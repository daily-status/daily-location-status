/*
  Warnings:

  - Made the column `occurred_at` on table `LocationReport` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE `LocationReport` MODIFY `occurred_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3);
