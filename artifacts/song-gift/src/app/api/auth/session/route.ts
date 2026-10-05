import { NextRequest, NextResponse } from "next/server";
import { authSessionSchema } from "@/lib/server/schemas";
import { AUTH_COOKIE, getAdminSupabase } from "@/lib/server/supabase";
import { configurationError, jsonError } from "@/lib/server/http";

export async function POST(request: NextRequest) {
  try {
    const body = authSessionSchema.safeParse(await request.json().catch(() => null));
    if (!body.success) return jsonError("A valid sign-in session is required.", 400);

    const { data, error } = await getAdminSupabase().auth.getUser(body.data.accessToken);
    if (error || !data.user) return jsonError("Your sign-in session has expired.", 401);

    const response = NextResponse.json({ ok: true });
    response.cookies.set({
      name: AUTH_COOKIE,
      value: body.data.accessToken,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60,
    });
    return response;
  } catch (error) {
    return configurationError(error) ?? jsonError("Could not create a secure session.", 500);
  }
}