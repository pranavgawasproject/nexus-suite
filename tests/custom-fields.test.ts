/**
 * Pure unit tests for Custom Field schemas (zod validation).
 * Run: bun run tests/custom-fields.test.ts
 */
import { describe, expect, test } from "bun:test";
import {
  createCustomFieldSchema,
  updateCustomFieldSchema,
  upsertCustomFieldValueSchema,
  customFieldTypeEnum,
} from "../src/lib/schemas";

describe("customFieldTypeEnum", () => {
  test("accepts all 8 field types", () => {
    for (const t of ["text", "number", "date", "select", "multiselect", "boolean", "url", "email"]) {
      expect(customFieldTypeEnum.safeParse(t).success).toBe(true);
    }
  });

  test("rejects unknown type", () => {
    expect(customFieldTypeEnum.safeParse("file").success).toBe(false);
  });
});

describe("createCustomFieldSchema", () => {
  test("accepts valid text field", () => {
    const r = createCustomFieldSchema.safeParse({
      moduleKey: "tasks",
      entityType: "task",
      key: "customer_ref",
      label: "Customer Reference",
      type: "text",
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.required).toBe(false);
      expect(r.data.searchable).toBe(false);
      expect(r.data.position).toBe(0);
    }
  });

  test("accepts select with options JSON string", () => {
    const r = createCustomFieldSchema.safeParse({
      moduleKey: "tasks",
      entityType: "task",
      key: "priority_tier",
      label: "Priority Tier",
      type: "select",
      options: '["P0","P1","P2"]',
      required: true,
      position: 2,
    });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.required).toBe(true);
  });

  test("rejects empty key", () => {
    const r = createCustomFieldSchema.safeParse({
      moduleKey: "tasks",
      entityType: "task",
      key: "",
      label: "X",
      type: "text",
    });
    expect(r.success).toBe(false);
  });

  test("rejects non-snake_case key", () => {
    const r = createCustomFieldSchema.safeParse({
      moduleKey: "tasks",
      entityType: "task",
      key: "CustomerRef",
      label: "Customer Reference",
      type: "text",
    });
    expect(r.success).toBe(false);
  });

  test("rejects key with spaces", () => {
    const r = createCustomFieldSchema.safeParse({
      moduleKey: "tasks",
      entityType: "task",
      key: "customer ref",
      label: "Customer Reference",
      type: "text",
    });
    expect(r.success).toBe(false);
  });

  test("rejects invalid type", () => {
    const r = createCustomFieldSchema.safeParse({
      moduleKey: "tasks",
      entityType: "task",
      key: "foo",
      label: "Foo",
      type: "attachment",
    });
    expect(r.success).toBe(false);
  });

  test("rejects label over 120 chars", () => {
    const r = createCustomFieldSchema.safeParse({
      moduleKey: "tasks",
      entityType: "task",
      key: "long_label",
      label: "x".repeat(121),
      type: "text",
    });
    expect(r.success).toBe(false);
  });
});

describe("updateCustomFieldSchema", () => {
  test("requires id", () => {
    const r = updateCustomFieldSchema.safeParse({ label: "Renamed" });
    expect(r.success).toBe(false);
  });

  test("accepts partial update", () => {
    const r = updateCustomFieldSchema.safeParse({
      id: "cfd_1",
      label: "New Label",
      required: true,
      active: false,
    });
    expect(r.success).toBe(true);
  });
});

describe("upsertCustomFieldValueSchema", () => {
  test("accepts text value", () => {
    const r = upsertCustomFieldValueSchema.safeParse({
      entityType: "task",
      entityId: "task_1",
      fieldDefId: "cfd_1",
      valueText: "ACME-42",
    });
    expect(r.success).toBe(true);
  });

  test("accepts number and boolean values", () => {
    const r = upsertCustomFieldValueSchema.safeParse({
      entityType: "task",
      entityId: "task_1",
      fieldDefId: "cfd_2",
      valueNumber: 3.14,
      valueBool: true,
    });
    expect(r.success).toBe(true);
  });

  test("accepts datetime valueDate", () => {
    const r = upsertCustomFieldValueSchema.safeParse({
      entityType: "task",
      entityId: "task_1",
      fieldDefId: "cfd_3",
      valueDate: "2026-08-15T00:00:00.000Z",
    });
    expect(r.success).toBe(true);
  });

  test("rejects non-datetime valueDate", () => {
    const r = upsertCustomFieldValueSchema.safeParse({
      entityType: "task",
      entityId: "task_1",
      fieldDefId: "cfd_3",
      valueDate: "2026-08-15",
    });
    expect(r.success).toBe(false);
  });

  test("rejects missing entityId", () => {
    const r = upsertCustomFieldValueSchema.safeParse({
      entityType: "task",
      fieldDefId: "cfd_1",
      valueText: "x",
    });
    expect(r.success).toBe(false);
  });
});
