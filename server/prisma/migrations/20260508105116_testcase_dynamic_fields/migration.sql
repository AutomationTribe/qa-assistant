/*
  Warnings:

  - You are about to drop the column `expectedResult` on the `TestCase` table. All the data in the column will be lost.
  - You are about to drop the column `preconditions` on the `TestCase` table. All the data in the column will be lost.
  - You are about to drop the column `priority` on the `TestCase` table. All the data in the column will be lost.
  - You are about to drop the column `projectId` on the `TestCase` table. All the data in the column will be lost.
  - You are about to drop the column `steps` on the `TestCase` table. All the data in the column will be lost.
  - You are about to drop the column `testType` on the `TestCase` table. All the data in the column will be lost.
  - You are about to drop the column `ticketId` on the `TestCase` table. All the data in the column will be lost.
  - You are about to drop the column `title` on the `TestCase` table. All the data in the column will be lost.
  - Made the column `fieldValues` on table `TestCase` required. This step will fail if there are existing NULL values in that column.
  - Made the column `featureId` on table `TestCase` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE `TestCase` DROP FOREIGN KEY `TestCase_featureId_fkey`;

-- DropForeignKey
ALTER TABLE `TestCase` DROP FOREIGN KEY `TestCase_ticketId_fkey`;

-- AlterTable
ALTER TABLE `TestCase` DROP COLUMN `expectedResult`,
    DROP COLUMN `preconditions`,
    DROP COLUMN `priority`,
    DROP COLUMN `projectId`,
    DROP COLUMN `steps`,
    DROP COLUMN `testType`,
    DROP COLUMN `ticketId`,
    DROP COLUMN `title`,
    MODIFY `fieldValues` JSON NOT NULL,
    MODIFY `featureId` VARCHAR(191) NOT NULL;

-- AddForeignKey
ALTER TABLE `TestCase` ADD CONSTRAINT `TestCase_featureId_fkey` FOREIGN KEY (`featureId`) REFERENCES `Feature`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
