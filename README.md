# Gloria Bendita · Reservas

Aplicación web de reservas de Gloria Bendita, desarrollada con Next.js 16 y Supabase.

## Funcionalidades

### Para clientes

- Reserva por peluquero, servicio, fecha y hora.
- Precio y duración propios para cada servicio y peluquero.
- Confirmación por correo electrónico.
- Enlace privado para cambiar o cancelar una cita.
- Bloqueo automático de horas ocupadas y fechas de ausencia.

### Para peluqueros

- Acceso individual mediante correo y contraseña con Supabase Auth.
- Cada peluquero solo consulta y gestiona sus propias citas.
- Cambio de fecha y hora o cancelación de citas.
- Configuración de horas disponibles para un día concreto.
- Modificación del precio y la duración de los servicios.
- Gestión de vacaciones, enfermedad, festivos y otras ausencias.
- Ausencias de un día, rangos de fechas o sin fecha de regreso.
- Aviso y listado de citas afectadas antes de confirmar una ausencia.
- Recuperación de contraseña mediante correo electrónico.

## Requisitos

- Node.js 22.13 o posterior.
- npm.
- Un proyecto de Supabase.
- El webhook de Gmail Apps Script si se quieren enviar confirmaciones.

## Preparar el proyecto en local

Clona el repositorio y entra en su carpeta:

```powershell
git clone https://github.com/angelmr2601/gloria-bendita-reservas.git
cd gloria-bendita-reservas
```

Si vas a trabajar en una rama ya existente:

```powershell
git checkout nombre-de-la-rama
git pull origin nombre-de-la-rama
```

Instala las dependencias y crea tu configuración local:

```powershell
npm install
Copy-Item .env.example .env.local
```

Completa `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-clave-publica
SUPABASE_SERVICE_ROLE_KEY=tu-clave-privada-del-servidor

GMAIL_WEBHOOK_URL=https://script.google.com/macros/s/TU_IMPLEMENTACION/exec
GMAIL_WEBHOOK_SECRET=tu-secreto
GMAIL_FROM_EMAIL=reservas@ejemplo.com
```

Importante:

- La clave pública de Supabase puede utilizarse en el navegador.
- `SUPABASE_SERVICE_ROLE_KEY` y `GMAIL_WEBHOOK_SECRET` son privados.
- Nunca subas `.env.local` a GitHub.
- No añadas `NEXT_PUBLIC_` a la clave `service_role`.

Inicia la aplicación:

```powershell
npm run dev
```

- Reservas: `http://localhost:3000`
- Panel de peluqueros: `http://localhost:3000/peluquero`

## Preparar Supabase

En **Supabase → SQL Editor**, ejecuta estas migraciones por orden:

1. `supabase/migrations/20260820_001_initial_schema.sql`
2. `supabase/migrations/20260820_002_date_blocks_and_service_duration.sql`
3. `supabase/migrations/20260821_003_absence_details.sql`

La primera migración crea las tablas de peluqueros, usuarios, servicios, disponibilidad y reservas. Las siguientes incorporan los cierres por fechas y la gestión completa de ausencias.

### Crear y vincular un peluquero

1. En **Authentication → Users**, crea el usuario con su correo y contraseña.
2. Activa la confirmación del usuario si se crea manualmente.
3. Ejecuta en SQL Editor, sustituyendo el correo y el identificador:

```sql
insert into public.barber_users (user_id, barber_id)
select id, 'peluquero-1'
from auth.users
where lower(email) = lower('correo-del-peluquero@ejemplo.com')
on conflict (user_id)
do update set barber_id = excluded.barber_id;
```

Identificadores iniciales:

- `peluquero-1`: Javi Pérez.
- `peluquero-2`: Iván.

Cada cuenta necesita un correo diferente.

### Recuperación de contraseña

En **Authentication → URL Configuration** configura:

```text
Site URL: http://localhost:3000
Redirect URL: http://localhost:3000/auth/callback
```

Cuando la aplicación esté desplegada, añade también la URL pública equivalente.

## Correo de confirmación

El código del webhook está en `integrations/gmail-apps-script.gs`.

Las reservas se guardan aunque el correo no esté configurado. Para enviar la confirmación y el enlace privado de gestión deben estar definidas las tres variables `GMAIL_*`.

No publiques la URL real del webhook ni su secreto en el repositorio.

## Validación antes de subir cambios

```powershell
npm run lint
npm run build
```

Ambos comandos deben terminar sin errores.

## Forma de trabajar con Git

No trabajes directamente sobre `main`. Antes de empezar una tarea:

```powershell
git checkout main
git pull origin main
git checkout -b nombre-del-cambio
```

Para guardar y publicar los cambios:

```powershell
git status
git add -- ruta-del-archivo
git commit -m "Descripción del cambio"
git push -u origin nombre-del-cambio
```

Después crea una Pull Request hacia `main`. Revisa siempre `git status` antes de añadir archivos y no incluyas `.env.local` en ningún commit.

## Comandos disponibles

- `npm run dev`: inicia el entorno local.
- `npm run lint`: comprueba el código.
- `npm run build`: genera la versión de producción.
- `npm run start`: inicia la versión compilada.
