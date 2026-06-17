/**
 * Create AuditFinding + OpinionDecision tables with the SAME charset/collation
 * (utf8mb4_unicode_ci) as the existing tables, so the FK to EngagementContract
 * succeeds. (prisma db push created them with a mismatched default collation.)
 */
const prisma = require("../src/config/prisma");

(async () => {
  await prisma.$executeRawUnsafe("SET FOREIGN_KEY_CHECKS=0");
  await prisma.$executeRawUnsafe("DROP TABLE IF EXISTS `AuditFinding`");
  await prisma.$executeRawUnsafe("DROP TABLE IF EXISTS `OpinionDecision`");

  await prisma.$executeRawUnsafe(
    "CREATE TABLE `AuditFinding` (" +
      "`id` VARCHAR(191) NOT NULL," +
      "`contractId` VARCHAR(191) NOT NULL," +
      "`analyticalGroup` VARCHAR(191) NOT NULL," +
      "`problemType` VARCHAR(191) NOT NULL," +
      "`material` BOOLEAN NOT NULL DEFAULT false," +
      "`pervasive` BOOLEAN NOT NULL DEFAULT false," +
      "`description` TEXT NULL," +
      "`createdById` INT NULL," +
      "`createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)," +
      "`updatedAt` DATETIME(3) NOT NULL," +
      "PRIMARY KEY (`id`)," +
      "INDEX `AuditFinding_contractId_idx` (`contractId`)," +
      "CONSTRAINT `AuditFinding_contractId_fkey` FOREIGN KEY (`contractId`) REFERENCES `EngagementContract`(`id`) ON DELETE CASCADE ON UPDATE CASCADE" +
      ") DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
  );

  await prisma.$executeRawUnsafe(
    "CREATE TABLE `OpinionDecision` (" +
      "`id` VARCHAR(191) NOT NULL," +
      "`contractId` VARCHAR(191) NOT NULL," +
      "`proposedType` VARCHAR(191) NOT NULL," +
      "`finalType` VARCHAR(191) NOT NULL," +
      "`status` VARCHAR(191) NOT NULL DEFAULT 'PROPOSED'," +
      "`overridden` BOOLEAN NOT NULL DEFAULT false," +
      "`reason` TEXT NULL," +
      "`confirmedById` INT NULL," +
      "`confirmedAt` DATETIME(3) NULL," +
      "`createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)," +
      "`updatedAt` DATETIME(3) NOT NULL," +
      "PRIMARY KEY (`id`)," +
      "UNIQUE INDEX `OpinionDecision_contractId_key` (`contractId`)," +
      "CONSTRAINT `OpinionDecision_contractId_fkey` FOREIGN KEY (`contractId`) REFERENCES `EngagementContract`(`id`) ON DELETE CASCADE ON UPDATE CASCADE" +
      ") DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
  );

  await prisma.$executeRawUnsafe("SET FOREIGN_KEY_CHECKS=1");
  console.log("✅ tables AuditFinding + OpinionDecision created (utf8mb4_unicode_ci)");
  await prisma.$disconnect();
})().catch(async (e) => {
  console.error("ERR:", e.message);
  await prisma.$disconnect();
  process.exit(1);
});
