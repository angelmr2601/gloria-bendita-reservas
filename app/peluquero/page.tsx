import { getAuthenticatedBarber } from "../../lib/auth";
import BarberDashboard from "./BarberDashboard";
import LoginForm from "./LoginForm";

export const dynamic = "force-dynamic";

export default async function BarberPage() {
  const barber = await getAuthenticatedBarber();
  if (!barber) return <LoginForm />;
  return <BarberDashboard barber={barber} />;
}
