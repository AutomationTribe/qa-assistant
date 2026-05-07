-- AlterTable
ALTER TABLE `TestCase` ADD COLUMN `fieldValues` JSON NULL;

-- CreateTable
CREATE TABLE `TestCaseTemplate` (
    `id` VARCHAR(191) NOT NULL,
    `projectId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `TestCaseTemplate_projectId_key`(`projectId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TestCaseField` (
    `id` VARCHAR(191) NOT NULL,
    `templateId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `key` VARCHAR(191) NOT NULL,
    `type` ENUM('TEXT', 'TEXTAREA', 'STEPS', 'SELECT', 'MULTISELECT', 'BOOLEAN', 'NUMBER') NOT NULL,
    `description` TEXT NULL,
    `required` BOOLEAN NOT NULL DEFAULT true,
    `order` INTEGER NOT NULL,
    `options` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `TestCaseTemplate` ADD CONSTRAINT `TestCaseTemplate_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `Project`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TestCaseField` ADD CONSTRAINT `TestCaseField_templateId_fkey` FOREIGN KEY (`templateId`) REFERENCES `TestCaseTemplate`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
