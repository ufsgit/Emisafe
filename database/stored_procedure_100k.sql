-- =============================================================================
-- EmiSafe Stored Procedure: sp_seed_100k_data(IN p_flag INT)
-- Executes ONLY when input parameter p_flag = 1.
-- Removes old candidate/certificate data and populates 100,000 new test records
-- aligned with the updated Candidate, Certification Scope, Accreditation (EIAC /
-- Non-EIAC), Company, and Certificate Status (Pass, Fail, Withdrawn, Withheld)
-- specifications.
-- =============================================================================

DROP PROCEDURE IF EXISTS sp_seed_100k_data;

DELIMITER $$

CREATE PROCEDURE sp_seed_100k_data(IN p_flag INT)
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

    -- 1. Seed 7 Predefined EIAC Scopes + 1 Non-EIAC Scope
    INSERT INTO certificate_types (id, name, accreditation_status, is_active, created_at) VALUES
      (1, 'Occupational Health and Safety (OSHA 30)', 'EIAC', 1, NOW()),
      (2, 'Basic First Aid & CPR / AED', 'EIAC', 1, NOW()),
      (3, 'Fire Warden & Emergency Response', 'EIAC', 1, NOW()),
      (4, 'Working at Heights Safety', 'EIAC', 1, NOW()),
      (5, 'Confined Space Entry & Rescue', 'EIAC', 1, NOW()),
      (6, 'Rigging & Lifting Operations Safety', 'EIAC', 1, NOW()),
      (7, 'Forklift & Heavy Equipment Operator Safety', 'EIAC', 1, NOW()),
      (8, 'H2S & Hazardous Gas Awareness', 'Non-EIAC', 1, NOW());

    -- 2. Seed 100,000 Candidates (employees) with realistic 3-part names, mandatory photo,
    --    Emirates ID, company name, and optional fields
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

    -- 3. Seed 100,000 Certificates (certificates) with realistic scope distribution,
    --    natural quarterly growth curve, WOR-yy/xxxx/dd/mm-xx-Cx format, and multi-company history.
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
        WHEN MOD(seq, 20) IN (17, 18) THEN 7
        ELSE 8
      END AS certificate_type_id,
      CASE
        WHEN MOD(seq, 20) IN (0, 1, 2, 3) THEN 'Occupational Health and Safety (OSHA 30)'
        WHEN MOD(seq, 20) IN (4, 5, 6) THEN 'Basic First Aid & CPR / AED'
        WHEN MOD(seq, 20) IN (7, 8, 9) THEN 'Fire Warden & Emergency Response'
        WHEN MOD(seq, 20) IN (10, 11, 12) THEN 'Working at Heights Safety'
        WHEN MOD(seq, 20) IN (13, 14) THEN 'Confined Space Entry & Rescue'
        WHEN MOD(seq, 20) IN (15, 16) THEN 'Rigging & Lifting Operations Safety'
        WHEN MOD(seq, 20) IN (17, 18) THEN 'Forklift & Heavy Equipment Operator Safety'
        ELSE 'H2S & Hazardous Gas Awareness'
      END AS scope_name,
      CASE
        WHEN MOD(seq, 20) = 19 THEN 'Non-EIAC'
        ELSE 'EIAC'
      END AS accreditation_status,
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
