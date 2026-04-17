-- Add dedicated supporting document column for extension requests
ALTER TABLE `extensions`
  ADD COLUMN `supportingDocument` LONGTEXT NULL AFTER `reason`;