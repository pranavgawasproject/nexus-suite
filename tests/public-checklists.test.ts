/**
 * Pure unit tests for Task Checklist schemas (zod validation).
 * Run: bun run tests/public-checklists.test.ts
 */
import { describe, expect, test } from "bun:test";
import {
  createTaskChecklistItemSchema,
  updateTaskChecklistItemSchema,
  taskChecklistQuerySchema,
} from "../src/lib/schemas";

describe("createTaskChecklistItemSchema", () => {
  test("accepts valid checklist item", () => {
    const r = createTaskChecklistItemSchema.safeParse({
      taskId: "task_a",
      title: "Write unit tests",
    });
    expect(r.success).toBe(true);
  });

  test("accepts optional position", () => {
    const r = createTaskChecklistItemSchema.safeParse({
      taskId: "task_a",
      title: "Review PR",
      position: 2,
    });
    expect(r.success).toBe(true);
  });

  test("rejects missing taskId", () => {
    const r = createTaskChecklistItemSchema.safeParse({
      title: "No task",
    });
    expect(r.success).toBe(false);
  });

  test("rejects empty title", () => {
    const r = createTaskChecklistItemSchema.safeParse({
      taskId: "task_a",
      title: "",
    });
    expect(r.success).toBe(false);
  });

  test("rejects title longer than 500", () => {
    const r = createTaskChecklistItemSchema.safeParse({
      taskId: "task_a",
      title: "x".repeat(501),
    });
    expect(r.success).toBe(false);
  });

  test("rejects negative position", () => {
    const r = createTaskChecklistItemSchema.safeParse({
      taskId: "task_a",
      title: "Item",
      position: -1,
    });
    expect(r.success).toBe(false);
  });
});

describe("updateTaskChecklistItemSchema", () => {
  test("accepts id only", () => {
    const r = updateTaskChecklistItemSchema.safeParse({ id: "cli_1" });
    expect(r.success).toBe(true);
  });

  test("accepts full update", () => {
    const r = updateTaskChecklistItemSchema.safeParse({
      id: "cli_1",
      title: "Updated title",
      completed: true,
      position: 0,
    });
    expect(r.success).toBe(true);
  });

  test("rejects missing id", () => {
    const r = updateTaskChecklistItemSchema.safeParse({
      title: "No id",
    });
    expect(r.success).toBe(false);
  });

  test("rejects empty title when provided", () => {
    const r = updateTaskChecklistItemSchema.safeParse({
      id: "cli_1",
      title: "",
    });
    expect(r.success).toBe(false);
  });
});

describe("taskChecklistQuerySchema", () => {
  test("accepts valid taskId", () => {
    const r = taskChecklistQuerySchema.safeParse({ taskId: "task_a" });
    expect(r.success).toBe(true);
  });

  test("rejects missing taskId", () => {
    const r = taskChecklistQuerySchema.safeParse({});
    expect(r.success).toBe(false);
  });

  test("rejects empty taskId", () => {
    const r = taskChecklistQuerySchema.safeParse({ taskId: "" });
    expect(r.success).toBe(false);
  });
});
