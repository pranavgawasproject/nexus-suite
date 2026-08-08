/**
 * Pure unit tests for public Task Comment schemas (zod validation).
 * Run: bun run tests/public-comments.test.ts
 */
import { describe, expect, test } from "bun:test";
import { createPublicTaskCommentSchema } from "../src/lib/schemas";

describe("createPublicTaskCommentSchema", () => {
  test("accepts valid public comment", () => {
    const r = createPublicTaskCommentSchema.safeParse({
      taskId: "task_a",
      authorId: "user_1",
      body: "Looks good — ship it.",
    });
    expect(r.success).toBe(true);
  });

  test("rejects missing authorId", () => {
    const r = createPublicTaskCommentSchema.safeParse({
      taskId: "task_a",
      body: "No author",
    });
    expect(r.success).toBe(false);
  });

  test("rejects missing taskId", () => {
    const r = createPublicTaskCommentSchema.safeParse({
      authorId: "user_1",
      body: "No task",
    });
    expect(r.success).toBe(false);
  });

  test("rejects empty body", () => {
    const r = createPublicTaskCommentSchema.safeParse({
      taskId: "task_a",
      authorId: "user_1",
      body: "",
    });
    expect(r.success).toBe(false);
  });

  test("rejects missing body", () => {
    const r = createPublicTaskCommentSchema.safeParse({
      taskId: "task_a",
      authorId: "user_1",
    });
    expect(r.success).toBe(false);
  });

  test("rejects body longer than 5000", () => {
    const r = createPublicTaskCommentSchema.safeParse({
      taskId: "task_a",
      authorId: "user_1",
      body: "x".repeat(5001),
    });
    expect(r.success).toBe(false);
  });

  test("accepts body at max length 5000", () => {
    const r = createPublicTaskCommentSchema.safeParse({
      taskId: "task_a",
      authorId: "user_1",
      body: "x".repeat(5000),
    });
    expect(r.success).toBe(true);
  });
});
