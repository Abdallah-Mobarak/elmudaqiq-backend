/*
  Warnings:

  - Added the required column `subscriberId` to the `AccountGuide` table without a default value. This is not possible if the table is not empty.
  - Added the required column `subscriberId` to the `FileStage` table without a default value. This is not possible if the table is not empty.
  - Added the required column `subscriberId` to the `ReviewGuide` table without a default value. This is not possible if the table is not empty.
  - Added the required column `subscriberId` to the `ReviewMarkIndex` table without a default value. This is not possible if the table is not empty.
  - Added the required column `subscriberId` to the `ReviewObjectiveStage` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX `ActivityLog_subscriberId_fkey` ON `activitylog`;

-- DropIndex
DROP INDEX `ActivityLog_userId_fkey` ON `activitylog`;

-- DropIndex
DROP INDEX `City_countryId_fkey` ON `city`;

-- DropIndex
DROP INDEX `Complaint_subscriberId_fkey` ON `complaint`;

-- DropIndex
DROP INDEX `Notification_subscriberId_fkey` ON `notification`;

-- DropIndex
DROP INDEX `Payment_subscriberId_fkey` ON `payment`;

-- DropIndex
DROP INDEX `Payment_subscriptionId_fkey` ON `payment`;

-- DropIndex
DROP INDEX `Region_cityId_fkey` ON `region`;

-- DropIndex
DROP INDEX `Subscriber_cityId_fkey` ON `subscriber`;

-- DropIndex
DROP INDEX `Subscriber_countryId_fkey` ON `subscriber`;

-- DropIndex
DROP INDEX `Subscription_planId_fkey` ON `subscription`;

-- DropIndex
DROP INDEX `Subscription_subscriberId_fkey` ON `subscription`;

-- DropIndex
DROP INDEX `User_roleId_fkey` ON `user`;

-- DropIndex
DROP INDEX `User_subscriberId_fkey` ON `user`;

-- AlterTable
ALTER TABLE `accountguide` ADD COLUMN `subscriberId` INTEGER NOT NULL,
    MODIFY `level` VARCHAR(191) NOT NULL;

-- AlterTable
ALTER TABLE `filestage` ADD COLUMN `subscriberId` INTEGER NOT NULL;

-- AlterTable
ALTER TABLE `reviewguide` ADD COLUMN `subscriberId` INTEGER NOT NULL;

-- AlterTable
ALTER TABLE `reviewmarkindex` ADD COLUMN `subscriberId` INTEGER NOT NULL;

-- AlterTable
ALTER TABLE `reviewobjectivestage` ADD COLUMN `subscriberId` INTEGER NOT NULL;

-- CreateTable
CREATE TABLE `AccountGuideTemplate` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `level` TEXT NOT NULL,
    `accountNumber` INTEGER NOT NULL,
    `accountName` TEXT NOT NULL,
    `rulesAndRegulations` TEXT NULL,
    `disclosureNotes` TEXT NULL,
    `code1` TEXT NULL,
    `code2` TEXT NULL,
    `code3` TEXT NULL,
    `code4` TEXT NULL,
    `code5` TEXT NULL,
    `code6` TEXT NULL,
    `code7` TEXT NULL,
    `code8` TEXT NULL,
    `objectiveCode` TEXT NULL,
    `relatedObjectives` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ReviewGuideTemplate` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `level` VARCHAR(191) NULL,
    `separator` VARCHAR(191) NULL,
    `number` VARCHAR(191) NULL,
    `statement` VARCHAR(191) NULL,
    `purpose` VARCHAR(191) NULL,
    `conclusion` VARCHAR(191) NULL,
    `attachments` VARCHAR(191) NULL,
    `notes1` VARCHAR(191) NULL,
    `notes2` VARCHAR(191) NULL,
    `notes3` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `FileStageTemplate` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `stageCode` VARCHAR(191) NULL,
    `stage` VARCHAR(191) NULL,
    `entityType` VARCHAR(191) NULL,
    `economicSector` VARCHAR(191) NULL,
    `procedure` VARCHAR(191) NULL,
    `scopeOfProcedure` VARCHAR(191) NULL,
    `selectionMethod` VARCHAR(191) NULL,
    `examplesOfUse` VARCHAR(191) NULL,
    `IAS` VARCHAR(191) NULL,
    `IFRS` VARCHAR(191) NULL,
    `ISA` VARCHAR(191) NULL,
    `relevantPolicies` VARCHAR(191) NULL,
    `detailedExplanation` VARCHAR(191) NULL,
    `formsToBeCompleted` VARCHAR(191) NULL,
    `practicalProcedures` VARCHAR(191) NULL,
    `associatedRisks` VARCHAR(191) NULL,
    `riskLevel` VARCHAR(191) NULL,
    `responsibleAuthority` VARCHAR(191) NULL,
    `outputs` VARCHAR(191) NULL,
    `implementationPeriod` VARCHAR(191) NULL,
    `strengths` VARCHAR(191) NULL,
    `potentialWeaknesses` VARCHAR(191) NULL,
    `performanceIndicators` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ReviewObjectiveStageTemplate` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `codesCollected` VARCHAR(191) NULL,
    `numberOfCollectedObjectives` INTEGER NULL,
    `ethicalCompliancePercentage` DOUBLE NULL,
    `professionalPlanningPercentage` DOUBLE NULL,
    `internalControlPercentage` DOUBLE NULL,
    `evidencePercentage` DOUBLE NULL,
    `evaluationPercentage` DOUBLE NULL,
    `documentationPercentage` DOUBLE NULL,
    `totalRelativeWeight` DOUBLE NULL,
    `codeOfEthics` VARCHAR(191) NULL,
    `policies` VARCHAR(191) NULL,
    `ifrs` VARCHAR(191) NULL,
    `ias` VARCHAR(191) NULL,
    `notes` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ReviewMarkIndexTemplate` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `codeImage` VARCHAR(191) NULL,
    `name` VARCHAR(191) NULL,
    `shortDescription` VARCHAR(191) NULL,
    `suggestedStage` VARCHAR(191) NULL,
    `whenToUse` VARCHAR(191) NULL,
    `exampleShortForm` VARCHAR(191) NULL,
    `sectorTags` VARCHAR(191) NULL,
    `assertion` VARCHAR(191) NULL,
    `benchmark` VARCHAR(191) NULL,
    `scoreWeight` DOUBLE NULL,
    `severityLevel` INTEGER NULL,
    `severityWeight` DOUBLE NULL,
    `priorityScore` DOUBLE NULL,
    `priorityRating` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `AccountGuide_subscriberId_idx` ON `AccountGuide`(`subscriberId`);

-- CreateIndex
CREATE INDEX `AccountGuide_accountNumber_idx` ON `AccountGuide`(`accountNumber`);

-- CreateIndex
CREATE INDEX `AccountGuide_level_idx` ON `AccountGuide`(`level`);

-- CreateIndex
CREATE INDEX `FileStage_subscriberId_idx` ON `FileStage`(`subscriberId`);

-- CreateIndex
CREATE INDEX `ReviewGuide_subscriberId_idx` ON `ReviewGuide`(`subscriberId`);

-- CreateIndex
CREATE INDEX `ReviewMarkIndex_subscriberId_idx` ON `ReviewMarkIndex`(`subscriberId`);

-- CreateIndex
CREATE INDEX `ReviewObjectiveStage_subscriberId_idx` ON `ReviewObjectiveStage`(`subscriberId`);

-- AddForeignKey
ALTER TABLE `User` ADD CONSTRAINT `User_roleId_fkey` FOREIGN KEY (`roleId`) REFERENCES `Role`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `User` ADD CONSTRAINT `User_subscriberId_fkey` FOREIGN KEY (`subscriberId`) REFERENCES `Subscriber`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `City` ADD CONSTRAINT `City_countryId_fkey` FOREIGN KEY (`countryId`) REFERENCES `Country`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Region` ADD CONSTRAINT `Region_cityId_fkey` FOREIGN KEY (`cityId`) REFERENCES `City`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AccountGuide` ADD CONSTRAINT `AccountGuide_subscriberId_fkey` FOREIGN KEY (`subscriberId`) REFERENCES `Subscriber`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ReviewGuide` ADD CONSTRAINT `ReviewGuide_subscriberId_fkey` FOREIGN KEY (`subscriberId`) REFERENCES `Subscriber`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FileStage` ADD CONSTRAINT `FileStage_subscriberId_fkey` FOREIGN KEY (`subscriberId`) REFERENCES `Subscriber`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ReviewObjectiveStage` ADD CONSTRAINT `ReviewObjectiveStage_subscriberId_fkey` FOREIGN KEY (`subscriberId`) REFERENCES `Subscriber`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ReviewMarkIndex` ADD CONSTRAINT `ReviewMarkIndex_subscriberId_fkey` FOREIGN KEY (`subscriberId`) REFERENCES `Subscriber`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Subscription` ADD CONSTRAINT `Subscription_subscriberId_fkey` FOREIGN KEY (`subscriberId`) REFERENCES `Subscriber`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Subscription` ADD CONSTRAINT `Subscription_planId_fkey` FOREIGN KEY (`planId`) REFERENCES `Plan`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Subscriber` ADD CONSTRAINT `Subscriber_countryId_fkey` FOREIGN KEY (`countryId`) REFERENCES `Country`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Subscriber` ADD CONSTRAINT `Subscriber_cityId_fkey` FOREIGN KEY (`cityId`) REFERENCES `City`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Complaint` ADD CONSTRAINT `Complaint_subscriberId_fkey` FOREIGN KEY (`subscriberId`) REFERENCES `Subscriber`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Notification` ADD CONSTRAINT `Notification_subscriberId_fkey` FOREIGN KEY (`subscriberId`) REFERENCES `Subscriber`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ActivityLog` ADD CONSTRAINT `ActivityLog_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ActivityLog` ADD CONSTRAINT `ActivityLog_subscriberId_fkey` FOREIGN KEY (`subscriberId`) REFERENCES `Subscriber`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Payment` ADD CONSTRAINT `Payment_subscriberId_fkey` FOREIGN KEY (`subscriberId`) REFERENCES `Subscriber`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Payment` ADD CONSTRAINT `Payment_subscriptionId_fkey` FOREIGN KEY (`subscriptionId`) REFERENCES `Subscription`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
