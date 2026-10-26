import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const destination = request.nextUrl.searchParams.get("next");
  const next =
    destination?.startsWith("/workspace") || destination?.startsWith("/dashboard") || destination === "/auth/update-password"
      ? destination
      : "/dashboard";

  if (!code) {
    return NextResponse.redirect(new URL("/auth/sign-in?error=confirmation", request.url));
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return NextResponse.redirect(new URL("/auth/sign-in?error=confirmation", request.url));
    }
  } catch {
    return NextResponse.redirect(new URL("/auth/sign-in?error=configuration", request.url));
  }

  return NextResponse.redirect(new URL(next, request.url));
}
