const fs = require("fs");
const path = require("path");

const envLocalPath = path.join(__dirname, "..", ".env.local");
if (fs.existsSync(envLocalPath)) {
  const envConfig = fs.readFileSync(envLocalPath, "utf8");
  for (const line of envConfig.split("\n")) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
      const equalIdx = trimmed.indexOf("=");
      const key = trimmed.slice(0, equalIdx).trim();
      let val = trimmed.slice(equalIdx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  }
}

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const targetUpdates = [
  { name: "Blanket - Single", newPrice: 349 },
  { name: "Blanket - Double", newPrice: 449 },
  { name: "Blazer - Dry Clean", newPrice: 299 },
  { name: "Carpet Cleaning (Per Sq Ft)", newPrice: 49 },
  { name: "Curtains (Per Panel)", newPrice: 159 },
  { name: "Doormat Cleaning", newPrice: 119 },
  { name: "Hoodie - Wash & Iron", newPrice: 179 },
  { name: "Jeans - Wash & Iron", newPrice: 109 },
  { name: "Leather Shoes Spa", newPrice: 449 },
  { name: "Lehenga - Dry Clean", newPrice: 359 },
  { name: "Pillow Cover", newPrice: 49 },
  { name: "Shirt - Dry Clean", newPrice: 109 },
  { name: "Winter Coat - Dry Clean", newPrice: 349 },
];

async function main() {
  console.log("Inspecting services in database...\n");
  let hasError = false;
  const inspectionResults = [];

  for (const target of targetUpdates) {
    const services = await prisma.service.findMany({
      where: { name: target.name },
      select: { id: true, name: true, basePrice: true },
    });

    if (services.length === 0) {
      console.error(`[ERROR] Service not found: "${target.name}"`);
      hasError = true;
    } else if (services.length > 1) {
      console.error(`[ERROR] Duplicate services found for: "${target.name}" (${services.length} matches)`);
      hasError = true;
    } else {
      inspectionResults.push({
        id: services[0].id,
        name: services[0].name,
        currentPrice: Number(services[0].basePrice),
        newPrice: target.newPrice,
      });
    }
  }

  console.table(inspectionResults);

  if (hasError) {
    console.error("\n[ABORTED] Missing or duplicate services detected. No changes made.");
    process.exit(1);
  }

  console.log("\nExecuting price updates...");
  for (const item of inspectionResults) {
    await prisma.service.update({
      where: { id: item.id },
      data: { basePrice: item.newPrice },
    });
  }

  console.log("\nVerifying updated prices in database...\n");
  const verificationResults = [];
  for (const item of inspectionResults) {
    const updated = await prisma.service.findUnique({
      where: { id: item.id },
      select: { id: true, name: true, basePrice: true },
    });
    verificationResults.push({
      id: updated.id,
      name: updated.name,
      updatedPrice: Number(updated.basePrice),
      expectedPrice: item.newPrice,
      verified: Number(updated.basePrice) === item.newPrice,
    });
  }

  console.table(verificationResults);
  console.log("\nPrice update and verification completed successfully.");
}

main()
  .catch((e) => {
    console.error("Script failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
