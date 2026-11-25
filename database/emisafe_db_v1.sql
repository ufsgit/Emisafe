-- =============================================================================
-- EmiSafe Certification Management & Public Verification Portal
-- Complete Database Schema, Official Users, 7 EIAC Scopes & 100k Seed Procedure
-- (MySQL 8.0+ / MariaDB 10.5+)
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
-- 1. Table: admins (Portal Users: Admin, Certification Manager, Examiner, Technical Coordinator)
-- -----------------------------------------------------------------------------
CREATE TABLE `admins` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(150) NOT NULL,
  `email` VARCHAR(191) NOT NULL,
  `password_hash` VARCHAR(255) NOT NULL,
  `role` ENUM('admin', 'certification_manager', 'examiner', 'technical_coordinator') NOT NULL DEFAULT 'examiner',
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
  `work_order` VARCHAR(100) NULL DEFAULT NULL,
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
  KEY `idx_certificates_work_order` (`work_order`),
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
  (1, 'System Administrator', 'admin@gmail.com', '$2a$10$Hlm/Nllaf8/7F3VZlpPBnOKwGDj9dRkgDIFrC/WtTCMhYGuB25.7e', 'admin', 1),
  (2, 'Certification Manager', 'manager@emisafe.ae', '$2a$10$Hlm/Nllaf8/7F3VZlpPBnOKwGDj9dRkgDIFrC/WtTCMhYGuB25.7e', 'certification_manager', 1),
  (3, 'Examiner', 'examiner@emisafe.ae', '$2a$10$Hlm/Nllaf8/7F3VZlpPBnOKwGDj9dRkgDIFrC/WtTCMhYGuB25.7e', 'examiner', 1),
  (4, 'Technical Coordinator', 'coordinator@emisafe.ae', '$2a$10$Hlm/Nllaf8/7F3VZlpPBnOKwGDj9dRkgDIFrC/WtTCMhYGuB25.7e', 'technical_coordinator', 1);

-- -----------------------------------------------------------------------------
-- 7 Official EIAC Certification Scopes
-- -----------------------------------------------------------------------------
INSERT INTO `certificate_types` (`id`, `name`, `accreditation_status`, `is_active`) VALUES
  (1, 'Signal Man', 'EIAC', 1),
  (2, 'Rigger Level 1', 'EIAC', 1),
  (3, 'Rigger Level 2', 'EIAC', 1),
  (4, 'Forklift Operator', 'EIAC', 1),
  (5, 'EOT Crane Operator', 'EIAC', 1),
  (6, 'Mobile Crane Operator', 'EIAC', 1),
  (7, 'Tower Crane Operator', 'EIAC', 1);

-- -----------------------------------------------------------------------------
-- Stored Procedure: sp_seed_100k_data(IN p_flag INT)
-- Seeds 7 EIAC Scopes, 100,000 Candidates, and 100,000 Certificates
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_seed_100k_data`;

DELIMITER $$
CREATE PROCEDURE `sp_seed_100k_data`(IN p_flag INT)
BEGIN
  IF p_flag IS NULL OR p_flag <> 1 THEN
    SELECT
      0 AS success,
      'Execution blocked: This stored procedure works ONLY when parameter 1 is input.' AS message,
      p_flag AS input_parameter;
  ELSE
    SET FOREIGN_KEY_CHECKS = 0;

    TRUNCATE TABLE candidate_documents;
    TRUNCATE TABLE certificates;
    TRUNCATE TABLE employees;
    TRUNCATE TABLE certificate_types;

    SET FOREIGN_KEY_CHECKS = 1;

    -- 1. Seed 7 Official EIAC Scopes
    INSERT INTO certificate_types (id, name, accreditation_status, is_active, created_at) VALUES
      (1, 'Signal Man', 'EIAC', 1, NOW()),
      (2, 'Rigger Level 1', 'EIAC', 1, NOW()),
      (3, 'Rigger Level 2', 'EIAC', 1, NOW()),
      (4, 'Forklift Operator', 'EIAC', 1, NOW()),
      (5, 'EOT Crane Operator', 'EIAC', 1, NOW()),
      (6, 'Mobile Crane Operator', 'EIAC', 1, NOW()),
      (7, 'Tower Crane Operator', 'EIAC', 1, NOW());

    -- 2. Seed 100,000 Candidates (employees)
    INSERT INTO employees (
      id, name, photo, email, phone, emirates_id,
      date_of_birth, nationality, gender, address,
      job_title, company, is_active, created_at
    )
    SELECT
      seq AS id,
      CONCAT(
        ELT(MOD(seq, 16) + 1,
          'Ahmed', 'Mohammed', 'Omar', 'Zayed', 'Rashid', 'Khalid', 'Saeed', 'Fatima',
          'Sara', 'Tariq', 'Hamdan', 'Mansoor', 'Mariam', 'Noura', 'Sultan', 'Yousef'
        ),
        ' ',
        ELT(MOD(seq * 7, 15) + 1,
          'Abdullah', 'Ibrahim', 'Hassan', 'Ali', 'Salim', 'Nasser', 'Majid', 'Kareem',
          'Hamad', 'Faisal', 'Jassim', 'Obaid', 'Saif', 'Adel', 'Badr'
        ),
        ' ',
        ELT(MOD(seq * 13, 17) + 1,
          'Al Mansoori', 'Al Nahyan', 'Al Hashimi', 'Al Suwaidi', 'Al Maktoum', 'Al Nuaimi',
          'Al Qasimi', 'Al Mazrouei', 'Al Shamsi', 'Al Ketbi', 'Al Dhaheri', 'Al Kaabi',
          'Al Muhairi', 'Al Zaabi', 'Al Falasi', 'Al Balooshi', 'Al Hammadi'
        )
      ) AS name,
      '/assets/logo/logo-navy.svg' AS photo,
      CASE WHEN MOD(seq, 5) = 0 THEN NULL ELSE CONCAT('candidate.', seq, '@emisafe-training.ae') END AS email,
      CASE WHEN MOD(seq, 4) = 0 THEN NULL ELSE CONCAT('+971-50-', LPAD(MOD(seq * 37, 10000000), 7, '0')) END AS phone,
      CONCAT('784-', 1975 + MOD(seq, 25), '-', LPAD(1000000 + seq, 7, '0'), '-', MOD(seq, 9) + 1) AS emirates_id,
      CASE WHEN MOD(seq, 6) = 0 THEN NULL ELSE DATE_SUB('1998-06-15', INTERVAL MOD(seq, 7000) DAY) END AS date_of_birth,
      CASE WHEN MOD(seq, 5) = 0 THEN NULL ELSE ELT(MOD(seq, 6) + 1, 'United Arab Emirates', 'India', 'Pakistan', 'Egypt', 'Jordan', 'Philippines') END AS nationality,
      CASE WHEN MOD(seq, 16) IN (7, 8, 12, 13) THEN 'Female' ELSE 'Male' END AS gender,
      'Abu Dhabi / Dubai Industrial Zone, UAE' AS address,
      CASE WHEN MOD(seq, 4) = 0 THEN NULL ELSE ELT(MOD(seq, 6) + 1, 'HSE Officer', 'Lifting Supervisor', 'Rigger Level 2', 'Scaffold Inspector', 'Fire Warden', 'Forklift Operator') END AS job_title,
      ELT(MOD(seq, 10) + 1,
        'ADNOC Drilling',
        'Emirates Steel Arkan',
        'DP World UAE',
        'DEWA',
        'Arabtec Construction',
        'Petrofac Emirates',
        'NPCC Abu Dhabi',
        'Target Engineering',
        'Al Naboodah Group',
        'Drydocks World'
      ) AS company,
      CASE WHEN MOD(seq, 20) = 0 THEN 0 ELSE 1 END AS is_active,
      DATE_SUB(NOW(), INTERVAL MOD(seq, 1000) DAY) AS created_at
    FROM (
      SELECT (d0.n + d1.n * 10 + d2.n * 100 + d3.n * 1000 + d4.n * 10000 + 1) AS seq
      FROM (SELECT 0 n UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) d0
      CROSS JOIN (SELECT 0 n UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) d1
      CROSS JOIN (SELECT 0 n UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) d2
      CROSS JOIN (SELECT 0 n UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) d3
      CROSS JOIN (SELECT 0 n UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) d4
    ) gen;

    -- 3. Seed 100,000 Certificates (certificates)
    INSERT INTO certificates (
      id, employee_id, certificate_type_id, scope_name,
      accreditation_status, company_name, certificate_number,
      issue_date, expiry_date, status, approval_status,
      approved_by, approved_at, created_at
    )
    SELECT
      seq AS id,
      CASE
        WHEN seq <= 1000 THEN 99000 + seq
        ELSE seq
      END AS employee_id,
      CASE
        WHEN MOD(seq, 20) IN (0, 1, 2, 3) THEN 1
        WHEN MOD(seq, 20) IN (4, 5, 6) THEN 2
        WHEN MOD(seq, 20) IN (7, 8, 9) THEN 3
        WHEN MOD(seq, 20) IN (10, 11, 12) THEN 4
        WHEN MOD(seq, 20) IN (13, 14) THEN 5
        WHEN MOD(seq, 20) IN (15, 16) THEN 6
        ELSE 7
      END AS certificate_type_id,
      CASE
        WHEN MOD(seq, 20) IN (0, 1, 2, 3) THEN 'Signal Man'
        WHEN MOD(seq, 20) IN (4, 5, 6) THEN 'Rigger Level 1'
        WHEN MOD(seq, 20) IN (7, 8, 9) THEN 'Rigger Level 2'
        WHEN MOD(seq, 20) IN (10, 11, 12) THEN 'Forklift Operator'
        WHEN MOD(seq, 20) IN (13, 14) THEN 'EOT Crane Operator'
        WHEN MOD(seq, 20) IN (15, 16) THEN 'Mobile Crane Operator'
        ELSE 'Tower Crane Operator'
      END AS scope_name,
      'EIAC' AS accreditation_status,
      CASE
        WHEN seq <= 1000 THEN ELT(MOD(seq + 3, 10) + 1,
          'ADNOC Drilling',
          'Emirates Steel Arkan',
          'DP World UAE',
          'DEWA',
          'Arabtec Construction',
          'Petrofac Emirates',
          'NPCC Abu Dhabi',
          'Target Engineering',
          'Al Naboodah Group',
          'Drydocks World'
        )
        ELSE ELT(MOD(seq, 10) + 1,
          'ADNOC Drilling',
          'Emirates Steel Arkan',
          'DP World UAE',
          'DEWA',
          'Arabtec Construction',
          'Petrofac Emirates',
          'NPCC Abu Dhabi',
          'Target Engineering',
          'Al Naboodah Group',
          'Drydocks World'
        )
      END AS company_name,
      CONCAT(
        'WOR-',
        DATE_FORMAT(DATE_SUB(CURDATE(), INTERVAL FLOOR(POW(MOD(seq * 31, 1000) / 1000, 1.4) * 900) DAY), '%y'),
        '/',
        LPAD(seq, 6, '0'),
        '/',
        DATE_FORMAT(DATE_SUB(CURDATE(), INTERVAL FLOOR(POW(MOD(seq * 31, 1000) / 1000, 1.4) * 900) DAY), '%d/%m'),
        '-',
        LPAD(MOD(seq, 99) + 1, 2, '0'),
        '-C',
        MOD(seq, 5) + 1
      ) AS certificate_number,
      DATE_SUB(CURDATE(), INTERVAL FLOOR(POW(MOD(seq * 31, 1000) / 1000, 1.4) * 900) DAY) AS issue_date,
      CASE
        WHEN MOD(seq, 25) = 0 THEN DATE_ADD(CURDATE(), INTERVAL MOD(seq * 7, 28) + 1 DAY)
        WHEN MOD(seq, 6) = 0 THEN DATE_SUB(CURDATE(), INTERVAL MOD(seq, 300) + 1 DAY)
        ELSE DATE_ADD(CURDATE(), INTERVAL MOD(seq, 330) + 31 DAY)
      END AS expiry_date,
      CASE
        WHEN MOD(seq, 20) = 0 THEN 'Fail'
        WHEN MOD(seq, 25) = 1 THEN 'Withdrawn'
        WHEN MOD(seq, 25) = 2 THEN 'Withheld'
        ELSE 'Pass'
      END AS status,
      CASE
        WHEN seq > 99950 THEN 'pending'
        ELSE 'approved'
      END AS approval_status,
      CASE
        WHEN seq > 99950 THEN NULL
        ELSE 2
      END AS approved_by,
      CASE
        WHEN seq > 99950 THEN NULL
        ELSE NOW()
      END AS approved_at,
      NOW() AS created_at
    FROM (
      SELECT (d0.n + d1.n * 10 + d2.n * 100 + d3.n * 1000 + d4.n * 10000 + 1) AS seq
      FROM (SELECT 0 n UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) d0
      CROSS JOIN (SELECT 0 n UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) d1
      CROSS JOIN (SELECT 0 n UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) d2
      CROSS JOIN (SELECT 0 n UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) d3
      CROSS JOIN (SELECT 0 n UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) d4
    ) gen;

    SELECT
      1 AS success,
      '1,00,000 test data records seeded successfully via sp_seed_100k_data(1).' AS message,
      (SELECT COUNT(*) FROM employees) AS total_candidates,
      (SELECT COUNT(*) FROM certificates) AS total_certificates,
      (SELECT COUNT(*) FROM certificate_types) AS total_scopes;
  END IF;
END$$
DELIMITER ;

-- Automatically seed the 100,000 candidates and 100,000 certificates on import
CALL `sp_seed_100k_data`(1);
