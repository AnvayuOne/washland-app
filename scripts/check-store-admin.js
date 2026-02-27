const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

async function checkStoreAdmin() {
  const prisma = new PrismaClient();

  try {
    const user = await prisma.user.findUnique({
      where: { email: 'admin@washland.com' }
    });

    if (user) {
      console.log('Store Admin user found:');
      console.log('- Email:', user.email);
      console.log('- Role:', user.role);
      console.log('- Active:', user.isActive);

      // Test password
      const isValid = await bcrypt.compare('admin123', user.password);
      console.log('- Password valid:', isValid);
    } else {
      console.log('Store Admin user not found');
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkStoreAdmin();