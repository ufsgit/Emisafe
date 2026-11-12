-- MySQL dump 10.13  Distrib 8.0.46, for Win64 (x86_64)
--
-- Host: localhost    Database: emisafe_db
-- ------------------------------------------------------
-- Server version	8.0.46

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `admins`
--

DROP TABLE IF EXISTS `admins`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `admins` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `password_hash` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`),
  KEY `idx_admins_email` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `admins`
--

LOCK TABLES `admins` WRITE;
/*!40000 ALTER TABLE `admins` DISABLE KEYS */;
INSERT INTO `admins` VALUES (1,'System Administrator','admin@gmail.com','$2a$10$FwmkbVFmni1vzgyVHC3vcOm3gSLAs4ZLex15scfIDwWATTm.eeT46','2026-11-09 07:19:02');
/*!40000 ALTER TABLE `admins` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `certificate_types`
--

DROP TABLE IF EXISTS `certificate_types`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `certificate_types` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `category` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `scope` text COLLATE utf8mb4_unicode_ci,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`),
  KEY `idx_cert_types_name` (`name`),
  KEY `idx_cert_types_is_active` (`is_active`)
) ENGINE=InnoDB AUTO_INCREMENT=16 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `certificate_types`
--

LOCK TABLES `certificate_types` WRITE;
/*!40000 ALTER TABLE `certificate_types` DISABLE KEYS */;
INSERT INTO `certificate_types` VALUES (1,'Occupational Health and Safety (OSHA 30)','Health & Safety','Comprehensive 30-hour general industry safety and risk assessment certification.','General Industry & Workplace Safety Standards',1,'2026-11-09 07:19:02','2026-11-09 07:19:02'),(2,'Basic First Aid & CPR / AED','Emergency Medical','Emergency first response, CPR administration, automated external defibrillator operation, and wound management.','Workplace First Aid & Life Support Protocols',1,'2026-11-09 07:19:02','2026-11-09 07:19:02'),(3,'Advanced Fire Fighting & Emergency Evacuation','Fire Safety','Industrial fire suppression protocols, apparatus handling, high-rise evacuation, and hazard mitigation.','Industrial & Commercial Fire Safety Directives',1,'2026-11-09 07:19:02','2026-11-09 07:19:02'),(4,'Confined Space Entry & Rescue Operations','Hazardous Environments','Specialized safety protocols for enclosed spaces, atmospheric monitoring, and technical rescue.','Heavy Engineering & Industrial Tanks',0,'2026-11-09 07:19:02','2026-11-09 07:19:02'),(5,'Working at Heights Safety','Safety',NULL,NULL,1,'2026-11-10 15:57:12','2026-11-10 15:57:12'),(6,'Fire Warden & Emergency Response','Fire',NULL,NULL,1,'2026-11-10 15:57:13','2026-11-10 15:57:13'),(7,'Manual Handling & Ergonomics','Safety',NULL,NULL,1,'2026-11-10 15:57:13','2026-11-10 15:57:13'),(8,'Hazard Communication (HazCom)','Safety',NULL,NULL,1,'2026-11-10 15:57:13','2026-11-10 15:57:13'),(9,'Electrical Safety Awareness','Technical',NULL,NULL,1,'2026-11-10 15:57:13','2026-11-10 15:57:13'),(10,'Fall Protection Systems','Safety',NULL,NULL,1,'2026-11-10 15:57:13','2026-11-10 15:57:13'),(11,'Defensive Driving Course','Transport',NULL,NULL,1,'2026-11-10 15:57:13','2026-11-10 15:57:13'),(12,'PPE Awareness & Compliance','Safety',NULL,NULL,1,'2026-11-10 15:57:13','2026-11-10 15:57:13'),(13,'First Aid Refresher','First Aid',NULL,NULL,1,'2026-11-10 15:57:13','2026-11-10 15:57:13'),(14,'Scaffolding Safety Inspector','Technical',NULL,NULL,1,'2026-11-10 15:57:13','2026-11-10 15:57:13'),(15,'Oil & Gas Safety Orientation','Safety',NULL,NULL,1,'2026-11-10 15:57:13','2026-11-10 15:57:13');
/*!40000 ALTER TABLE `certificate_types` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `certificates`
--

DROP TABLE IF EXISTS `certificates`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `certificates` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `employee_id` int unsigned NOT NULL,
  `certificate_type_id` int unsigned NOT NULL,
  `certificate_number` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `issue_date` date NOT NULL,
  `expiry_date` date NOT NULL,
  `status` enum('Pass','Fail') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Pass',
  `description` text COLLATE utf8mb4_unicode_ci,
  `scope` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `certificate_number` (`certificate_number`),
  KEY `idx_certificates_number` (`certificate_number`),
  KEY `idx_certificates_employee` (`employee_id`),
  KEY `idx_certificates_type` (`certificate_type_id`),
  KEY `idx_certificates_status` (`status`),
  KEY `idx_certificates_expiry` (`expiry_date`),
  KEY `idx_certificates_issue` (`issue_date`),
  CONSTRAINT `fk_certificates_employee` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_certificates_type` FOREIGN KEY (`certificate_type_id`) REFERENCES `certificate_types` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=17 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `certificates`
--

LOCK TABLES `certificates` WRITE;
/*!40000 ALTER TABLE `certificates` DISABLE KEYS */;
INSERT INTO `certificates` VALUES (1,1,1,'CERT-2026-08912','2026-02-10','2027-02-10','Pass','Demonstrated exemplary competency in advanced hazard identification and risk control measures.','Federal Safety Standards & General Industry Compliance','2026-11-09 07:19:02','2026-11-09 07:19:02'),(2,1,2,'CERT-2025-04521','2025-11-21','2026-11-21','Pass','Certified in adult CPR, AED emergency intervention, and medical response.','Workplace Level 2 First Responder','2026-11-09 07:19:02','2026-11-09 07:19:02'),(3,1,3,'CERT-2024-01104','2024-05-15','2026-05-15','Pass','Certified initial command training for industrial fire incident containment.','Tier 1 Rapid Fire Response','2026-11-09 07:19:02','2026-11-09 07:19:02'),(4,2,2,'CERT-2026-09341','2026-04-01','2027-04-01','Pass','Completed comprehensive pediatric and adult resuscitation with distinction.','Life Support Protocols Level 3','2026-11-09 07:19:02','2026-11-09 07:19:02'),(5,2,3,'CERT-2025-07823','2025-12-01','2026-12-01','Pass','Certified for structural fire drill execution and facility smoke containment.','Facility Warden Emergency Protocols','2026-11-09 07:19:02','2026-11-09 07:19:02'),(6,3,3,'CERT-2026-10555','2026-08-15','2027-08-15','Pass','Mastered high-temperature suppression and compressed breathing apparatus protocols.','Full Hazard Fire Containment','2026-11-09 07:19:02','2026-11-09 07:19:02'),(8,4,1,'CERT-2024-00100','2024-01-01','2025-01-01','Pass','Archived inspection credentials.','Baseline Compliance Auditing','2026-11-09 07:19:02','2026-11-09 07:19:02'),(9,5,1,'CERT-2024-04471','2024-03-12','2025-03-12','Pass',NULL,NULL,'2026-11-10 15:58:43','2026-11-10 15:58:43'),(10,7,2,'CERT-2025-01288','2025-02-18','2026-11-28','Pass',NULL,NULL,'2026-11-10 15:58:43','2026-11-10 15:58:43'),(11,8,3,'CERT-2025-03417','2025-04-22','2027-04-22','Pass',NULL,NULL,'2026-11-10 15:58:43','2026-11-10 15:58:43'),(12,9,1,'CERT-2025-07756','2025-09-10','2027-09-10','Fail',NULL,NULL,'2026-11-10 15:58:43','2026-11-10 15:58:43'),(13,12,2,'CERT-2026-02635','2026-05-19','2026-11-20','Pass',NULL,NULL,'2026-11-10 15:58:43','2026-11-10 15:58:43'),(14,13,3,'CERT-2026-04508','2026-08-27','2028-08-27','Fail',NULL,NULL,'2026-11-10 15:58:43','2026-11-10 15:58:43'),(15,6,5,'CERT-2024-06903','2024-06-05','2025-06-05','Pass',NULL,NULL,'2026-11-10 15:59:14','2026-11-10 15:59:14'),(16,10,6,'CERT-2026-01194','2026-02-03','2028-02-03','Pass',NULL,NULL,'2026-11-10 15:59:14','2026-11-10 15:59:14');
/*!40000 ALTER TABLE `certificates` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `employees`
--

DROP TABLE IF EXISTS `employees`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `employees` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `phone` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `emirates_id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `date_of_birth` date DEFAULT NULL,
  `nationality` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `gender` enum('Male','Female','Other') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `job_title` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `address` text COLLATE utf8mb4_unicode_ci,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`),
  UNIQUE KEY `emirates_id` (`emirates_id`),
  KEY `idx_employees_email` (`email`),
  KEY `idx_employees_emirates_id` (`emirates_id`),
  KEY `idx_employees_is_active` (`is_active`),
  KEY `idx_employees_name` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=16 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `employees`
--

LOCK TABLES `employees` WRITE;
/*!40000 ALTER TABLE `employees` DISABLE KEYS */;
INSERT INTO `employees` VALUES (1,'Ahmed Mansoor Al-Nuaimi','ahmed.nuaimi@emisafe.ae','+971 50 123 4567','784-1988-1234567-1','1988-04-12','United Arab Emirates','Male','Senior HSE Safety Officer','Al Nahda 2, Dubai, United Arab Emirates',1,'2026-11-09 07:19:02','2026-11-09 07:19:02'),(2,'Fatima Zahra Al-Hashimi','fatima.hashimi@emisafe.ae','+971 55 987 6543','784-1992-7654321-2','1992-09-24','United Arab Emirates','Female','Site Safety Coordinator','Corniche Road, Abu Dhabi, United Arab Emirates',1,'2026-11-09 07:19:02','2026-11-09 07:19:02'),(3,'Rashid Mohammed Khan','rashid.khan@emisafe.ae','+971 52 456 7890','784-1995-3456789-3','1995-02-18','Pakistan','Male','Emergency Response Specialist','Al Majaz 3, Sharjah, United Arab Emirates',1,'2026-11-09 07:19:02','2026-11-09 07:19:02'),(4,'David Robert Miller','david.miller@emisafe.ae','+971 54 321 0987','784-1985-8901234-4','1985-11-30','United Kingdom','Male','Industrial Compliance Inspector','Downtown Dubai, UAE',0,'2026-11-09 07:19:02','2026-11-09 07:19:02'),(5,'Omar Hassan Al-Mansoori','omar.mansoori@emisafe-demo.com','+971501234001','784-1985-1000001-1','1985-04-12','Emirati','Male','Safety Officer',NULL,1,'2026-11-10 15:57:13','2026-11-10 15:57:13'),(6,'Layla Ibrahim Al-Suwaidi','layla.suwaidi@emisafe-demo.com','+971501234002','784-1987-1000002-1','1987-09-03','Emirati','Female','HSE Coordinator',NULL,1,'2026-11-10 15:57:13','2026-11-10 15:57:13'),(7,'Mohammed Abdul Al-Rashid','mohammed.rashid@emisafe-demo.com','+971501234003','784-1983-1000003-1','1983-01-27','Emirati','Male','Site Supervisor',NULL,1,'2026-11-10 15:57:13','2026-11-10 15:57:13'),(8,'Priya Sharma Nair','priya.nair@emisafe-demo.com','+971501234004','784-1992-1000004-1','1992-06-15','Indian','Female','QA/QC Engineer',NULL,1,'2026-11-10 15:57:13','2026-11-10 15:57:13'),(9,'Juan Carlos Dela Cruz','juan.cruz@emisafe-demo.com','+971501234005','784-1990-1000005-1','1990-11-22','Filipino','Male','Maintenance Technician',NULL,1,'2026-11-10 15:57:13','2026-11-10 15:57:13'),(10,'Aisha Mohammed Al-Balushi','aisha.balushi@emisafe-demo.com','+971501234006','784-1989-1000006-1','1989-03-08','Emirati','Female','Safety Trainer',NULL,1,'2026-11-10 15:57:13','2026-11-10 15:57:13'),(11,'Sergei Ivanov Petrov','sergei.petrov@emisafe-demo.com','+971501234007','784-1986-1000007-1','1986-07-19','Russian','Male','Crane Operator',NULL,0,'2026-11-10 15:57:13','2026-11-10 15:57:13'),(12,'Chen Wei Zhang','chen.zhang@emisafe-demo.com','+971501234008','784-1991-1000008-1','1991-12-05','Chinese','Male','Electrical Engineer',NULL,1,'2026-11-10 15:57:13','2026-11-10 15:57:13'),(13,'Fatima Ahmed Al-Zaabi','fatima.zaabi@emisafe-demo.com','+971501234009','784-1993-1000009-1','1993-08-30','Emirati','Female','HR & Compliance Officer',NULL,1,'2026-11-10 15:57:13','2026-11-10 15:57:13'),(14,'David John Thompson','david.thompson@emisafe-demo.com','+971501234010','784-1984-1000010-1','1984-02-14','British','Male','Project Manager',NULL,0,'2026-11-10 15:57:13','2026-11-10 15:57:13'),(15,'Mariam Yousuf Al-Harbi','mariam.harbi@emisafe-demo.com','+971501234011','784-1988-1000011-1','1988-05-26','Emirati','Female','First Aid Instructor',NULL,1,'2026-11-10 15:57:13','2026-11-10 15:57:13');
/*!40000 ALTER TABLE `employees` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-11-12 10:47:09
