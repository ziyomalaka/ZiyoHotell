import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

const skip = !process.env.DATABASE_URL;

function cookieHeader(res: { headers: { ['set-cookie']?: string | string[] } }) {
  const raw = res.headers['set-cookie'];
  if (!raw) return '';
  return Array.isArray(raw) ? raw.join('; ') : raw;
}

describe('ZiyoHotel e2e', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let receptionCookie = '';
  let managerCookie = '';
  let adminCookie = '';

  beforeAll(async () => {
    if (skip) return;
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.use(cookieParser());
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  const login = async (loginName: string, password = process.env.SEED_DEV_PASSWORD || '12345') => {
    const res = await request(app.getHttpServer()).post('/api/v1/auth/login').send({ login: loginName, password });
    return res;
  };

  it('login success', async () => {
    if (skip) return;
    const res = await login('reception', 'reception');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.data.role).toBe('RECEPTION');
    receptionCookie = cookieHeader(res);

  });

  it('wrong password', async () => {
    if (skip) return;
    const res = await login('reception', 'wrong');
    expect(res.status).toBe(401);
  });

  it('blocked user', async () => {
    if (skip) return;
    const res = await login('blocked', 'blocked123');
    expect(res.status).toBe(403);
  });

  it('admin and manager login', async () => {
    if (skip) return;
    const admin = await login('shoxrux', 'shoxrux571');
    const boss = await login('boshliq', 'boshliq123');
    expect(admin.status).toBe(200);
    expect(boss.status).toBe(200);
    adminCookie = cookieHeader(admin);
    managerCookie = cookieHeader(boss);
  });

  it('manager cannot POST payment', async () => {
    if (skip) return;
    const res = await request(app.getHttpServer())
      .post('/api/v1/reception/payments')
      .set('Cookie', managerCookie)
      .send({ stayId: '00000000-0000-0000-0000-000000000001', amount: 1000, method: 'CASH' });
    expect(res.status).toBe(403);
  });

  it('system admin can open dashboard', async () => {
    if (skip) return;
    const res = await request(app.getHttpServer()).get('/api/v1/admin/dashboard').set('Cookie', adminCookie);
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  it('parallel check-in on one bed: one 201, one 409', async () => {
    if (skip) return;
    const bed = await prisma.bed.findFirst({
      where: { status: 'ACTIVE', occupancy: null, room: { status: 'ACTIVE' } },
    });
    expect(bed).toBeTruthy();
    const payload = (passport: string) => ({
      fullName: 'Race Test',
      phone: '998900000001',
      gender: 'MALE',
      passportId: passport,
      bedId: bed!.id,
      stayType: 'DAILY',
      startDate: '2026-08-25',
      daysCount: 1,
      paidAmount: 0,
      paymentStatus: 'UNPAID',
    });
    const [a, b] = await Promise.all([
      request(app.getHttpServer())
        .post('/api/v1/reception/customers/register')
        .set('Cookie', receptionCookie)
        .send(payload(`RACE-A-${Date.now()}`)),
      request(app.getHttpServer())
        .post('/api/v1/reception/customers/register')
        .set('Cookie', receptionCookie)
        .send(payload(`RACE-B-${Date.now()}`)),
    ]);
    const statuses = [a.status, b.status].sort();
    expect(statuses).toEqual([201, 409]);
    const fail = a.status === 409 ? a : b;
    expect(fail.body.code).toBe('BED_ALREADY_OCCUPIED');
  });

  it('payment idempotency', async () => {
    if (skip) return;
    const stay = await prisma.stay.findFirst({ where: { status: 'ACTIVE' } });
    expect(stay).toBeTruthy();
    const key = `idem-${Date.now()}`;
    const body = { stayId: stay!.id, amount: 1000, method: 'CASH', idempotencyKey: key };
    const first = await request(app.getHttpServer()).post('/api/v1/reception/payments').set('Cookie', receptionCookie).send(body);
    const second = await request(app.getHttpServer()).post('/api/v1/reception/payments').set('Cookie', receptionCookie).send(body);
    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    expect(second.body.data.id).toBe(first.body.data.id);
  });
});
