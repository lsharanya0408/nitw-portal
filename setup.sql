-- =============================================
-- NITW Smart Campus Portal — Database Setup
-- Run this once in MySQL Workbench or terminal
-- =============================================

-- 1. Create the database
CREATE DATABASE IF NOT EXISTS nitw_portal;
USE nitw_portal;

-- 2. Users table (login credentials)
CREATE TABLE IF NOT EXISTS users (
    id         INT AUTO_INCREMENT PRIMARY KEY,
    email      VARCHAR(100) UNIQUE NOT NULL,
    password   VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Login logs (every login is recorded)
CREATE TABLE IF NOT EXISTS logins (
    id         INT AUTO_INCREMENT PRIMARY KEY,
    email      VARCHAR(100) NOT NULL,
    login_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Attendance records
CREATE TABLE IF NOT EXISTS attendance (
    id       INT AUTO_INCREMENT PRIMARY KEY,
    email    VARCHAR(100),
    attended INT,
    total    INT,
    saved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. GPA records
CREATE TABLE IF NOT EXISTS gpa (
    id       INT AUTO_INCREMENT PRIMARY KEY,
    email    VARCHAR(100),
    cgpa     FLOAT,
    saved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Verify tables created
SHOW TABLES;