-- AlterTable
ALTER TABLE "Product" ADD COLUMN "subcategoryId" TEXT;

-- CreateTable
CREATE TABLE "Subcategory" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "slug" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Subcategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubcategoryTranslation" (
    "id" TEXT NOT NULL,
    "subcategoryId" TEXT NOT NULL,
    "locale" "Locale" NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "SubcategoryTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CategoryAlias" (
    "id" TEXT NOT NULL,
    "rawValue" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "subcategoryId" TEXT,
    "confidence" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CategoryAlias_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Subcategory_slug_key" ON "Subcategory"("slug");

-- CreateIndex
CREATE INDEX "Subcategory_categoryId_sortOrder_idx" ON "Subcategory"("categoryId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "SubcategoryTranslation_subcategoryId_locale_key" ON "SubcategoryTranslation"("subcategoryId", "locale");

-- CreateIndex
CREATE UNIQUE INDEX "CategoryAlias_rawValue_key" ON "CategoryAlias"("rawValue");

-- CreateIndex
CREATE INDEX "CategoryAlias_categoryId_idx" ON "CategoryAlias"("categoryId");

-- CreateIndex
CREATE INDEX "CategoryAlias_subcategoryId_idx" ON "CategoryAlias"("subcategoryId");

-- CreateIndex
CREATE INDEX "Product_subcategoryId_idx" ON "Product"("subcategoryId");

-- AddForeignKey
ALTER TABLE "Subcategory" ADD CONSTRAINT "Subcategory_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubcategoryTranslation" ADD CONSTRAINT "SubcategoryTranslation_subcategoryId_fkey" FOREIGN KEY ("subcategoryId") REFERENCES "Subcategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_subcategoryId_fkey" FOREIGN KEY ("subcategoryId") REFERENCES "Subcategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CategoryAlias" ADD CONSTRAINT "CategoryAlias_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CategoryAlias" ADD CONSTRAINT "CategoryAlias_subcategoryId_fkey" FOREIGN KEY ("subcategoryId") REFERENCES "Subcategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;
