import { initTRPC } from "@trpc/server";
import { prisma } from "./prisma";
import * as z from "zod";
// HACK: The `superjson` library is ESM-only (does not support CJS), while our codebase is CJS.
// This is a workaround to still get to use the latest version of the library from our codebase.
// https://github.com/blitz-js/superjson/issues/268
// https://www.npmjs.com/package/fix-esm
// eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-unsafe-assignment
// const fixESM = require("fix-esm");
import SuperJSON from "superjson";
// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment
// const superjson: SuperJSON = fixESM.require("superjson");

const t = initTRPC.create({
  transformer: SuperJSON,
});

export const appRouter = t.router({
  danhMucKhachHang: t.procedure.query(() => {
    return prisma.danhMucKhachHang.findMany();
  }),
  updateKhachHang: t.procedure
    .input(
      z.object({
        id: z.number(),
        data: z.object({
          tenKhachHang: z.string().optional(),
          maSoThue: z.string().optional(),
          diaChi: z.string().nullable().optional(),
          phiDichVu: z.number().nullable().optional(),
          kyKhaiThue: z.string().nullable().optional(),
          kyNhanCT: z.string().nullable().optional(),
          dienThoai: z.string().nullable().optional(),
          email: z.string().nullable().optional(),
          nganhKD: z.string().nullable().optional(),
          cqtQuanLy: z.string().nullable().optional(),
          trangThai: z.string().nullable().optional(),
          giamDoc: z.string().nullable().optional(),
          nhanVienDVKH: z.string().nullable().optional(),
          nhanVienLapSo: z.string().nullable().optional(),
          trangThaiHoatDong: z.string().nullable().optional(),
          nhanVienDVKHId: z.number().nullable().optional(),
          nhanVienLapSoId: z.number().nullable().optional(),
          nhanVienNSLId: z.number().nullable().optional(),
          nhanVienNSL: z.string().nullable().optional(),
        }),
      })
    )
    .mutation(({ input }) => {
      return prisma.danhMucKhachHang.update({
        where: {
          id: input.id,
        },
        data: input.data,
      });
    }),
  khachHangById: t.procedure
    .input(
      z.object({
        id: z.number(),
      })
    )
    .query(({ input }) => {
      return prisma.danhMucKhachHang.findUnique({
        where: {
          id: input.id,
        },
      });
    }),
  khachHangByNhanVien: t.procedure
    .input(
      z.object({
        nhanVienId: z.number(),
        nhanVienType: z.enum(["DVKH", "LAPSO", "NSL"]),
      })
    )
    .query(({ input }) => {
      if (input.nhanVienType === "DVKH") {
        return prisma.danhMucKhachHang.findMany({
          where: {
            nhanVienDVKHId: input.nhanVienId,
          },
        });
      } else if (input.nhanVienType === "LAPSO") {
        return prisma.danhMucKhachHang.findMany({
          where: {
            nhanVienLapSoId: input.nhanVienId,
          },
        });
      } else if (input.nhanVienType === "NSL") {
        return prisma.danhMucKhachHang.findMany({
          where: {
            nhanVienNSLId: input.nhanVienId,
          },
        });
      }
    }),
  danhMucNhanVien: t.procedure.query(() => {
    return prisma.danhMucNhanVien.findMany();
  }),
  updateNhanVien: t.procedure
    .input(
      z.object({
        id: z.number(),
        data: z.object({
          maSoNhanVien: z.string().optional(),
          tenNhanVien: z.string().optional(),
          namSinh: z.date().optional(),
          dienThoai: z.string().optional(),
          thuongTru: z.string().optional(),
          userDangNhap: z.string().optional(),
        }),
      })
    )
    .mutation(({ input }) => {
      return prisma.danhMucNhanVien.update({
        where: {
          id: input.id,
        },
        data: input.data,
      });
    }),

  nhanVienById: t.procedure
    .input(
      z.object({
        id: z.number(),
      })
    )
    .query(({ input }) => {
      return prisma.danhMucNhanVien.findUnique({
        where: {
          id: input.id,
        },
      });
    }),
  danhMucCongViec: t.procedure.query(() => {
    return prisma.danhMucCongViec.findMany();
  }),
  updateCongViec: t.procedure
    .input(
      z.object({
        id: z.number(),
        data: z.object({
          ten: z.string().optional(),
          moTa: z.string().nullable().optional(),
        }),
      })
    )
    .mutation(({ input }) => {
      return prisma.danhMucCongViec.update({
        where: {
          id: input.id,
        },
        data: input.data,
      });
    }),
  congViecById: t.procedure
    .input(
      z.object({
        id: z.number(),
      })
    )
    .query(({ input }) => {
      return prisma.danhMucCongViec.findUnique({
        where: {
          id: input.id,
        },
      });
    }),
  chiPhiCongViec: t.procedure.query(() => {
    return prisma.chiPhiCongViec.findMany();
  }),
  phieuChi: t.procedure.query(() => {
    return prisma.phieuChi.findMany();
  }),
  phieuThu: t.procedure.query(() => {
    return prisma.phieuThu.findMany();
  }),
  phieuThuByKhachHang: t.procedure
    .input(
      z.object({
        khachHangId: z.number(),
      })
    )
    .query(({ input }) => {
      return prisma.phieuThu.findMany({
        where: {
          khachHangId: input.khachHangId,
        },
      });
    }),
  nghiemThuCongViec: t.procedure.query(() => {
    return prisma.nghiemThuCongViec.findMany();
  }),
  quanLyPhiDichVu: t.procedure.query(() => {
    return prisma.quanLyPhiDichVu.findMany();
  }),
});

export type AppRouter = typeof appRouter;
