import { prisma } from './index.js';

async function main() {
  console.log('Connecting to PostgreSQL database...');
  try {
    const users = await prisma.user.findMany();
    console.log(`✅ Success! Database connection established. Found ${users.length} users.`);
  } catch (error) {
    console.error('❌ Failed to query database:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();

