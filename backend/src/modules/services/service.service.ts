import { Prisma, ServiceCategory } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { ApiError } from '../../utils/apiError';

export async function listServices(filters: { category?: ServiceCategory; search?: string }) {
  const where: Prisma.ServiceWhereInput = { isActive: true };
  if (filters.category) where.category = filters.category;
  if (filters.search) {
    where.name = { contains: filters.search, mode: 'insensitive' };
  }
  return prisma.service.findMany({ where, orderBy: { basePrice: 'asc' } });
}

export async function getService(id: string) {
  const service = await prisma.service.findUnique({ where: { id } });
  if (!service) throw ApiError.notFound('Service not found');
  return service;
}

export async function createService(data: {
  name: string;
  description?: string;
  category: ServiceCategory;
  basePrice: number;
  durationMin: number;
  imageUrl?: string;
}) {
  return prisma.service.create({ data });
}

export async function updateService(
  id: string,
  data: Partial<{
    name: string;
    description: string;
    category: ServiceCategory;
    basePrice: number;
    durationMin: number;
    imageUrl: string;
    isActive: boolean;
  }>,
) {
  return prisma.service.update({ where: { id }, data });
}
