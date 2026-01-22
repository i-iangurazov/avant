import { NextResponse } from 'next/server';
import type { ZodError } from 'zod';

export type ApiFieldErrors = Record<string, string[]>;

export type ApiErrorPayload = {
  code: string;
  message: string;
  fields?: ApiFieldErrors;
};

export const jsonOk = <T extends Record<string, unknown>>(payload: T, init?: ResponseInit) =>
  NextResponse.json({ ok: true, ...payload }, init);

export const jsonError = (error: ApiErrorPayload, status = 400) =>
  NextResponse.json({ ok: false, error, message: error.message }, { status });

export const jsonErrorFromZod = (error: ZodError, code = 'invalid_payload') => {
  const fields = error.flatten().fieldErrors;
  return jsonError({ code, message: 'Invalid payload.', fields }, 400);
};
