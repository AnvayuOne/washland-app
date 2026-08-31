const dns = require("dns");
dns.setDefaultResultOrder("verbatim");

const { PrismaClient } = require("@prisma/client");

async function test() {
  const url = `postgresql://postgres:AnvayuOne%40459@db.llhrfddkjwbyhljiafee.supabase.co:5432/postgres?sslmode=require`;
  
  const prisma = new PrismaClient({
    datasources: { db: { url } },
  });

  try {
    const count = await prisma.service.count();
    console.log(`[SUCCESS] Connected with verbatim DNS order! Service count:`, count);
    await prisma.$disconnect();
  } catch (err) {
    console.log(`[FAILED]:`, err.message);
    try { await prisma.$disconnect(); } catch {}
  }
}

test();
