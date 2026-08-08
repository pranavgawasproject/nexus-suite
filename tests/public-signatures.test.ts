/**
 * Pure unit tests for public Signature schemas (zod validation).
 * Run: bun run tests/public-signatures.test.ts
 */
import { describe, expect, test } from "bun:test";
import { createPublicSignatureSchema } from "../src/lib/schemas";

describe("createPublicSignatureSchema", () => {
  test("accepts valid signature request", () => {
    const r = createPublicSignatureSchema.safeParse({
      documentType: "document",
      documentId: "doc_1",
      signerId: "user_1",
      signerEmail: "signer@example.com",
    });
    expect(r.success).toBe(true);
  });

  test("accepts all documentType values", () => {
    for (const documentType of ["document", "kra", "expense", "change_request"] as const) {
      const r = createPublicSignatureSchema.safeParse({
        documentType,
        documentId: "id_1",
        signerId: "user_1",
        signerEmail: "a@b.co",
      });
      expect(r.success).toBe(true);
    }
  });

  test("accepts optional expiresAt", () => {
    const r = createPublicSignatureSchema.safeParse({
      documentType: "kra",
      documentId: "kra_9",
      signerId: "user_2",
      signerEmail: "mgr@company.com",
      expiresAt: "2026-12-31T23:59:59.000Z",
    });
    expect(r.success).toBe(true);
  });

  test("rejects missing documentType", () => {
    const r = createPublicSignatureSchema.safeParse({
      documentId: "doc_1",
      signerId: "user_1",
      signerEmail: "a@b.co",
    });
    expect(r.success).toBe(false);
  });

  test("rejects invalid documentType", () => {
    const r = createPublicSignatureSchema.safeParse({
      documentType: "invoice",
      documentId: "doc_1",
      signerId: "user_1",
      signerEmail: "a@b.co",
    });
    expect(r.success).toBe(false);
  });

  test("rejects missing documentId", () => {
    const r = createPublicSignatureSchema.safeParse({
      documentType: "document",
      signerId: "user_1",
      signerEmail: "a@b.co",
    });
    expect(r.success).toBe(false);
  });

  test("rejects empty documentId", () => {
    const r = createPublicSignatureSchema.safeParse({
      documentType: "document",
      documentId: "",
      signerId: "user_1",
      signerEmail: "a@b.co",
    });
    expect(r.success).toBe(false);
  });

  test("rejects missing signerId", () => {
    const r = createPublicSignatureSchema.safeParse({
      documentType: "document",
      documentId: "doc_1",
      signerEmail: "a@b.co",
    });
    expect(r.success).toBe(false);
  });

  test("rejects invalid signerEmail", () => {
    const r = createPublicSignatureSchema.safeParse({
      documentType: "document",
      documentId: "doc_1",
      signerId: "user_1",
      signerEmail: "not-an-email",
    });
    expect(r.success).toBe(false);
  });

  test("rejects missing signerEmail", () => {
    const r = createPublicSignatureSchema.safeParse({
      documentType: "document",
      documentId: "doc_1",
      signerId: "user_1",
    });
    expect(r.success).toBe(false);
  });

  test("rejects invalid expiresAt format", () => {
    const r = createPublicSignatureSchema.safeParse({
      documentType: "document",
      documentId: "doc_1",
      signerId: "user_1",
      signerEmail: "a@b.co",
      expiresAt: "tomorrow",
    });
    expect(r.success).toBe(false);
  });
});
