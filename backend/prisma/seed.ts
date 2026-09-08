import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { DEFAULT_ROLE_PERMISSIONS } from '../src/common/roles';

const prisma = new PrismaClient();

if (process.env.NODE_ENV === 'production') {
  console.error('Development seed productionda ishlatilmaydi.');
  process.exit(1);
}

const ACCOUNTS = {
  admin: { login: 'shoxrux', password: 'shoxrux571', fullName: 'Dasturiy Admin', role: 'SYSTEM_ADMIN' as const },
  manager: { login: 'boshliq', password: 'boshliq123', fullName: 'Boshliq', role: 'MANAGER' as const },
  reception: {
    login: 'reception',
    password: 'reception',
    fullName: 'Karimova Dilnoza',
    phone: '998901234567',
    role: 'RECEPTION' as const,
  },
};

const settings: Record<string, string> = {
  hostelName: 'Ziyo yotoqxona',
  phone: '+998 71 200 00 00',
  address: 'Toshkent',
  hours: '24/7',
  currency: 'UZS',
  dateFormat: 'DD.MM.YYYY',
  dailyPrice: '25000',
  monthlyPrice: '750000',
  paymentDueDays: '5',
  allowPartial: 'true',
  payCash: 'true',
  payCard: 'true',
  payBank: 'true',
  payOther: 'true',
  sessionHours: '12',
  loginAttempts: '5',
  minPassword: '5',
  strongPassword: 'false',
  blockMinutes: '15',
  auditEnabled: 'true',
};

const roleNames: Record<string, string> = {
  SYSTEM_ADMIN: 'Dasturiy Admin',
  RECEPTION: 'Admin / Reception',
  MANAGER: 'Boshliq',
};

async function main() {
  for (const code of ['SYSTEM_ADMIN', 'RECEPTION', 'MANAGER'] as const) {
    await prisma.role.upsert({
      where: { code },
      update: { name: roleNames[code], permissions: JSON.stringify(DEFAULT_ROLE_PERMISSIONS[code]) },
      create: {
        code,
        name: roleNames[code],
        permissions: JSON.stringify(DEFAULT_ROLE_PERMISSIONS[code]),
      },
    });
  }
  for (const [key, value] of Object.entries(settings)) {
    await prisma.setting.upsert({
      where: { key },
      update: {},
      create: { key, value },
    });
  }

  const receptionHash = await bcrypt.hash(ACCOUNTS.reception.password, 12);
  await prisma.user.upsert({
    where: { login: ACCOUNTS.reception.login },
    update: {
      passwordHash: receptionHash,
      fullName: ACCOUNTS.reception.fullName,
      phone: ACCOUNTS.reception.phone,
      role: ACCOUNTS.reception.role,
      workStatus: 'ACTIVE',
      isActive: true,
    },
    create: {
      login: ACCOUNTS.reception.login,
      passwordHash: receptionHash,
      fullName: ACCOUNTS.reception.fullName,
      phone: ACCOUNTS.reception.phone,
      role: ACCOUNTS.reception.role,
      workStatus: 'ACTIVE',
      isActive: true,
    },
  });

  const adminHash = await bcrypt.hash(ACCOUNTS.admin.password, 12);
  await prisma.user.upsert({
    where: { login: ACCOUNTS.admin.login },
    update: {
      passwordHash: adminHash,
      fullName: ACCOUNTS.admin.fullName,
      role: ACCOUNTS.admin.role,
      workStatus: 'ACTIVE',
      isActive: true,
    },
    create: {
      login: ACCOUNTS.admin.login,
      passwordHash: adminHash,
      fullName: ACCOUNTS.admin.fullName,
      role: ACCOUNTS.admin.role,
      workStatus: 'ACTIVE',
      isActive: true,
    },
  });

  const managerHash = await bcrypt.hash(ACCOUNTS.manager.password, 12);
  await prisma.user.upsert({
    where: { login: ACCOUNTS.manager.login },
    update: {
      passwordHash: managerHash,
      fullName: ACCOUNTS.manager.fullName,
      role: ACCOUNTS.manager.role,
      workStatus: 'ACTIVE',
      isActive: true,
    },
    create: {
      login: ACCOUNTS.manager.login,
      passwordHash: managerHash,
      fullName: ACCOUNTS.manager.fullName,
      role: ACCOUNTS.manager.role,
      workStatus: 'ACTIVE',
      isActive: true,
    },
  });

  const blockedHash = await bcrypt.hash('blocked123', 12);
  await prisma.user.upsert({
    where: { login: 'blocked' },
    update: { workStatus: 'BLOCKED', isActive: false },
    create: {
      login: 'blocked',
      passwordHash: blockedHash,
      fullName: 'Bloklangan xodim',
      role: 'RECEPTION',
      workStatus: 'BLOCKED',
      isActive: false,
    },
  });

  if ((await prisma.floor.count()) === 0) {
    await prisma.floor.create({ data: { number: 1, name: '1-qavat', status: 'ACTIVE' } });
  }

  console.log('Development seed OK. Loginlar: shoxrux / boshliq / reception');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
