-- ============================================================
-- Patch: Add Unit table (Superadmin CRUD)
-- Apply AFTER 20260815000000_mysql_initial_schema.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS `Unit` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL UNIQUE,
  `type` VARCHAR(50) NOT NULL DEFAULT 'Sederhana',
  `retailModuleEnabled` TINYINT(1) NOT NULL DEFAULT 0,
  `description` TEXT NULL,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_unit_type` (`type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Seed default units (idempotent)
INSERT IGNORE INTO `Unit` (`name`, `type`, `retailModuleEnabled`, `description`) VALUES
  ('Kantor',  'Sederhana', 0, 'Unit administrasi & kantor pusat'),
  ('Kantin',  'Retail',    1, 'Unit retail makanan & minuman'),
  ('Koperasi','Retail',    1, 'Unit retail koperasi');
