import { PrismaClient, Role, EventCategory, EventStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  const organizerEmail = process.env.SEED_ORGANIZER_EMAIL || 'organizer@kmutt.ac.th';
  const organizerPassword = process.env.SEED_ORGANIZER_PASSWORD || 'AdminInitial123!';
  const participantEmail = process.env.SEED_PARTICIPANT_EMAIL || 'participant@kmutt.ac.th';
  const participantPassword = process.env.SEED_PARTICIPANT_PASSWORD || 'Participant123!';

  const salt = await bcrypt.genSalt(10);
  const organizerHash = await bcrypt.hash(organizerPassword, salt);
  const participantHash = await bcrypt.hash(participantPassword, salt);

  // 1. Upsert Organizer
  const organizer = await prisma.user.upsert({
    where: { email: organizerEmail },
    update: { passwordHash: organizerHash },
    create: {
      email: organizerEmail,
      name: 'Dr. Faculty Organizer',
      passwordHash: organizerHash,
      role: Role.ORGANIZER,
    },
  });

  // 2. Upsert Participant
  const participant = await prisma.user.upsert({
    where: { email: participantEmail },
    update: { passwordHash: participantHash },
    create: {
      email: participantEmail,
      name: 'Somchai Student',
      passwordHash: participantHash,
      role: Role.PARTICIPANT,
    },
  });

  console.log(`Seeded users: Organizer (${organizer.email}), Participant (${participant.email})`);

  // 3. Pre-seed events if none exist
  const existingEventsCount = await prisma.event.count();
  if (existingEventsCount === 0) {
    const now = new Date();
    const futureStart1 = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days ahead
    const futureEnd1 = new Date(futureStart1.getTime() + 3 * 60 * 60 * 1000); // +3 hours

    const futureStart2 = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000); // 14 days ahead
    const futureEnd2 = new Date(futureStart2.getTime() + 4 * 60 * 60 * 1000); // +4 hours

    const futureStart3 = new Date(now.getTime() + 21 * 24 * 60 * 60 * 1000); // 21 days ahead
    const futureEnd3 = new Date(futureStart3.getTime() + 2 * 60 * 60 * 1000); // +2 hours

    // Event 1: Draft workshop
    await prisma.event.create({
      data: {
        title: 'Kubernetes on GCP Hands-on Workshop',
        description: 'Deep dive into container orchestration, Cloud Run, and GKE.',
        category: EventCategory.WORKSHOP,
        location: 'CB4 Computer Lab 2',
        startAt: futureStart1,
        endAt: futureEnd1,
        capacity: 25,
        status: EventStatus.DRAFT,
        organizerId: organizer.id,
      },
    });

    // Event 2: Published seminar with open seats
    const event2 = await prisma.event.create({
      data: {
        title: 'AI Agents in Software Engineering Seminar',
        description: 'Industry guest speaker sharing modern multi-agent coding workflows.',
        category: EventCategory.SEMINAR,
        location: 'Auditorium Hall A',
        startAt: futureStart2,
        endAt: futureEnd2,
        capacity: 100,
        status: EventStatus.PUBLISHED,
        organizerId: organizer.id,
      },
    });

    // Event 3: Published workshop with 1 seat remaining (for concurrency & testing)
    const event3 = await prisma.event.create({
      data: {
        title: 'High-Throughput Database Concurrency Lab',
        description: 'Testing row-level locks and isolation levels with PostgreSQL.',
        category: EventCategory.WORKSHOP,
        location: 'Software Engineering Room 402',
        startAt: futureStart3,
        endAt: futureEnd3,
        capacity: 1,
        status: EventStatus.PUBLISHED,
        organizerId: organizer.id,
      },
    });

    console.log('Seeded initial draft & published events.');
  }

  console.log('Seeding completed successfully.');
}

main()
  .catch((e) => {
    console.error('Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
