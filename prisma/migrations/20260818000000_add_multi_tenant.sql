-- ============================================================
-- Migration: Add Multi-Tenant Support (White-Label)
-- Apply AFTER 20260817000000_add_unit_table.sql
-- ============================================================

USE `u826712707_alba`;

-- 1. Create Tenant table
CREATE TABLE IF NOT EXISTS `Tenant` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(191) NOT NULL,
  `appName` VARCHAR(191) NOT NULL,
  `logo` VARCHAR(191) NULL,
  `primaryColor` VARCHAR(191) NOT NULL DEFAULT '#1E3A5F',
  `secondaryColor` VARCHAR(191) NOT NULL DEFAULT '#10B981',
  `subdomain` VARCHAR(191) NULL,
  `domain` VARCHAR(191) NULL,
  `activeModules` VARCHAR(191) NOT NULL DEFAULT 'transactions,reconciliation',
  `isActive` BOOLEAN NOT NULL DEFAULT TRUE,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `Tenant_name_key`(`name`),
  UNIQUE INDEX `Tenant_subdomain_key`(`subdomain`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 2. Insert default tenant (existing data)
INSERT INTO `Tenant` (`id`, `name`, `appName`, `primaryColor`, `secondaryColor`, `activeModules`, `isActive`, `createdAt`, `updatedAt`)
VALUES (1, 'Pesantren Al-Basyariyyah', 'ALBA Finance', '#1E3A5F', '#10B981', 'transactions,reconciliation,retail,ai,inventory', TRUE, NOW(), NOW())
ON DUPLICATE KEY UPDATE `id` = 1;

-- 3. Add tenantId to User (nullable for Superadmin)
ALTER TABLE `User` ADD COLUMN `tenantId` INT NULL AFTER `id`;
UPDATE `User` SET `tenantId` = 1 WHERE `tenantId` IS NULL;
ALTER TABLE `User` ADD INDEX `User_tenantId_idx`(`tenantId`);

-- 4. Add tenantId to Unit + unique composite
ALTER TABLE `Unit` ADD COLUMN `tenantId` INT NOT NULL DEFAULT 1 AFTER `id`;
ALTER TABLE `Unit` DROP INDEX `name`;
ALTER TABLE `Unit` ADD UNIQUE INDEX `Unit_tenantId_name_key`(`tenantId`, `name`);
ALTER TABLE `Unit` ADD INDEX `Unit_tenantId_idx`(`tenantId`);

-- 5. Add tenantId, unitId to Transaction
ALTER TABLE `Transaction` ADD COLUMN `tenantId` INT NOT NULL DEFAULT 1 AFTER `id`;
ALTER TABLE `Transaction` ADD COLUMN `unitId` INT NOT NULL DEFAULT 1 AFTER `tenantId`;
ALTER TABLE `Transaction` ADD INDEX `Transaction_tenantId_unitId_idx`(`tenantId`, `unitId`);
ALTER TABLE `Transaction` ADD INDEX `Transaction_tenantId_status_idx`(`tenantId`, `status`);

-- 6. Add tenantId, unitId to Reconciliation
ALTER TABLE `Reconciliation` ADD COLUMN `tenantId` INT NOT NULL DEFAULT 1 AFTER `id`;
ALTER TABLE `Reconciliation` ADD COLUMN `unitId` INT NOT NULL DEFAULT 1 AFTER `tenantId`;
ALTER TABLE `Reconciliation` ADD INDEX `Reconciliation_tenantId_unitId_idx`(`tenantId`, `unitId`);
ALTER TABLE `Reconciliation` ADD INDEX `Reconciliation_tenantId_status_idx`(`tenantId`, `status`);

-- 7. Add tenantId, unitId to Category
ALTER TABLE `Category` ADD COLUMN `tenantId` INT NOT NULL DEFAULT 1 AFTER `id`;
ALTER TABLE `Category` ADD COLUMN `unitId` INT NULL AFTER `tenantId`;
ALTER TABLE `Category` DROP INDEX `name`;
ALTER TABLE `Category` ADD UNIQUE INDEX `Category_tenantId_name_type_key`(`tenantId`, `name`, `type`);
ALTER TABLE `Category` ADD INDEX `Category_tenantId_idx`(`tenantId`);

-- 8. Retail tables - add tenantId, unitId
ALTER TABLE `Supplier` ADD COLUMN `tenantId` INT NOT NULL DEFAULT 1 AFTER `id`;
ALTER TABLE `Supplier` ADD COLUMN `unitId` INT NOT NULL DEFAULT 1 AFTER `tenantId`;
ALTER TABLE `Supplier` ADD INDEX `Supplier_tenantId_unitId_idx`(`tenantId`, `unitId`);

ALTER TABLE `PurchaseOrder` ADD COLUMN `tenantId` INT NOT NULL DEFAULT 1 AFTER `id`;
ALTER TABLE `PurchaseOrder` ADD COLUMN `unitId` INT NOT NULL DEFAULT 1 AFTER `tenantId`;
ALTER TABLE `PurchaseOrder` ADD INDEX `PurchaseOrder_tenantId_unitId_status_idx`(`tenantId`, `unitId`, `status`);

ALTER TABLE `InventoryItem` ADD COLUMN `tenantId` INT NOT NULL DEFAULT 1 AFTER `id`;
ALTER TABLE `InventoryItem` ADD COLUMN `unitId` INT NOT NULL DEFAULT 1 AFTER `tenantId`;
ALTER TABLE `InventoryItem` ADD INDEX `InventoryItem_tenantId_unitId_idx`(`tenantId`, `unitId`);

ALTER TABLE `PosSale` ADD COLUMN `tenantId` INT NOT NULL DEFAULT 1 AFTER `id`;
ALTER TABLE `PosSale` ADD COLUMN `unitId` INT NOT NULL DEFAULT 1 AFTER `tenantId`;
ALTER TABLE `PosSale` ADD INDEX `PosSale_tenantId_unitId_idx`(`tenantId`, `unitId`);

ALTER TABLE `CashierShift` ADD COLUMN `tenantId` INT NOT NULL DEFAULT 1 AFTER `id`;
ALTER TABLE `CashierShift` ADD COLUMN `unitId` INT NOT NULL DEFAULT 1 AFTER `tenantId`;
ALTER TABLE `CashierShift` ADD INDEX `CashierShift_tenantId_unitId_status_idx`(`tenantId`, `unitId`, `status`);

-- 9. Cross-cutting tables
ALTER TABLE `AuditLog` ADD COLUMN `tenantId` INT NULL AFTER `id`;
ALTER TABLE `AuditLog` ADD INDEX `AuditLog_tenantId_idx`(`tenantId`);

ALTER TABLE `Notification` ADD COLUMN `tenantId` INT NOT NULL DEFAULT 1 AFTER `id`;
ALTER TABLE `Notification` ADD INDEX `Notification_tenantId_userId_read_idx`(`tenantId`, `userId`, `read`);

-- 10. New table: StaffRequest
CREATE TABLE IF NOT EXISTS `StaffRequest` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `tenantId` INT NOT NULL,
  `unitId` INT NOT NULL,
  `userId` INT NOT NULL,
  `title` VARCHAR(191) NOT NULL,
  `description` TEXT NULL,
  `amount` DECIMAL(18,2) NOT NULL,
  `status` VARCHAR(191) NOT NULL DEFAULT 'Pending',
  `approvedById` INT NULL,
  `approvedAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `StaffRequest_tenantId_status_idx`(`tenantId`, `status`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 11. Update Unit balance to Decimal(18,2)
ALTER TABLE `Unit` MODIFY `balance` DECIMAL(18,2) NOT NULL DEFAULT 0;

-- 12. Rename InventoryItem.unit -> unitOfMeasure (handled by Prisma)
-- Note: column rename needs manual ALTER if column exists
-- ALTER TABLE `InventoryItem` CHANGE `unit` `unitOfMeasure` VARCHAR(191) NOT NULL;