import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "../../../lib/supabase/server";
export async function GET(request: Request) { const url = new URL(request.url); const code = url.searchParams.get("code"); const requested = url.searchParams.get("next"); const next = requested?.startsWith("/") ? requested : "/peluquero"; if (code) await (await createSupabaseServerClient()).auth.exchangeCodeForSession(code); return NextResponse.redirect(new URL(next, url.origin)); }
