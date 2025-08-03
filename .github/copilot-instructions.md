# NAP Management - AI Coding Assistant Instructions

## Architecture Overview

**NAP Management** is an Electron desktop application for Vietnamese business management, built with:
- **Frontend**: React + TypeScript + TailwindCSS + Vite
- **Backend**: tRPC + Prisma + SQL Server
- **Communication**: Custom IPC bridge for Electron-tRPC integration
- **UI Components**: AG Grid Enterprise for data tables

## Key Communication Patterns

### tRPC-over-IPC Architecture
The app uses a unique tRPC-over-IPC pattern to enable type-safe database queries in Electron:

1. **Frontend queries**: `trpc.danhMucKhachHang.useQuery()` in React components
2. **Custom fetch**: `src/utils/trpc.ts` overrides fetch to send requests over Electron IPC
3. **IPC bridge**: `electron/main/ipcRequestHandler.ts` converts IPC to tRPC calls
4. **Database layer**: `electron/router.ts` contains all tRPC procedures using Prisma

```typescript
// Frontend usage pattern
const { data: khachHangList } = useQuery(trpc.danhMucKhachHang.queryOptions());

// Backend procedure in electron/router.ts
danhMucKhachHang: t.procedure.query(() => prisma.danhMucKhachHang.findMany())
```

### Vietnamese Business Domain
The app manages Vietnamese business entities:
- `DanhMucKhachHang` (Customer Directory)
- `DanhMucNhanVien` (Employee Directory) 
- `DanhMucCongViec` (Job Directory)
- `ChiPhiCongViec` (Job Costs)

Page components follow the pattern: `src/pages/DanhMuc*.tsx`

## Development Conventions

### Frontend Standards
- **Always use AG Grid Enterprise** (not community version) for data tables
- **TailwindCSS only** for styling - avoid CSS files or inline styles
- **Event handlers**: Prefix with `handle` (e.g., `handleClick`, `handleSubmit`)
- **Early returns**: Use for conditional rendering and error states
- **Accessibility**: Include `tabIndex="0"`, `aria-label` on interactive elements

### Database & Prisma
- **Custom Prisma setup**: Uses `generated/client` output directory for Electron compatibility
- **Engine paths**: Platform-specific query engines in `electron/constants.ts`
- **Migration pattern**: Update `latestMigration` constant when creating migrations
- **Database**: SQL Server with Vietnamese field names (e.g., `TenKhachHang`, `MaSoThue`)

### Type Safety
- IPC communication typed via `electron/api.d.ts`
- Global `window.appApi` provides typed Electron APIs
- SuperJSON handles serialization for complex types across IPC boundary

## Essential Commands

```bash
# Development with hot reload
npm run dev

# Build for production  
npm run build

# Database migrations (update latestMigration constant first)
npx prisma migrate dev --name migration_name

# Generate Prisma client after schema changes
npx prisma generate
```

## Project-Specific Patterns

### Adding New Business Entities
1. Add Prisma model to `prisma/schema.prisma`
2. Create tRPC procedure in `electron/router.ts`
3. Add page component in `src/pages/DanhMuc*.tsx`
4. Update navigation in `src/components/NavigationMenu.tsx`

### Error Handling Pattern
```typescript
if (isLoading) return <div>Đang tải...</div>;
if (error) return <div className="text-red-500">Lỗi: {error.message}</div>;
```

### Data Table Integration
Components use AG Grid Enterprise with custom cell renderers for status badges and progress bars. See `src/components/DataTable.tsx` for the standard pattern.

## Critical Files for Architecture Changes
- `electron/router.ts` - All database procedures
- `electron/prisma.ts` - Database connection and migration logic  
- `src/utils/trpc.ts` - IPC-tRPC bridge configuration
- `electron/main/ipcRequestHandler.ts` - IPC request handling
- `prisma/schema.prisma` - Database schema

NAP Management Electron application with React frontend and Prisma database integration

```tree
├── electron                                 Electron-related code
│   ├── main                                 Main-process source code
│   │   ├── index.ts                        Entry point for Electron main process
│   │   ├── ipcRequestHandler.ts            Handles IPC requests between main and renderer
│   │   └── update.ts                       Auto-updater functionality
│   ├── preload                             Preload-scripts source code
│   │   └── index.ts                        Preload script for secure IPC communication
│   ├── api.d.ts                            TypeScript definitions for IPC API
│   ├── constants.ts                        Application constants and configuration
│   ├── electron-env.d.ts                   Electron environment type definitions
│   ├── prisma.ts                           Prisma client configuration and database setup
│   └── router.ts                           tRPC router with database procedures
│
├── prisma                                   Database schema and migrations
│   ├── schema.prisma                       Prisma database schema definition
│   └── migrations                          Database migration files
│       └── 0_init                          Initial database migration
│           └── migration.sql               SQL migration script
│
├── generated                               Generated Prisma client
│   └── client                              Auto-generated Prisma client code
│       ├── index.js                        Main Prisma client export
│       ├── index.d.ts                      TypeScript definitions for Prisma client
│       ├── libquery_engine-darwin-arm64.dylib.node  Query engine binary for macOS ARM64
│       ├── package.json                    Prisma client package configuration
│       ├── schema.prisma                   Copy of schema for client generation
│       └── runtime                         Prisma client runtime files
│
├── src                                     Renderer source code (React application)
│   ├── main.tsx                           React application entry point
│   ├── App.tsx                            Main React component
│   ├── App.css                            Application styles
│   ├── index.css                          Global styles
│   ├── vite-env.d.ts                      Vite environment type definitions
│   ├── assets                             Static assets (images, icons)
│   ├── components                         Reusable React components
│   │   ├── DataTable.tsx                  Data table component
│   │   ├── NavigationMenu.tsx             Navigation menu component
│   │   └── update                         Auto-update related components
│   │       ├── index.tsx                  Update notification component
│   │       ├── update.css                 Update component styles
│   │       ├── Modal                      Update modal components
│   │       └── Progress                   Update progress components
│   ├── context                            React context providers
│   ├── data                               Application data files
│   ├── hooks                              Custom React hooks
│   ├── pages                              React page components
│   │   ├── Login.tsx                      Login page component
│   │   └── Main.tsx                       Main application page
│   ├── services                           Service layer
│   ├── types                              TypeScript type definitions
│   │   └── electron-updater.d.ts          Electron updater type definitions
│   └── utils                              Utility functions
│
├── public                                  Static assets served by Vite
│   ├── favicon.ico                         Application favicon
│   └── node.svg                           Node.js logo
│
├── build                                   Build assets and icons
│   ├── icon.icns                          macOS application icon
│   ├── icon.ico                           Windows application icon
│   └── icon.png                           PNG application icon
│
├── dist-electron                          Built Electron code (generated)
│   └── preload                            Built preload scripts
│       └── index.mjs                      Compiled preload script
│
├── release                                 Generated after production build
│   └── 2.2.0                              Version-specific build artifacts
│       ├── builder-debug.yml              Build configuration debug info
│       ├── electron-vite-react_2.2.0.dmg  macOS installer
│       ├── electron-vite-react_2.2.0.zip  Packaged application
│       ├── latest-mac.yml                 Auto-updater manifest
│       └── mac-arm64                      Unpacked macOS ARM64 application
│
├── test                                    Test files
│   ├── e2e.spec.ts                        End-to-end test specifications
│   └── screenshots                        Test screenshots
│
├── .github                                 GitHub configuration
│   └── copilot-instructions.md            This file - Copilot instructions
│
├── package.json                           Node.js package configuration
├── tsconfig.json                          TypeScript configuration for main code
├── tsconfig.node.json                     TypeScript configuration for Node.js code
├── vite.config.ts                         Vite build configuration
├── vitest.config.ts                       Vitest testing configuration
├── tailwind.config.js                     Tailwind CSS configuration
├── postcss.config.cjs                     PostCSS configuration
├── electron-builder.json                  Electron Builder configuration
├── index.html                             HTML template for renderer
├── LICENSE                                Project license
├── README.md                              Project documentation
```