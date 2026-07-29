/**
 * Pure unit tests for TaskWorklog schemas (zod validation).
 * Run: bun run tests/task-worklogs.test.ts
 */
import { describe, expect, test } from "bun:test";
import {
  createTaskWorklogSchema,
  updateTaskWorklogSchema,
  taskWorklogQuerySchema,
} from "../src/lib/schemas";

describe("createTaskWorklogSchema", () => {
  test("accepts valid worklog", () => {
    const r = createTaskWorklogSchema.safeParse({
      taskId: "task_a",
      hours: 1.5,
      note: "Implemented API",
    });
    expect(r.success).toBe(true);
  });

  test("accepts without note", () => {
    const r = createTaskWorklogSchema.safeParse({
      taskId: "task_a",
      hours: 0.25,
    });
    expect(r.success).toBe(true);
  });

  test("rejects zero hours", () => {
    const r = createTaskWorklogSchema.safeParse({
      taskId: "task_a",
      hours: 0,
    });
    expect(r.success).toBe(false);
  });

  test("rejects negative hours", () => {
    const r = createTaskWorklogSchema.safeParse({
      taskId: "task_a",
      hours: -1,
    });
    expect(r.success).toBe(false);
  });

  test("rejects hours over 24", () => {
    const r = createTaskWorklogSchema.safeParse({
      taskId: "task_a",
      hours: 25,
    });
    expect(r.success).toBe(false);
  });

  test("rejects missing taskId", () => {
    const r = createTaskWorklogSchema.safeParse({
      hours: 1,
    });
    expect(r.success).toBe(false);
  });
});

describe("updateTaskWorklogSchema", () => {
  test("accepts hours update", () => {
    const r = updateTaskWorklogSchema.safeParse({
      id: "wl_1",
      hours: 2,
    });
    expect(r.success).toBe(true);
  });

  test("accepts note clear", () => {
    const r = updateTaskWorklogSchema.safeParse({
      id: "wl_1",
      note: null,
    });
    expect(r.success).toBe(true);
  });

  test("rejects missing id", () => {
    const r = updateTaskWorklogSchema.safeParse({
      hours: 1,
    });
    expect(r.success).toBe(false);
  });
});

describe("taskWorklogQuerySchema", () => {
  test("requires taskId", () => {
    const r = taskWorklogQuerySchema.safeParse({});
    expect(r.success).toBe(false);
  });

  test("accepts taskId", () => {
    const r = taskWorklogQuerySchema.safeParse({ taskId: "task_abc" });
    expect(r.success).toBe(true);
  });
});
