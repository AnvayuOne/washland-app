const { PrismaClient } = require("@prisma/client");

const regions = [
  "aws-0-ap-south-1",
  "aws-0-ap-southeast-1",
  "aws-0-us-east-1",
  "aws-0-eu-central-1",
  "aws-0-us-west-1",
  "aws-0-eu-west-1",
  "aws-0-sa-east-1",
  "aws-0-ca-central-1",
  "aws-0-ap-northeast-1",
  "aws-0-ap-northeast-2",
  "aws-0-ap-southeast-2",
];

async function testRegion(region) {
  const host = `${region}.pooler.supabase.com`;
  const url = `postgresql://postgres.llhrfddkjwbyhljiafee:AnvayuOne%40459@${host}:6543/postgres?pgbouncer=true&sslmode=require`;
  
  const prisma = new PrismaClient({
    datasources: { db: { url } },
  });

  try {
    const count = await prisma.service.count();
    console.log(`[SUCCESS] Connected to ${region}! Service count:`, count);
    await prisma.$disconnect();
    return true;
  } catch (err) {
    console.log(`[FAILED] ${region}:`, err.message);
    try { await prisma.$disconnect(); } catch {}
    return false;
  }
}

async function main() {
  for (const r of regions) {
    const ok = await testRegion(r);
    if (ok) {
      console.log(`FOUND WORKING REGION: ${r}`);
      break;
    }
  }
}

main();
