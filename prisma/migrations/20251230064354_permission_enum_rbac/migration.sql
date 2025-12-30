/*
  Warnings:

  - You are about to drop the column `action` on the `permission` table. All the data in the column will be lost.
  - You are about to drop the column `module` on the `permission` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[code]` on the table `Permission` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `code` to the `Permission` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX `Permission_module_action_key` ON `permission`;

-- AlterTable
ALTER TABLE `permission` DROP COLUMN `action`,
    DROP COLUMN `module`,
    ADD COLUMN `code` ENUM('VIEW_DASHBOARD', 'MANAGE_CHILDREN', 'MANAGE_PARENTS', 'MANAGE_IMMUNIZATION', 'MANAGE_VACCINES', 'MANAGE_USERS', 'MANAGE_ROLES', 'MANAGE_ADMINISTRATION') NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX `Permission_code_key` ON `Permission`(`code`);
