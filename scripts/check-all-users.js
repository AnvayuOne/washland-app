const { PrismaClient } = require('@prisma/client');

async function checkAllUsers() {
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

    console.log('All users in SQLite database:');
    users.forEach(user => {
      console.log(`- ${user.email} (${user.role}) - Active: ${user.isActive}`);
      if (user.managedStores.length > 0) {
        console.log(`  Manages stores: ${user.managedStores.map(s => s.name).join(', ')}`);
      }
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAllUsers();