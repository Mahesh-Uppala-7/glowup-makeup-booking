import { Prisma } from '@prisma/client';
import fs from 'node:fs';
import path from 'node:path';
import { prisma } from '../../config/prisma';
import { ApiError } from '../../utils/apiError';
import { boundingBox, haversineKm } from '../../utils/geo';
import { uploadRoot } from '../../middleware/upload';

const artistInclude = {
  user: { select: { id: true, name: true, mobile: true, avatarUrl: true } },
  services: { include: { service: true } },
  availability: { where: { isActive: true } },
  portfolio: { orderBy: { createdAt: 'desc' } },
} satisfies Prisma.ArtistProfileInclude;

const DEFAULT_RADIUS_KM = 25;

/* Browse artists, optionally filtered by service, city, name, or proximity. */
export async function listArtists(filters: {
  serviceId?: string;
  city?: string;
  search?: string;
  lat?: number;
  lng?: number;
  radiusKm?: number;
}) {
  const where: Prisma.ArtistProfileWhereInput = { isAvailable: true };
  if (filters.city) where.city = { contains: filters.city, mode: 'insensitive' };
  if (filters.search) where.displayName = { contains: filters.search, mode: 'insensitive' };
  if (filters.serviceId) {
    where.services = { some: { serviceId: filters.serviceId } };
  }

  const near = typeof filters.lat === 'number' && typeof filters.lng === 'number';
  if (near) {
    const radiusKm = filters.radiusKm && filters.radiusKm > 0 ? filters.radiusKm : DEFAULT_RADIUS_KM;
    // Cheap, index-friendly bounding-box prefilter, then precise Haversine distance.
    const box = boundingBox(filters.lat as number, filters.lng as number, radiusKm);
    where.latitude = { gte: box.minLat, lte: box.maxLat };
    where.longitude = { gte: box.minLng, lte: box.maxLng };

    const artists = await prisma.artistProfile.findMany({ where, include: artistInclude });
    return artists
      .map((a) => ({
        ...a,
        distanceKm:
          Math.round(
            haversineKm(
              filters.lat as number,
              filters.lng as number,
              a.latitude as number,
              a.longitude as number,
            ) * 10,
          ) / 10,
      }))
      .filter((a) => a.distanceKm <= radiusKm)
      .sort((x, y) => x.distanceKm - y.distanceKm);
  }

  return prisma.artistProfile.findMany({
    where,
    include: artistInclude,
    orderBy: [{ rating: 'desc' }, { ratingCount: 'desc' }],
  });
}

export async function getArtist(id: string) {
  const artist = await prisma.artistProfile.findUnique({
    where: { id },
    include: artistInclude,
  });
  if (!artist) throw ApiError.notFound('Artist not found');
  return artist;
}

export async function getArtistByUserId(userId: string) {
  return prisma.artistProfile.findUnique({
    where: { userId },
    include: artistInclude,
  });
}

/* Create or update the calling artist's profile and promote their role to ARTIST. */
export async function upsertMyProfile(
  userId: string,
  data: {
    displayName: string;
    bio?: string;
    experienceYears?: number;
    city?: string;
    address?: string;
    latitude?: number;
    longitude?: number;
  },
) {
  const [profile] = await prisma.$transaction([
    prisma.artistProfile.upsert({
      where: { userId },
      update: data,
      create: { userId, ...data },
      include: artistInclude,
    }),
    prisma.user.update({ where: { id: userId }, data: { role: 'ARTIST' } }),
  ]);
  return profile;
}

/* Replace the services (and prices) offered by an artist. */
export async function setMyServices(
  userId: string,
  items: Array<{ serviceId: string; price: number }>,
) {
  const artist = await requireArtist(userId);
  await prisma.$transaction([
    prisma.artistService.deleteMany({ where: { artistId: artist.id } }),
    prisma.artistService.createMany({
      data: items.map((i) => ({ artistId: artist.id, serviceId: i.serviceId, price: i.price })),
      skipDuplicates: true,
    }),
  ]);
  return getArtist(artist.id);
}

/* Replace the weekly availability for an artist. */
export async function setMyAvailability(
  userId: string,
  slots: Array<{ dayOfWeek: number; startTime: string; endTime: string }>,
) {
  const artist = await requireArtist(userId);
  await prisma.$transaction([
    prisma.availabilitySlot.deleteMany({ where: { artistId: artist.id } }),
    prisma.availabilitySlot.createMany({
      data: slots.map((s) => ({ artistId: artist.id, ...s })),
    }),
  ]);
  return getArtist(artist.id);
}

async function requireArtist(userId: string) {
  const artist = await prisma.artistProfile.findUnique({ where: { userId } });
  if (!artist) throw ApiError.badRequest('Create your artist profile first');
  return artist;
}

/* Add an uploaded image to the calling artist's portfolio gallery. */
export async function addPortfolioImage(
  userId: string,
  data: { url: string; caption?: string },
) {
  const artist = await requireArtist(userId);
  return prisma.portfolioImage.create({
    data: { artistId: artist.id, url: data.url, caption: data.caption },
  });
}

export async function listPortfolio(artistId: string) {
  return prisma.portfolioImage.findMany({
    where: { artistId },
    orderBy: { createdAt: 'desc' },
  });
}

/* Remove a portfolio image (and its file) owned by the calling artist. */
export async function deletePortfolioImage(userId: string, imageId: string) {
  const artist = await requireArtist(userId);
  const image = await prisma.portfolioImage.findUnique({ where: { id: imageId } });
  if (!image || image.artistId !== artist.id) {
    throw ApiError.notFound('Image not found');
  }
  // Best-effort delete of the file on disk.
  const filename = image.url.split('/').pop();
  if (filename) {
    fs.promises
      .unlink(path.join(uploadRoot, 'portfolio', filename))
      .catch(() => undefined);
  }
  await prisma.portfolioImage.delete({ where: { id: imageId } });
  return { id: imageId };
}

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

function toHHMM(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * Compute bookable start times for an artist on a given date.
 * Honours weekly availability, the service duration, existing bookings, and a step interval.
 */
export async function getAvailableSlots(
  artistId: string,
  dateStr: string,
  serviceId?: string,
  stepMinutes = 30,
): Promise<{ date: string; durationMin: number; slots: string[] }> {
  const date = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    throw ApiError.badRequest('Invalid date. Use YYYY-MM-DD.');
  }
  const dayOfWeek = date.getDay();

  const artist = await prisma.artistProfile.findUnique({
    where: { id: artistId },
    include: { availability: { where: { dayOfWeek, isActive: true } } },
  });
  if (!artist) throw ApiError.notFound('Artist not found');

  let durationMin = 60;
  if (serviceId) {
    const svc = await prisma.service.findUnique({ where: { id: serviceId } });
    if (svc) durationMin = svc.durationMin;
  }

  const dayStart = new Date(date);
  const dayEnd = new Date(date);
  dayEnd.setDate(dayEnd.getDate() + 1);

  const bookings = await prisma.booking.findMany({
    where: {
      artistId,
      scheduledAt: { gte: dayStart, lt: dayEnd },
      status: { not: 'CANCELLED' },
    },
    select: { scheduledAt: true, durationMin: true },
  });

  const busy = bookings.map((b) => {
    const start = b.scheduledAt.getHours() * 60 + b.scheduledAt.getMinutes();
    return { start, end: start + b.durationMin };
  });

  const now = new Date();
  const isToday = now.toDateString() === date.toDateString();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  const slots: string[] = [];
  for (const window of artist.availability) {
    const open = toMinutes(window.startTime);
    const close = toMinutes(window.endTime);
    for (let t = open; t + durationMin <= close; t += stepMinutes) {
      const slotEnd = t + durationMin;
      const overlaps = busy.some((b) => t < b.end && slotEnd > b.start);
      const inPast = isToday && t <= nowMinutes;
      if (!overlaps && !inPast) slots.push(toHHMM(t));
    }
  }

  return { date: dateStr, durationMin, slots };
}
