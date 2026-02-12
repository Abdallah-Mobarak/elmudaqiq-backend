const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {

  // ===============================
  // 1 Seed Roles
  // ===============================
  const roles = [
    "ADMIN",
    "SUBSCRIBER_OWNER",
    "BRANCH_MANAGER",
    "SECRETARY",
    "AUDIT_MANAGER",
    "TECHNICAL_AUDITOR"
  ];

  for (const roleName of roles) {
    const exists = await prisma.role.findUnique({
      where: { name: roleName }
    });

    if (!exists) {
      await prisma.role.create({ data: { name: roleName } });
    }
  }

  // ===============================
  // 2 Get ADMIN Role
  // ===============================
  const adminRole = await prisma.role.findUnique({
    where: { name: "ADMIN" }
  });

  // ===============================
  // 3 Create Super Admin (NO UPSERT)
  // ===============================
  const adminEmail = "admin@erp.com";

  const existingAdmin = await prisma.user.findFirst({
    where: {
      email: adminEmail,
      subscriberId: null
    }
  });

  if (!existingAdmin) {
    const password = await bcrypt.hash("Admin123!", 10);

    await prisma.user.create({
      data: {
        fullName: "Super Admin",
        email: adminEmail,
        password,
        roleId: adminRole.id,
        subscriberId: null, //  
        status: "active"
      }
    });

    console.log(" Super Admin created");
  } else {
    console.log("ℹ Super Admin already exists");
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
