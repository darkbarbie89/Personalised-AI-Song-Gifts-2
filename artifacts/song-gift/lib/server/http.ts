import { NextResponse } from "next/server";

export function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message, message }, { status });
}

export function configurationError(error: unknown) {
  if (error instanceof Error && (error.message.includes("configuration is missing") ||
      error.message === "Supabase connection is unavailable." ||
      error.message.startsWith("Stripe public and secret keys must"))) {
    return jsonError(error.message, 503);
  }
  return null;
}

export function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

export function readString(record: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.length > 0) return value;
  }
  return null;
}