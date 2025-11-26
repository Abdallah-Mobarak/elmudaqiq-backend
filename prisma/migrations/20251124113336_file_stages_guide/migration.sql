-- DropIndex
DROP INDEX `City_countryId_fkey` ON `city`;

-- DropIndex
DROP INDEX `Region_cityId_fkey` ON `region`;

-- DropIndex
DROP INDEX `User_roleId_fkey` ON `user`;

-- CreateTable
CREATE TABLE `FileStage` (
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

-- AddForeignKey
ALTER TABLE `User` ADD CONSTRAINT `User_roleId_fkey` FOREIGN KEY (`roleId`) REFERENCES `Role`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `City` ADD CONSTRAINT `City_countryId_fkey` FOREIGN KEY (`countryId`) REFERENCES `Country`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Region` ADD CONSTRAINT `Region_cityId_fkey` FOREIGN KEY (`cityId`) REFERENCES `City`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
