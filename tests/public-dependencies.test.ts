/**
 * Pure unit tests for public Task Dependency schemas (zod validation).
 * Run: bun run tests/public-dependencies.test.ts
 */
import { describe, expect, test } from "bun:test";
import { createPublicTaskDependencySchema } from "../src/lib/schemas";

describe("createPublicTaskDependencySchema", () => {
  test("accepts valid dependency with default type", () => {
    const r = createPublicTaskDependencySchema.safeParse({
      fromTaskId: "task_a",
      toTaskId: "task_b",
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.type).toBe("blocks");
    }
  });

  test("accepts relates type", () => {
    const r = createPublicTaskDependencySchema.safeParse({
      fromTaskId: "task_a",
      toTaskId: "task_b",
      type: "relates",
    });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.type).toBe("relates");
  });

  test("rejects same from and to task", () => {
    const r = createPublicTaskDependencySchema.safeParse({
      fromTaskId: "task_a",
      toTaskId: "task_a",
    });
    expect(r.success).toBe(false);
  });

  test("rejects missing fromTaskId", () => {
    const r = createPublicTaskDependencySchema.safeParse({
      toTaskId: "task_b",
    });
    expect(r.success).toBe(false);
  });

  test("rejects missing toTaskId", () => {
    const r = createPublicTaskDependencySchema.safeParse({
      fromTaskId: "task_a",
    });
    expect(r.success).toBe(false);
  });

  test("rejects invalid type", () => {
    const r = createPublicTaskDependencySchema.safeParse({
      fromTaskId: "task_a",
      toTaskId: "task_b",
      type: "blocks_after",
    });
    expect(r.success).toBe(false);
  });

  test("rejects empty fromTaskId", () => {
    const r = createPublicTaskDependencySchema.safeParse({
      fromTaskId: "",
      toTaskId: "task_b",
    });
    expect(r.success).toBe(false);
  });
});
