const { PrismaClient } = require("@prisma/client");

const dbUrl = "postgresql://postgres.llhrfddkjwbyhljiafee:AnvayuOne%40459@aws-0-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1";

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: dbUrl,
    },
  },
});

async function main() {
  const services = await prisma.service.findMany({ take: 5 });
  console.log("Connected successfully! Found services:", services);
}

main()
  .catch((e) => {
    console.error("Prisma error:", e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });