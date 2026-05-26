/*
  Warnings:

  - Made the column `description` on table `Feature` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE `Feature` ADD COLUMN `acceptanceCriteria` TEXT NULL,
    ADD COLUMN `contextImages` JSON NULL,
    ADD COLUMN `testData` TEXT NULL,
    ADD COLUMN `uiNotes` TEXT NULL;

-- Update NULL descriptions to empty string
UPDATE `Feature` SET `description` = '' WHERE `description` IS NULL;

-- AlterTable
ALTER TABLE `Feature` MODIFY `description` TEXT NOT NULL;
