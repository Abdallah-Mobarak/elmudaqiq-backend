-- DropIndex
DROP INDEX `City_countryId_fkey` ON `city`;

-- DropIndex
DROP INDEX `Region_cityId_fkey` ON `region`;

-- DropIndex
DROP INDEX `User_roleId_fkey` ON `user`;

-- CreateTable
CREATE TABLE `Subscriber` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `countryId` INTEGER NOT NULL,
    `cityId` INTEGER NOT NULL,
    `regionId` INTEGER NOT NULL,
    `cpaWebsite` VARCHAR(191) NULL,
    `commerceWebsite` VARCHAR(191) NULL,
    `taxWebsite` VARCHAR(191) NULL,
    `licenseType` VARCHAR(191) NOT NULL,
    `licenseNumber` VARCHAR(191) NOT NULL,
    `licenseCertificate` VARCHAR(191) NOT NULL,
    `licenseDate` DATETIME(3) NOT NULL,
    `licenseName` VARCHAR(191) NOT NULL,
    `legalEntityType` VARCHAR(191) NOT NULL,
    `legalEntityNationality` VARCHAR(191) NOT NULL,
    `articlesOfAssociationFile` VARCHAR(191) NULL,
    `commercialRegisterFile` VARCHAR(191) NULL,
    `ownersNames` VARCHAR(191) NOT NULL,
    `commercialRegisterNumber` VARCHAR(191) NOT NULL,
    `taxNumber` VARCHAR(191) NOT NULL,
    `taxCertificateFile` VARCHAR(191) NOT NULL,
    `unifiedNumber` VARCHAR(191) NOT NULL,
    `unifiedNumberFile` VARCHAR(191) NOT NULL,
    `commercialActivityFile` VARCHAR(191) NOT NULL,
    `commercialRegisterDate` DATETIME(3) NOT NULL,
    `fiscalYear` DATETIME(3) NOT NULL,
    `subscriberEmail` VARCHAR(191) NOT NULL,
    `primaryMobile` VARCHAR(191) NOT NULL,
    `status` ENUM('ACTIVE', 'INACTIVE', 'PENDING', 'SUSPENDED') NOT NULL DEFAULT 'PENDING',
    `subscriptionDate` DATETIME(3) NULL,
    `lastLogin` DATETIME(3) NULL,
    `internalNotes` VARCHAR(191) NULL,
    `subscriptionType` VARCHAR(191) NULL,
    `subscriptionStartDate` DATETIME(3) NULL,
    `subscriptionEndDate` DATETIME(3) NULL,
    `paidFees` DOUBLE NULL,
    `paymentMethod` VARCHAR(191) NULL,
    `numberOfUsers` INTEGER NULL,
    `numberOfClients` INTEGER NULL,
    `numberOfBranches` INTEGER NULL,
    `facilityLink` VARCHAR(191) NULL,
    `factoryLogo` VARCHAR(191) NULL,
    `language` VARCHAR(191) NULL,
    `currency` VARCHAR(191) NULL,
    `subdomain` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Subscriber_licenseNumber_key`(`licenseNumber`),
    UNIQUE INDEX `Subscriber_subdomain_key`(`subdomain`),
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
