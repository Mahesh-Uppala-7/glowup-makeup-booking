import { PrismaClient, Role, ServiceCategory } from '@prisma/client';

const prisma = new PrismaClient();

const services = [
  { name: 'Basic Makeup', category: ServiceCategory.BASIC, basePrice: 600, durationMin: 45, description: 'Everyday natural look — foundation, eyes, lips.' },
  { name: 'Party Makeup', category: ServiceCategory.PARTY, basePrice: 900, durationMin: 60, description: 'Glam look for parties and events.' },
  { name: 'Engagement Makeup', category: ServiceCategory.ENGAGEMENT, basePrice: 1100, durationMin: 90, description: 'Elegant look for your engagement day.' },
  { name: 'Bridal Makeup', category: ServiceCategory.BRIDAL, basePrice: 1300, durationMin: 120, description: 'Complete bridal makeover for your big day.' },
  { name: 'HD Bridal Makeup', category: ServiceCategory.BRIDAL, basePrice: 2500, durationMin: 150, description: 'High-definition, camera-ready bridal makeup.' },
  { name: 'Hair Styling', category: ServiceCategory.HAIR, basePrice: 500, durationMin: 45, description: 'Professional hair styling and setting.' },
];

// Mon–Sat, 9:00–18:00 availability template.
const weekday = (dayOfWeek: number) => ({ dayOfWeek, startTime: '09:00', endTime: '18:00' });

async function main() {
  console.log('Seeding services...');
  const createdServices = [];
  for (const s of services) {
    const service = await prisma.service.upsert({
      where: { id: s.name.toLowerCase().replace(/\s+/g, '-') },
      update: s,
      create: { id: s.name.toLowerCase().replace(/\s+/g, '-'), ...s },
    });
    createdServices.push(service);
  }

  const basic = createdServices.find((s) => s.name === 'Basic Makeup')!;
  const party = createdServices.find((s) => s.name === 'Party Makeup')!;
  const bridal = createdServices.find((s) => s.name === 'Bridal Makeup')!;
  const hdBridal = createdServices.find((s) => s.name === 'HD Bridal Makeup')!;
  const hair = createdServices.find((s) => s.name === 'Hair Styling')!;

  console.log('Seeding admin...');
  await prisma.user.upsert({
    where: { mobile: '9000000000' },
    update: { role: Role.ADMIN },
    create: { mobile: '9000000000', name: 'Platform Admin', role: Role.ADMIN },
  });

  const artistSeeds = [
    {
      mobile: '9811111111',
      name: 'Aisha Khan',
      displayName: 'Aisha Khan Makeovers',
      bio: '8+ years of bridal & HD makeup experience. Certified professional.',
      experienceYears: 8,
      city: 'Hyderabad',
      latitude: 17.4474,
      longitude: 78.3762,
      rating: 4.8,
      ratingCount: 124,
      offers: [
        { service: basic, price: 650 },
        { service: party, price: 950 },
        { service: bridal, price: 1300 },
        { service: hdBridal, price: 2600 },
      ],
    },
    {
      mobile: '9822222222',
      name: 'Priya Sharma',
      displayName: 'Glam by Priya',
      bio: 'Party and engagement makeup specialist. Loves bold, colourful looks.',
      experienceYears: 5,
      city: 'Hyderabad',
      latitude: 17.4065,
      longitude: 78.4772,
      rating: 4.6,
      ratingCount: 87,
      offers: [
        { service: basic, price: 600 },
        { service: party, price: 900 },
        { service: hair, price: 500 },
      ],
    },
    {
      mobile: '9833333333',
      name: 'Neha Reddy',
      displayName: 'Neha Reddy Studio',
      bio: 'Luxury bridal makeovers with premium products.',
      experienceYears: 10,
      city: 'Bengaluru',
      latitude: 12.9716,
      longitude: 77.5946,
      rating: 4.9,
      ratingCount: 201,
      offers: [
        { service: bridal, price: 1500 },
        { service: hdBridal, price: 2800 },
        { service: party, price: 1000 },
      ],
    },
  ];

  console.log('Seeding artists...');
  for (const a of artistSeeds) {
    const user = await prisma.user.upsert({
      where: { mobile: a.mobile },
      update: { name: a.name, role: Role.ARTIST },
      create: { mobile: a.mobile, name: a.name, role: Role.ARTIST },
    });

    const profile = await prisma.artistProfile.upsert({
      where: { userId: user.id },
      update: {
        displayName: a.displayName,
        bio: a.bio,
        experienceYears: a.experienceYears,
        city: a.city,
        latitude: a.latitude,
        longitude: a.longitude,
        rating: a.rating,
        ratingCount: a.ratingCount,
        isVerified: true,
      },
      create: {
        userId: user.id,
        displayName: a.displayName,
        bio: a.bio,
        experienceYears: a.experienceYears,
        city: a.city,
        latitude: a.latitude,
        longitude: a.longitude,
        rating: a.rating,
        ratingCount: a.ratingCount,
        isVerified: true,
      },
    });

    await prisma.artistService.deleteMany({ where: { artistId: profile.id } });
    await prisma.artistService.createMany({
      data: a.offers.map((o) => ({ artistId: profile.id, serviceId: o.service.id, price: o.price })),
      skipDuplicates: true,
    });

    await prisma.availabilitySlot.deleteMany({ where: { artistId: profile.id } });
    await prisma.availabilitySlot.createMany({
      data: [1, 2, 3, 4, 5, 6].map((d) => ({ artistId: profile.id, ...weekday(d) })),
    });
  }

  console.log('Seed complete.');
  console.log('Admin mobile: 9000000000 | Artists: 9811111111, 9822222222, 9833333333');
  console.log('Use OTP_DEV_MODE=true and the devCode returned by /auth/otp/request to log in.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
