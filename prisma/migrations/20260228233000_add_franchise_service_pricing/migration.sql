CREATE TABLE "franchise_services" (
  "id" TEXT NOT NULL,
  "franchiseId" TEXT NOT NULL,
  "serviceId" TEXT NOT NULL,
  "defaultPrice" DECIMAL(65,30),
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "franchise_services_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "franchise_services_franchiseId_serviceId_key"
  ON "franchise_services"("franchiseId", "serviceId");

CREATE INDEX "franchise_services_franchiseId_isActive_idx"
  ON "franchise_services"("franchiseId", "isActive");

CREATE INDEX "franchise_services_serviceId_idx"
  ON "franchise_services"("serviceId");

ALTER TABLE "franchise_services"
  ADD CONSTRAINT "franchise_services_franchiseId_fkey"
  FOREIGN KEY ("franchiseId") REFERENCES "franchises"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "franchise_services"
  ADD CONSTRAINT "franchise_services_serviceId_fkey"
  FOREIGN KEY ("serviceId") REFERENCES "services"("id") ON DELETE CASCADE ON UPDATE CASCADE;
