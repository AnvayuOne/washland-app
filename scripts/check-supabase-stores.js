const { PrismaClient } = require('@prisma/client');

async function checkSupabaseStores() {
  const prisma = new PrismaClient();

  try {
    const stores = await prisma.store.findMany({
      select: {
        id: true,
        name: true,
        admin: {
          select: {
            email: true,
            role: true
          }
        },
        franchise: {
          select: {
            name: true
          }
        }
      }
    });

    console.log('Stores in Supabase database:');
    stores.forEach(store => {
      console.log(`- ${store.name} (ID: ${store.id})`);
      console.log(`  Admin: ${store.admin?.email} (${store.admin?.role})`);
      console.log(`  Franchise: ${store.franchise?.name}`);
    });
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkSupabaseStores();