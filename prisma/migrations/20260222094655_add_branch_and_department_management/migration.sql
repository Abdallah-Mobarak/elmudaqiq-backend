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
ALTER TABLE `user` ADD COLUMN `assignedDevices` VARCHAR(191) NULL,
    ADD COLUMN `branchId` INTEGER NULL,
    ADD COLUMN `emailSignature` VARCHAR(191) NULL,
    ADD COLUMN `emergencyContact` VARCHAR(191) NULL,
    ADD COLUMN `employeeId` VARCHAR(191) NULL,
    ADD COLUMN `jobTitle` VARCHAR(191) NULL,
    ADD COLUMN `language` VARCHAR(191) NULL,
    ADD COLUMN `profilePhoto` VARCHAR(191) NULL,
    ADD COLUMN `recoveryEmail` VARCHAR(191) NULL,
    ADD COLUMN `recoveryPhone` VARCHAR(191) NULL,
    ADD COLUMN `startDate` DATETIME(3) NULL,
    ADD COLUMN `suggestedUsername` VARCHAR(191) NULL,
    ADD COLUMN `timeZone` VARCHAR(191) NULL,
    ADD COLUMN `workLocation` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `Branch` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `status` ENUM('ACTIVE', 'INACTIVE') NOT NULL DEFAULT 'ACTIVE',
    `cpaWebsite` VARCHAR(191) NULL,
    `commerceWebsite` VARCHAR(191) NULL,
    `taxWebsite` VARCHAR(191) NULL,
    `subscriberId` INTEGER NOT NULL,
    `cityId` INTEGER NOT NULL,
    `managerId` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Branch_managerId_key`(`managerId`),
    INDEX `Branch_subscriberId_idx`(`subscriberId`),
    INDEX `Branch_cityId_idx`(`cityId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Department` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `subscriberId` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Department_name_subscriberId_key`(`name`, `subscriberId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `_DepartmentToUser` (
    `A` INTEGER NOT NULL,
    `B` INTEGER NOT NULL,

    UNIQUE INDEX `_DepartmentToUser_AB_unique`(`A`, `B`),
    INDEX `_DepartmentToUser_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `User` ADD CONSTRAINT `User_roleId_fkey` FOREIGN KEY (`roleId`) REFERENCES `Role`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `User` ADD CONSTRAINT `User_subscriberId_fkey` FOREIGN KEY (`subscriberId`) REFERENCES `Subscriber`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `User` ADD CONSTRAINT `User_branchId_fkey` FOREIGN KEY (`branchId`) REFERENCES `Branch`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

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

-- AddForeignKey
ALTER TABLE `Branch` ADD CONSTRAINT `Branch_subscriberId_fkey` FOREIGN KEY (`subscriberId`) REFERENCES `Subscriber`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Branch` ADD CONSTRAINT `Branch_cityId_fkey` FOREIGN KEY (`cityId`) REFERENCES `City`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Branch` ADD CONSTRAINT `Branch_managerId_fkey` FOREIGN KEY (`managerId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Department` ADD CONSTRAINT `Department_subscriberId_fkey` FOREIGN KEY (`subscriberId`) REFERENCES `Subscriber`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_DepartmentToUser` ADD CONSTRAINT `_DepartmentToUser_A_fkey` FOREIGN KEY (`A`) REFERENCES `Department`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_DepartmentToUser` ADD CONSTRAINT `_DepartmentToUser_B_fkey` FOREIGN KEY (`B`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
