-- AlterTable
ALTER TABLE `Project` ADD COLUMN `baseUrl` VARCHAR(191) NULL,
    ADD COLUMN `description` TEXT NULL,
    ADD COLUMN `logins` JSON NULL;
