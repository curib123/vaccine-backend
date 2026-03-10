-- CreateEnum
CREATE TYPE "PermissionCode" AS ENUM (
    'VIEW_DASHBOARD',
    'MANAGE_CHILDREN',
    'MANAGE_PARENTS',
    'MANAGE_IMMUNIZATION',
    'MANAGE_VACCINES',
    'MANAGE_USERS',
    'MANAGE_ROLES',
    'MANAGE_ADMINISTRATION'
);

-- DropIndex
DROP INDEX "Permission_module_action_key";

-- AlterTable
ALTER TABLE "Permission" ADD COLUMN "code" "PermissionCode";

-- AlterTable
ALTER TABLE "Permission" DROP COLUMN "action",
DROP COLUMN "module";

-- AlterTable
ALTER TABLE "Permission" ALTER COLUMN "code" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Permission_code_key" ON "Permission"("code");

-- DropEnum
DROP TYPE "PermissionAction";

-- DropEnum
DROP TYPE "PermissionModule";
