-- AlterTable
ALTER TABLE `immunizationrecord` ADD COLUMN `administeredAt` VARCHAR(191) NULL,
    ADD COLUMN `batchNumber` VARCHAR(191) NULL,
    ADD COLUMN `doseNumber` INTEGER NULL,
    ADD COLUMN `isLate` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `isMissed` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `manufacturer` VARCHAR(191) NULL,
    ADD COLUMN `nextDueDate` DATETIME(3) NULL,
    ADD COLUMN `remarks` VARCHAR(191) NULL,
    ADD COLUMN `status` ENUM('PENDING', 'COMPLETED', 'SKIPPED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
    ADD COLUMN `visitId` INTEGER NULL,
    MODIFY `dateGiven` DATETIME(3) NULL,
    MODIFY `administeredBy` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `vaccine` ADD COLUMN `boosterAfterMonths` INTEGER NULL,
    ADD COLUMN `requiresBooster` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `totalDoses` INTEGER NULL;

-- CreateTable
CREATE TABLE `ImmunizationSchedule` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `vaccineId` INTEGER NOT NULL,
    `doseLabel` VARCHAR(191) NOT NULL,
    `doseNumber` INTEGER NOT NULL,
    `recommendedAgeInMonths` INTEGER NOT NULL,
    `intervalDays` INTEGER NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ImmunizationVisit` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `childId` INTEGER NOT NULL,
    `visitDate` DATETIME(3) NOT NULL,
    `location` VARCHAR(191) NULL,
    `nurseName` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ImmunizationSummary` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `childId` INTEGER NOT NULL,
    `totalRequired` INTEGER NOT NULL,
    `totalCompleted` INTEGER NOT NULL,
    `totalMissed` INTEGER NOT NULL,
    `completionRate` DOUBLE NOT NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ImmunizationSummary_childId_key`(`childId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ImmunizationSchedule` ADD CONSTRAINT `ImmunizationSchedule_vaccineId_fkey` FOREIGN KEY (`vaccineId`) REFERENCES `Vaccine`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ImmunizationVisit` ADD CONSTRAINT `ImmunizationVisit_childId_fkey` FOREIGN KEY (`childId`) REFERENCES `Child`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ImmunizationRecord` ADD CONSTRAINT `ImmunizationRecord_visitId_fkey` FOREIGN KEY (`visitId`) REFERENCES `ImmunizationVisit`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ImmunizationSummary` ADD CONSTRAINT `ImmunizationSummary_childId_fkey` FOREIGN KEY (`childId`) REFERENCES `Child`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
