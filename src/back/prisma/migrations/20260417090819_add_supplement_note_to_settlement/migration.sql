-- AlterTable
ALTER TABLE `extensions` MODIFY `supportingDocument` TEXT NULL;

-- AlterTable
ALTER TABLE `settlements` ADD COLUMN `supplementNote` TEXT NULL;
