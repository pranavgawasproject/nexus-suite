/**
 * Pure unit tests for public Milestone schemas (zod validation).
 * Run: bun run tests/public-milestones.test.ts
 */
import { describe, expect, test } from "bun:test";
import {
  createMilestoneSchema,
  updateMilestoneSchema,
} from "../src/lib/schemas";

describe("createMilestoneSchema", () => {
  test("accepts valid milestone with defaults", () => {
    const r = createMilestoneSchema.safeParse({
      projectId: "proj_1",
      name: "Beta Launch",
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.status).toBe("planned");
    }
  });

  test("accepts full milestone payload", () => {
    const r = createMilestoneSchema.safeParse({
      projectId: "proj_1",
      name: "GA Release",
      description: "General availability",
      status: "active",
      dueDate: "2026-09-30T00:00:00.000Z",
    });
    expect(r.success).toBe(true);
  });

  test("rejects missing projectId", () => {
    const r = createMilestoneSchema.safeParse({
      name: "Milestone",
    });
    expect(r.success).toBe(false);
  });

  test("rejects empty name", () => {
    const r = createMilestoneSchema.safeParse({
      projectId: "proj_1",
      name: "",
    });
    expect(r.success).toBe(false);
  });

  test("rejects name longer than 200", () => {
    const r = createMilestoneSchema.safeParse({
      projectId: "proj_1",
      name: "x".repeat(201),
    });
    expect(r.success).toBe(false);
  });

  test("rejects invalid status", () => {
    const r = createMilestoneSchema.safeParse({
      projectId: "proj_1",
      name: "MS",
      status: "cancelled",
    });
    expect(r.success).toBe(false);
  });

  test("rejects non-ISO dueDate", () => {
    const r = createMilestoneSchema.safeParse({
      projectId: "proj_1",
      name: "MS",
      dueDate: "2026-09-30",
    });
    expect(r.success).toBe(false);
  });
});

describe("updateMilestoneSchema", () => {
  test("requires id", () => {
    const r = updateMilestoneSchema.safeParse({ name: "Updated" });
    expect(r.success).toBe(false);
  });

  test("accepts partial update", () => {
    const r = updateMilestoneSchema.safeParse({
      id: "ms_1",
      status: "completed",
      dueDate: "2026-10-01T00:00:00.000Z",
    });
    expect(r.success).toBe(true);
  });

  test("rejects invalid status on update", () => {
    const r = updateMilestoneSchema.safeParse({
      id: "ms_1",
      status: "draft",
    });
    expect(r.success).toBe(false);
  });

  test("rejects empty name on update", () => {
    const r = updateMilestoneSchema.safeParse({
      id: "ms_1",
      name: "",
    });
    expect(r.success).toBe(false);
  });
});
