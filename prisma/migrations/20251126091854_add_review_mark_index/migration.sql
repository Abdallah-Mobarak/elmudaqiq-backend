-- DropIndex
DROP INDEX `City_countryId_fkey` ON `city`;

-- DropIndex
DROP INDEX `Region_cityId_fkey` ON `region`;

-- DropIndex
DROP INDEX `User_roleId_fkey` ON `user`;

-- CreateTable
CREATE TABLE `ReviewMarkIndex` (
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

-- AddForeignKey
ALTER TABLE `User` ADD CONSTRAINT `User_roleId_fkey` FOREIGN KEY (`roleId`) REFERENCES `Role`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `City` ADD CONSTRAINT `City_countryId_fkey` FOREIGN KEY (`countryId`) REFERENCES `Country`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Region` ADD CONSTRAINT `Region_cityId_fkey` FOREIGN KEY (`cityId`) REFERENCES `City`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
