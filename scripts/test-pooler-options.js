const { PrismaClient } = require("@prisma/client");

async function test() {
  const url = `postgresql://postgres:AnvayuOne%40459@aws-0-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true&sslmode=require&options=project%3Dllhrfddkjwbyhljiafee`;
  
  const prisma = new PrismaClient({
    datasources: { db: { url } },
  });

  try {
    const count = await prisma.service.count();
    console.log(`[SUCCESS] Connected! Service count:`, count);
    await prisma.$disconnect();
  } catch (err) {
    console.log(`[FAILED]:`, err.message);
    try { await prisma.$disconnect(); } catch {}
  }
}

test();
