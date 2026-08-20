import { chatGPTSignOutPath, requireChatGPTUser } from "../chatgpt-auth";
import { BARBERS, barberFromEmail } from "../../lib/barbers";
import BarberDashboard from "./BarberDashboard";

export const dynamic = "force-dynamic";

export default async function BarberPage() {
  const user = await requireChatGPTUser("/peluquero");
  const barberId = barberFromEmail(user.email);
  if (!barberId) return <main className="access-denied"><div className="andalusian-star"><i /><i /></div><h1>Acceso no autorizado</h1><p>El correo {user.email} no está asociado a ningún peluquero.</p><a href={chatGPTSignOutPath("/peluquero")}>Cerrar sesión</a></main>;
  return <BarberDashboard barber={BARBERS[barberId]} signOutPath={chatGPTSignOutPath("/peluquero")} />;
}
