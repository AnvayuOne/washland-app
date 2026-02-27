const { PrismaClient } = require('@prisma/client');

async function checkStoreAdminAccess() {
  const prisma = new PrismaClient();

  try {
    const user = await prisma.user.findUnique({
      where: { email: 'admin@washland.com' },
      include: {
        managedStores: true
      }
    });

    if (user) {
      console.log('Store Admin Access:');
      console.log('- Email:', user.email);
      console.log('- Role:', user.role);
      console.log('- Managed Stores:', user.managedStores.length);

      user.managedStores.forEach(store => {
        console.log('  -', store.name, '(ID:', store.id + ')');
      });
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkStoreAdminAccess();