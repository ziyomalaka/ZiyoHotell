# ZiyoHotel Frontend

Next.js UI. API so‘rovlari `/api/v1/*` orqali NestJS backendga rewrite qilinadi.

```bash
cp .env.example .env
# JWT_ACCESS_SECRET backenddagi bilan bir xil bo‘lsin
npm install
npm run dev
```

`API_URL` default: `http://localhost:4000`

Sahifalar:

- Reception: `/register`, `/rooms`, `/stays`, `/payments`, `/reports`
- Dasturiy Admin: `/admin`
- Boshliq: `/manager`
