DO $$
BEGIN
  CREATE TYPE "OrderStatus" AS ENUM ('NEW', 'IN_PROGRESS', 'READY', 'COMPLETED', 'CANCELLED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "status" "OrderStatus" NOT NULL DEFAULT 'NEW';

CREATE INDEX IF NOT EXISTS "Order_status_createdAt_idx" ON "Order"("status", "createdAt");
