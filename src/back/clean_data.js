const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Cleaning up data...');
  
  // Hard delete related records first to satisfy foreign key constraints
  await prisma.councilReview.deleteMany();
  await prisma.councilMinutes.deleteMany();
  await prisma.councilMembership.deleteMany();
  await prisma.council.deleteMany();
  await prisma.contract.deleteMany();
  await prisma.projectReport.deleteMany();
  await prisma.extension.deleteMany();
  await prisma.budgetItem.deleteMany();
  await prisma.settlementAudit.deleteMany();
  await prisma.settlement.deleteMany();
  await prisma.archiveRecord.deleteMany();
  await prisma.projectMember.deleteMany();
  
  // Finally delete all projects
  const deletedProjects = await prisma.project.deleteMany();
  
  console.log(`Successfully deleted ${deletedProjects.count} projects and all related contracts/councils/reports!`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
