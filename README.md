# Prode con Amigos 🏆⚽

Esta es una app que hice para mi grupo de amigos. Es algo sencillo pero está bueno para seguir practicando conceptos y mejorar habilidades.

## Stack

| Mobile + Web | Expo (React Native + Web PWA) |
| Backend | Node.js + Express + TypeScript |
| Base de datos | PostgreSQL + Prisma ORM |
| Auth | JWT + bcrypt |
| Emails | Resend |
| API de fútbol | football-data.org |

## Estructura del Monorepo

```
├── apps/
│   ├── api/       → Backend (Express + Prisma)
│   └── mobile/    → App Expo (Android + Web)
├── packages/
│   └── shared/    → Tipos TypeScript compartidos
```

## Comandos

```bash
# Instalar dependencias
pnpm install

# Desarrollo
pnpm dev:api        # Backend en http://localhost:3001
pnpm dev:mobile     # App Expo en Expo Go
pnpm dev:web        # Web en http://localhost:8081

# Base de datos
pnpm db:migrate     # Crear/actualizar tablas
pnpm db:studio      # Abrir Prisma Studio (visual)
pnpm db:seed        # Poblar datos iniciales

# Build
pnpm build:api      # Compilar backend
```

## Variables de Entorno

Crear archivo `.env` en `apps/api/`:

```env
DATABASE_URL=postgresql://user:pass@host:5432/prode
JWT_SECRET=tu-secreto-super-seguro
JWT_REFRESH_SECRET=otro-secreto-diferente
FOOTBALL_API_KEY=tu-api-key-de-football-data
RESEND_API_KEY=tu-api-key-de-resend
PORT=3001
NODE_ENV=development
```
