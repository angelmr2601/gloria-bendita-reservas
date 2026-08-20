import { BARBERS } from "../../../lib/barbers";
import { getBarberServices } from "../../../lib/services";
export async function GET(request: Request) {
  const barber = new URL(request.url).searchParams.get("barber") ?? "";
  if (!(barber in BARBERS)) return Response.json({ services: [] }, { status: 400 });
  const services = await getBarberServices(barber);
  return Response.json({ services });
}
