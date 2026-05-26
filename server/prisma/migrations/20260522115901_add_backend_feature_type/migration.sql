-- AlterTable
ALTER TABLE `Feature` ADD COLUMN `endpoints` JSON NULL,
    MODIFY `type` ENUM('NEW_FEATURE', 'BUG', 'BACKEND_API') NOT NULL;
