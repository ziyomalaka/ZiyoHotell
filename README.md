# ZiyoHotel

Yotoqxona boshqaruv tizimi. Frontend va backend alohida papkalar.

```
ZiyoHotell/
  frontend/   Next.js UI
  backend/    NestJS REST API + Prisma + PostgreSQL
```

## Ishga tushirish

PostgreSQL ishlashi shart. Keyin **bitta buyruq** bilan ikkalasi ochiladi:

```bash
cd ZiyoHotell
npm run dev
```

Yoki alohida terminallarda:

```bash
cd backend
npm run dev
```

```bash
cd frontend
npm run dev
```

Development loginlar (`SEED_DEV_PASSWORD`, default `.env.example` da `12345`):

- `admin` — Dasturiy Admin
- `reception` — Reception
- `boshliq` — Boshliq

## Arxitektura

Next.js (cookie + rewrite `/api/v1`) → NestJS REST → Prisma → PostgreSQL
