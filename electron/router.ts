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
      })
    )
    .mutation(({ input }) => {
      return prisma.payment.create({ data: input });
    }),

  updatePayment: t.procedure
    .input(
      z.object({
        id: z.number(),
        data: z.object({
          month: z.number().int().min(1).max(12).optional(),
          year: z.number().int().min(2000).optional(),
          note: z.string().nullable().optional(),
        }),
      })
    )
    .mutation(({ input }) => {
      return prisma.payment.update({
        where: { id: input.id },
        data: input.data,
      });
    }),

  deletePayment: t.procedure
    .input(z.object({ id: z.number() }))
    .mutation(({ input }) => {
      return prisma.payment.delete({ where: { id: input.id } });
    }),
});

export type AppRouter = typeof appRouter;
