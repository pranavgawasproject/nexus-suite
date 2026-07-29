/**
 * Pure unit tests for TaskChecklistItem schemas (zod validation).
 * Run: bun run tests/task-checklists.test.ts
 */
import { describe, expect, test } from "bun:test";
import {
  createTaskChecklistItemSchema,
  updateTaskChecklistItemSchema,
  taskChecklistQuerySchema,
} from "../src/lib/schemas";

describe("createTaskChecklistItemSchema", () => {
  test("accepts valid item", () => {
    const r = createTaskChecklistItemSchema.safeParse({
      taskId: "task_a",
      title: "Write tests",
    });
    expect(r.success).toBe(true);
  });

  test("accepts optional position", () => {
    const r = createTaskChecklistItemSchema.safeParse({
      taskId: "task_a",
      title: "Ship it",
      position: 2,
    });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.position).toBe(2);
  });

  test("rejects empty title", () => {
    const r = createTaskChecklistItemSchema.safeParse({
      taskId: "task_a",
      title: "",
    });
    expect(r.success).toBe(false);
  });

  test("rejects missing taskId", () => {
    const r = createTaskChecklistItemSchema.safeParse({
      title: "Do thing",
    });
    expect(r.success).toBe(false);
  });

  test("rejects title over 500 chars", () => {
    const r = createTaskChecklistItemSchema.safeParse({
      taskId: "task_a",
      title: "x".repeat(501),
    });
    expect(r.success).toBe(false);
  });
});

describe("updateTaskChecklistItemSchema", () => {
  test("accepts completed toggle", () => {
    const r = updateTaskChecklistItemSchema.safeParse({
      id: "item_1",
      completed: true,
    });
    expect(r.success).toBe(true);
  });

  test("accepts title update", () => {
    const r = updateTaskChecklistItemSchema.safeParse({
      id: "item_1",
      title: "Renamed step",
    });
    expect(r.success).toBe(true);
  });

  test("rejects missing id", () => {
    const r = updateTaskChecklistItemSchema.safeParse({
      completed: false,
    });
    expect(r.success).toBe(false);
  });
});

describe("taskChecklistQuerySchema", () => {
  test("requires taskId", () => {
    const r = taskChecklistQuerySchema.safeParse({});
    expect(r.success).toBe(false);
  });

  test("accepts taskId", () => {
    const r = taskChecklistQuerySchema.safeParse({ taskId: "task_abc" });
    expect(r.success).toBe(true);
  });
});
