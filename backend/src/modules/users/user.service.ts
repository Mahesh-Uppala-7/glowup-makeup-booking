import { prisma } from '../../config/prisma';
import { ApiError } from '../../utils/apiError';

export async function getProfile(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { artistProfile: true },
  });
  if (!user) throw ApiError.notFound('User not found');
  return user;
}

export async function updateProfile(
  userId: string,
  data: { name?: string; email?: string; avatarUrl?: string },
) {
  return prisma.user.update({
    where: { id: userId },
    data,
    include: { artistProfile: true },
  });
}
