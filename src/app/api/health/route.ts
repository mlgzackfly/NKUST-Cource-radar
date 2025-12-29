import { NextResponse } from "next/server";

export async function GET(): Promise<Response> {
  return Response.json({ ok: true });
}
