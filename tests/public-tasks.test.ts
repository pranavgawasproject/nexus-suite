/**
 * Pure unit tests for public Task schema (zod validation).
 * Run: bun run tests/public-tasks.test.ts
 */
import { describe, expect, test } from "bun:test";
import { createTaskSchema } from "../src/lib/schemas";

describe("createTaskSchema", () => {
  test("accepts valid minimal task", () => {
    const r = createTaskSchema.safeParse({
      projectId: "proj_1",
      title: "Implement login",
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.status).toBe("todo");
      expect(r.data.priority).toBe("medium");
      expect(r.data.type).toBe("task");
    }
  });

  test("accepts full payload", () => {
    const r = createTaskSchema.safeParse({
      projectId: "proj_1",
      title: "Full task",
      description: "Detailed description",
      status: "in_progress",
      priority: "high",
      type: "bug",
      assigneeId: "user_1",
      reporterId: "user_2",
      dueDate: "2026-09-01T00:00:00.000Z",
      estimateHours: 8,
      tags: "auth,security",
      cycleId: "cycle_1",
      milestoneId: "ms_1",
      parentId: "task_parent",
    });
    expect(r.success).toBe(true);
  });

  test("rejects empty title", () => {
    const r = createTaskSchema.safeParse({
      projectId: "proj_1",
      title: "",
    });
    expect(r.success).toBe(false);
  });

  test("rejects missing projectId", () => {
    const r = createTaskSchema.safeParse({
      title: "No project",
    });
    expect(r.success).toBe(false);
  });

  test("rejects title longer than 200", () => {
    const r = createTaskSchema.safeParse({
      projectId: "proj_1",
      title: "x".repeat(201),
    });
    expect(r.success).toBe(false);
  });

  test("rejects invalid status", () => {
    const r = createTaskSchema.safeParse({
      projectId: "proj_1",
      title: "Bad status",
      status: "done_wrong",
    });
    expect(r.success).toBe(false);
  });

  test("rejects negative estimateHours", () => {
    const r = createTaskSchema.safeParse({
      projectId: "proj_1",
      title: "Bad estimate",
      estimateHours: -1,
    });
    expect(r.success).toBe(false);
  });
});
