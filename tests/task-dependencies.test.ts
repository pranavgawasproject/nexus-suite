/**
 * Pure unit tests for TaskDependency schemas (zod validation).
 * Run: bun run tests/task-dependencies.test.ts
 */
import { describe, expect, test } from "bun:test";
import {
  createTaskDependencySchema,
  taskDependencyQuerySchema,
} from "../src/lib/schemas";

describe("createTaskDependencySchema", () => {
  test("accepts valid blocks dependency", () => {
    const r = createTaskDependencySchema.safeParse({
      fromTaskId: "task_a",
      toTaskId: "task_b",
      type: "blocks",
    });
    expect(r.success).toBe(true);
  });

  test("defaults type to blocks", () => {
    const r = createTaskDependencySchema.safeParse({
      fromTaskId: "task_a",
      toTaskId: "task_b",
    });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.type).toBe("blocks");
  });

  test("accepts relates type", () => {
    const r = createTaskDependencySchema.safeParse({
      fromTaskId: "task_a",
      toTaskId: "task_b",
      type: "relates",
    });
    expect(r.success).toBe(true);
  });

  test("rejects self-dependency", () => {
    const r = createTaskDependencySchema.safeParse({
      fromTaskId: "task_a",
      toTaskId: "task_a",
    });
    expect(r.success).toBe(false);
  });

  test("rejects missing fromTaskId", () => {
    const r = createTaskDependencySchema.safeParse({
      toTaskId: "task_b",
    });
    expect(r.success).toBe(false);
  });

  test("rejects invalid type", () => {
    const r = createTaskDependencySchema.safeParse({
      fromTaskId: "task_a",
      toTaskId: "task_b",
      type: "finish_to_start",
    });
    expect(r.success).toBe(false);
  });
});

describe("taskDependencyQuerySchema", () => {
  test("requires taskId", () => {
    const r = taskDependencyQuerySchema.safeParse({});
    expect(r.success).toBe(false);
  });

  test("accepts taskId", () => {
    const r = taskDependencyQuerySchema.safeParse({ taskId: "task_abc" });
    expect(r.success).toBe(true);
  });
});
