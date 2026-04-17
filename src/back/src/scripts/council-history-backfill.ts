import fs from 'fs/promises';
import path from 'path';
import { z } from 'zod';
import { CouncilStatus, PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const CouncilRoleSchema = z.enum(['chu_tich', 'phan_bien_1', 'phan_bien_2', 'thu_ky', 'uy_vien']);

const ManifestMemberSchema = z.object({
  userId: z.string().cuid().optional(),
  email: z.string().email(),
  name: z.string().min(2),
  title: z.string().optional(),
  institution: z.string().optional(),
  affiliation: z.string().optional(),
  phone: z.string().optional(),
  role: CouncilRoleSchema,
  hasConflict: z.boolean().optional(),
});

const ManifestCouncilSchema = z.object({
  decisionCode: z.string().min(1),
  councilId: z.string().cuid().optional(),
  status: z.nativeEnum(CouncilStatus).optional(),
  decisionPdfUrl: z.string().trim().min(1).optional(),
  minutesFileUrl: z.string().trim().min(1).optional(),
  replaceMemberships: z.boolean().optional().default(true),
  members: z.array(ManifestMemberSchema).min(1),
});

const ManifestSchema = z.object({
  councils: z.array(ManifestCouncilSchema).default([]),
});

const REQUIRED_ROLES = ['chu_tich', 'phan_bien_1', 'phan_bien_2', 'thu_ky'] as const;

type CouncilRole = z.infer<typeof CouncilRoleSchema>;
type ManifestCouncil = z.infer<typeof ManifestCouncilSchema>;
type ManifestMember = z.infer<typeof ManifestMemberSchema>;

const normalizeText = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

const getArgs = () => {
  const args = process.argv.slice(2);
  const getValue = (flag: string) => {
    const index = args.indexOf(flag);
    return index >= 0 ? args[index + 1] : undefined;
  };

  return {
    apply: args.includes('--apply'),
    manifestPath: getValue('--manifest')
      ? path.resolve(process.cwd(), getValue('--manifest')!)
      : path.resolve(process.cwd(), 'src/scripts/council-history-backfill.manifest.json'),
  };
};

const loadManifest = async (manifestPath: string) => {
  const raw = await fs.readFile(manifestPath, 'utf8');
  return ManifestSchema.parse(JSON.parse(raw));
};

const requiredMissingRoles = (members: Array<{ role: CouncilRole }>) =>
  REQUIRED_ROLES.filter((role) => !members.some((member) => member.role === role));

const reportCouncil = (entry: {
  decisionCode: string;
  status: string;
  memberCount: number;
  missingRoles: string[];
  members: Array<{ name: string; email: string; role: string }>;
}) => {
  const suffix = entry.missingRoles.length ? ` missing=[${entry.missingRoles.join(', ')}]` : '';
  console.log(`${entry.decisionCode} | status=${entry.status} | members=${entry.memberCount}${suffix}`);
  console.log(`  current=${entry.members.map((member) => `${member.role}:${member.name}<${member.email}>`).join(' | ')}`);
};

const findExistingMember = async (councilId: string, member: ManifestMember) => {
  const members = await prisma.councilMembership.findMany({
    where: { councilId },
    include: { user: { select: { email: true } } },
    orderBy: { createdAt: 'asc' },
  });

  const normalizedEmail = normalizeText(member.email);
  const normalizedName = normalizeText(member.name);
  return members.find((item) => {
    const itemEmail = normalizeText(item.email);
    const itemName = normalizeText(item.name);
    const itemUserEmail = item.user?.email ? normalizeText(item.user.email) : '';
    return (
      (member.userId && item.userId === member.userId) ||
      itemEmail === normalizedEmail ||
      itemUserEmail === normalizedEmail ||
      itemName === normalizedName
    );
  });
};

const resolveCouncil = async (item: ManifestCouncil) => {
  const council = await prisma.council.findFirst({
    where: {
      is_deleted: false,
      OR: item.councilId ? [{ id: item.councilId }, { decisionCode: item.decisionCode }] : [{ decisionCode: item.decisionCode }],
    },
    include: {
      members: { where: { is_deleted: false }, select: { role: true } },
    },
  });

  if (!council) {
    throw new Error(`Council not found: ${item.decisionCode}`);
  }

  return council;
};

const applyCouncil = async (item: ManifestCouncil) => {
  const council = await resolveCouncil(item);

  const existingMembers = await prisma.councilMembership.findMany({
    where: { councilId: council.id },
    orderBy: { createdAt: 'asc' },
  });

  const touchedMemberIds = new Set<string>();
  let created = 0;
  let updated = 0;
  let deleted = 0;

  for (const member of item.members) {
    const matched = await findExistingMember(council.id, member);
    const user = member.userId
      ? await prisma.user.findFirst({ where: { id: member.userId, is_deleted: false }, select: { id: true, role: true } })
      : await prisma.user.findFirst({ where: { email: member.email, is_deleted: false }, select: { id: true, role: true } });

    const payload = {
      userId: member.userId ?? user?.id ?? null,
      name: member.name,
      title: member.title ?? null,
      institution: member.institution ?? null,
      email: member.email,
      phone: member.phone ?? null,
      affiliation: member.affiliation ?? null,
      role: member.role,
      hasConflict: member.hasConflict ?? false,
      is_deleted: false,
    };

    if (matched) {
      touchedMemberIds.add(matched.id);
      await prisma.councilMembership.update({ where: { id: matched.id }, data: payload });
      updated += 1;
    } else {
      await prisma.councilMembership.create({ data: { councilId: council.id, ...payload } });
      created += 1;
    }

    if (user?.id) {
      await prisma.user.update({
        where: { id: user.id },
        data: { councilRole: member.role === 'chu_tich' ? 'chairman' : member.role === 'thu_ky' ? 'secretary' : 'reviewer' },
      });
    }
  }

  if (item.replaceMemberships) {
    const removable = existingMembers.filter((member) => !touchedMemberIds.has(member.id));
    for (const member of removable) {
      await prisma.councilMembership.update({ where: { id: member.id }, data: { is_deleted: true } });
      deleted += 1;
    }
  }

  const currentMembers = await prisma.councilMembership.findMany({
    where: { councilId: council.id, is_deleted: false },
    select: { role: true },
  });
  const missingRoles = requiredMissingRoles(currentMembers as Array<{ role: CouncilRole }>);

  if (item.status && item.status === 'da_hoan_thanh' && missingRoles.length > 0) {
    throw new Error(`Council ${item.decisionCode} is missing required roles: ${missingRoles.join(', ')}`);
  }

  await prisma.council.update({
    where: { id: council.id },
    data: {
      ...(item.status ? { status: item.status } : {}),
      ...(item.decisionPdfUrl ? { decisionPdfUrl: item.decisionPdfUrl } : {}),
    },
  });

  if (item.minutesFileUrl) {
    await prisma.councilMinutes.upsert({
      where: { councilId: council.id },
      create: { councilId: council.id, fileUrl: item.minutesFileUrl, content: '', recordedBy: 'historical-backfill' },
      update: { fileUrl: item.minutesFileUrl },
    });
  }

  return {
    decisionCode: item.decisionCode,
    councilId: council.id,
    created,
    updated,
    deleted,
    missingRoles,
  };
};

const main = async () => {
  const args = getArgs();

  if (!args.apply) {
    const councilUsers = await prisma.user.findMany({
      where: { role: 'council_member', is_deleted: false },
      select: { name: true, email: true, councilRole: true },
      orderBy: { email: 'asc' },
    });

    console.log('Available council-member accounts:');
    councilUsers.forEach((user) => {
      console.log(`  ${user.councilRole ?? 'none'}: ${user.name}<${user.email}>`);
    });

    const councils = await prisma.council.findMany({
      where: { is_deleted: false },
      include: { members: { where: { is_deleted: false }, select: { role: true, name: true, email: true } } },
      orderBy: { createdDate: 'desc' },
    });

    const broken = councils
      .map((council) => ({
        decisionCode: council.decisionCode,
        status: council.status,
        memberCount: council.members.length,
        missingRoles: requiredMissingRoles(council.members as Array<{ role: CouncilRole }>),
        members: council.members.map((member) => ({ name: member.name, email: member.email, role: member.role })),
      }))
      .filter((entry) => entry.memberCount < 5 || entry.missingRoles.length > 0 || entry.status === 'da_hoan_thanh' && entry.missingRoles.length > 0);

    console.log(`Found ${broken.length} council(s) needing historical repair.`);
    broken.forEach(reportCouncil);
    return;
  }

  const manifest = await loadManifest(args.manifestPath);
  if (!manifest.councils.length) {
    throw new Error(`Manifest is empty: ${args.manifestPath}`);
  }

  const results = [] as Awaited<ReturnType<typeof applyCouncil>>[];
  for (const item of manifest.councils) {
    const result = await applyCouncil(item);
    results.push(result);
    console.log(`Applied ${result.decisionCode}: +${result.created} ~${result.updated} -${result.deleted}`);
    if (result.missingRoles.length) {
      console.log(`  Remaining missing roles: ${result.missingRoles.join(', ')}`);
    }
  }

  console.log(`Completed backfill for ${results.length} council(s).`);
};

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });