const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkDatabase() {
  try {
    // Check verification tokens
    console.log('Checking VerificationToken table...');
    const tokens = await prisma.verificationToken.findMany({
      orderBy: { expires: 'desc' },
      take: 5
    });

    console.log('\nRecent verification tokens:');
    tokens.forEach(token => {
      console.log(`- Email: ${token.identifier}`);
      console.log(`  Expires: ${token.expires}`);
      console.log(`  Token: ${token.token.substring(0, 20)}...`);
      console.log('');
    });

    // Check if user was created
    console.log('\nChecking User table for C109193108@nkust.edu.tw...');
    const user = await prisma.user.findUnique({
      where: { email: 'C109193108@nkust.edu.tw' }
    });

    if (user) {
      console.log('✓ User exists in database');
      console.log(`  ID: ${user.id}`);
      console.log(`  Email: ${user.email}`);
      console.log(`  Created: ${user.createdAt}`);
    } else {
      console.log('✗ User not found in database');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDatabase();
