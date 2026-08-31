const { PrismaClient } = require("@prisma/client");

async function test() {
  const url = `postgresql://postgres:AnvayuOne%40459@[2406:da1a:6b0:f626:5bb3:6453:db82:f937]:5432/postgres?sslmode=require&host=db.llhrfddkjwbyhljiafee.supabase.co`;
  
  const prisma = new PrismaClient({
    datasources: { db: { url } },
  });

  try {
    const count = await prisma.service.count();
    console.log(`[SUCCESS] Connected via IP + SNI! Service count:`, count);
    await prisma.$disconnect();
  } catch (err) {
    console.log(`[FAILED]:`, err.message);
    try { await prisma.$disconnect(); } catch {}
  }
}

test();
