/**
 * Pure unit tests for public Document schema (zod validation).
 * Schema is defined inline in src/app/api/v1/documents/route.ts; mirrored here for unit coverage.
 * Run: bun run tests/public-documents.test.ts
 */
import { describe, expect, test } from "bun:test";
import { z } from "zod";

const createDocumentSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().max(200000).optional().default(""),
  parentId: z.string().optional().nullable(),
  isPublic: z.boolean().optional().default(false),
});

describe("createDocumentSchema", () => {
  test("accepts valid minimal document", () => {
    const r = createDocumentSchema.safeParse({
      title: "Getting started",
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.content).toBe("");
      expect(r.data.isPublic).toBe(false);
    }
  });

  test("accepts full payload", () => {
    const r = createDocumentSchema.safeParse({
      title: "Architecture overview",
      content: "# Overview

Details here.",
      parentId: "doc_parent",
      isPublic: true,
    });
    expect(r.success).toBe(true);
  });

  test("rejects empty title", () => {
    const r = createDocumentSchema.safeParse({ title: "" });
    expect(r.success).toBe(false);
  });

  test("rejects title longer than 200", () => {
    const r = createDocumentSchema.safeParse({
      title: "x".repeat(201),
    });
    expect(r.success).toBe(false);
  });

  test("rejects content longer than 200000", () => {
    const r = createDocumentSchema.safeParse({
      title: "Huge",
      content: "x".repeat(200001),
    });
    expect(r.success).toBe(false);
  });

  test("accepts null parentId", () => {
    const r = createDocumentSchema.safeParse({
      title: "Root doc",
      parentId: null,
    });
    expect(r.success).toBe(true);
  });
});
