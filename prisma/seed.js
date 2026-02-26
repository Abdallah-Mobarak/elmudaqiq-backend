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

  // ===============================
  // 4 Seed Master Account Guide TEMPLATE (Example Data)
  // ===============================
  const existingGuides = await prisma.accountGuideTemplate.count();
  
  if (existingGuides === 0) {
    await prisma.accountGuideTemplate.createMany({
      data: [
        { level: "1", accountNumber: 1, accountName: "Assets" },
        { level: "2", accountNumber: 11, accountName: "Current Assets" },
        { level: "3", accountNumber: 1101, accountName: "Cash and Cash Equivalents" },
        { level: "1", accountNumber: 2, accountName: "Liabilities" },
        { level: "2", accountNumber: 21, accountName: "Current Liabilities" }
      ]
    });
    console.log("✅ Master Account Guide Templates seeded");
  }

  // ===============================
  // 5 Seed Review Guide TEMPLATE
  // ===============================
  const existingReviewGuides = await prisma.reviewGuideTemplate.count();
  if (existingReviewGuides === 0) {
    await prisma.reviewGuideTemplate.createMany({
      data: [
        { level: "1", number: "100", statement: "General Planning", purpose: "Initial assessment" },
        { level: "2", number: "101", statement: "Client Acceptance", purpose: "Risk evaluation" }
      ]
    });
    console.log("✅ Master Review Guide Templates seeded");
  }

  // ===============================
  // 6 Seed File Stage TEMPLATE
  // ===============================
  const existingFileStages = await prisma.fileStageTemplate.count();
  if (existingFileStages === 0) {
    await prisma.fileStageTemplate.createMany({
      data: [
        { stageCode: "PLAN", stage: "Planning Phase", entityType: "Corporate", procedure: "Define Scope" },
        { stageCode: "EXEC", stage: "Execution Phase", entityType: "Corporate", procedure: "Fieldwork" }
      ]
    });
    console.log("✅ Master File Stage Templates seeded");
  }

  // ===============================
  // 7 Seed Review Objective Stage TEMPLATE
  // ===============================
  const existingObjectives = await prisma.reviewObjectiveStageTemplate.count();
  if (existingObjectives === 0) {
    await prisma.reviewObjectiveStageTemplate.createMany({
      data: [
        { 
          codesCollected: "ETH,PLN", 
          numberOfCollectedObjectives: 2, 
          ethicalCompliancePercentage: 20,
          professionalPlanningPercentage: 30,
          totalRelativeWeight: 50
        }
      ]
    });
    console.log("✅ Master Review Objective Stage Templates seeded");
  }

  // ===============================
  // 8 Seed Review Mark Index TEMPLATE
  // ===============================
  const existingMarks = await prisma.reviewMarkIndexTemplate.count();
  if (existingMarks === 0) {
    await prisma.reviewMarkIndexTemplate.createMany({
      data: [
        { name: "Verified", shortDescription: "Confirmed with external source", scoreWeight: 10, severityLevel: 1 },
        { name: "Calculated", shortDescription: "Recalculated by auditor", scoreWeight: 5, severityLevel: 1 }
      ]
    });
    console.log("✅ Master Review Mark Index Templates seeded");
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
