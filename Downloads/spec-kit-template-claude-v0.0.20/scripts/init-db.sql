-- Mount Sinai Research Study Management System
-- Database Initialization Script

-- Create database if not exists (run as superuser)
-- CREATE DATABASE research_study_db;

-- Connect to the database
\c research_study_db;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create audit schema
CREATE SCHEMA IF NOT EXISTS audit;

-- Grant permissions
GRANT ALL ON SCHEMA public TO research_admin;
GRANT ALL ON SCHEMA audit TO research_admin;