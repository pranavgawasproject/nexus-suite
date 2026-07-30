/**
 * Pure unit tests for public TaskWorklog schemas (zod validation).
 * Run: bun run tests/public-worklogs.test.ts
 */
import { describe, expect, test } from "bun:test";
import { createPublicTaskWorklogSchema } from "../src/lib/schemas";

describe("createPublicTaskWorklogSchema", () => {
  test("accepts valid public worklog", () => {
    const r = createPublicTaskWorklogSchema.safeParse({
      taskId: "task_a",
      authorId: "user_1",
      hours: 1.5,
      note: "API integration",
    });
    expect(r.success).toBe(true);
  });

  test("accepts without note", () => {
    const r = createPublicTaskWorklogSchema.safeParse({
      taskId: "task_a",
      authorId: "user_1",
      hours: 0.5,
    });
    expect(r.success).toBe(true);
  });

  test("rejects missing authorId", () => {
    const r = createPublicTaskWorklogSchema.safeParse({
      taskId: "task_a",
      hours: 1,
    });
    expect(r.success).toBe(false);
  });

  test("rejects zero hours", () => {
    const r = createPublicTaskWorklogSchema.safeParse({
      taskId: "task_a",
      authorId: "user_1",
      hours: 0,
    });
    expect(r.success).toBe(false);
  });

  test("rejects hours over 24", () => {
    const r = createPublicTaskWorklogSchema.safeParse({
      taskId: "task_a",
      authorId: "user_1",
      hours: 30,
    });
    expect(r.success).toBe(false);
  });

  test("rejects missing taskId", () => {
    const r = createPublicTaskWorklogSchema.safeParse({
      authorId: "user_1",
      hours: 1,
    });
    expect(r.success).toBe(false);
  });
});
