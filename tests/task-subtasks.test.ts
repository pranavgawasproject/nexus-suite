/**
 * Pure unit tests for task subtask (parentId) schema fields.
 * Run: bun run tests/task-subtasks.test.ts
 */
import { describe, expect, test } from "bun:test";
import {
  createTaskSchema,
  updateTaskSchema,
  taskQuerySchema,
} from "../src/lib/schemas";

describe("createTaskSchema parentId", () => {
  test("accepts task without parentId", () => {
    const r = createTaskSchema.safeParse({
      projectId: "proj_1",
      title: "Top-level task",
    });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.parentId).toBeUndefined();
  });

  test("accepts parentId string", () => {
    const r = createTaskSchema.safeParse({
      projectId: "proj_1",
      title: "Subtask",
      parentId: "task_parent",
    });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.parentId).toBe("task_parent");
  });

  test("accepts parentId null", () => {
    const r = createTaskSchema.safeParse({
      projectId: "proj_1",
      title: "Task",
      parentId: null,
    });
    expect(r.success).toBe(true);
  });
});

describe("updateTaskSchema parentId", () => {
  test("accepts parentId update", () => {
    const r = updateTaskSchema.safeParse({
      id: "task_1",
      parentId: "task_parent",
    });
    expect(r.success).toBe(true);
  });

  test("accepts clearing parentId", () => {
    const r = updateTaskSchema.safeParse({
      id: "task_1",
      parentId: null,
    });
    expect(r.success).toBe(true);
  });
});

describe("taskQuerySchema parentId", () => {
  test("accepts parentId filter", () => {
    const r = taskQuerySchema.safeParse({ parentId: "task_parent" });
    expect(r.success).toBe(true);
  });

  test("accepts parentId=none for top-level only", () => {
    const r = taskQuerySchema.safeParse({ parentId: "none" });
    expect(r.success).toBe(true);
  });

  test("accepts empty query", () => {
    const r = taskQuerySchema.safeParse({});
    expect(r.success).toBe(true);
  });
});
