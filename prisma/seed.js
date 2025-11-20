import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {

  const password = await bcrypt.hash("Admin123!", 10);

  const adminRole = await prisma.role.create({
    data: { name: "admin" }
  });

  await prisma.user.create({
    data: {
      fullName: "Super Admin",
      email: "admin@erp.com",
      password: password,
      roleId: adminRole.id
    }
  });

  console.log("Admin created!");
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
