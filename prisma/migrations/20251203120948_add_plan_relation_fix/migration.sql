/*
  Warnings:

  - You are about to drop the column `numberOfBranches` on the `subscriber` table. All the data in the column will be lost.
  - You are about to drop the column `numberOfClients` on the `subscriber` table. All the data in the column will be lost.
  - You are about to drop the column `numberOfUsers` on the `subscriber` table. All the data in the column will be lost.
  - You are about to drop the column `subscriptionType` on the `subscriber` table. All the data in the column will be lost.

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
DROP INDEX `Region_cityId_fkey` ON `region`;

-- DropIndex
DROP INDEX `Subscriber_cityId_fkey` ON `subscriber`;

-- DropIndex
DROP INDEX `Subscriber_countryId_fkey` ON `subscriber`;

-- DropIndex
DROP INDEX `Subscriber_regionId_fkey` ON `subscriber`;

-- DropIndex
DROP INDEX `User_roleId_fkey` ON `user`;

-- AlterTable
ALTER TABLE `subscriber` DROP COLUMN `numberOfBranches`,
    DROP COLUMN `numberOfClients`,
    DROP COLUMN `numberOfUsers`,
    DROP COLUMN `subscriptionType`,
    ADD COLUMN `planId` INTEGER NULL;

-- CreateTable
CREATE TABLE `Plan` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `durationMonths` INTEGER NOT NULL,
    `paidFees` DOUBLE NOT NULL,
    `usersLimit` INTEGER NOT NULL,
    `clientsLimit` INTEGER NOT NULL,
    `branchesLimit` INTEGER NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
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

-- AddForeignKey
ALTER TABLE `Subscriber` ADD CONSTRAINT `Subscriber_countryId_fkey` FOREIGN KEY (`countryId`) REFERENCES `Country`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Subscriber` ADD CONSTRAINT `Subscriber_cityId_fkey` FOREIGN KEY (`cityId`) REFERENCES `City`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Subscriber` ADD CONSTRAINT `Subscriber_regionId_fkey` FOREIGN KEY (`regionId`) REFERENCES `Region`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Subscriber` ADD CONSTRAINT `Subscriber_planId_fkey` FOREIGN KEY (`planId`) REFERENCES `Plan`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

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
