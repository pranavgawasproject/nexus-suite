/**
 * Pure unit tests for TaskComment schemas (zod validation).
 * Run: bun run tests/task-comments.test.ts
 */
import { describe, expect, test } from "bun:test";
import {
  createTaskCommentSchema,
  updateTaskCommentSchema,
  taskCommentQuerySchema,
} from "../src/lib/schemas";

describe("createTaskCommentSchema", () => {
  test("accepts valid comment", () => {
    const r = createTaskCommentSchema.safeParse({
      taskId: "task_123",
      body: "Looks good, ship it.",
    });
    expect(r.success).toBe(true);
  });

  test("rejects empty body", () => {
    const r = createTaskCommentSchema.safeParse({
      taskId: "task_123",
      body: "",
    });
    expect(r.success).toBe(false);
  });

  test("rejects missing taskId", () => {
    const r = createTaskCommentSchema.safeParse({
      body: "Hello",
    });
    expect(r.success).toBe(false);
  });

  test("rejects body over 5000 chars", () => {
    const r = createTaskCommentSchema.safeParse({
      taskId: "task_123",
      body: "x".repeat(5001),
    });
    expect(r.success).toBe(false);
  });
});

describe("updateTaskCommentSchema", () => {
  test("requires id", () => {
    const r = updateTaskCommentSchema.safeParse({ body: "edited" });
    expect(r.success).toBe(false);
  });

  test("accepts valid update", () => {
    const r = updateTaskCommentSchema.safeParse({
      id: "cmt_1",
      body: "Updated text",
    });
    expect(r.success).toBe(true);
  });
});

describe("taskCommentQuerySchema", () => {
  test("requires taskId", () => {
    const r = taskCommentQuerySchema.safeParse({});
    expect(r.success).toBe(false);
  });

  test("accepts taskId", () => {
    const r = taskCommentQuerySchema.safeParse({ taskId: "task_abc" });
    expect(r.success).toBe(true);
  });
});
