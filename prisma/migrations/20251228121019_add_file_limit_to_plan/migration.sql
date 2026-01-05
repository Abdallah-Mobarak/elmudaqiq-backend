/*
  Warnings:

  - You are about to drop the column `clientsLimit` on the `plan` table. All the data in the column will be lost.
  - You are about to drop the column `unifiedNumberFile` on the `subscriber` table. All the data in the column will be lost.
  - Added the required column `fileLimit` to the `Plan` table without a default value. This is not possible if the table is not empty.

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
DROP INDEX `Subscriber_planId_fkey` ON `subscriber`;

-- DropIndex
DROP INDEX `User_roleId_fkey` ON `user`;

-- AlterTable
ALTER TABLE `plan` DROP COLUMN `clientsLimit`,
    ADD COLUMN `fileLimit` INTEGER NOT NULL,
    ADD COLUMN `maxFileSizeMB` INTEGER NULL;

-- AlterTable
ALTER TABLE `subscriber` DROP COLUMN `unifiedNumberFile`;

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
