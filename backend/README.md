# ZiyoHotel Backend

Yotoqxona boshqaruv tizimi REST API: NestJS + Prisma + PostgreSQL.

## Requirements

- Node.js 20+
- PostgreSQL 16+
- npm

## Installation

```bash
cd backend
npm install
cp .env.example .env
```

`.env` ichida `JWT_ACCESS_SECRET` va `JWT_REFRESH_SECRET` kamida 32 belgi bo‘lishi shart.

## PostgreSQL setup

Development:

```bash
docker compose up -d postgres
```

Yoki o‘z PostgreSQL instansiyangizda `ziyohotel` bazasini yarating.

## Prisma migration

```bash
npx prisma generate
npx prisma migrate deploy
```

Developmentda:

```bash
npx prisma migrate dev
```

Productionda `prisma db push` ishlatilmaydi.

## Seed (faqat development)

```bash
# .env: SEED_DEV_PASSWORD=...
npm run prisma:seed
```

Test loginlar (development):

| Login | Role | Panel |
|---|---|---|
| `admin` | SYSTEM_ADMIN | `/admin` |
| `reception` | RECEPTION | `/register` |
| `boshliq` | MANAGER | `/manager` |

Production paroli seedga yozilmaydi.

## Development

```bash
npm run start:dev
```

API: http://localhost:4000/api/v1

## Build

```bash
npm run build
```

## Production start

```bash
npx prisma migrate deploy
npx prisma generate
npm run start:prod
```

## Swagger

http://localhost:4000/api/docs

## Testing

```bash
npm test
npm run test:e2e
```

Majburiy e2e: ikkita parallel check-in — faqat bittasi 201, ikkinchisi 409.

## Backup

`POST /api/v1/admin/backups` `pg_dump` orqali `BACKUP_DIR` (default `./storage/backups`) ga yozadi. Papka public web root emas.

Restore HTTP orqali avtomatik `pg_restore` qilinmaydi. Runbook:

1. Maintenance window
2. Yangi backup oling
3. Serverda: `pg_restore -d $DATABASE_URL storage/backups/<file>.sql`
4. `prisma migrate deploy`
5. Audit logda RESTORE qayd qiling

## Deployment

1. `frontend/` va `backend/` alohida deploy qilinadi
2. Frontend `API_URL` / rewrite `/api/v1` ni backendga yo‘naltiradi
3. CORS `FRONTEND_URL` whitelist
4. Secrets faqat environment
5. HTTPS + Secure cookie productionda

## Roles

- `RECEPTION` — operatsion 5 modul
- `SYSTEM_ADMIN` — tizim boshqaruvi
- `MANAGER` — faqat o‘qish
