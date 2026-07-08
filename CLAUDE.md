# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**NAP Management** — an Electron desktop app (Vietnamese UI) for an accounting firm to manage client companies, employees, and monthly service-fee payments. TypeScript throughout: React renderer + tRPC/Prisma backend running in the Electron main process.

> Note: `.github/copilot-instructions.md` and `DATABASE_SETUP.md` are **stale** — they describe a SQL Server DB with Vietnamese-named Prisma models (`DanhMucKhachHang`) that no longer exist. The live schema is **SQLite** with English models (`Employee`, `Company`, `CompanyEmployee`, `Payment`). Treat `electron/` and `prisma/schema.prisma` as authoritative.

## Commands

```sh
npm run dev          # Vite + Electron with hot reload (dev)
npm run build        # prisma generate + tsc + vite build + copy engines + install-mac-engines + electron-builder (cross-platform installer)
npm run build-win    # Windows-focused build; same chain as build (install-mac-engines is a no-op off macOS)
npm test             # vitest run (pretest builds with --mode=test); only test is test/e2e.spec.ts (Playwright-driven Electron e2e)
npm run seed         # tsx scripts/seedData.ts  (seed:reset to wipe first)
```

- **Single test**: `npx vitest run test/e2e.spec.ts` or `npx vitest run -t "<name>"`.
- **No lint/ESLint/Prettier config exists.** Type-checking is via `tsc` (part of `build`). CI only lints Markdown, and does **not** run the Vitest suite.
- **After editing `prisma/schema.prisma`**: run `npx prisma generate` (writes to the non-default `generated/client`, not `node_modules/.prisma`). To create a migration: `npx prisma migrate dev --name <name>`, then bump the `latestMigration` constant in `electron/constants.ts`.

## Architecture

### tRPC over Electron IPC (no HTTP server)
The single most important pattern. tRPC requests are marshalled over Electron IPC, not HTTP:

1. Renderer calls `useQuery(trpc.<proc>.queryOptions(input))` / `useMutation(trpc.<proc>.mutationOptions())` (TanStack Query + tRPC proxy).
2. `src/utils/trpc.ts` builds the client with `httpBatchLink({ url: "/trpc" })` but **overrides `fetch`** to package the request as an `IpcRequest` and call `window.appApi.trpc(req)`, then fakes a `Response` from the returned JSON.
3. `electron/preload/index.ts` exposes `appApi.trpc = (req) => ipcRenderer.invoke("trpc", req)` via `contextBridge`.
4. `electron/main/index.ts` `ipcMain.handle("trpc", ...)` → `electron/main/ipcRequestHandler.ts` builds a synthetic `Request` (fake `https://electron` origin so the URL parses), strips the `/trpc` prefix, and calls tRPC's `resolveResponse` against `appRouter`.

Type safety is end-to-end: `src/utils/trpc.ts` imports the `AppRouter` type directly from `electron/router.ts`. **`superjson` is the transformer on both client and server** — keep them matched.

### Backend (Prisma + tRPC)
- `electron/router.ts` — one **flat** `appRouter` (no sub-routers). Zod-validated procedures grouped by domain: Company (`companies`, `companiesWithPayments`, `companyById`, `create/update/deleteCompany`), Employee (`employees`, `employeeById`, `create/update/deleteEmployee`), assignments (`companyEmployees`, `assign/removeEmployeeFromCompany`), Payment (`payments`, `create/update/deletePayment`), and `bulkCreatePayments` (skips existing company/month/year, pre-fills `amount` from `serviceFee`). `createContext` returns `{}` — no auth.
- `prisma/schema.prisma` — **SQLite**, client output to `generated/client`. Models: `Company` (taxId unique, serviceFee), `Employee`, `CompanyEmployee` join with `EmployeeRole` enum (`LAP_SO`/`NHAP_SO_LIEU`/`DICH_VU_KH`), `Payment` (unique on `companyId+month+year`, optional `amount`/`collectionDate`). FKs cascade-delete.
- `electron/prisma.ts` — exports a **mutable `prisma` singleton**. `applyDatabaseConfig()` disconnects and recreates the client to switch DBs at runtime; `testDatabaseConnection()` runs `SELECT 1` on a throwaway client. `PrismaClient` is built with an undocumented `__internal.engine.binaryPath` pointing at the platform query engine.

### DB config & startup migrations (non-obvious)
- `electron/constants.ts` resolves `dbUrl` at import time: dev uses `.env DATABASE_URL`; else reads `database-config.json` in Electron `userData`; else defaults to `nap-management.db` in `userData`. Config shape is `{ filePath }` → `file:<path>`.
- **Migrations run automatically on startup**: `app.whenReady()` → `ensureMigrationsApplied()` **forks** `node_modules/prisma/build/index.js` with `migrate deploy` (Prisma has no programmatic migration API), passing engine binary paths (`mePath`/`qePath`) via env vars.
- Prisma engines ship as electron-builder `extraResources` and are located per-platform in `constants.ts` (`platformToExecutables`). `scripts/copy-prisma-engines.js` rewrites the generated client's `process.cwd()` to `app.getAppPath()` and copies engines into the build.
- The DB settings UI (`src/components/DatabaseConfigModal.tsx`) calls `appApi` DB methods **directly, not via tRPC** (`load/save/test-database-config`, `select-db-file`, `restart-app`).

### Frontend
- `src/App.tsx` — `HashRouter` (required for Electron `file://`) with a single `/` route → `Main`. **Navigation is NOT router-based**: `src/pages/Main.tsx` uses `useState('activeView')` + a `switch`. `NavigationMenu` calls `onItemClick(id)`; id `"database-config"` opens the config modal instead of switching views.
- Pages (`src/pages/`): `DanhMucKhachHang` (companies), `DanhMucNhanVien` (employees), `PaymentList`, `QuanLyTienThu` (collections), `ThongKePhieuThu` (payment stats).
- **State**: no Redux/Zustand. Server state = TanStack Query via the tRPC proxy (shared `queryClient` singleton from `src/utils/trpc.ts`); local UI state = `useState`.
- **AG Grid Enterprise** is the primary data surface (registered globally in `src/main.tsx` with AG Charts Enterprise). `src/utils/gridConfig.ts` centralizes `DEFAULT_GRID_OPTIONS` (Vietnamese locale, pagination), per-page presets (`PAGE_GRID_OPTIONS.{masterData,detail,modal}`), shared `CELL_RENDERERS` (VND currency, `vi-VN` dates, status badges), and `COMMON_COLUMNS`. The actions column uses a global `window.agGridActionHandler` callback.
- **Excel import/export** via `xlsx` in `src/utils/excelUtils.ts` (`parseExcelFile`, `validateImportData`, `exportToExcel`, `exportTienThuPivot` 12-month matrix, `exportTienThuList`), driven by `ImportModal` and `BulkPaymentModal`.

## Conventions (from copilot-instructions, still valid)
- Use **AG Grid Enterprise** for tables; **TailwindCSS** for styling; `lucide-react` for icons.
- Event handlers prefixed `handle*`; early returns for loading/error. Loading/error UI is Vietnamese: `Đang tải...` / `Lỗi: {error.message}`.

### Adding a new business entity/feature
1. Model in `prisma/schema.prisma` → `npx prisma generate` (+ migration, bump `latestMigration`).
2. Procedure(s) in `electron/router.ts` (Zod input, call `prisma`).
3. Page in `src/pages/`, wire into the `switch` in `Main.tsx` and the menu in `NavigationMenu.tsx`.
4. Renderer imports the `AppRouter` type from `electron/router.ts` and Prisma model types from `generated/client` — no manual DTOs.

## Key files
- IPC/tRPC: `src/utils/trpc.ts`, `electron/preload/index.ts`, `electron/main/index.ts`, `electron/main/ipcRequestHandler.ts`, `electron/api.d.ts`
- Backend: `electron/router.ts`, `electron/prisma.ts`, `electron/constants.ts`, `prisma/schema.prisma`
- Frontend shell: `src/main.tsx`, `src/App.tsx`, `src/pages/Main.tsx`, `src/components/NavigationMenu.tsx`
- Shared utils: `src/utils/gridConfig.ts`, `src/utils/excelUtils.ts`
- Build: `vite.config.ts`, `electron-builder.json`, `scripts/copy-prisma-engines.js`
