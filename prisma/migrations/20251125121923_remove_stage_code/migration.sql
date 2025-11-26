-- DropIndex
DROP INDEX `City_countryId_fkey` ON `city`;

-- DropIndex
DROP INDEX `Region_cityId_fkey` ON `region`;

-- DropIndex
DROP INDEX `User_roleId_fkey` ON `user`;

-- CreateTable
CREATE TABLE `ReviewObjectiveStage` (
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
    `implementationStatus` VARCHAR(191) NULL,
    `actualPerformance` DOUBLE NULL,
    `gapPercentage` DOUBLE NULL,
    `codeOfEthics` VARCHAR(191) NULL,
    `policies` VARCHAR(191) NULL,
    `ifrs` VARCHAR(191) NULL,
    `ias` VARCHAR(191) NULL,
    `notes` VARCHAR(191) NULL,
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
