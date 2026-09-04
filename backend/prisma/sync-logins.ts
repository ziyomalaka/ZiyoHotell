import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const accounts = [
  {
    oldLogins: ['admin', 'shoxrux'],
    login: 'shoxrux',
    password: 'shoxrux571',
    fullName: 'Dasturiy Admin',
    role: 'SYSTEM_ADMIN',
  },
  {
    oldLogins: ['boshliq'],
    login: 'boshliq',
    password: 'boshliq123',
    fullName: 'Boshliq',
    role: 'MANAGER',
  },
  {
    oldLogins: ['reception'],
    login: 'reception',
    password: 'reception',
    fullName: 'Karimova Dilnoza',
    phone: '998901234567',
    role: 'RECEPTION',
  },
];

async function main() {
  for (const account of accounts) {
    const passwordHash = await bcrypt.hash(account.password, 12);
    const existing = await prisma.user.findFirst({
      where: { login: { in: account.oldLogins } },
    });
    if (existing) {
      await prisma.user.update({
        where: { id: existing.id },
        data: {
          login: account.login,
          passwordHash,
          fullName: account.fullName,
          role: account.role,
          workStatus: 'ACTIVE',
          isActive: true,
          mustChangePassword: false,
          ...('phone' in account ? { phone: account.phone } : {}),
        },
      });
      await prisma.refreshToken.deleteMany({ where: { userId: existing.id } });
      console.log('Yangilandi:', account.login);
    } else {
      await prisma.user.create({
        data: {
          login: account.login,
          passwordHash,
          fullName: account.fullName,
          role: account.role,
          workStatus: 'ACTIVE',
          isActive: true,
          phone: 'phone' in account ? account.phone : null,
        },
      });
      console.log('Yaratildi:', account.login);
    }
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
