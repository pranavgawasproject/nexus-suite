/**
 * Pure unit tests for TaskTimeEntry schemas (zod validation).
 * Run: bun run tests/task-time-entries.test.ts
 */
import { describe, expect, test } from "bun:test";
import {
  createTaskTimeEntrySchema,
  updateTaskTimeEntrySchema,
  taskTimeEntryQuerySchema,
} from "../src/lib/schemas";

describe("createTaskTimeEntrySchema", () => {
  test("accepts valid entry", () => {
    const r = createTaskTimeEntrySchema.safeParse({
      taskId: "task_a",
      hours: 1.5,
      note: "Implemented API",
    });
    expect(r.success).toBe(true);
  });

  test("accepts optional loggedAt ISO datetime", () => {
    const r = createTaskTimeEntrySchema.safeParse({
      taskId: "task_a",
      hours: 2,
      loggedAt: "2026-07-29T10:00:00.000Z",
    });
    expect(r.success).toBe(true);
  });

  test("rejects zero or negative hours", () => {
    const r = createTaskTimeEntrySchema.safeParse({
      taskId: "task_a",
      hours: 0,
    });
    expect(r.success).toBe(false);
  });

  test("rejects missing taskId", () => {
    const r = createTaskTimeEntrySchema.safeParse({
      hours: 1,
    });
    expect(r.success).toBe(false);
  });

  test("rejects hours above max", () => {
    const r = createTaskTimeEntrySchema.safeParse({
      taskId: "task_a",
      hours: 24 * 7 + 1,
    });
    expect(r.success).toBe(false);
  });
});

describe("updateTaskTimeEntrySchema", () => {
  test("accepts hours update", () => {
    const r = updateTaskTimeEntrySchema.safeParse({
      id: "entry_1",
      hours: 3.25,
    });
    expect(r.success).toBe(true);
  });

  test("accepts clearing note", () => {
    const r = updateTaskTimeEntrySchema.safeParse({
      id: "entry_1",
      note: null,
    });
    expect(r.success).toBe(true);
  });

  test("rejects missing id", () => {
    const r = updateTaskTimeEntrySchema.safeParse({
      hours: 1,
    });
    expect(r.success).toBe(false);
  });
});

describe("taskTimeEntryQuerySchema", () => {
  test("requires taskId", () => {
    const r = taskTimeEntryQuerySchema.safeParse({});
    expect(r.success).toBe(false);
  });

  test("accepts taskId", () => {
    const r = taskTimeEntryQuerySchema.safeParse({ taskId: "task_abc" });
    expect(r.success).toBe(true);
  });
});
