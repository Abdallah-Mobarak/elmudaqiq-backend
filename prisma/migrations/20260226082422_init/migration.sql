-- CreateTable
CREATE TABLE `Role` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `Role_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `User` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `fullName` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `password` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(191) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'active',
    `mustChangePassword` BOOLEAN NOT NULL DEFAULT false,
    `roleId` INTEGER NOT NULL,
    `subscriberId` INTEGER NULL,
    `branchId` INTEGER NULL,
    `otp` VARCHAR(191) NULL,
    `otpExpiresAt` DATETIME(3) NULL,
    `employeeId` VARCHAR(191) NULL,
    `jobTitle` VARCHAR(191) NULL,
    `startDate` DATETIME(3) NULL,
    `language` VARCHAR(191) NULL,
    `timeZone` VARCHAR(191) NULL,
    `workLocation` VARCHAR(191) NULL,
    `profilePhoto` VARCHAR(191) NULL,
    `emailSignature` VARCHAR(191) NULL,
    `emergencyContact` VARCHAR(191) NULL,
    `assignedDevices` VARCHAR(191) NULL,
    `recoveryEmail` VARCHAR(191) NULL,
    `recoveryPhone` VARCHAR(191) NULL,
    `suggestedUsername` VARCHAR(191) NULL,
    `permissions` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `User_email_subscriberId_key`(`email`, `subscriberId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Country` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `cpaWebsite` VARCHAR(191) NULL,
    `commerceWebsite` VARCHAR(191) NULL,
    `taxWebsite` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Country_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `City` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `countryId` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Region` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `cityId` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SystemSettings` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `companyName` VARCHAR(191) NULL,
    `companyEmail` VARCHAR(191) NULL,
    `companyPhone` VARCHAR(191) NULL,
    `address` VARCHAR(191) NULL,
    `taxNumber` VARCHAR(191) NULL,
    `commercialRegister` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AuthorityWebsite` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `url` VARCHAR(191) NOT NULL,
    `category` VARCHAR(191) NULL,
    `notes` VARCHAR(191) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

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
CREATE TABLE `AccountGuide` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `subscriberId` INTEGER NOT NULL,
    `level` VARCHAR(191) NOT NULL,
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

    INDEX `AccountGuide_subscriberId_idx`(`subscriberId`),
    INDEX `AccountGuide_accountNumber_idx`(`accountNumber`),
    INDEX `AccountGuide_level_idx`(`level`),
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
    `responsiblePerson` VARCHAR(191) NULL,
    `datePrepared` DATETIME(3) NULL,
    `dateReviewed` DATETIME(3) NULL,
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
CREATE TABLE `ReviewGuide` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `subscriberId` INTEGER NOT NULL,
    `level` VARCHAR(191) NULL,
    `separator` VARCHAR(191) NULL,
    `number` VARCHAR(191) NULL,
    `statement` VARCHAR(191) NULL,
    `purpose` VARCHAR(191) NULL,
    `responsiblePerson` VARCHAR(191) NULL,
    `datePrepared` DATETIME(3) NULL,
    `dateReviewed` DATETIME(3) NULL,
    `conclusion` VARCHAR(191) NULL,
    `attachments` VARCHAR(191) NULL,
    `notes1` VARCHAR(191) NULL,
    `notes2` VARCHAR(191) NULL,
    `notes3` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `ReviewGuide_subscriberId_idx`(`subscriberId`),
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
CREATE TABLE `FileStage` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `subscriberId` INTEGER NOT NULL,
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

    INDEX `FileStage_subscriberId_idx`(`subscriberId`),
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
CREATE TABLE `ReviewObjectiveStage` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `subscriberId` INTEGER NOT NULL,
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

    INDEX `ReviewObjectiveStage_subscriberId_idx`(`subscriberId`),
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

-- CreateTable
CREATE TABLE `ReviewMarkIndex` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `subscriberId` INTEGER NOT NULL,
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

    INDEX `ReviewMarkIndex_subscriberId_idx`(`subscriberId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Subscription` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `subscriberId` INTEGER NOT NULL,
    `planId` INTEGER NOT NULL,
    `startDate` DATETIME(3) NOT NULL,
    `endDate` DATETIME(3) NOT NULL,
    `amountPaid` DOUBLE NOT NULL,
    `paymentMethod` VARCHAR(191) NULL,
    `paymentStatus` VARCHAR(191) NOT NULL DEFAULT 'PAID',
    `status` ENUM('ACTIVE', 'EXPIRED', 'CANCELLED', 'PENDING') NOT NULL DEFAULT 'ACTIVE',
    `gracePeriodEnd` DATETIME(3) NULL,
    `autoRenew` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Subscriber` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `countryId` INTEGER NOT NULL,
    `cityId` INTEGER NOT NULL,
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
    `commercialActivityFile` VARCHAR(191) NOT NULL,
    `commercialRegisterDate` DATETIME(3) NOT NULL,
    `commercialExpireDate` DATETIME(3) NULL,
    `fiscalYear` DATETIME(3) NOT NULL,
    `subscriberEmail` VARCHAR(191) NOT NULL,
    `primaryMobile` VARCHAR(191) NOT NULL,
    `status` ENUM('ACTIVE', 'INACTIVE', 'PENDING', 'SUSPENDED') NOT NULL DEFAULT 'PENDING',
    `subscriptionDate` DATETIME(3) NULL,
    `lastLogin` DATETIME(3) NULL,
    `internalNotes` VARCHAR(191) NULL,
    `lastRenewalNotification` DATETIME(3) NULL,
    `renewalStatus` VARCHAR(191) NOT NULL DEFAULT 'PENDING',
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

-- CreateTable
CREATE TABLE `Complaint` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `subscriberId` INTEGER NOT NULL,
    `subscriberName` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `message` VARCHAR(191) NOT NULL,
    `type` ENUM('COMMERCIAL', 'TECHNICAL') NOT NULL,
    `complaintDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `response` VARCHAR(191) NULL,
    `respondedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Notification` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `title` VARCHAR(191) NOT NULL,
    `message` VARCHAR(191) NOT NULL,
    `subscriberId` INTEGER NULL,
    `isRead` BOOLEAN NOT NULL DEFAULT false,
    `type` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ActivityLog` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NULL,
    `subscriberId` INTEGER NULL,
    `userType` VARCHAR(191) NOT NULL,
    `action` VARCHAR(191) NOT NULL,
    `message` VARCHAR(191) NOT NULL,
    `ipAddress` VARCHAR(191) NULL,
    `userAgent` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `UploadedFile` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `path` VARCHAR(191) NOT NULL,
    `size` INTEGER NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `source` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Payment` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `subscriberId` INTEGER NOT NULL,
    `subscriptionId` INTEGER NULL,
    `amount` DOUBLE NOT NULL,
    `method` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL,
    `paidAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Plan` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `durationMonths` INTEGER NOT NULL,
    `paidFees` DOUBLE NOT NULL,
    `usersLimit` INTEGER NOT NULL,
    `fileLimit` INTEGER NOT NULL,
    `maxFileSizeMB` INTEGER NULL,
    `branchesLimit` INTEGER NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Branch` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `cityName` VARCHAR(191) NULL,
    `status` ENUM('ACTIVE', 'INACTIVE') NOT NULL DEFAULT 'ACTIVE',
    `subscriberId` INTEGER NOT NULL,
    `managerId` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Branch_managerId_key`(`managerId`),
    INDEX `Branch_subscriberId_idx`(`subscriberId`),
    PRIMARY KEY (`id`)
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
ALTER TABLE `Branch` ADD CONSTRAINT `Branch_managerId_fkey` FOREIGN KEY (`managerId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
