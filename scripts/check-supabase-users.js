const { PrismaClient } = require('@prisma/client');

async function checkSupabaseUsers() {
  const prisma = new PrismaClient();

  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        role: true,
        isActive: true,
        managedStores: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    console.log('Users in Supabase database:');
    users.forEach(user => {
      console.log(`- ${user.email} (${user.role}) - Active: ${user.isActive}`);
      if (user.managedStores.length > 0) {
        console.log(`  Manages stores: ${user.managedStores.map(s => s.name).join(', ')}`);
      }
    });
  } catch (error) {
    console.error('Error connecting to Supabase:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkSupabaseUsers();