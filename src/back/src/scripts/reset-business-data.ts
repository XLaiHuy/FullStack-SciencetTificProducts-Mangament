import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const DEMO_EMAILS = [
  'staff@nckh.edu.vn',
  'owner@nckh.edu.vn',
  'accounting@nckh.edu.vn',
  'archive@nckh.edu.vn',
  'reports@nckh.edu.vn',
  'admin@nckh.edu.vn',
  'chairman@demo.com',
  'reviewer@demo.com',
  'secretary@demo.com',
  'member@demo.com',
];

async function main() {
  console.log('Resetting business data to empty state...');
  const keepMode = (process.env.RESET_KEEP_USERS ?? 'all').trim().toLowerCase();

  await prisma.councilReview.deleteMany();
  await prisma.councilMinutes.deleteMany();
  await prisma.councilMembership.deleteMany();
  await prisma.council.deleteMany();

  await prisma.settlementAudit.deleteMany();
  await prisma.budgetItem.deleteMany();
  await prisma.settlement.deleteMany();

  await prisma.extension.deleteMany();
  await prisma.projectReport.deleteMany();
  await prisma.archiveRecord.deleteMany();
  await prisma.contract.deleteMany();
  await prisma.projectMember.deleteMany();
  await prisma.project.deleteMany();

  await prisma.formTemplate.deleteMany();
  await prisma.formType.deleteMany();
  await prisma.template.deleteMany();

  await prisma.emailLog.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.refreshToken.deleteMany();

  if (keepMode === 'demo_and_project_owners') {
    const usersToKeep = await prisma.user.findMany({
      where: {
        is_deleted: false,
        OR: [
          { email: { in: DEMO_EMAILS } },
          { role: 'project_owner' },
        ],
      },
      select: { id: true, email: true, role: true },
    });

    const keepUserIds = usersToKeep.map((user) => user.id);
    if (keepUserIds.length > 0) {
      await prisma.user.deleteMany({
        where: {
          id: { notIn: keepUserIds },
        },
      });
    } else {
      await prisma.user.deleteMany();
    }

    console.log(`Kept ${usersToKeep.length} users (demo + project_owner).`);
  }

  console.log('Business data reset completed.');
  if (keepMode === 'demo_and_project_owners') {
    console.log('Kept: demo accounts + project_owner accounts + categories + system configs.');
  } else {
    console.log('Kept: user accounts + categories + system configs.');
  }
}

main()
  .catch((error) => {
    console.error('Reset failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
