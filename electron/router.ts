import {initTRPC} from '@trpc/server';
import { prisma } from './prisma';
import * as z from 'zod';
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
  transformer: SuperJSON
});

export const appRouter = t.router({
  danhMucKhachHang: t.procedure
    .query(() => {
      return prisma.danhMucKhachHang.findMany();
    }),
  khachHangById: t.procedure
    .input(z.object({
      id: z.number()
    }))
    .query(({ input }) => {
      return prisma.danhMucKhachHang.findUnique({
        where: {
          id: input.id
        }
      });
    }),
  khachHangByNhanVien: t.procedure
    .input(z.object({
      nhanVienId: z.number(),
      nhanVienType: z.enum(['DVKH', 'LAPSO', 'NSL'])
    }))
    .query(({ input }) => {
      if (input.nhanVienType === 'DVKH') {
        return prisma.danhMucKhachHang.findMany({
          where: {
            nhanVienDVKHId: input.nhanVienId
          }
        });
      } else if (input.nhanVienType === 'LAPSO') {
        return prisma.danhMucKhachHang.findMany({
          where: {
            nhanVienLapSoId: input.nhanVienId
          }
        });
      } else if (input.nhanVienType === 'NSL') {
        return prisma.danhMucKhachHang.findMany({
          where: {
            nhanVienNSLId: input.nhanVienId
          }
        });
      }
    }),
  danhMucNhanVien: t.procedure
    .query(() => {
      return prisma.danhMucNhanVien.findMany();
    }),
  nhanVienById: t.procedure
    .input(z.object({
      id: z.number()
    }))
    .query(({ input }) => {
      return prisma.danhMucNhanVien.findUnique({
        where: {
          id: input.id
        }
      });
    }),
  danhMucCongViec: t.procedure
    .query(() => {
      return prisma.danhMucCongViec.findMany();
    }),
  congViecById: t.procedure
    .input(z.object({
      id: z.number()
    }))
    .query(({ input }) => {
      return prisma.danhMucCongViec.findUnique({
        where: {
          id: input.id
        }
      });
    }),
  chiPhiCongViec: t.procedure
    .query(() => {
      return prisma.chiPhiCongViec.findMany();
    }
  ),
  phieuChi: t.procedure
    .query(() => {
      return prisma.phieuChi.findMany();
    }
  ),
  phieuThu: t.procedure
    .query(() => {
      return prisma.phieuThu.findMany();
    }
  ),
  phieuThuByKhachHang: t.procedure
    .input(z.object({ 
      khachHangId: z.number() 
    }))
    .query(({ input }) => {
      return prisma.phieuThu.findMany({
        where: {
          khachHangId: input.khachHangId
        }
      });
    }),
  nghiemThuCongViec: t.procedure
    .query(() => {
      return prisma.nghiemThuCongViec.findMany();
    }
  ),
  quanLyPhiDichVu: t.procedure
    .query(() => {
      return prisma.quanLyPhiDichVu.findMany();
    }
  ),
});

export type AppRouter = typeof appRouter;