# %% [markdown]
# # PixArt-alpha + LoRA for Compositional T2I  (Kaggle-ready)
#
# Fine-tunes a **single LoRA adapter** on the **cross-attention** layers of
# PixArt-alpha (PixArt-XL-2-512x512), using a **contrastive hard-negative
# denoising loss**:
#
#     L_total = L_diff + lambda * max(0, delta - (L_eps(c-) - L_eps(c+)))
#
# where L_eps(c) = || eps - eps_theta(z_t, t, c) ||^2 .
#
# Pipeline: precompute latents + T5 embeddings offline  ->  train LoRA
# ->  generate eval images (before/after)  ->  CLIP score + BLIP-VQA
# attribute binding  ->  print the numbers for the paper's tables.
#
# HOW TO USE ON KAGGLE:
#   1. New Notebook -> Settings: Accelerator = GPU (T4 x1 or P100), Internet = ON.
#   2. Paste each "# %%" block below into its own cell (or run as a script).
#   3. Put your images + captions in DATA_DIR (see the DATA cell) OR let the
#      demo fallback download a tiny captioned set.
#   4. Run top to bottom. Numbers for Table (comp-results) / Table (ablation)
#      are printed at the end.
#
# NOTE: this matches the paper's Section "Experimental Setup"
#   (r=16, alpha=32, lr=1e-4, batch 2 x grad-accum 4, 512px, lambda=0.5, delta=0.1).
#   If you change any value here, update the paper to match.

# %% [markdown]
# ## 0. Install dependencies

# %%
import os, sys, subprocess
def pip(*args):
    subprocess.run([sys.executable, "-m", "pip", "install", "-q", *args], check=True)

# --- Force the classic HF CDN download path -------------------------------
# HuggingFace now serves many repos through its new "Xet" (CAS) storage backend.
# Kaggle sessions often cannot reach the Xet endpoints, so hf_hub_download hangs
# at "0.00/605M" forever with NO error (it is stuck inside xet_get). Removing the
# hf_xet package + setting HF_HUB_DISABLE_XET makes is_xet_available() False, so
# huggingface_hub falls back to the normal CDN download, which works.
# NOTE: must run in a FRESH kernel, before anything imports huggingface_hub.
subprocess.run([sys.executable, "-m", "pip", "uninstall", "-y", "-q", "hf_xet"])
os.environ["HF_HUB_DISABLE_XET"] = "1"

# Pinned versions known to work together. Adjust only if Kaggle complains.
# huggingface_hub is pinned to a PRE-XET release: newer hub versions resolve files
# to Xet storage (us.gcp.cdn.hf.co/xet-bridge-us/...), whose endpoint Kaggle cannot
# authenticate against -> downloads either hang at 0% forever or die with
# "403 Forbidden / SignatureError: invalid key pair id". 0.25.2 has no Xet code at
# all, always uses the classic CDN, and satisfies transformers 4.44 / diffusers 0.30.
pip("huggingface_hub==0.25.2",
    "diffusers==0.30.3", "transformers==4.44.2", "accelerate==0.34.2",
    "peft==0.12.0", "sentencepiece", "open_clip_torch==2.24.0", "ftfy")

import huggingface_hub
print("deps installed; huggingface_hub", huggingface_hub.__version__, "(pre-Xet, classic CDN)")

# %% [markdown]
# ## 1. Config  (matches the paper — edit here, then edit the paper to match)

# %%
import os, json, math, random
import torch

class CFG:
    base_model      = "PixArt-alpha/PixArt-XL-2-512x512"
    resolution      = 512
    t5_max_length   = 120          # PixArt-alpha uses 120 tokens

    # LoRA
    lora_rank       = 16           # ablation: also try 8
    lora_alpha      = 32
    # cross-attention projections only (attn2 = cross-attn in PixArt/diffusers)
    lora_targets    = ("attn2.to_q", "attn2.to_k", "attn2.to_v")

    # optim (paper: Experimental Setup)
    lr              = 1e-4
    batch_size      = 2
    grad_accum      = 4            # effective batch 8
    max_steps       = 2000         # v2: longer training (was 1000)
    seed            = 42

    # hard-negative loss
    # v2 targeted improvement: the naive config barely changed binding, so we
    # strengthen the contrastive signal (bigger weight + harder margin so the
    # gradient does not vanish early) and train longer on more data.
    lambda_hn       = 2.0          # v2: was 0.5 (stronger binding signal)
    margin_delta    = 0.5          # v2: was 0.1 (harder margin -> sustained gradient)
    use_hard_neg    = True         # ablation: set False for "w/o hard-neg"

    # data / io
    data_dir        = "/kaggle/input"      # look for your dataset here
    work_dir        = "/kaggle/working"
    lora_out        = "/kaggle/working/lora_pixart_compositional"

device = "cuda" if torch.cuda.is_available() else "cpu"
# bf16 ONLY on Ampere+ (sm_80+: RTX 3060, A100). Kaggle T4 (sm_75) -> fp16.
# NOTE: Kaggle P100 (sm_60) is NOT supported by the current PyTorch build ->
#       switch the Accelerator to "GPU T4 x2" in Notebook Settings.
_cc = torch.cuda.get_device_capability()[0] if torch.cuda.is_available() else 0
use_bf16 = _cc >= 8
weight_dtype = torch.bfloat16 if use_bf16 else torch.float16
if torch.cuda.is_available() and _cc < 7:
    print("WARNING: this GPU (sm_%d0) is unsupported. Change Accelerator to GPU T4." % _cc)
print("device:", device, "| dtype:", weight_dtype,
      "| GPU:", torch.cuda.get_device_name(0) if torch.cuda.is_available() else "none")

random.seed(CFG.seed); torch.manual_seed(CFG.seed)
os.makedirs(CFG.work_dir, exist_ok=True)

# %% [markdown]
# ## 2. Data
#
# Provide training pairs as a list of dicts: {"image": <path>, "caption": <str>}.
# The hard-negative caption is generated automatically by swapping a
# color / spatial term.
#
# Put a Kaggle dataset with your 88 image-caption pairs and point TRAIN_JSON to it,
# OR the fallback below builds a tiny demo set from a public captioned dataset
# so you can smoke-test the whole pipeline end-to-end first.

# %%
# ============ CLEVR-style synthetic compositional dataset ============
# We procedurally render scenes of geometric objects (cube/sphere/cylinder)
# with known color + position. Because WE place them, every attribute is exact,
# so attribute-binding can be scored automatically. This cell defines BOTH
# `train_pairs` (with hard-negatives) and `EVAL` (held-out, with QA).
from PIL import Image, ImageDraw

random.seed(CFG.seed)
GEN_DIR = os.path.join(CFG.work_dir, "clevr_style"); os.makedirs(GEN_DIR, exist_ok=True)

COLORS = {"red": (220,30,30), "blue": (40,70,220), "green": (30,160,60),
          "yellow": (235,210,40), "purple": (150,40,200), "orange": (235,130,20),
          "cyan": (40,190,200), "pink": (235,110,180), "gray": (130,130,130),
          "brown": (140,80,40)}
SHAPES = ["cube", "sphere", "cylinder"]

N_TRAIN = 400      # v2: more training scenes (was 200)
N_EVAL  = 100      # held-out evaluation scenes (larger -> more stable metrics)

def draw_shape(d, shape, cx, cy, r, rgb):
    if shape == "cube":
        d.rectangle([cx-r, cy-r, cx+r, cy+r], fill=rgb)
    elif shape == "sphere":
        d.ellipse([cx-r, cy-r, cx+r, cy+r], fill=rgb)
    else:  # cylinder = body + elliptical top
        d.rectangle([cx-r, cy-r//2, cx+r, cy+r], fill=rgb)
        d.ellipse([cx-r, cy-r-r//3, cx+r, cy-r//2+r//3], fill=rgb)

def render(objs, path):
    img = Image.new("RGB", (CFG.resolution, CFG.resolution), (235,235,235))
    d = ImageDraw.Draw(img); S = CFG.resolution
    pos = {"C": (S//2, S//2), "L": (S//3, S//2), "R": (2*S//3, S//2)}
    for o in objs:
        cx, cy = pos[o["side"]]
        draw_shape(d, o["shape"], cx, cy, S//8, COLORS[o["color"]])
    img.save(path)

def caption_of(objs, spatial):
    if len(objs) == 1:
        o = objs[0]; return f"a {o['color']} {o['shape']}"
    a, b = objs
    if spatial:
        rel = "to the left of" if a["side"] == "L" else "to the right of"
        return f"a {a['color']} {a['shape']} {rel} a {b['color']} {b['shape']}"
    return f"a {a['color']} {a['shape']} and a {b['color']} {b['shape']}"

def hard_negative(objs, spatial):
    """Structured hard-negative: swap the two colors, else flip relation, else recolor."""
    objs = [dict(o) for o in objs]
    if len(objs) == 2 and objs[0]["color"] != objs[1]["color"]:
        objs[0]["color"], objs[1]["color"] = objs[1]["color"], objs[0]["color"]
        return caption_of(objs, spatial)
    if len(objs) == 2 and spatial:
        objs[0]["side"], objs[1]["side"] = objs[1]["side"], objs[0]["side"]
        return caption_of(objs, spatial)
    o = objs[0]; o["color"] = random.choice([c for c in COLORS if c != o["color"]])
    return caption_of(objs, spatial)

# build a pool of scene specs, then split into train / held-out eval
clist = list(COLORS)
specs = [{"objs": [{"color": c, "shape": s, "side": "C"}], "spatial": False}
         for c in clist for s in SHAPES]                      # 30 singles
for _ in range(N_TRAIN + N_EVAL):                             # multi-object + spatial
    c1, c2 = random.sample(clist, 2); s1, s2 = random.sample(SHAPES, 2)
    spatial = random.random() < 0.5
    specs.append({"objs": [{"color": c1, "shape": s1, "side": "L"},
                           {"color": c2, "shape": s2, "side": "R"}], "spatial": spatial})
random.shuffle(specs)
eval_specs, train_specs = specs[:N_EVAL], specs[N_EVAL:N_EVAL + N_TRAIN]

train_pairs = []
for i, sp in enumerate(train_specs):
    p = os.path.join(GEN_DIR, f"tr_{i}.png"); render(sp["objs"], p)
    train_pairs.append({"image": p,
                        "caption": caption_of(sp["objs"], sp["spatial"]),
                        "neg": hard_negative(sp["objs"], sp["spatial"])})

# EVAL: held-out prompts with color-binding questions (BLIP-VQA answerable)
EVAL = []
for sp in eval_specs:
    EVAL.append({"prompt": caption_of(sp["objs"], sp["spatial"]),
                 "qa": [(f"What color is the {o['shape']}?", o["color"]) for o in sp["objs"]]})

print(f"train pairs: {len(train_pairs)} | eval prompts: {len(EVAL)}")
print("train example:", train_pairs[0])
print("eval  example:", EVAL[0])

# %% [markdown]
# ## 3. Load PixArt-alpha, attach LoRA to cross-attention

# %%
from diffusers import PixArtAlphaPipeline, DDPMScheduler
from peft import (LoraConfig, inject_adapter_in_model,
                  get_peft_model_state_dict, set_peft_model_state_dict)

pipe = PixArtAlphaPipeline.from_pretrained(CFG.base_model, torch_dtype=weight_dtype)
transformer = pipe.transformer
vae         = pipe.vae
text_encoder= pipe.text_encoder
tokenizer   = pipe.tokenizer

# noise scheduler for TRAINING (epsilon prediction / add_noise)
noise_sched = DDPMScheduler.from_pretrained(CFG.base_model, subfolder="scheduler")
if noise_sched.config.prediction_type != "epsilon":
    print("warn: prediction_type =", noise_sched.config.prediction_type)

# freeze everything
for m in (transformer, vae, text_encoder):
    m.requires_grad_(False)

# build the exact list of cross-attention modules to adapt
target_modules = []
for name, _ in transformer.named_modules():
    if name.endswith(CFG.lora_targets):
        target_modules.append(name)
assert target_modules, "no cross-attention modules matched!"
print(f"LoRA on {len(target_modules)} modules (e.g. {target_modules[0]})")

lora_cfg = LoraConfig(
    r=CFG.lora_rank, lora_alpha=CFG.lora_alpha,
    init_lora_weights="gaussian", target_modules=target_modules,
)
inject_adapter_in_model(lora_cfg, transformer)

# collect trainable (LoRA) params, keep them fp32 for stable optim
lora_params = [p for p in transformer.parameters() if p.requires_grad]
for p in lora_params:
    p.data = p.data.float()
n_train = sum(p.numel() for p in lora_params)
n_total = sum(p.numel() for p in transformer.parameters())
print(f"trainable LoRA params: {n_train:,}  ({100*n_train/n_total:.3f}% of transformer)")

# %% [markdown]
# ## 4. Precompute latents + T5 embeddings (so we can free VAE & T5 -> fits 12GB)

# %%
from PIL import Image
import torchvision.transforms as T

img_tf = T.Compose([
    T.Resize(CFG.resolution, interpolation=T.InterpolationMode.BILINEAR),
    T.CenterCrop(CFG.resolution),
    T.ToTensor(),
    T.Normalize([0.5], [0.5]),
])

@torch.no_grad()
def encode_image(path):
    img = Image.open(path).convert("RGB")
    x = img_tf(img).unsqueeze(0).to(device, weight_dtype)
    lat = vae.encode(x).latent_dist.sample() * vae.config.scaling_factor
    return lat.squeeze(0).cpu()

@torch.no_grad()
def encode_text(prompt):
    tok = tokenizer(prompt, max_length=CFG.t5_max_length, padding="max_length",
                    truncation=True, return_tensors="pt")
    ids  = tok.input_ids.to(device)
    mask = tok.attention_mask.to(device)
    emb  = text_encoder(ids, attention_mask=mask)[0]
    return emb.squeeze(0).cpu(), mask.squeeze(0).cpu()

vae.to(device); text_encoder.to(device)
cache = []
for p in train_pairs:
    lat = encode_image(p["image"])
    pos_emb, pos_mask = encode_text(p["caption"])
    neg_emb, neg_mask = encode_text(p["neg"])
    cache.append(dict(lat=lat, pos_emb=pos_emb, pos_mask=pos_mask,
                      neg_emb=neg_emb, neg_mask=neg_mask))
print("cached", len(cache), "items")

# free memory: VAE + T5 not needed during training
vae.to("cpu"); text_encoder.to("cpu")
del text_encoder
pipe.text_encoder = None
torch.cuda.empty_cache()
transformer.to(device)

# %% [markdown]
# ## 5. Training loop  (contrastive hard-negative denoising loss)

# %%
from torch.utils.data import Dataset, DataLoader

class CacheDS(Dataset):
    def __init__(self, items): self.items = items
    def __len__(self): return len(self.items)
    def __getitem__(self, i): return self.items[i]

def collate(batch):
    stack = lambda k: torch.stack([b[k] for b in batch])
    return {k: stack(k) for k in batch[0]}

dl = DataLoader(CacheDS(cache), batch_size=CFG.batch_size, shuffle=True,
                collate_fn=collate, drop_last=True)

opt = torch.optim.AdamW(lora_params, lr=CFG.lr, weight_decay=1e-4)
scaler = torch.cuda.amp.GradScaler(enabled=(weight_dtype == torch.float16))
autocast_dtype = weight_dtype

def transformer_eps(latents, emb, mask, t):
    """Return predicted noise (first 4 channels) for given text condition."""
    out = transformer(hidden_states=latents,
                      encoder_hidden_states=emb,
                      encoder_attention_mask=mask,
                      timestep=t,
                      # 512 model doesn't use these, but the API requires the keys
                      added_cond_kwargs={"resolution": None, "aspect_ratio": None},
                      return_dict=False)[0]
    # PixArt predicts [eps, sigma] -> take the eps half
    if out.shape[1] == latents.shape[1] * 2:
        out = out.chunk(2, dim=1)[0]
    return out

transformer.train()
step, run_diff, run_hn = 0, 0.0, 0.0
data_iter = iter(dl)
opt.zero_grad()
while step < CFG.max_steps:
    try:
        batch = next(data_iter)
    except StopIteration:
        data_iter = iter(dl); batch = next(data_iter)

    lat = batch["lat"].to(device, weight_dtype)
    noise = torch.randn_like(lat)
    bsz = lat.shape[0]
    t = torch.randint(0, noise_sched.config.num_train_timesteps, (bsz,), device=device).long()
    z_t = noise_sched.add_noise(lat, noise, t)

    with torch.autocast(device_type="cuda", dtype=autocast_dtype):
        pos = transformer_eps(z_t, batch["pos_emb"].to(device, weight_dtype),
                              batch["pos_mask"].to(device), t)
        l_diff = torch.nn.functional.mse_loss(pos.float(), noise.float())

        if CFG.use_hard_neg:
            neg = transformer_eps(z_t, batch["neg_emb"].to(device, weight_dtype),
                                  batch["neg_mask"].to(device), t)
            # per-sample denoising error for +/- captions (share z_t, t, noise)
            err = lambda p: ((p.float() - noise.float()) ** 2).flatten(1).mean(1)
            l_hn = torch.clamp(CFG.margin_delta - (err(neg) - err(pos)), min=0).mean()
        else:
            l_hn = torch.zeros((), device=device)

        loss = l_diff + CFG.lambda_hn * l_hn

    scaler.scale(loss / CFG.grad_accum).backward()
    run_diff += l_diff.item(); run_hn += float(l_hn)

    if (step + 1) % CFG.grad_accum == 0:
        scaler.unscale_(opt)
        torch.nn.utils.clip_grad_norm_(lora_params, 1.0)
        scaler.step(opt); scaler.update(); opt.zero_grad()

    if (step + 1) % 50 == 0:
        print(f"step {step+1}/{CFG.max_steps} | L_diff {run_diff/50:.4f} | L_hn {run_hn/50:.4f}")
        run_diff = run_hn = 0.0
    step += 1

# save LoRA (peft state dict -> version independent)
os.makedirs(CFG.lora_out, exist_ok=True)
lora_file = os.path.join(CFG.lora_out, "lora_state.pt")
torch.save(get_peft_model_state_dict(transformer), lora_file)
print("saved LoRA ->", lora_file)

# %% [markdown]
# ## 6. Generate eval images (baseline vs LoRA)
#
# Structured eval prompts let us measure attribute binding with BLIP-VQA.
# Replace/extend EVAL with your ~50 held-out compositional prompts.

# %%
# EVAL is defined in the dataset cell (## 2) as the held-out set with QA.
import gc
gc.collect(); torch.cuda.empty_cache()

@torch.no_grad()
def build_pipe(with_lora: bool):
    p = PixArtAlphaPipeline.from_pretrained(CFG.base_model, torch_dtype=weight_dtype)
    if with_lora:
        inject_adapter_in_model(lora_cfg, p.transformer)
        sd = torch.load(os.path.join(CFG.lora_out, "lora_state.pt"))
        set_peft_model_state_dict(p.transformer, sd)
    p.to(device)
    p.set_progress_bar_config(disable=True)
    return p

@torch.no_grad()
def generate(p, prompt, seed=1234):
    g = torch.Generator(device=device).manual_seed(seed)
    return p(prompt=prompt, num_inference_steps=20, guidance_scale=4.5, generator=g).images[0]

def run_generation(with_lora):
    p = build_pipe(with_lora)
    imgs = []
    for e in EVAL:
        imgs.append(generate(p, e["prompt"]))
    del p; gc.collect(); torch.cuda.empty_cache()
    return imgs

# NOTE: eval-set generation is done in the metrics cell (## 7), where we generate
# under multiple seeds to report mean +/- std. `run_generation`/`generate` above
# are reused there. (No eager single-seed generation here anymore.)

# %% [markdown]
# ## 6b. Qualitative demo: baseline vs LoRA on hand-picked prompts
# Self-contained: can run right after Cell 5 (training) WITHOUT running the slow
# Cell 6. Saves a side-by-side comparison grid to /kaggle/working for the paper.

# %%
import os, gc
import matplotlib.pyplot as plt

# Prompts follow the exact training phrasing ("a <color> <shape> ...").
# Colors: red/blue/green/yellow/purple/orange/cyan/pink/gray/brown.
DEMO_PROMPTS = [
    "a red cube and a blue sphere",
    "a green cylinder and a yellow cube",
    "a purple sphere to the left of a orange cube",
    "a cyan cube to the right of a pink cylinder",
]
DEMO_SEED = 1234   # same seed for both models -> identical noise -> fair compare

@torch.no_grad()
def _demo_build(with_lora):
    p = PixArtAlphaPipeline.from_pretrained(CFG.base_model, torch_dtype=weight_dtype)
    if with_lora:
        inject_adapter_in_model(lora_cfg, p.transformer)
        sd = torch.load(os.path.join(CFG.lora_out, "lora_state.pt"))
        set_peft_model_state_dict(p.transformer, sd)
    p.to(device); p.set_progress_bar_config(disable=True)
    return p

@torch.no_grad()
def _demo_gen(p, prompt, seed=DEMO_SEED):
    g = torch.Generator(device=device).manual_seed(seed)
    return p(prompt=prompt, num_inference_steps=25, guidance_scale=4.5, generator=g).images[0]

print("demo: generating baseline ...")
p = _demo_build(False)
base = [_demo_gen(p, pr) for pr in DEMO_PROMPTS]
del p; gc.collect(); torch.cuda.empty_cache()

print("demo: generating LoRA ...")
p = _demo_build(True)
ours = [_demo_gen(p, pr) for pr in DEMO_PROMPTS]
del p; gc.collect(); torch.cuda.empty_cache()

n = len(DEMO_PROMPTS)
fig, axes = plt.subplots(n, 2, figsize=(6, 3.1 * n))
if n == 1:
    axes = axes[None, :]
for i, pr in enumerate(DEMO_PROMPTS):
    axes[i, 0].imshow(base[i]); axes[i, 0].axis("off")
    axes[i, 1].imshow(ours[i]); axes[i, 1].axis("off")
    axes[i, 0].set_title(f"baseline\n\"{pr}\"", fontsize=8)
    axes[i, 1].set_title(f"ours (LoRA)\n\"{pr}\"", fontsize=8)
plt.tight_layout()
grid_path = "/kaggle/working/qualitative_compare.png"
plt.savefig(grid_path, dpi=150, bbox_inches="tight")
plt.show()
print("saved grid ->", grid_path)

os.makedirs("/kaggle/working/demo_imgs", exist_ok=True)
for i, pr in enumerate(DEMO_PROMPTS):
    tag = pr.replace(" ", "_")[:40]
    base[i].save(f"/kaggle/working/demo_imgs/base_{i}_{tag}.png")
    ours[i].save(f"/kaggle/working/demo_imgs/lora_{i}_{tag}.png")
print("saved individual images -> /kaggle/working/demo_imgs")

# %% [markdown]
# ## 7. Metrics: CLIP similarity + BLIP-VQA attribute binding

# %%
# Two-phase eval to fit the T4's 15GB: (1) generate ALL images with ONLY the
# diffusion pipeline on the GPU, then (2) load the scoring models (CLIP, BLIP)
# and score the stored images. The T5-XXL pipeline and the scorers never live on
# the GPU at the same time -> no OOM.
import gc, statistics

# The trained transformer from the training cell is no longer needed here
# (build_pipe loads a fresh one); free it to reclaim GPU memory.
try:
    del transformer
except NameError:
    pass
gc.collect(); torch.cuda.empty_cache()

prompts = [e["prompt"] for e in EVAL]

# Evaluate each model over several GENERATION seeds (the trained model is fixed).
# Measures generation stochasticity -> report mean +/- std, avoids over-reading
# tiny gaps. Reduce this list (or N_EVAL) if the run is too slow.
SEEDS = [1234, 2025, 777]

# ---- Phase 1: generate images (only the pipeline is on the GPU) ----
@torch.no_grad()
def generate_all(with_lora):
    tag = "LoRA" if with_lora else "baseline"
    p = build_pipe(with_lora)
    per_seed = {}
    for s in SEEDS:
        per_seed[s] = [generate(p, pr, seed=s) for pr in prompts]
        print(f"  generated {tag} seed={s} ({len(prompts)} imgs)")
    del p; gc.collect(); torch.cuda.empty_cache()
    return per_seed

print("phase 1: generating baseline images ...")
gen_base = generate_all(False)
print("phase 1: generating LoRA images ...")
gen_lora = generate_all(True)

# ---- Phase 2: load scorers (CLIP + BLIP) and compute metrics ----
import open_clip
clip_model, _, clip_pre = open_clip.create_model_and_transforms(
    "ViT-B-32", pretrained="laion2b_s34b_b79k")
clip_tok = open_clip.get_tokenizer("ViT-B-32")
clip_model = clip_model.to(device).eval()

@torch.no_grad()
def clip_score(images, prompts):
    scores = []
    for img, pr in zip(images, prompts):
        im = clip_pre(img).unsqueeze(0).to(device)
        tx = clip_tok([pr]).to(device)
        fi = clip_model.encode_image(im); ft = clip_model.encode_text(tx)
        fi = fi / fi.norm(dim=-1, keepdim=True); ft = ft / ft.norm(dim=-1, keepdim=True)
        scores.append((fi @ ft.T).item())
    return sum(scores) / len(scores)

# BLIP-VQA for attribute binding (answer must contain the ground-truth attribute)
from transformers import BlipProcessor, BlipForQuestionAnswering
blip_proc = BlipProcessor.from_pretrained("Salesforce/blip-vqa-base")
blip = BlipForQuestionAnswering.from_pretrained("Salesforce/blip-vqa-base").to(device).eval()

@torch.no_grad()
def attr_binding(images):
    correct = total = 0
    for img, e in zip(images, EVAL):
        for q, a in e["qa"]:
            inp = blip_proc(img, q, return_tensors="pt").to(device)
            out = blip.generate(**inp, max_new_tokens=5)
            ans = blip_proc.decode(out[0], skip_special_tokens=True).lower()
            correct += int(a.lower() in ans); total += 1
    return correct / max(total, 1)

def score_seeds(gen):
    clip_s, attr_s = [], []
    for s in SEEDS:
        imgs = gen[s]
        clip_s.append(clip_score(imgs, prompts))
        attr_s.append(attr_binding(imgs))
        print(f"  seed={s}: AttrBinding={attr_s[-1]:.3f}  CLIP={clip_s[-1]:.3f}")
    return clip_s, attr_s

def _mstd(xs):
    m = sum(xs) / len(xs)
    sd = statistics.pstdev(xs) if len(xs) > 1 else 0.0
    return m, sd

print("phase 2: scoring baseline ...")
base_clip, base_attr = score_seeds(gen_base)
print("phase 2: scoring LoRA ...")
lora_clip, lora_attr = score_seeds(gen_lora)

res = {
    "seeds": SEEDS,
    "n_eval": len(EVAL),
    "baseline": {
        "AttrBinding_mean": _mstd(base_attr)[0], "AttrBinding_std": _mstd(base_attr)[1],
        "CLIP_mean": _mstd(base_clip)[0], "CLIP_std": _mstd(base_clip)[1],
        "AttrBinding_all": base_attr, "CLIP_all": base_clip,
    },
    "ours_lora": {
        "AttrBinding_mean": _mstd(lora_attr)[0], "AttrBinding_std": _mstd(lora_attr)[1],
        "CLIP_mean": _mstd(lora_clip)[0], "CLIP_std": _mstd(lora_clip)[1],
        "AttrBinding_all": lora_attr, "CLIP_all": lora_clip,
    },
}

# %% [markdown]
# ## 8. Print numbers for the paper tables

# %%
print("\n==== RESULTS (paste into the paper) ====")
print(f"eval prompts: {res['n_eval']}  |  seeds: {res['seeds']}")
print(f"{'Method':<22}{'Attr.Binding (mean+/-std)':>28}{'CLIP (mean+/-std)':>22}")
for k, name in [("baseline", "PixArt-a (baseline)"), ("ours_lora", "Ours (LoRA)")]:
    r = res[k]
    print(f"{name:<22}"
          f"{r['AttrBinding_mean']:>12.3f} +/- {r['AttrBinding_std']:.3f}"
          f"{r['CLIP_mean']:>10.3f} +/- {r['CLIP_std']:.3f}")
print("\nConfig:", dict(r=CFG.lora_rank, alpha=CFG.lora_alpha, lr=CFG.lr,
      steps=CFG.max_steps, lambda_hn=CFG.lambda_hn, delta=CFG.margin_delta,
      hard_neg=CFG.use_hard_neg))
print("\nFor the ablation table, re-run this notebook changing:")
print("  * CFG.lora_rank = 8   (then 16)")
print("  * CFG.use_hard_neg = False   (r=16 w/o hard-neg row)")

with open(os.path.join(CFG.work_dir, "results.json"), "w") as f:
    json.dump(res, f, indent=2)
print("saved -> results.json")

# %% [markdown]
# ## 9. Metric diagnostic: is BLIP-VQA a reliable color reader on OUR renders?
# Runs the attribute-binding metric on GROUND-TRUTH renders (perfect binding by
# construction). If BLIP scores ~1.0 here, the metric is trustworthy and the
# model comparison is meaningful. If it scores ~0.5 on perfect images, the
# metric is unreliable on this synthetic domain and the whole comparison is
# uninformative (a measurement problem, not a method problem).

# %%
import random
from PIL import Image

# Reload BLIP if this cell is run in a fresh kernel.
try:
    blip, blip_proc
except NameError:
    from transformers import BlipProcessor, BlipForQuestionAnswering
    blip_proc = BlipProcessor.from_pretrained("Salesforce/blip-vqa-base")
    blip = BlipForQuestionAnswering.from_pretrained("Salesforce/blip-vqa-base").to(device).eval()

@torch.no_grad()
def _blip_answer(img, q):
    inp = blip_proc(img, q, return_tensors="pt").to(device)
    out = blip.generate(**inp, max_new_tokens=5)
    return blip_proc.decode(out[0], skip_special_tokens=True).lower()

def _mk_scene(n_obj):
    if n_obj == 1:
        c = random.choice(list(COLORS)); s = random.choice(SHAPES)
        return [{"color": c, "shape": s, "side": "C"}], False
    c1, c2 = random.sample(list(COLORS), 2); s1, s2 = random.sample(SHAPES, 2)
    return [{"color": c1, "shape": s1, "side": "L"},
            {"color": c2, "shape": s2, "side": "R"}], (random.random() < 0.5)

def diagnose(n_obj, N=40, show=8):
    correct = total = shown = 0
    for i in range(N):
        objs, spatial = _mk_scene(n_obj)
        path = os.path.join(GEN_DIR, f"diag_{n_obj}_{i}.png")
        render(objs, path)
        img = Image.open(path).convert("RGB")
        for o in objs:
            q = f"What color is the {o['shape']}?"
            ans = _blip_answer(img, q)
            ok = o["color"].lower() in ans
            correct += int(ok); total += 1
            if shown < show:
                print(f"  GT: {o['color']:6s} {o['shape']:8s} | Q: {q:26s} "
                      f"| BLIP: {ans:16s} | {'OK' if ok else 'X'}")
                shown += 1
    print(f"  -> BLIP color accuracy on {n_obj}-object GROUND-TRUTH renders: "
          f"{correct/total:.3f} ({correct}/{total})\n")
    return correct / max(total, 1)

print("== DIAGNOSTIC: BLIP-VQA on perfectly-bound ground-truth renders ==\n")
print("[single-object renders]")
acc1 = diagnose(1, N=40)
print("[two-object renders]")
acc2 = diagnose(2, N=40)
print(f"SUMMARY: single-obj={acc1:.3f}  two-obj={acc2:.3f}")
print("Interpretation: ~1.0 => metric OK (comparison is real);"
      " ~0.5 => metric unreliable on synthetic images (comparison uninformative).")

# %% [markdown]
# ## 9b. OPTIONAL FAST BOOTSTRAP for cells 10 & 11 (skip re-training)
# Use this when you only need to (re-)run the Sigma / Attend-and-Excite cells in a
# FRESH kernel without repeating the ~40-min LoRA training + baseline eval.
#
#   Fast path:  run cells 0, 1, 2, 6, then THIS cell, then cells 10 and 11.
#   (cells 3, 4, 5, 6b, 7, 8, 9 can be SKIPPED — 10/11 use frozen alpha, no LoRA.)
#
# It is a no-op during a full Run-All (it detects that cell 7 already built `res`
# and loaded the scorers, and skips). It reuses the exact scorer code from cell 7
# and hard-codes the baseline/LoRA numbers already measured overnight so cells
# 10/11 can print their comparison rows.

# %%
try:
    res; clip_model; blip          # full run already set these -> skip bootstrap
    print("bootstrap skipped: res + scorers already exist (full run).")
except NameError:
    import gc, statistics
    from diffusers import PixArtAlphaPipeline   # build_pipe(with_lora=False) needs this
    try:
        del transformer, pipe      # free the training pipe if cell 3 was run
    except NameError:
        pass
    gc.collect(); torch.cuda.empty_cache()

    prompts = [e["prompt"] for e in EVAL]
    SEEDS = [1234, 2025, 777]

    import open_clip
    clip_model, _, clip_pre = open_clip.create_model_and_transforms(
        "ViT-B-32", pretrained="laion2b_s34b_b79k")
    clip_tok = open_clip.get_tokenizer("ViT-B-32")
    clip_model = clip_model.to(device).eval()

    @torch.no_grad()
    def clip_score(images, prompts):
        scores = []
        for img, pr in zip(images, prompts):
            im = clip_pre(img).unsqueeze(0).to(device)
            tx = clip_tok([pr]).to(device)
            fi = clip_model.encode_image(im); ft = clip_model.encode_text(tx)
            fi = fi / fi.norm(dim=-1, keepdim=True); ft = ft / ft.norm(dim=-1, keepdim=True)
            scores.append((fi @ ft.T).item())
        return sum(scores) / len(scores)

    from transformers import BlipProcessor, BlipForQuestionAnswering
    blip_proc = BlipProcessor.from_pretrained("Salesforce/blip-vqa-base")
    blip = BlipForQuestionAnswering.from_pretrained("Salesforce/blip-vqa-base").to(device).eval()

    @torch.no_grad()
    def attr_binding(images):
        correct = total = 0
        for img, e in zip(images, EVAL):
            for q, a in e["qa"]:
                inp = blip_proc(img, q, return_tensors="pt").to(device)
                out = blip.generate(**inp, max_new_tokens=5)
                ans = blip_proc.decode(out[0], skip_special_tokens=True).lower()
                correct += int(a.lower() in ans); total += 1
        return correct / max(total, 1)

    def score_seeds(gen):
        clip_s, attr_s = [], []
        for s in SEEDS:
            imgs = gen[s]
            clip_s.append(clip_score(imgs, prompts))
            attr_s.append(attr_binding(imgs))
            print(f"  seed={s}: AttrBinding={attr_s[-1]:.3f}  CLIP={clip_s[-1]:.3f}")
        return clip_s, attr_s

    def _mstd(xs):
        m = sum(xs) / len(xs)
        sd = statistics.pstdev(xs) if len(xs) > 1 else 0.0
        return m, sd

    # Baseline / LoRA numbers already measured (overnight, N=100, 3 seeds) so the
    # comparison rows print without re-running training or the baseline eval.
    res = {
        "seeds": SEEDS, "n_eval": len(EVAL),
        "baseline":  {"AttrBinding_mean": 0.488, "AttrBinding_std": 0.007,
                      "CLIP_mean": 0.389, "CLIP_std": 0.004},
        "ours_lora": {"AttrBinding_mean": 0.427, "AttrBinding_std": 0.011,
                      "CLIP_mean": 0.262, "CLIP_std": 0.003},
    }
    print("bootstrap ready: scorers loaded, res set. Now run cell 10 and cell 11.")

# %% [markdown]
# ## 10. Comparison point: stronger base model PixArt-Sigma
# A legitimate, low-risk positive comparison for the study: run a STRONGER base
# model (PixArt-Sigma) through the SAME evaluation protocol (no training, no LoRA).
# Reuses generate()/score_seeds()/_mstd(). Run this AFTER cells 1-8 (needs
# prompts, SEEDS, and the CLIP/BLIP scorers loaded in cell 7).

# %%
from diffusers import PixArtSigmaPipeline
try:
    from diffusers import PixArtTransformer2DModel as _SigmaTF
except ImportError:
    from diffusers import Transformer2DModel as _SigmaTF

# The 512-MS repo ships ONLY the transformer weights (no model_index.json), so
# we load that transformer and graft it onto the Sigma base pipeline (SDXL VAE +
# T5), which is the documented diffusers way to run PixArt-Sigma.
SIGMA_TRANSFORMER = "PixArt-alpha/PixArt-Sigma-XL-2-512-MS"
SIGMA_BASE        = "PixArt-alpha/pixart_sigma_sdxlvae_T5_diffusers"

@torch.no_grad()
def generate_all_sigma():
    tf = _SigmaTF.from_pretrained(SIGMA_TRANSFORMER, subfolder="transformer",
                                  torch_dtype=weight_dtype, use_safetensors=True)
    p = PixArtSigmaPipeline.from_pretrained(SIGMA_BASE, transformer=tf,
                                            torch_dtype=weight_dtype, use_safetensors=True)
    p.to(device); p.set_progress_bar_config(disable=True)
    per_seed = {}
    for s in SEEDS:
        per_seed[s] = [generate(p, pr, seed=s) for pr in prompts]
        print(f"  generated PixArt-Sigma seed={s} ({len(prompts)} imgs)")
    del p; gc.collect(); torch.cuda.empty_cache()
    return per_seed

# Wrapped in try/except so an overnight Run-All still COMPLETES (and keeps the
# earlier baseline/LoRA/diagnostic results) even if this comparison fails.
try:
    clip_model.to("cpu"); blip.to("cpu"); gc.collect(); torch.cuda.empty_cache()
    print("phase 1: generating PixArt-Sigma images ...")
    gen_sigma = generate_all_sigma()
    clip_model.to(device); blip.to(device); gc.collect(); torch.cuda.empty_cache()
    print("phase 2: scoring PixArt-Sigma ...")
    sigma_clip, sigma_attr = score_seeds(gen_sigma)
    sigma_res = {
        "AttrBinding_mean": _mstd(sigma_attr)[0], "AttrBinding_std": _mstd(sigma_attr)[1],
        "CLIP_mean": _mstd(sigma_clip)[0], "CLIP_std": _mstd(sigma_clip)[1],
        "AttrBinding_all": sigma_attr, "CLIP_all": sigma_clip,
    }
    print("\n==== PixArt-Sigma vs PixArt-alpha (paste into the paper) ====")
    print(f"eval prompts: {len(EVAL)}  |  seeds: {SEEDS}")
    print(f"{'Method':<24}{'Attr.Binding (mean+/-std)':>28}{'CLIP (mean+/-std)':>22}")
    for name, r in [("PixArt-a (baseline)", res["baseline"]),
                    ("Ours LoRA (r=16)",    res["ours_lora"]),
                    ("PixArt-Sigma",        sigma_res)]:
        print(f"{name:<24}"
              f"{r['AttrBinding_mean']:>12.3f} +/- {r['AttrBinding_std']:.3f}"
              f"{r['CLIP_mean']:>10.3f} +/- {r['CLIP_std']:.3f}")
    try:
        with open(os.path.join(CFG.work_dir, "results.json")) as f:
            _all = json.load(f)
    except Exception:
        _all = {}
    _all["pixart_sigma"] = sigma_res
    with open(os.path.join(CFG.work_dir, "results.json"), "w") as f:
        json.dump(_all, f, indent=2)
    print("saved -> results.json (added pixart_sigma)")
except Exception as _e:
    import traceback; traceback.print_exc()
    print("PixArt-Sigma comparison FAILED (skipped):", _e)
    try:
        clip_model.to(device); blip.to(device)   # restore scorers for later cells
    except Exception:
        pass

# %% [markdown]
# ## 11. Inference-time method: Attend-and-Excite attention guidance
# The PRIMARY proposed positive method. No training. On the FROZEN PixArt-alpha,
# during the first K denoising steps we read the cross-attention maps for the
# subject tokens (the shape/color words), and nudge the latent so that every
# subject token receives strong attention somewhere in the image (Chefer et al.,
# "Attend-and-Excite"). This directly targets attribute binding at inference.
#
# NOTE: this is a first end-to-end draft (like the training cell was). If it
# errors on Kaggle, paste the traceback back and we debug it together. Run AFTER
# cells 1-8 (needs prompts, SEEDS, EVAL, build_pipe, score_seeds, scorers).

# %%
import torch.nn.functional as F

# ---- attention capture on the cross-attention (attn2) modules ----
class _AttnStore:
    def __init__(self):
        self.capture = False
        self.maps = []
    def reset(self):
        self.maps = []
_store = _AttnStore()

class CaptureCrossAttnProcessor:
    """Standard (non-fused) cross-attention that also stores the softmax
    attention map (averaged over heads) when _store.capture is True, so the map
    stays differentiable w.r.t. the latent."""
    def __call__(self, attn, hidden_states, encoder_hidden_states=None,
                 attention_mask=None, **kwargs):
        bsz, q_len, _ = hidden_states.shape
        ctx = encoder_hidden_states if encoder_hidden_states is not None else hidden_states
        # match the stock AttnProcessor: reshape the (T5 padding) mask to a
        # per-head additive bias before computing scores.
        if attention_mask is not None:
            attention_mask = attn.prepare_attention_mask(attention_mask, ctx.shape[1], bsz)
        q = attn.to_q(hidden_states)
        k = attn.to_k(ctx); v = attn.to_v(ctx)
        q = attn.head_to_batch_dim(q); k = attn.head_to_batch_dim(k); v = attn.head_to_batch_dim(v)
        probs = attn.get_attention_scores(q, k, attention_mask)   # [b*h, q_len, kv_len]
        if _store.capture:
            h = attn.heads
            _store.maps.append(probs.reshape(bsz, h, probs.shape[1], probs.shape[2]).mean(1))
        out = torch.bmm(probs, v)
        out = attn.batch_to_head_dim(out)
        out = attn.to_out[0](out)
        out = attn.to_out[1](out)
        return out

def _install_capture(transformer):
    for name, mod in transformer.named_modules():
        if name.endswith("attn2"):
            mod.set_processor(CaptureCrossAttnProcessor())

def _subject_token_indices(pipe, prompt):
    """Indices (in the padded T5 sequence) of the tokens making up shape/color words.

    T5's SentencePiece splits some targets across tokens ("cube" -> "cu"+"be"), so
    matching one decoded token at a time silently misses them. We therefore group up
    to 4 consecutive pieces and match the concatenation. Empty pieces are skipped:
    the loss takes a MAX over tokens (i.e. it chases the WORST-attended one), so an
    empty separator token -- which gets almost no attention -- would hijack the
    guidance away from the real subject words."""
    ids = pipe.tokenizer(prompt, max_length=CFG.t5_max_length, padding="max_length",
                         truncation=True, return_tensors="pt").input_ids[0].tolist()
    pieces = [pipe.tokenizer.decode([t]).strip().lower() for t in ids]
    want = set(SHAPES) | set(COLORS)
    idxs, n = [], len(pieces)
    for i in range(n):
        if not pieces[i]:
            continue
        buf = ""
        for j in range(i, min(i + 4, n)):
            buf += pieces[j]
            if buf in want:
                idxs.extend(k for k in range(i, j + 1) if pieces[k])
                break
    return sorted(set(idxs))

# ---- guided generation (faithful to Chefer et al., adapted to the PixArt DiT) ----
import numpy as np

# FAIRNESS: the baseline generate() uses num_inference_steps=20, so A&E must use
# 20 too. The first draft used 25, which silently gave A&E ~25% more compute than
# the baseline it was being compared against.
AE_STEPS      = 20      # == baseline generate()'s num_inference_steps
AE_MAX_ALTER  = 10      # guide during the first half of the steps (paper: 25 of 50)
AE_SCALE      = 20.0    # paper's scale_factor
AE_GUID       = 4.5     # classifier-free guidance scale
# Paper refines to an attention threshold at t = 0/10/20 of 50 steps -> rescaled to 20.
# The TARGETS are recalibrated to PixArt's measured attention distribution: with the
# EOS column dropped there are ~15 text tokens, so uniform attention is ~0.067 and the
# observed subject max is ~0.021. The paper's 0.5/0.8 targets (tuned on Stable
# Diffusion) are unreachable here and would just burn every refinement iteration.
# Calibrated on the DEV split only -- never on EVAL.
AE_THRESHOLDS = {0: 0.05, 4: 0.10, 8: 0.15}
AE_MAX_REFINE = 10      # paper allows 20 refinement iters; capped here for runtime
AE_LAYER_FRAC = (0.25, 0.75)   # use the middle DiT blocks (the paper picks 16x16 UNet layers;
                               # a DiT has one resolution, so we select by depth instead)
ADDED_COND    = {"resolution": None, "aspect_ratio": None}

def _gauss_kernel(ks=3, sigma=0.5):
    """Paper smooths each attention map with a 3x3 Gaussian (sigma=0.5) before max."""
    ax = torch.arange(ks, dtype=torch.float32) - (ks - 1) / 2
    g = torch.exp(-(ax ** 2) / (2 * sigma ** 2)); g = g / g.sum()
    return torch.outer(g, g)[None, None]
_GK = _gauss_kernel()

@torch.no_grad()
def _cfg_step(pipe, latents, t, neg_emb, pos_emb, neg_mask, pos_mask):
    _store.capture = False
    inp = torch.cat([latents, latents], 0)
    emb = torch.cat([neg_emb, pos_emb], 0)
    msk = torch.cat([neg_mask, pos_mask], 0)
    tt = t.expand(inp.shape[0]) if torch.is_tensor(t) else torch.tensor([t]*inp.shape[0], device=device)
    out = pipe.transformer(inp, encoder_hidden_states=emb, encoder_attention_mask=msk,
                           timestep=tt, added_cond_kwargs=ADDED_COND, return_dict=False)[0]
    if pipe.transformer.config.out_channels // 2 == latents.shape[1]:
        out = out.chunk(2, dim=1)[0]
    noise_uncond, noise_text = out.chunk(2, 0)
    noise = noise_uncond + AE_GUID * (noise_text - noise_uncond)
    return pipe.scheduler.step(noise, t, latents, return_dict=False)[0]

def _excite_loss(pipe, latents, t, pos_emb, pos_mask, idxs, n_real):
    """One conditional forward (grad on latents) -> Attend-and-Excite loss.
    loss = max over subject tokens of (1 - max spatial attention), i.e. we push up
    the attention of the WORST-attended subject token."""
    _store.capture = True; _store.reset()
    tt = t.expand(latents.shape[0]) if torch.is_tensor(t) else torch.tensor([t], device=latents.device)
    pipe.transformer(latents, encoder_hidden_states=pos_emb, encoder_attention_mask=pos_mask,
                     timestep=tt, added_cond_kwargs=ADDED_COND, return_dict=False)
    _store.capture = False
    maps = _store.maps
    lo = int(len(maps) * AE_LAYER_FRAC[0])
    hi = max(lo + 1, int(len(maps) * AE_LAYER_FRAC[1]))
    m = torch.stack(maps[lo:hi], 0).mean(0)[0]           # [q_len, kv_len], middle blocks
    # Drop the trailing </s> BEFORE the x100 softmax. Measured on PixArt: the EOS
    # token soaks up ~91% of all cross-attention (subject words get ~1%). Feeding it
    # into the x100 sharpening makes the subject columns underflow to EXACTLY 0 in
    # fp32 (exp(1.2-93) ~ 1e-40), so loss pins at 1.0 and the gradient is exactly 0
    # -- guidance silently becomes a no-op. The original A&E drops CLIP's SOT/EOT for
    # this same reason; omitting that step here made the whole method do nothing.
    n_text = n_real - 1
    a = (m[:, :n_text].float() * 100.0).softmax(dim=-1)
    g = int(round(a.shape[0] ** 0.5))
    k = _GK.to(a.device, a.dtype)
    losses = []
    for j in idxs:
        if j >= n_text:
            continue
        att = a[:, j].reshape(1, 1, g, g)
        att = F.conv2d(F.pad(att, (1, 1, 1, 1), mode="reflect"), k)   # gaussian smooth
        losses.append(1.0 - att.max())
    return torch.stack(losses).max()

def _refine(pipe, latents, t, pos_emb, pos_mask, idxs, n_real, thr, step):
    """Paper's iterative refinement: keep updating the latent at this timestep until
    the weakest subject token's attention passes `thr` (or we hit the iter cap).
    THIS is the part the first draft omitted -- it did a single gradient step."""
    target = 1.0 - thr
    for _ in range(AE_MAX_REFINE):
        lat = latents.clone().detach().requires_grad_(True)
        loss = _excite_loss(pipe, lat, t, pos_emb, pos_mask, idxs, n_real)
        if float(loss) <= target:
            break
        latents = (lat - step * _step_dir(loss, lat)).detach()
    return latents

# Records (first_loss, last_loss) per guided image. The excite loss is
# 1 - max_spatial_attention of the worst subject token, so a working guidance must
# DRIVE THIS DOWN. If it stays flat while the latent is being pushed, the guidance is
# firing but has no purchase on the attention -- which is the mechanism we want to
# measure, not just infer from the binding score.
AE_TRACE = []

# When True, every guidance step keeps the excite gradient's MAGNITUDE but throws away its
# DIRECTION, substituting a random one. This is the control for the sweep: binding rose
# with guidance strength while the excite loss never fell (0.971 -> 0.967 at 10x force),
# so the gradient plausibly is not optimising attention at all, just displacing the latent.
# If a random direction of equal norm reproduces the gain, the gain is not attention
# guidance -- it is perturbation, and the sweep's dose-response is really dose-variance
# (std blew up 0.006 -> 0.082 across the ladder).
AE_RANDOM = False

def _step_dir(loss, lat):
    """The direction to move the latent: the excite gradient, or a norm-matched random
    vector when running the control."""
    grad = torch.autograd.grad(loss, lat)[0]
    if not AE_RANDOM:
        return grad
    r = torch.randn_like(grad)
    return r * (grad.norm() / (r.norm() + 1e-12))

def generate_ae(pipe, prompt, seed=1234):
    # prepare_latents' randn_tensor does device.type, so it needs a torch.device
    _dev = device if hasattr(device, "type") else torch.device(device)
    if AE_RANDOM:
        torch.manual_seed(seed)   # _step_dir's randn_like draws from the global RNG
    with torch.no_grad():
        (pos_emb, pos_mask, neg_emb, neg_mask) = pipe.encode_prompt(
            prompt, do_classifier_free_guidance=True, num_images_per_prompt=1, device=_dev)
        g = torch.Generator(device=_dev).manual_seed(seed)
        ch = pipe.transformer.config.in_channels
        latents = pipe.prepare_latents(1, ch, CFG.resolution, CFG.resolution,
                                       pos_emb.dtype, _dev, g)
    n_real = int(pos_mask[0].sum().item())        # real (non-padding) T5 tokens
    idxs = [j for j in _subject_token_indices(pipe, prompt) if j < n_real]
    pipe.scheduler.set_timesteps(AE_STEPS, device=_dev)
    ts = pipe.scheduler.timesteps
    scale_range = np.linspace(1.0, 0.5, len(ts))  # paper: step size decays over time
    _trace = []
    for i, t in enumerate(ts):
        if idxs and i < AE_MAX_ALTER:
            step = AE_SCALE * float(np.sqrt(scale_range[i]))
            if i in AE_THRESHOLDS:                # refine to threshold at these steps
                latents = _refine(pipe, latents, t, pos_emb, pos_mask, idxs,
                                  n_real, AE_THRESHOLDS[i], step)
            lat = latents.clone().detach().requires_grad_(True)
            loss = _excite_loss(pipe, lat, t, pos_emb, pos_mask, idxs, n_real)
            _trace.append(float(loss.detach()))
            if float(loss) > 0:
                latents = (lat - step * _step_dir(loss, lat)).detach()
        latents = _cfg_step(pipe, latents, t, neg_emb, pos_emb, neg_mask, pos_mask)
    if _trace:
        AE_TRACE.append((_trace[0], _trace[-1]))
    with torch.no_grad():
        img = pipe.vae.decode(latents / pipe.vae.config.scaling_factor, return_dict=False)[0]
    return pipe.image_processor.postprocess(img, output_type="pil")[0]

# ---- run A&E through the eval protocol (scorers off-GPU during generation) ----
def generate_all_ae():
    pipe = build_pipe(with_lora=False)          # frozen PixArt-alpha, NO LoRA
    pipe.transformer.enable_gradient_checkpointing()
    _install_capture(pipe.transformer)
    # smoke test: fail fast on ONE image (cheap) before the full 3-seed sweep.
    _smoke = generate_ae(pipe, prompts[0], seed=SEEDS[0])
    _smoke.save(os.path.join(GEN_DIR, "ae_smoke.png"))
    print("  A&E smoke image OK ->", prompts[0])
    per_seed = {}
    for s in SEEDS:
        per_seed[s] = [generate_ae(pipe, pr, seed=s) for pr in prompts]
        print(f"  generated A&E seed={s} ({len(prompts)} imgs)")
    del pipe; gc.collect(); torch.cuda.empty_cache()
    return per_seed

# %% [markdown]
# ## 11a. CHEAP PILOT: does the faithful A&E move binding at all?
# Screens the guidance config on a DEV split built from the TRAINING specs -- NOT on
# EVAL. Tuning a config on EVAL and then reporting EVAL numbers would be overfitting
# the test set, which is exactly the kind of flaw this study is meant to avoid.
#
# Small N + a single seed is for SCREENING ONLY. A promising delta here proves
# nothing: it is the same small-sample setup that produced the earlier "+8.9%"
# false positive. Anything promising MUST be confirmed with the full N=100 x 3-seed
# protocol on EVAL (cell 11b) before it goes anywhere near the paper.

# %%
N_PILOT    = 20
PILOT_SEED = 4242

DEV = [{"prompt": caption_of(sp["objs"], sp["spatial"]),
        "qa": [(f"What color is the {o['shape']}?", o["color"]) for o in sp["objs"]]}
       for sp in train_specs[:N_PILOT]]
dev_prompts = [e["prompt"] for e in DEV]

def _binding_on(images, items):
    correct = total = 0
    for img, e in zip(images, items):
        for q, a in e["qa"]:
            inp = blip_proc(img, q, return_tensors="pt").to(device)
            out = blip.generate(**inp, max_new_tokens=5)
            ans = blip_proc.decode(out[0], skip_special_tokens=True).lower()
            correct += int(a.lower() in ans); total += 1
    return correct / max(total, 1)

try:
    clip_model.to("cpu"); blip.to("cpu"); gc.collect(); torch.cuda.empty_cache()
    _p = build_pipe(with_lora=False)
    _p.transformer.enable_gradient_checkpointing()
    _install_capture(_p.transformer)   # baseline runs the SAME attention impl -> fair
    print(f"pilot: generating {N_PILOT} baseline images ...")
    _base = [generate(_p, pr, seed=PILOT_SEED) for pr in dev_prompts]
    print(f"pilot: generating {N_PILOT} A&E images ...")
    _ae = [generate_ae(_p, pr, seed=PILOT_SEED) for pr in dev_prompts]
    del _p; gc.collect(); torch.cuda.empty_cache()
    blip.to(device)
    _b0 = _binding_on(_base, DEV); _b1 = _binding_on(_ae, DEV)
    print("\n==== PILOT (dev split -- SCREENING ONLY, do NOT put in the paper) ====")
    print(f"N={N_PILOT}  seed={PILOT_SEED}")
    print(f"  baseline        AttrBinding = {_b0:.3f}")
    print(f"  A&E (faithful)  AttrBinding = {_b1:.3f}")
    print(f"  delta                         {_b1 - _b0:+.3f}")
    print("\ndelta clearly > 0 -> run cell 11b (full EVAL protocol) to get real numbers.")
    print("delta ~0 or < 0   -> A&E genuinely does not help here; report the null honestly.")
except Exception as _e:
    import traceback; traceback.print_exc()
    print("PILOT FAILED:", _e)
    try:
        clip_model.to(device); blip.to(device)
    except Exception:
        pass

# %% [markdown]
# ## 11c. DEV sweep of the guidance strength (why A&E has no purchase on PixArt)
#
# The full EVAL run put A&E at 0.470 +/- 0.015 vs a 0.480 +/- 0.022 baseline -- no
# effect. Before concluding that A&E cannot work here, rule out the boring explanation:
# that the guidance is simply too weak. At AE_SCALE=20 the latent moves only ~4% of its
# own std, so "no effect" could just mean "no force".
#
# This sweeps the force by 5x on a DEV split (never EVAL: tuning on the test set and then
# reporting it is precisely the failure this study exists to document). Screening only --
# a winner here would have to be re-confirmed on EVAL with the full N=100 x 3-seed run.
#
# The decisive number is NOT the binding score, it is `loss first -> last`. The excite
# loss is 1 - max_attention of the worst subject token, so working guidance must drive it
# down. Flat loss under 5x force = the attention is unreachable, which is a mechanistic
# result and not a tuning failure. Binding at N=40 x 2 seeds is far too noisy to read on
# its own -- the pilot already produced a +0.026 that evaporated.

# %%
SWEEP_N      = 40
SWEEP_SEEDS  = [4242, 5252]
# 200 extends the ladder because binding rose monotonically to scale=100 with CLIP flat
# (0.396 -> 0.394), i.e. no sign of the image damage that would cap the useful range yet.
# Four monotone points with CLIP intact is much harder to wave away as noise than three,
# and if 200 is where it breaks, that locates the peak -- also worth knowing.
# Images are cached on disk by scale, so re-running only generates the new rung.
SWEEP_SCALES = [20.0, 50.0, 100.0, 200.0]

SW = [{"prompt": caption_of(sp["objs"], sp["spatial"]),
       "qa": [(f"What color is the {o['shape']}?", o["color"]) for o in sp["objs"]]}
      for sp in train_specs[:SWEEP_N]]
sw_prompts = [e["prompt"] for e in SW]

SWEEP_DIR = os.path.join(GEN_DIR, "sweep"); os.makedirs(SWEEP_DIR, exist_ok=True)

def _bind_on(images, items):
    correct = total = 0
    for img, e in zip(images, items):
        for q, a in e["qa"]:
            inp = blip_proc(img, q, return_tensors="pt").to(device)
            out = blip.generate(**inp, max_new_tokens=5)
            ans = blip_proc.decode(out[0], skip_special_tokens=True).lower()
            correct += int(a.lower() in ans); total += 1
    return correct / max(total, 1)

def _sw_gen(p, tag, s, fn):
    from PIL import Image
    imgs = []
    for i, pr in enumerate(sw_prompts):
        fp = os.path.join(SWEEP_DIR, f"{tag}_s{s}_{i:03d}.png")
        if os.path.exists(fp):
            imgs.append(Image.open(fp).convert("RGB"))
        else:
            im = fn(p, pr, seed=s); im.save(fp); imgs.append(im); _store.reset()
    print(f"  {tag} seed={s} done ({len(imgs)})", flush=True)
    return imgs

try:
    clip_model.to("cpu"); blip.to("cpu"); gc.collect(); torch.cuda.empty_cache()
    _p = build_pipe(with_lora=False)
    _p.transformer.enable_gradient_checkpointing()
    _p.vae.enable_slicing(); _p.vae.enable_tiling()
    _install_capture(_p.transformer)

    _sw_imgs = {"baseline": [im for s in SWEEP_SEEDS for im in _sw_gen(_p, "base", s, generate)]}
    _sw_loss = {}
    for sc in SWEEP_SCALES:
        AE_SCALE = sc                       # generate_ae reads this global
        AE_TRACE.clear()
        _sw_imgs[f"scale={sc:g}"] = [im for s in SWEEP_SEEDS
                                     for im in _sw_gen(_p, f"ae{sc:g}", s, generate_ae)]
        _sw_loss[f"scale={sc:g}"] = list(AE_TRACE)
    del _p; gc.collect(); torch.cuda.empty_cache()

    blip.to(device)
    _items = SW * len(SWEEP_SEEDS)
    print(f"\n==== DEV SWEEP (N={SWEEP_N} x {len(SWEEP_SEEDS)} seeds -- SCREENING ONLY) ====")
    print(f"{'config':<14}{'AttrBinding':>13}{'loss first':>13}{'loss last':>12}{'drop':>9}")
    _sw_res = {}
    for k, ims in _sw_imgs.items():
        b = _bind_on(ims, _items)
        tr = _sw_loss.get(k)
        if tr:
            f0 = sum(x[0] for x in tr) / len(tr); f1 = sum(x[1] for x in tr) / len(tr)
            print(f"{k:<14}{b:>13.3f}{f0:>13.4f}{f1:>12.4f}{f0 - f1:>9.4f}")
            _sw_res[k] = {"binding": b, "loss_first": f0, "loss_last": f1}
        else:
            print(f"{k:<14}{b:>13.3f}{'--':>13}{'--':>12}{'--':>9}")
            _sw_res[k] = {"binding": b}
    json.dump(_sw_res, open(os.path.join(CFG.work_dir, "results_sweep.json"), "w"), indent=2)
    print("\nsaved -> results_sweep.json")
    print("loss barely drops as scale grows -> guidance has no purchase on PixArt's")
    print("cross-attention (the ~91%-EOS finding), i.e. a mechanism, not weak tuning.")
    AE_SCALE = 20.0                         # restore the paper's reported setting
except Exception as _e:
    import traceback; traceback.print_exc(); print("SWEEP FAILED:", _e)
    AE_SCALE = 20.0
    try:
        clip_model.to(device); blip.to(device)
    except Exception:
        pass

# %% [markdown]
# ## 11d. Did the sweep buy binding, or just wreck the image?
#
# Cell 11c measured binding but NOT CLIP, which leaves its headline (binding rising
# 0.475 -> 0.506 as guidance goes 20 -> 100) uninterpretable. At scale=100 the latent is
# pushed hard, and a degraded image can raise BLIP-VQA accuracy by accident while the
# picture stops matching the prompt -- exactly what the LoRA arm did (binding 0.427 with
# CLIP collapsed 0.389 -> 0.262). A binding gain paid for with CLIP is not a gain.
#
# Re-scores the images already on disk, so this costs minutes, not another GPU-hour --
# and it must clear before spending ~4h confirming any scale on EVAL. Also reports
# per-seed mean +/- std, since 11c printed a single pooled number that hid the spread.

# %%
try:
    from PIL import Image
    clip_model.to(device); blip.to(device); gc.collect(); torch.cuda.empty_cache()

    def _load_sw(tag, s):
        return [Image.open(os.path.join(SWEEP_DIR, f"{tag}_s{s}_{i:03d}.png")).convert("RGB")
                for i in range(len(sw_prompts))]

    print(f"==== DEV SWEEP re-scored, N={SWEEP_N} x {len(SWEEP_SEEDS)} seeds (SCREENING) ====")
    print(f"{'config':<12}{'AttrBinding':>22}{'CLIP':>20}")
    _sw_full = {}
    for _tag, _name in [("base", "baseline"), ("ae20", "scale=20"),
                        ("ae50", "scale=50"), ("ae100", "scale=100"),
                        ("ae200", "scale=200")]:
        _bs, _cs = [], []
        for s in SWEEP_SEEDS:
            _ims = _load_sw(_tag, s)
            _bs.append(_bind_on(_ims, SW))
            _cs.append(clip_score(_ims, sw_prompts))
        _m1, _s1 = _mstd(_bs); _m2, _s2 = _mstd(_cs)
        print(f"{_name:<12}{_m1:>12.3f} +/- {_s1:.3f}{_m2:>12.3f} +/- {_s2:.3f}")
        _sw_full[_name] = {"binding": _bs, "clip": _cs}
    json.dump(_sw_full, open(os.path.join(CFG.work_dir, "results_sweep_clip.json"), "w"),
              indent=2)
    print("\nsaved -> results_sweep_clip.json")
    print("CLIP holds while binding climbs -> real candidate, confirm on EVAL.")
    print("CLIP falls with binding        -> the 'gain' is image damage, same as LoRA.")
except Exception as _e:
    import traceback; traceback.print_exc(); print("RESCORE FAILED:", _e)

# %% [markdown]
# ## 11e. CONTROL: is the gain attention guidance, or just perturbation?
#
# The sweep looks like a dose-response (binding 0.481 -> 0.538 as scale goes 20 -> 200,
# CLIP flat) but two facts undercut it: the excite loss never falls (0.971 -> 0.967 at
# 10x force), and the seed spread explodes along the same ladder (0.006 -> 0.082). A
# gradient that does not reduce its own objective is not optimising anything; it may just
# be displacing the latent, in which case the ladder is dose-VARIANCE and the rising mean
# is BLIP's asymmetric error under a wider image distribution.
#
# So run the ladder again with the gradient's direction replaced by a random one of the
# same norm -- identical steps, schedule, refinement and magnitude, differing only in
# whether the direction carries attention information. If random reproduces the gain, the
# gain is not attention guidance, and no amount of EVAL confirmation would make it one.
#
# This has to clear BEFORE spending ~4h confirming any scale on EVAL: without it a win on
# EVAL would be uninterpretable, and reporting it as attention guidance could be flatly
# false.

# %%
try:
    clip_model.to("cpu"); blip.to("cpu"); gc.collect(); torch.cuda.empty_cache()
    _p = build_pipe(with_lora=False)
    _p.transformer.enable_gradient_checkpointing()
    _p.vae.enable_slicing(); _p.vae.enable_tiling()
    _install_capture(_p.transformer)

    AE_RANDOM = True                    # _step_dir now discards the gradient direction
    for sc in [100.0, 200.0]:
        AE_SCALE = sc
        for s in SWEEP_SEEDS:
            _sw_gen(_p, f"rand{sc:g}", s, generate_ae)
    AE_RANDOM = False; AE_SCALE = 20.0
    del _p; gc.collect(); torch.cuda.empty_cache()

    clip_model.to(device); blip.to(device)
    print("\n==== CONTROL: excite gradient vs norm-matched random direction ====")
    print(f"N={SWEEP_N} x {len(SWEEP_SEEDS)} seeds (DEV, screening)")
    print(f"{'config':<18}{'AttrBinding':>22}{'CLIP':>20}")
    _ctrl = {}
    for _tag, _name in [("base", "baseline"),
                        ("ae100", "A&E scale=100"), ("rand100", "random scale=100"),
                        ("ae200", "A&E scale=200"), ("rand200", "random scale=200")]:
        _bs, _cs = [], []
        for s in SWEEP_SEEDS:
            _ims = _load_sw(_tag, s)
            _bs.append(_bind_on(_ims, SW))
            _cs.append(clip_score(_ims, sw_prompts))
        _m1, _s1 = _mstd(_bs); _m2, _s2 = _mstd(_cs)
        print(f"{_name:<18}{_m1:>12.3f} +/- {_s1:.3f}{_m2:>12.3f} +/- {_s2:.3f}")
        _ctrl[_name] = {"binding": _bs, "clip": _cs}
    json.dump(_ctrl, open(os.path.join(CFG.work_dir, "results_control.json"), "w"), indent=2)
    print("\nsaved -> results_control.json")
    print("random ~= A&E -> the gain is perturbation, not attention guidance.")
    print("A&E >> random -> a real directional effect; confirm that scale on EVAL.")
except Exception as _e:
    import traceback; traceback.print_exc(); print("CONTROL FAILED:", _e)
    AE_RANDOM = False; AE_SCALE = 20.0
    try:
        clip_model.to(device); blip.to(device)
    except Exception:
        pass

# %% [markdown]
# ## 11b. FULL A&E evaluation on EVAL (only worth running if the pilot moved)
#
# The baseline is REGENERATED here rather than reused from cell 8. Cell 8 ran without
# VAE tiling; A&E needs tiling to fit in 15GB. Tiling perturbs the decoded image enough
# to move binding by ~0.025 on the dev split -- the same magnitude as the effect we are
# measuring. Comparing a tiled A&E against an untiled baseline would therefore bake an
# artifact the exact size of the claim into the result. Both arms run through the same
# pipe with identical VAE settings.
#
# Images are written to disk as they are generated and re-read if already present: a
# 3-4h run that loses its kernel (Kaggle reaps sessions) resumes instead of restarting.

# %%
RUN_DIR = os.path.join(GEN_DIR, "fullrun"); os.makedirs(RUN_DIR, exist_ok=True)

def _gen_seed(p, tag, s, fn):
    from PIL import Image
    imgs = []
    for i, pr in enumerate(prompts):
        fp = os.path.join(RUN_DIR, f"{tag}_s{s}_{i:03d}.png")
        if os.path.exists(fp):
            imgs.append(Image.open(fp).convert("RGB"))
        else:
            im = fn(p, pr, seed=s); im.save(fp); imgs.append(im); _store.reset()
            if i % 10 == 0:
                print(f"  {tag} seed={s} {i}/{len(prompts)}", flush=True)
    print(f"  {tag} seed={s} DONE", flush=True)
    return imgs

try:
    clip_model.to("cpu"); blip.to("cpu"); gc.collect(); torch.cuda.empty_cache()
    _p = build_pipe(with_lora=False)          # frozen PixArt-alpha, NO LoRA
    _p.transformer.enable_gradient_checkpointing()
    _p.vae.enable_slicing(); _p.vae.enable_tiling()
    _install_capture(_p.transformer)

    gen_base2 = {s: _gen_seed(_p, "base", s, generate)    for s in SEEDS}
    gen_ae2   = {s: _gen_seed(_p, "ae",   s, generate_ae) for s in SEEDS}
    del _p; gc.collect(); torch.cuda.empty_cache()

    clip_model.to(device); blip.to(device)
    bc, ba = score_seeds(gen_base2)
    ac, aa = score_seeds(gen_ae2)
    print("\n==== FULL EVAL (identical VAE config, N=100, 3 seeds) ====")
    print(f"{'Method':<22}{'AttrBinding':>22}{'CLIP':>18}")
    for nm, at, ct in [("PixArt-a baseline", ba, bc), ("A&E (ours)", aa, ac)]:
        m1, s1 = _mstd(at); m2, s2 = _mstd(ct)
        print(f"{nm:<22}{m1:>12.3f} +/- {s1:.3f}{m2:>10.3f} +/- {s2:.3f}")
    json.dump({"baseline_retimed": {"attr": ba, "clip": bc},
               "ae_fixed": {"attr": aa, "clip": ac}},
              open(os.path.join(CFG.work_dir, "results_ae_fixed.json"), "w"), indent=2)
    print("saved -> results_ae_fixed.json")
except Exception as _e:
    import traceback; traceback.print_exc(); print("FAILED:", _e)
    try:
        clip_model.to(device); blip.to(device)
    except Exception:
        pass

# %% [markdown]
# ## 12. FINAL overnight run: guidance vs its own control, on EVAL
#
# One self-contained cell. Everything before it was screening; these are the numbers the
# paper reports.
#
# What the screening established. The excite loss never falls -- 0.971 at scale=20,
# 0.967 at scale=200, i.e. a 10x stronger push moves the worst subject token's attention
# from ~2.9% to ~3.3%. Cross-attention in PixArt-alpha is dominated by the trailing </s>
# token (~91% of the mass), so there is almost nothing for the subject columns to win.
# A gradient that cannot reduce its own objective is not optimising anything. Yet DEV
# binding rose monotonically (0.481 -> 0.475 -> 0.494 -> 0.506 -> 0.538) with CLIP flat
# (~0.395), which looks exactly like a working method.
#
# The catch is that seed spread rose along the same ladder: 0.000 -> 0.006 -> 0.013 ->
# 0.013 -> 0.082. At scale=200 the two seeds land ~0.456 and ~0.620. That is the profile
# of injected noise, not of an optimiser: the latent is displaced, the image distribution
# widens, and BLIP's asymmetric errors drag the mean up. Dose-response and dose-variance
# are indistinguishable from the A&E arm alone.
#
# Hence the control: rerun each scale with the gradient's DIRECTION replaced by a random
# one of identical norm (`AE_RANDOM`), holding steps, schedule, refinement and magnitude
# fixed. The arms are paired at matched scale, so the table answers its own question --
# if random tracks A&E, the effect is perturbation and no EVAL win would make it
# attention guidance.
#
# Both scales are carried because DEV cannot choose between them honestly: 200 has the
# better mean, 100 the only trustworthy variance. Picking one post hoc on the strength of
# its mean is how the earlier +8.9% (N=50, one seed) and +0.026 (N=20, one seed) false
# positives happened.
#
# Baseline images are reused from cell 11b when /fullrun survived (Kaggle clears
# /kaggle/working between sessions), else regenerated identically. All arms share one
# pipe with VAE tiling on, since tiling alone shifts binding ~0.025 -- the size of the
# effect being measured.
#
# ~1200 new images at the ~19s/image the sweep measured is ~6.5h, inside Kaggle's 12h.
# Every image is written as it is made and re-read if present, so a reaped kernel costs
# the current image, not the night: rerun 0-1-2-6-9b-11-12 and it resumes.

# %%
FINAL_DIR = os.path.join(GEN_DIR, "final");   os.makedirs(FINAL_DIR, exist_ok=True)
FULL_DIR  = os.path.join(GEN_DIR, "fullrun")  # cell 11b's baseline, if it survived

# (tag, random_direction, scale)
FINAL_ARMS = [("ae100",   False, 100.0), ("rand100", True, 100.0),
              ("ae200",   False, 200.0), ("rand200", True, 200.0)]

def _final_gen(p, tag, s, fn):
    from PIL import Image
    imgs = []
    for i, pr in enumerate(prompts):
        got = None
        for d in (FINAL_DIR, FULL_DIR):                 # reuse 11b's baseline if present
            fp = os.path.join(d, f"{tag}_s{s}_{i:03d}.png")
            if os.path.exists(fp):
                got = Image.open(fp).convert("RGB"); break
        if got is None:
            got = fn(p, pr, seed=s)
            got.save(os.path.join(FINAL_DIR, f"{tag}_s{s}_{i:03d}.png")); _store.reset()
            if i % 25 == 0:
                print(f"  {tag} s={s} {i}/{len(prompts)}", flush=True)
        imgs.append(got)
    print(f"  {tag} s={s} DONE", flush=True)
    return imgs

try:
    clip_model.to("cpu"); blip.to("cpu"); gc.collect(); torch.cuda.empty_cache()
    _p = build_pipe(with_lora=False)
    _p.transformer.enable_gradient_checkpointing()
    _p.vae.enable_slicing(); _p.vae.enable_tiling()
    _install_capture(_p.transformer)

    _sets = {}
    print("=== baseline ===", flush=True)
    _sets["PixArt-a baseline"] = {s: _final_gen(_p, "base", s, generate) for s in SEEDS}
    for _tag, _rnd, _sc in FINAL_ARMS:
        AE_RANDOM, AE_SCALE = _rnd, _sc
        _label = f"{'random' if _rnd else 'A&E'} scale={_sc:g}"
        print(f"=== {_label} ===", flush=True)
        _sets[_label] = {s: _final_gen(_p, _tag, s, generate_ae) for s in SEEDS}
    AE_RANDOM = False; AE_SCALE = 20.0
    del _p; gc.collect(); torch.cuda.empty_cache()

    clip_model.to(device); blip.to(device)
    print("\nscoring ...", flush=True)
    _final = {}
    for _label, _per_seed in _sets.items():
        _bs = [attr_binding(_per_seed[s]) for s in SEEDS]
        _cs = [clip_score(_per_seed[s], prompts) for s in SEEDS]
        _final[_label] = {"binding": _bs, "clip": _cs}
    json.dump(_final, open(os.path.join(CFG.work_dir, "results_final.json"), "w"), indent=2)

    print(f"\n==== FINAL (EVAL, N={len(EVAL)} x {len(SEEDS)} seeds) ====")
    print(f"{'arm':<20}{'AttrBinding':>22}{'CLIP':>20}")
    for _label, r in _final.items():
        _m1, _s1 = _mstd(r["binding"]); _m2, _s2 = _mstd(r["clip"])
        print(f"{_label:<20}{_m1:>12.3f} +/- {_s1:.3f}{_m2:>12.3f} +/- {_s2:.3f}")
    print("\nsaved -> results_final.json")
    print("Read the A&E/random PAIR at each scale, not either arm against baseline:")
    print("  random tracks A&E -> the gain is perturbation; A&E's mechanism is absent.")
    print("  A&E clearly above random and above its own seed std -> a real effect.")
except Exception as _e:
    import traceback; traceback.print_exc(); print("FINAL RUN FAILED:", _e)
    AE_RANDOM = False; AE_SCALE = 20.0
    try:
        clip_model.to(device); blip.to(device)
    except Exception:
        pass
