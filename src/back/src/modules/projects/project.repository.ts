import prisma from '../../prisma';
import { ProjectStatus, Prisma } from '@prisma/client';

export const ProjectRepository = {
  async count(where: Prisma.ProjectWhereInput) {
    return prisma.project.count({ where });
  },

  async findManyWithPagination(
    where: Prisma.ProjectWhereInput,
    skip: number,
    take: number
  ) {
    return prisma.project.findMany({
      where,
      include: { owner: { select: { id: true, name: true, email: true, title: true } } },
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    });
  },

  async findById(id: string) {
    return prisma.project.findFirst({
      where: { OR: [{ id }, { code: id }], is_deleted: false },
      include: {
        owner:       { select: { id: true, name: true, email: true, title: true, department: true } },
        members:     { where: { is_deleted: false }, include: { user: { select: { name: true, email: true } } } },
        contracts:   { where: { is_deleted: false } },
        councils:    { where: { is_deleted: false }, include: { members: true } },
        extensions:  true,
        settlements: { where: { is_deleted: false } },
        reports:     true,
      },
    });
  },

  async findByOwner(ownerId: string) {
    return prisma.project.findMany({
      where: { ownerId, is_deleted: false },
      orderBy: { createdAt: 'desc' },
    });
  },

  async create(data: Prisma.ProjectCreateInput) {
    return prisma.project.create({ data });
  },

  async update(id: string, data: Prisma.ProjectUpdateInput) {
    return prisma.project.update({ where: { id }, data });
  },

  async softDelete(id: string) {
    return prisma.project.update({ where: { id }, data: { is_deleted: true } });
  },

  async createReport(data: Prisma.ProjectReportUncheckedCreateInput) {
    return prisma.projectReport.create({ data });
  },

  async aggregateBudget(where: Prisma.ProjectWhereInput) {
    return prisma.project.aggregate({
      where,
      _sum: { budget: true, advancedAmount: true },
    });
  },
};
