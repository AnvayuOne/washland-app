-- CreateTable
CREATE TABLE "loyalty_configuration" (
    "id" TEXT NOT NULL,
    "pointsPerOrderCurrency" INTEGER NOT NULL DEFAULT 1,
    "pointsForSignUp" INTEGER NOT NULL DEFAULT 50,
    "pointsForReferral" INTEGER NOT NULL DEFAULT 100,
    "minOrderForPoints" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "loyalty_configuration_pkey" PRIMARY KEY ("id")
);
