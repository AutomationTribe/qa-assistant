-- AlterTable
ALTER TABLE `TestCase` ADD COLUMN `zephyrId` INTEGER NULL,
    ADD COLUMN `zephyrKey` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `ZephyrConnection` (
    `id` VARCHAR(191) NOT NULL,
    `projectId` VARCHAR(191) NOT NULL,
    `apiToken` TEXT NOT NULL,
    `jiraProjectKey` VARCHAR(191) NOT NULL,
    `fieldMapping` JSON NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ZephyrConnection_projectId_key`(`projectId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ZephyrConnection` ADD CONSTRAINT `ZephyrConnection_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `Project`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
