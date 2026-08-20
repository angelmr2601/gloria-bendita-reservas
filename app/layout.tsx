import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "Gloria Bendita | Reserva tu cita", description: "Reserva tu cita en Gloria Bendita. Elige peluquero, fecha y hora en menos de un minuto.", other: { "codex-preview": "development" } };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="es"><body>{children}</body></html>; }
