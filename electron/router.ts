import { initTRPC } from "@trpc/server";
import { prisma } from "./prisma";
import * as z from "zod";
// HACK: The `superjson` library is ESM-only (does not support CJS), while our codebase is CJS.
// This is a workaround to still get to use the latest version of the library from our codebase.
// https://github.com/blitz-js/superjson/issues/268
// https://www.npmjs.com/package/fix-esm
import SuperJSON from "superjson";

const t = initTRPC.create({
  transformer: SuperJSON,
});

const employeeRoleSchema = z.enum(["LAP_SO", "NHAP_SO_LIEU", "DICH_VU_KH"]);

export const appRouter = t.router({
  // ─── Company ─────────────────────────────────────────────────────────────────
  companies: t.procedure.query(() => {
    return prisma.company.findMany({
      include: {
        employeeAssignments: {
          include: { employee: true },
        },
      },
      orderBy: { companyName: "asc" },
    });
  }),

  companiesWithPayments: t.procedure.query(() => {
    return prisma.company.findMany({
      include: {
        employeeAssignments: {
          include: { employee: true },
        },
        payments: {
          orderBy: [{ year: "desc" }, { month: "desc" }],
          include: { batch: { include: { enteredBy: true } } },
        },
      },
      orderBy: { companyName: "asc" },
    });
  }),

  companyById: t.procedure
    .input(z.object({ id: z.number() }))
    .query(({ input }) => {
      return prisma.company.findUnique({
        where: { id: input.id },
        include: {
          employeeAssignments: {
            include: { employee: true },
          },
          payments: {
            orderBy: [{ year: "desc" }, { month: "desc" }],
          },
        },
      });
    }),

  createCompany: t.procedure
    .input(
      z.object({
        companyName: z.string(),
        taxId: z.string(),
        serviceFee: z.number().nullable().optional(),
      })
    )
    .mutation(({ input }) => {
      return prisma.company.create({ data: input });
    }),

  updateCompany: t.procedure
    .input(
      z.object({
        id: z.number(),
        data: z.object({
          companyName: z.string().optional(),
          taxId: z.string().optional(),
          serviceFee: z.number().nullable().optional(),
        }),
      })
    )
    .mutation(({ input }) => {
      return prisma.company.update({
        where: { id: input.id },
        data: input.data,
      });
    }),

  deleteCompany: t.procedure
    .input(z.object({ id: z.number() }))
    .mutation(({ input }) => {
      return prisma.company.delete({ where: { id: input.id } });
    }),

  // ─── Employee ────────────────────────────────────────────────────────────────
  employees: t.procedure.query(() => {
    return prisma.employee.findMany({
      include: {
        companyAssignments: {
          include: { company: true },
        },
      },
      orderBy: { fullName: "asc" },
    });
  }),

  employeeById: t.procedure
    .input(z.object({ id: z.number() }))
    .query(({ input }) => {
      return prisma.employee.findUnique({
        where: { id: input.id },
        include: {
          companyAssignments: {
            include: { company: true },
          },
        },
      });
    }),

  createEmployee: t.procedure
    .input(z.object({ fullName: z.string() }))
    .mutation(({ input }) => {
      return prisma.employee.create({ data: input });
    }),

  updateEmployee: t.procedure
    .input(
      z.object({
        id: z.number(),
        data: z.object({
          fullName: z.string().optional(),
        }),
      })
    )
    .mutation(({ input }) => {
      return prisma.employee.update({
        where: { id: input.id },
        data: input.data,
      });
    }),

  deleteEmployee: t.procedure
    .input(z.object({ id: z.number() }))
    .mutation(({ input }) => {
      return prisma.employee.delete({ where: { id: input.id } });
    }),

  // ─── CompanyEmployee (assignments) ───────────────────────────────────────────
  companyEmployees: t.procedure
    .input(
      z.object({
        companyId: z.number().optional(),
        employeeId: z.number().optional(),
        role: employeeRoleSchema.optional(),
      })
    )
    .query(({ input }) => {
      return prisma.companyEmployee.findMany({
        where: {
          ...(input.companyId !== undefined && { companyId: input.companyId }),
          ...(input.employeeId !== undefined && { employeeId: input.employeeId }),
          ...(input.role !== undefined && { role: input.role }),
        },
        include: {
          company: true,
          employee: true,
        },
      });
    }),

  assignEmployeeToCompany: t.procedure
    .input(
      z.object({
        companyId: z.number(),
        employeeId: z.number(),
        role: employeeRoleSchema,
      })
    )
    .mutation(({ input }) => {
      return prisma.companyEmployee.create({ data: input });
    }),

  removeEmployeeFromCompany: t.procedure
    .input(z.object({ id: z.number() }))
    .mutation(({ input }) => {
      return prisma.companyEmployee.delete({ where: { id: input.id } });
    }),

  // ─── Payment ─────────────────────────────────────────────────────────────────
  payments: t.procedure
    .input(
      z.object({
        companyId: z.number().optional(),
        year: z.number().optional(),
        month: z.number().optional(),
      })
    )
    .query(({ input }) => {
      return prisma.payment.findMany({
        where: {
          ...(input.companyId !== undefined && { companyId: input.companyId }),
          ...(input.year !== undefined && { year: input.year }),
          ...(input.month !== undefined && { month: input.month }),
        },
        include: { company: true },
        orderBy: [{ year: "desc" }, { month: "desc" }, { company: { companyName: "asc" } }],
      });
    }),

  createPayment: t.procedure
    .input(
      z.object({
        companyId: z.number(),
        month: z.number().int().min(1).max(12),
        year: z.number().int().min(2000),
        note: z.string().nullable().optional(),
        amount: z.number().nullable().optional(),
        collectionDate: z.string().datetime().nullable().optional(),
      })
    )
    .mutation(({ input }) => {
      return prisma.payment.create({
        data: {
          companyId: input.companyId,
          month: input.month,
          year: input.year,
          note: input.note || null,
          amount: input.amount || null,
          collectionDate: input.collectionDate ? new Date(input.collectionDate) : null,
        },
      });
    }),

  updatePayment: t.procedure
    .input(
      z.object({
        id: z.number(),
        data: z.object({
          month: z.number().int().min(1).max(12).optional(),
          year: z.number().int().min(2000).optional(),
          note: z.string().nullable().optional(),
          amount: z.number().nullable().optional(),
          collectionDate: z.string().datetime().nullable().optional(),
        }),
      })
    )
    .mutation(async ({ input }) => {
      const { month, year, note, amount, collectionDate } = input.data;

      const updateData: any = {};
      if (month !== undefined) updateData.month = month;
      if (year !== undefined) updateData.year = year;
      if (note !== undefined) updateData.note = note;
      if (amount !== undefined) updateData.amount = amount;
      if (collectionDate !== undefined) {
        updateData.collectionDate = collectionDate ? new Date(collectionDate) : null;
      }

      return prisma.payment.update({
        where: { id: input.id },
        data: updateData,
      });
    }),

  deletePayment: t.procedure
    .input(z.object({ id: z.number() }))
    .mutation(({ input }) => {
      return prisma.payment.delete({ where: { id: input.id } });
    }),

  // Xóa hàng loạt: xóa nguyên khối các phiếu theo danh sách id (1 round-trip).
  deletePayments: t.procedure
    .input(z.object({ ids: z.array(z.number()).min(1) }))
    .mutation(async ({ input }) => {
      const result = await prisma.payment.deleteMany({
        where: { id: { in: input.ids } },
      });
      return { count: result.count };
    }),

  // ─── Bulk Payment ─────────────────────────────────────────────────────────
  // Tạo 1 "phiếu thu" (PaymentBatch) gom nhiều công ty. Mỗi payment tạo ra được
  // gắn batchId của phiếu → sau này tách/gom theo phiếu ở "Thống Kê Phiếu".
  bulkCreatePayments: t.procedure
    .input(
      z.object({
        companyIds: z.array(z.number()).min(1),
        month: z.number().int().min(1).max(12),
        year: z.number().int().min(2000),
        collectionDate: z.string().datetime().nullable().optional(),
        note: z.string().nullable().optional(),
        enteredById: z.number().nullable().optional(), // người nhập (nhân viên)
      })
    )
    .mutation(async ({ input }) => {
      const results: {
        created: number[];
        skipped: number[];
        failed: number[];
        batchId: number | null;
      } = {
        created: [],
        skipped: [],
        failed: [],
        batchId: null,
      };

      const collectionDate = input.collectionDate
        ? new Date(input.collectionDate)
        : null;

      // Tạo phiếu trước để lấy id gắn cho các payment.
      const batch = await prisma.paymentBatch.create({
        data: {
          month: input.month,
          year: input.year,
          collectionDate,
          note: input.note || null,
          enteredById: input.enteredById ?? null,
        },
      });
      results.batchId = batch.id;

      for (const companyId of input.companyIds) {
        try {
          // Skip if a payment already exists for this company/month/year
          const existing = await prisma.payment.findFirst({
            where: { companyId, month: input.month, year: input.year },
          });

          if (existing) {
            results.skipped.push(companyId);
            continue;
          }

          // Pre-fill amount from company's serviceFee
          const company = await prisma.company.findUnique({
            where: { id: companyId },
            select: { serviceFee: true },
          });

          await prisma.payment.create({
            data: {
              companyId,
              month: input.month,
              year: input.year,
              collectionDate,
              amount: company?.serviceFee ?? null,
              note: input.note || null,
              batchId: batch.id,
            },
          });

          results.created.push(companyId);
        } catch {
          results.failed.push(companyId);
        }
      }

      // Không tạo ra payment nào (mọi công ty đều đã có phiếu) → bỏ phiếu rỗng.
      if (results.created.length === 0) {
        await prisma.paymentBatch.delete({ where: { id: batch.id } });
        results.batchId = null;
      }

      return results;
    }),
});

export type AppRouter = typeof appRouter;
