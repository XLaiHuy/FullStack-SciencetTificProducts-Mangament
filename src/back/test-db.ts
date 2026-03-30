import prisma from './src/prisma';

async function main() {
  try {
    const userCount = await prisma.user.count();
    console.log('User count:', userCount);
    const users = await prisma.user.findMany({ select: { email: true, name: true, role: true } });
    console.log('Users in DB:', users);
  } catch (error) {
    console.error('Error connecting to DB:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
