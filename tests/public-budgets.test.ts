/**
 * Pure unit tests for public Budget / Expense schemas (zod validation).
 * Run: bun run tests/public-budgets.test.ts
 */
import { describe, expect, test } from "bun:test";
import {
  createBudgetSchema,
  createExpenseSchema,
  updateExpenseSchema,
} from "../src/lib/schemas";

describe("createBudgetSchema", () => {
  test("accepts valid budget with defaults", () => {
    const r = createBudgetSchema.safeParse({
      projectId: "proj_1",
      totalAmount: 50000,
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.currency).toBe("INR");
    }
  });

  test("accepts full budget payload", () => {
    const r = createBudgetSchema.safeParse({
      projectId: "proj_1",
      totalAmount: 100000,
      currency: "USD",
      notes: "Q3 client budget",
    });
    expect(r.success).toBe(true);
  });

  test("rejects missing projectId", () => {
    const r = createBudgetSchema.safeParse({
      totalAmount: 1000,
    });
    expect(r.success).toBe(false);
  });

  test("rejects negative totalAmount", () => {
    const r = createBudgetSchema.safeParse({
      projectId: "proj_1",
      totalAmount: -1,
    });
    expect(r.success).toBe(false);
  });

  test("rejects invalid currency length", () => {
    const r = createBudgetSchema.safeParse({
      projectId: "proj_1",
      totalAmount: 100,
      currency: "US",
    });
    expect(r.success).toBe(false);
  });
});

describe("createExpenseSchema", () => {
  test("accepts valid expense with defaults", () => {
    const r = createExpenseSchema.safeParse({
      projectId: "proj_1",
      title: "AWS invoice",
      amount: 1200,
      incurredDate: "2026-08-01T00:00:00.000Z",
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.currency).toBe("INR");
      expect(r.data.category).toBe("other");
    }
  });

  test("accepts full expense payload", () => {
    const r = createExpenseSchema.safeParse({
      projectId: "proj_1",
      title: "Flight to client",
      amount: 8500,
      currency: "EUR",
      category: "travel",
      incurredDate: "2026-07-15T00:00:00.000Z",
      vendor: "IndiGo",
      notes: "Round trip BOM-BLR",
    });
    expect(r.success).toBe(true);
  });

  test("rejects empty title", () => {
    const r = createExpenseSchema.safeParse({
      projectId: "proj_1",
      title: "",
      amount: 10,
      incurredDate: "2026-08-01T00:00:00.000Z",
    });
    expect(r.success).toBe(false);
  });

  test("rejects invalid category", () => {
    const r = createExpenseSchema.safeParse({
      projectId: "proj_1",
      title: "Expense",
      amount: 10,
      incurredDate: "2026-08-01T00:00:00.000Z",
      category: "rent",
    });
    expect(r.success).toBe(false);
  });

  test("rejects negative amount", () => {
    const r = createExpenseSchema.safeParse({
      projectId: "proj_1",
      title: "Expense",
      amount: -5,
      incurredDate: "2026-08-01T00:00:00.000Z",
    });
    expect(r.success).toBe(false);
  });

  test("rejects invalid incurredDate", () => {
    const r = createExpenseSchema.safeParse({
      projectId: "proj_1",
      title: "Expense",
      amount: 10,
      incurredDate: "2026-08-01",
    });
    expect(r.success).toBe(false);
  });
});

describe("updateExpenseSchema", () => {
  test("requires id", () => {
    const r = updateExpenseSchema.safeParse({ title: "Updated" });
    expect(r.success).toBe(false);
  });

  test("accepts partial update", () => {
    const r = updateExpenseSchema.safeParse({
      id: "exp_1",
      amount: 1500,
      category: "software",
    });
    expect(r.success).toBe(true);
  });

  test("rejects invalid category on update", () => {
    const r = updateExpenseSchema.safeParse({
      id: "exp_1",
      category: "utilities",
    });
    expect(r.success).toBe(false);
  });
});
