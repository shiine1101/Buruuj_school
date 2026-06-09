# Buruuj School Bus Management System

Simple full-stack project structure for the Buruuj School Bus Management System.

```text
buruuj-school-bus/
├── backend/
│   ├── src/
│   ├── prisma/
│   ├── package.json
│   ├── .env.example
│   └── nest-cli.json
├── frontend/
│   ├── app/
│   ├── components/
│   ├── lib/
│   ├── public/
│   ├── package.json
│   └── .env.local.example
└── README.md
```

## Run Locally

Backend:

```bash
cd backend
npm install
cp .env.example .env
npm run prisma:generate
npm run start:dev
```

Frontend:

```bash
cd frontend
npm install
cp .env.local.example .env.local
npm run dev
```

## Demo Roles

- Admin: full access
- Financial Officer: payments, maintenance, reports
- Driver: dashboard, my students, attendance, breakdown reports, my bus
- Parent: dashboard, my children, payments, attendance, notifications, profile

## Included

- Next.js 15 frontend with TypeScript, Tailwind CSS, React Query, Zustand, React Hook Form, Zod, Lucide Icons
- NestJS backend with Prisma, PostgreSQL, JWT auth, refresh tokens, RBAC guards
- Complete Prisma data model for students, drivers, buses, maintenance, payments, attendance, reports, audit logs, notifications, users, roles, backups, and academic years
- Dashboard, login, role permissions, module tables, reports, settings, and AI assistant UI
