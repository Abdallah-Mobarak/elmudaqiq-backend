-- DropIndex
DROP INDEX `City_countryId_fkey` ON `city`;

-- DropIndex
DROP INDEX `Region_cityId_fkey` ON `region`;

-- DropIndex
DROP INDEX `User_roleId_fkey` ON `user`;

-- CreateTable
CREATE TABLE `AccountGuide` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `level` VARCHAR(191) NOT NULL,
    `accountNumber` INTEGER NOT NULL,
    `accountName` VARCHAR(191) NOT NULL,
    `rulesAndRegulations` VARCHAR(191) NULL,
    `disclosureNotes` VARCHAR(191) NULL,
    `code1` VARCHAR(191) NULL,
    `code2` VARCHAR(191) NULL,
    `code3` VARCHAR(191) NULL,
    `code4` VARCHAR(191) NULL,
    `code5` VARCHAR(191) NULL,
    `code6` VARCHAR(191) NULL,
    `code7` VARCHAR(191) NULL,
    `code8` VARCHAR(191) NULL,
    `objectiveCode` VARCHAR(191) NULL,
    `relatedObjectives` VARCHAR(191) NULL,
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
