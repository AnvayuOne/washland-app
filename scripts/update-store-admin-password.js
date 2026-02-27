const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

async function updateStoreAdminPassword() {
  const prisma = new PrismaClient();

  try {
    const hash = await bcrypt.hash('admin123', 10);
    const user = await prisma.user.update({
      where: { email: 'admin@washland.com' },
      data: { password: hash }
    });

    console.log('Updated store admin password');
    console.log('Email:', user.email);
    console.log('New password hash created for: admin123');

    // Verify it works
    const isValid = await bcrypt.compare('admin123', hash);
    console.log('Password verification:', isValid);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateStoreAdminPassword();