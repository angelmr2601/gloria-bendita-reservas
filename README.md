# Gloria Bendita · Reservas

Aplicación web de reservas para Gloria Bendita, desarrollada con Next.js y Supabase.

## Funcionalidades

- Reserva por peluquero, servicio, fecha y hora.
- Duración y precio independientes por servicio.
- Enlace privado por correo para cambiar o cancelar una cita.
- Panel individual para cada peluquero.
- Gestión de citas, disponibilidad y precios.
- Acceso con Supabase Auth y recuperación de contraseña por correo.

## Desarrollo local

Requiere Node.js 22 o posterior.

```bash
npm install
cp .env.example .env.local
npm run dev
```

En Windows PowerShell:

```powershell
Copy-Item .env.example .env.local
npm run dev
```

La aplicación se abre en `http://localhost:3000` y el panel en
`http://localhost:3000/peluquero`.

## Configuración

Completa `.env.local` con las variables descritas en `.env.example`. No subas
claves privadas, secretos del webhook ni archivos `.env.local` al repositorio.

## Base de datos

La migración inicial está en
`supabase/migrations/20260820_001_initial_schema.sql`.

## Comandos

- `npm run dev`: inicia el entorno local.
- `npm run lint`: comprueba el código.
- `npm run build`: genera la versión de producción.
- `npm run start`: inicia la versión compilada.
