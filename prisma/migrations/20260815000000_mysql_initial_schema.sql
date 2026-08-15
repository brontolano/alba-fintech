-- ============================================================
-- ALBA Finance - MySQL Database Import
-- Target: Hostinger MySQL
-- Database: u826712707_alba
-- ============================================================

SET FOREIGN_KEY_CHECKS = 0;

-- ============================================================
-- 1. USER
-- ============================================================
CREATE TABLE IF NOT EXISTS `User` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `email` VARCHAR(255) NOT NULL UNIQUE,
  `passwordHash` VARCHAR(255) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `image` VARCHAR(255) NULL,
  `role` VARCHAR(50) NOT NULL DEFAULT 'Staff',
  `unit` VARCHAR(100) NOT NULL DEFAULT 'Kantor',
  `unitType` VARCHAR(50) NOT NULL DEFAULT 'Sederhana',
  `retailModuleEnabled` TINYINT(1) NOT NULL DEFAULT 0,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_user_role` (`role`),
  INDEX `idx_user_unit` (`unit`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 2. SYSTEM CONFIG
-- ============================================================
CREATE TABLE IF NOT EXISTS `SystemConfig` (
  `id` INT PRIMARY KEY DEFAULT 1,
  `appName` VARCHAR(255) NOT NULL DEFAULT 'ALBA Finance',
  `appLogo` VARCHAR(255) NULL,
  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO `SystemConfig` (`id`, `appName`, `updatedAt`) VALUES (1, 'ALBA Finance', NOW());

-- ============================================================
-- 3. TRANSACTION
-- ============================================================
CREATE TABLE IF NOT EXISTS `Transaction` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `userId` INT NOT NULL,
  `transactionDate` DATETIME NOT NULL,
  `unit` VARCHAR(100) NOT NULL,
  `type` VARCHAR(50) NOT NULL,
  `method` VARCHAR(50) NOT NULL,
  `category` VARCHAR(255) NOT NULL,
  `amount` DECIMAL(15,2) NOT NULL,
  `description` TEXT NULL,
  `photoUrl` VARCHAR(255) NULL,
  `status` VARCHAR(50) NOT NULL DEFAULT 'Submitted',
  `approvedById` INT NULL,
  `approvedAt` DATETIME NULL,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_transaction_user` (`userId`),
  INDEX `idx_transaction_status` (`status`),
  INDEX `idx_transaction_date` (`transactionDate`),
  CONSTRAINT `fk_transaction_user` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_transaction_approver` FOREIGN KEY (`approvedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 4. APPROVAL
-- ============================================================
CREATE TABLE IF NOT EXISTS `Approval` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `transactionId` INT NOT NULL,
  `approverId` INT NOT NULL,
  `level` VARCHAR(50) NOT NULL,
  `status` VARCHAR(50) NOT NULL,
  `notes` TEXT NULL,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_approval_transaction` (`transactionId`),
  INDEX `idx_approval_approver` (`approverId`),
  CONSTRAINT `fk_approval_transaction` FOREIGN KEY (`transactionId`) REFERENCES `Transaction`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_approval_user` FOREIGN KEY (`approverId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 5. RECONCILIATION
-- ============================================================
CREATE TABLE IF NOT EXISTS `Reconciliation` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `userId` INT NOT NULL,
  `reconciliationDate` DATETIME NOT NULL,
  `unit` VARCHAR(100) NOT NULL,
  `physicalCash` DECIMAL(15,2) NOT NULL,
  `digitalBalance` DECIMAL(15,2) NOT NULL,
  `difference` DECIMAL(15,2) NOT NULL,
  `notes` TEXT NULL,
  `status` VARCHAR(50) NOT NULL DEFAULT 'Pending',
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_reconciliation_user` (`userId`),
  INDEX `idx_reconciliation_date` (`reconciliationDate`),
  CONSTRAINT `fk_reconciliation_user` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 6. CATEGORY
-- ============================================================
CREATE TABLE IF NOT EXISTS `Category` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `type` VARCHAR(50) NOT NULL,
  `unit` VARCHAR(100) NOT NULL,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_category_unit` (`unit`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 7. SUPPLIER
-- ============================================================
CREATE TABLE IF NOT EXISTS `Supplier` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `contact` VARCHAR(255) NULL,
  `email` VARCHAR(255) NULL,
  `phone` VARCHAR(100) NULL,
  `address` TEXT NULL,
  `unitName` VARCHAR(100) NOT NULL,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 8. PURCHASE ORDER
-- ============================================================
CREATE TABLE IF NOT EXISTS `PurchaseOrder` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `supplierId` INT NOT NULL,
  `unitName` VARCHAR(100) NOT NULL,
  `orderDate` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `totalAmount` DECIMAL(15,2) NOT NULL,
  `status` VARCHAR(50) NOT NULL DEFAULT 'Pending',
  `receivedAt` DATETIME NULL,
  `notes` TEXT NULL,
  `createdById` INT NOT NULL,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_po_supplier` (`supplierId`),
  INDEX `idx_po_unit_status` (`unitName`, `status`),
  CONSTRAINT `fk_po_supplier` FOREIGN KEY (`supplierId`) REFERENCES `Supplier`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_po_creator` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 9. PURCHASE ORDER ITEM
-- ============================================================
CREATE TABLE IF NOT EXISTS `PurchaseOrderItem` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `purchaseOrderId` INT NOT NULL,
  `inventoryId` INT NOT NULL,
  `quantity` INT NOT NULL,
  `unitPrice` DECIMAL(15,2) NOT NULL,
  `subtotal` DECIMAL(15,2) NOT NULL,
  INDEX `idx_poi_order` (`purchaseOrderId`),
  CONSTRAINT `fk_poi_order` FOREIGN KEY (`purchaseOrderId`) REFERENCES `PurchaseOrder`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_poi_inventory` FOREIGN KEY (`inventoryId`) REFERENCES `InventoryItem`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 10. INVENTORY ITEM
-- ============================================================
CREATE TABLE IF NOT EXISTS `InventoryItem` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `sku` VARCHAR(255) NULL UNIQUE,
  `category` VARCHAR(255) NULL,
  `imageUrl` VARCHAR(255) NULL,
  `buyPrice` DECIMAL(15,2) NULL,
  `sellPrice` DECIMAL(15,2) NOT NULL,
  `unit` VARCHAR(50) NOT NULL,
  `stock` INT NOT NULL DEFAULT 0,
  `minStock` INT NOT NULL DEFAULT 0,
  `unitName` VARCHAR(100) NOT NULL,
  `createdById` INT NOT NULL,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_inventory_unit` (`unitName`),
  CONSTRAINT `fk_inventory_creator` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 11. STOCK MOVEMENT
-- ============================================================
CREATE TABLE IF NOT EXISTS `StockMovement` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `inventoryId` INT NOT NULL,
  `type` VARCHAR(10) NOT NULL,
  `quantity` INT NOT NULL,
  `note` TEXT NULL,
  `createdById` INT NOT NULL,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_movement_inventory` (`inventoryId`),
  CONSTRAINT `fk_movement_inventory` FOREIGN KEY (`inventoryId`) REFERENCES `InventoryItem`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_movement_user` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 12. STOCK OPNAME
-- ============================================================
CREATE TABLE IF NOT EXISTS `StockOpname` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `inventoryId` INT NOT NULL,
  `physicalStock` INT NOT NULL,
  `difference` INT NOT NULL,
  `note` TEXT NULL,
  `createdById` INT NOT NULL,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_opname_inventory` (`inventoryId`),
  CONSTRAINT `fk_opname_inventory` FOREIGN KEY (`inventoryId`) REFERENCES `InventoryItem`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_opname_user` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 13. POS SALE
-- ============================================================
CREATE TABLE IF NOT EXISTS `PosSale` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `unitName` VARCHAR(100) NOT NULL,
  `totalAmount` DECIMAL(15,2) NOT NULL,
  `paymentMethod` VARCHAR(50) NOT NULL,
  `status` VARCHAR(50) NOT NULL DEFAULT 'Completed',
  `refundOfId` INT NULL,
  `shiftId` INT NULL,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `createdById` INT NOT NULL,
  INDEX `idx_pos_unit` (`unitName`),
  INDEX `idx_pos_shift` (`shiftId`),
  CONSTRAINT `fk_pos_refund` FOREIGN KEY (`refundOfId`) REFERENCES `PosSale`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_pos_shift` FOREIGN KEY (`shiftId`) REFERENCES `CashierShift`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_pos_creator` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 14. CASHIER SHIFT
-- ============================================================
CREATE TABLE IF NOT EXISTS `CashierShift` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `unitName` VARCHAR(100) NOT NULL,
  `openedBy` INT NOT NULL,
  `closedBy` INT NULL,
  `openedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `closedAt` DATETIME NULL,
  `openingCash` DECIMAL(15,2) NOT NULL,
  `closingCash` DECIMAL(15,2) NULL,
  `cashDifference` DECIMAL(15,2) NULL,
  `note` TEXT NULL,
  `status` VARCHAR(50) NOT NULL DEFAULT 'Open',
  INDEX `idx_shift_unit_status` (`unitName`, `status`),
  CONSTRAINT `fk_shift_opened` FOREIGN KEY (`openedBy`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_shift_closed` FOREIGN KEY (`closedBy`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 15. POS SALE ITEM
-- ============================================================
CREATE TABLE IF NOT EXISTS `PosSaleItem` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `posSaleId` INT NOT NULL,
  `inventoryId` INT NOT NULL,
  `quantity` INT NOT NULL,
  `priceAtSale` DECIMAL(15,2) NOT NULL,
  `subtotal` DECIMAL(15,2) NOT NULL,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_pos_item_sale` (`posSaleId`),
  CONSTRAINT `fk_pos_item_sale` FOREIGN KEY (`posSaleId`) REFERENCES `PosSale`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_pos_item_inventory` FOREIGN KEY (`inventoryId`) REFERENCES `InventoryItem`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 16. AUDIT LOG
-- ============================================================
CREATE TABLE IF NOT EXISTS `AuditLog` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `actorId` INT NOT NULL,
  `action` VARCHAR(100) NOT NULL,
  `entity` VARCHAR(100) NOT NULL,
  `entityId` INT NOT NULL,
  `metadata` TEXT NULL,
  `ip` VARCHAR(45) NULL,
  `userAgent` VARCHAR(255) NULL,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_audit_actor` (`actorId`),
  INDEX `idx_audit_entity` (`entity`, `entityId`),
  CONSTRAINT `fk_audit_actor` FOREIGN KEY (`actorId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 17. NOTIFICATION
-- ============================================================
CREATE TABLE IF NOT EXISTS `Notification` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `userId` INT NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `message` TEXT NOT NULL,
  `type` VARCHAR(50) NOT NULL,
  `read` TINYINT(1) NOT NULL DEFAULT 0,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_notification_user` (`userId`),
  CONSTRAINT `fk_notification_user` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================
-- SEED: Superadmin
-- Password: bismillah
-- ============================================================
-- Hash di-generate oleh prisma db seed di aplikasi.
-- Baris ini placeholder; isi via aplikasi atau seed script.
-- INSERT INTO `User` (`email`, `passwordHash`, `name`, `role`, `unit`, `unitType`, `retailModuleEnabled`) VALUES
--   ('admin@brontolano', '<HASH>', 'Superadmin', 'Superadmin', 'All', 'Sederhana', 0);
