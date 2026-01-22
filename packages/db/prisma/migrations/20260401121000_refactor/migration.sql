-- AlterTable
ALTER TABLE "Category" ALTER COLUMN "sortOrder" SET DEFAULT 0;

-- AlterTable
ALTER TABLE "Product" ALTER COLUMN "sortOrder" SET DEFAULT 0;

-- AlterTable
ALTER TABLE "Subcategory" ALTER COLUMN "sortOrder" SET DEFAULT 0;

-- CreateIndex
CREATE INDEX "Product_categoryId_sortOrder_idx" ON "Product"("categoryId", "sortOrder");

-- CreateIndex
CREATE INDEX "Variant_productId_idx" ON "Variant"("productId");
