-- Add clients manager role
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'CLIENTS_MANAGER';
