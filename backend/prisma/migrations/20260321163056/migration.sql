/*
  Warnings:

  - You are about to drop the column `person_id` on the `LocationReport` table. All the data in the column will be lost.
  - You are about to drop the `Person` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `user_id` to the `LocationReport` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `LocationReport` DROP FOREIGN KEY `LocationReport_person_id_fkey`;

-- DropIndex
DROP INDEX `LocationReport_person_id_fkey` ON `LocationReport`;

-- AlterTable
ALTER TABLE `LocationReport` DROP COLUMN `person_id`,
    ADD COLUMN `user_id` INTEGER NOT NULL;

-- DropTable
DROP TABLE `Person`;

-- CreateTable
CREATE TABLE `User` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `full_name` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(191) NOT NULL,
    `telegram_user_id` VARCHAR(191) NULL,

    UNIQUE INDEX `User_phone_key`(`phone`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `LocationReport` ADD CONSTRAINT `LocationReport_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
