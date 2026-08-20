import ManageAppointment from "./ManageAppointment";
export default async function ManageAppointmentPage({ params }: { params: Promise<{ token: string }> }) { const { token } = await params; return <ManageAppointment token={token} />; }
