-- =============================================================================
-- EmiSafe Certification Management & Public Verification Portal
-- Database Schema & Stored Procedure (MySQL 8.0+ / MariaDB 10.5+)
-- =============================================================================

CREATE DATABASE IF NOT EXISTS `emisafe_db`
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `emisafe_db`;

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS `candidate_documents`;
DROP TABLE IF EXISTS `certificates`;
DROP TABLE IF EXISTS `certificate_types`;
DROP TABLE IF EXISTS `employees`;
DROP TABLE IF EXISTS `login_history`;
DROP TABLE IF EXISTS `certificate_formats`;
DROP TABLE IF EXISTS `admins`;

-- -----------------------------------------------------------------------------
-- 1. Table: admins (Portal Users: Admin, Certification Manager, Examiner)
-- -----------------------------------------------------------------------------
CREATE TABLE `admins` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(150) NOT NULL,
  `email` VARCHAR(191) NOT NULL,
  `password_hash` VARCHAR(255) NOT NULL,
  `role` ENUM('admin', 'certification_manager', 'examiner') NOT NULL DEFAULT 'examiner',
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `photo` VARCHAR(255) NULL DEFAULT NULL,
  `created_by` INT UNSIGNED NULL DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_admins_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 2. Table: employees (Candidates)
-- -----------------------------------------------------------------------------
CREATE TABLE `employees` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(150) NOT NULL,
  `photo` VARCHAR(255) NULL DEFAULT NULL,
  `email` VARCHAR(255) NULL DEFAULT NULL,
  `phone` VARCHAR(50) NULL DEFAULT NULL,
  `emirates_id` VARCHAR(50) NOT NULL,
  `date_of_birth` DATE NULL DEFAULT NULL,
  `nationality` VARCHAR(100) NULL DEFAULT NULL,
  `gender` ENUM('Male', 'Female', 'Other') NULL DEFAULT NULL,
  `address` TEXT NULL DEFAULT NULL,
  `job_title` VARCHAR(150) NULL DEFAULT NULL,
  `company` VARCHAR(255) NULL DEFAULT NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_employees_emirates_id` (`emirates_id`),
  KEY `idx_employees_name` (`name`),
  KEY `idx_employees_is_active` (`is_active`),
  KEY `idx_emp_active_id` (`is_active`, `id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 3. Table: certificate_types (Certification Scopes)
-- -----------------------------------------------------------------------------
CREATE TABLE `certificate_types` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(191) NOT NULL,
  `accreditation_status` ENUM('EIAC', 'Non-EIAC') NOT NULL DEFAULT 'EIAC',
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_certificate_types_name` (`name`),
  KEY `idx_certificate_types_is_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 4. Table: certificates (Issued Certificates)
-- -----------------------------------------------------------------------------
CREATE TABLE `certificates` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `employee_id` INT UNSIGNED NOT NULL,
  `certificate_type_id` INT UNSIGNED NULL DEFAULT NULL,
  `scope_name` VARCHAR(255) NOT NULL,
  `accreditation_status` ENUM('EIAC', 'Non-EIAC') NULL DEFAULT NULL,
  `certificate_number` VARCHAR(100) NOT NULL,
  `issue_date` DATE NOT NULL,
  `expiry_date` DATE NOT NULL,
  `company_name` VARCHAR(255) NULL DEFAULT NULL,
  `status` ENUM('Pass', 'Fail', 'Withdrawn', 'Withheld') NOT NULL DEFAULT 'Pass',
  `approval_status` ENUM('pending', 'approved') NOT NULL DEFAULT 'pending',
  `approved_by` INT UNSIGNED NULL DEFAULT NULL,
  `approved_at` TIMESTAMP NULL DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_certificates_number` (`certificate_number`),
  KEY `idx_certificates_employee_id` (`employee_id`),
  KEY `idx_certificates_type_id` (`certificate_type_id`),
  KEY `idx_certificates_expiry_date` (`expiry_date`),
  KEY `idx_certificates_status` (`status`),
  KEY `idx_cert_issue_id` (`issue_date`, `id`),
  KEY `idx_cert_status_expiry` (`status`, `expiry_date`),
  KEY `idx_cert_type_status_expiry` (`certificate_type_id`, `status`, `expiry_date`),
  KEY `idx_cert_emp_company_issue` (`employee_id`, `company_name`, `issue_date`, `id`),
  KEY `idx_cert_approval_id` (`approval_status`, `id`),
  CONSTRAINT `fk_certificates_employee`
    FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_certificates_type`
    FOREIGN KEY (`certificate_type_id`) REFERENCES `certificate_types` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 5. Table: candidate_documents (Multi-file Candidate Uploads)
-- -----------------------------------------------------------------------------
CREATE TABLE `candidate_documents` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `employee_id` INT UNSIGNED NOT NULL,
  `doc_type` VARCHAR(100) NOT NULL DEFAULT 'Other',
  `file_name` VARCHAR(255) NOT NULL,
  `file_path` VARCHAR(500) NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_doc_employee` (`employee_id`),
  CONSTRAINT `fk_doc_employee`
    FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 6. Table: login_history (Admin-Only Login Audit Trail)
-- -----------------------------------------------------------------------------
CREATE TABLE `login_history` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` INT UNSIGNED NULL DEFAULT NULL,
  `name` VARCHAR(255) NULL DEFAULT NULL,
  `email` VARCHAR(255) NULL DEFAULT NULL,
  `role` VARCHAR(50) NULL DEFAULT NULL,
  `ip` VARCHAR(64) NULL DEFAULT NULL,
  `user_agent` VARCHAR(500) NULL DEFAULT NULL,
  `login_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_login_at` (`login_at`),
  KEY `idx_login_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 7. Table: certificate_formats (Uploaded Raw Client Certificate Format)
-- -----------------------------------------------------------------------------
CREATE TABLE `certificate_formats` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `file_name` VARCHAR(255) NOT NULL,
  `file_path` VARCHAR(500) NOT NULL,
  `mime_type` VARCHAR(150) NULL DEFAULT NULL,
  `file_size` INT UNSIGNED NULL DEFAULT NULL,
  `uploaded_by` INT UNSIGNED NULL DEFAULT NULL,
  `uploaded_by_name` VARCHAR(255) NULL DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;

-- -----------------------------------------------------------------------------
-- Default Role Accounts (Password for all: 123)
-- -----------------------------------------------------------------------------
INSERT INTO `admins` (`id`, `name`, `email`, `password_hash`, `role`, `is_active`) VALUES
  (1, 'System Administrator', 'admin@gmail.com', '$2a$10$fT8383T27Y622i0T009v5.4K2J17rM.q.V15S/l1x4h1i.C.p2jO2', 'admin', 1),
  (2, 'Certification Manager', 'manager@emisafe.ae', '$2a$10$fT8383T27Y622i0T009v5.4K2J17rM.q.V15S/l1x4h1i.C.p2jO2', 'certification_manager', 1),
  (3, 'Examiner', 'examiner@emisafe.ae', '$2a$10$fT8383T27Y622i0T009v5.4K2J17rM.q.V15S/l1x4h1i.C.p2jO2', 'examiner', 1);
