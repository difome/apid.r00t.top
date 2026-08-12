-- CreateTable
CREATE TABLE `Currency` (
    `key` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `source` VARCHAR(191) NOT NULL,
    `baseCurrency` VARCHAR(191) NOT NULL,
    `targetCurrency` VARCHAR(191) NOT NULL,
    `symbol` VARCHAR(191) NULL,
    `emoji` VARCHAR(191) NULL,
    `params` JSON NULL,
    `order` INTEGER NOT NULL DEFAULT 0,
    `enabled` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Currency_baseCurrency_targetCurrency_key`(`baseCurrency`, `targetCurrency`),
    PRIMARY KEY (`key`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
