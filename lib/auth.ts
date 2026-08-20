import { createSupabaseServerClient } from "./supabase/server";

export async function getAuthenticatedBarber() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: account } = await supabase.from("barber_users").select("barber_id, barbers(id, name)").eq("user_id", user.id).maybeSingle();
  if (!account) return null;
  const related = account.barbers as unknown;
  const barber = (Array.isArray(related) ? related[0] : related) as { name?: string } | null;
  return { user, id: account.barber_id as string, name: barber?.name ?? "Peluquero", email: user.email ?? "" };
}
