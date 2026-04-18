CREATE TABLE `email_logs` (
  `id` VARCHAR(191) NOT NULL,
  `toAddress` VARCHAR(1000) NOT NULL,
  `ccAddress` VARCHAR(1000) NULL,
  `subject` VARCHAR(500) NOT NULL,
  `bodyPreview` TEXT NULL,
  `provider` VARCHAR(50) NOT NULL DEFAULT 'smtp',
  `isMock` BOOLEAN NOT NULL DEFAULT true,
  `status` VARCHAR(30) NOT NULL,
  `attempts` INTEGER NOT NULL DEFAULT 0,
  `messageId` VARCHAR(255) NULL,
  `errorMessage` TEXT NULL,
  `sentAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  INDEX `email_logs_status_createdAt_idx`(`status`, `createdAt`),
  INDEX `email_logs_createdAt_idx`(`createdAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
