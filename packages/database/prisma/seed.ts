import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting Code_Craft database seed...');

  // 1. Cleanup existing records
  await prisma.timeLog.deleteMany();
  await prisma.project.deleteMany();
  await prisma.techUnlock.deleteMany();
  await prisma.user.deleteMany();

  // 2. Seed Admin User
  const admin = await prisma.user.create({
    data: {
      email: 'admin@codecraft.dev',
      name: 'System Administrator',
      role: 'ADMIN',
    },
  });
  console.log(`👤 Admin created: ${admin.email}`);

  // 3. Seed Client Users
  const clientAcme = await prisma.user.create({
    data: {
      email: 'sarah.client@acmecorp.com',
      name: 'Sarah Jenkins (Acme Corp)',
      role: 'CLIENT',
      stripeCustomerId: 'cus_acme_corp_mock',
      defaultPaymentMethodId: 'pm_card_acme_mock',
    },
  });

  const clientFintech = await prisma.user.create({
    data: {
      email: 'david.client@fintech.io',
      name: 'David Zhao (Fintech IO)',
      role: 'CLIENT',
      stripeCustomerId: 'cus_fintech_mock',
      defaultPaymentMethodId: 'pm_card_fintech_mock',
    },
  });
  console.log(`🏢 Clients created: ${clientAcme.email}, ${clientFintech.email}`);

  // 4. Seed Technicians with Skill Category Unlocks
  const techAlex = await prisma.user.create({
    data: {
      email: 'alex.tech@codecraft.dev',
      name: 'Alex Rivera (Senior Web Specialist)',
      role: 'TECH',
      activeJobs: 0,
      techUnlocks: {
        create: [
          { skill: 'React & Fastify', category: 'WEBSITE_CREATION' },
          { skill: 'Next.js & Node', category: 'FULLSTACK' },
        ],
      },
    },
  });

  const techMaria = await prisma.user.create({
    data: {
      email: 'maria.tech@codecraft.dev',
      name: 'Maria Santos (Mobile Specialist)',
      role: 'TECH',
      activeJobs: 1,
      techUnlocks: {
        create: [
          { skill: 'Flutter & Dart', category: 'MOBILE_APPS' },
          { skill: 'Mobile Architecture', category: 'FULLSTACK' },
        ],
      },
    },
  });

  const techChen = await prisma.user.create({
    data: {
      email: 'chen.tech@codecraft.dev',
      name: 'Kevin Chen (Integration Specialist)',
      role: 'TECH',
      activeJobs: 2, // Concurrency cap reached (< 2)
      techUnlocks: {
        create: [
          { skill: 'Webhooks & REST APIs', category: 'CUSTOM_INTEGRATION' },
          { skill: 'Shopify & Stripe', category: 'ECOMMERCE' },
        ],
      },
    },
  });
  console.log(`🛠️ Technicians created: ${techAlex.email}, ${techMaria.email}, ${techChen.email}`);

  // 5. Seed Projects
  // Project 1: OPEN_FOR_CLAIM (Ready for Tech to claim in radar)
  const project1 = await prisma.project.create({
    data: {
      title: 'Acme SaaS Marketing Portal',
      description: 'High-conversion responsive landing pages and custom auth integration.',
      category: 'WEBSITE_CREATION',
      status: 'OPEN_FOR_CLAIM',
      minEstimatedHours: 16,
      maxEstimatedHours: 28,
      hourlyRateCents: 8000,
      hardCapHours: 33,
      fundedHours: 8.0, // 50% initial block funded
      consumedHours: 0.0,
      clientId: clientAcme.id,
      stripeCustomerId: clientAcme.stripeCustomerId,
      defaultPaymentMethodId: clientAcme.defaultPaymentMethodId,
      appliedRulesSnapshot: {
        category: 'WEBSITE_CREATION',
        baselineHours: { min: 30, max: 50 },
        adjustments: [
          { rule: 'hasBrandAssets', applied: true, minHoursDelta: -5, maxHoursDelta: -8, reason: 'Vector brand assets provided' },
          { rule: 'hasWrittenContent', applied: true, minHoursDelta: -4, maxHoursDelta: -6, reason: 'Copywriting prepared' },
          { rule: 'hasDomainAndDns', applied: true, minHoursDelta: -2, maxHoursDelta: -3, reason: 'Domain connected' },
          { rule: 'designPreference_component_library', applied: true, minHoursDelta: -3, maxHoursDelta: -5, reason: 'Tailwind component acceleration' },
        ],
        finalHourRange: { min: 16, max: 28 },
        hourlyRateCents: 8000,
        calculatedAt: new Date().toISOString(),
      },
    },
  });

  // Project 2: IN_PROGRESS (Claimed by Maria Santos)
  const project2 = await prisma.project.create({
    data: {
      title: 'Fintech Mobile App MVP',
      description: 'Cross-platform Flutter application with wallet balance and push alerts.',
      category: 'MOBILE_APPS',
      status: 'IN_PROGRESS',
      minEstimatedHours: 70,
      maxEstimatedHours: 110,
      hourlyRateCents: 8000,
      hardCapHours: 115,
      fundedHours: 35.0, // 50% block funded
      consumedHours: 12.0,
      clientId: clientFintech.id,
      claimedById: techMaria.id,
      isClaimConfirmed: true,
      claimHoldStartedAt: new Date(Date.now() - 3600000 * 48),
      claimHoldExpiresAt: new Date(Date.now() - 3600000 * 47),
      appliedRulesSnapshot: {
        category: 'MOBILE_APPS',
        baselineHours: { min: 70, max: 110 },
        adjustments: [],
        finalHourRange: { min: 70, max: 110 },
        hourlyRateCents: 8000,
        calculatedAt: new Date().toISOString(),
      },
      timeLogs: {
        create: [
          {
            techId: techMaria.id,
            hours: 4.5,
            notes: 'Scaffolded state management, routing, and dark theme palette.',
            gitCommitHash: 'f4b3c2d1e0a9876543210fedcba9876543210abc',
            isAutoApproved: true,
            autoApprovalTriggered: true,
            autoApprovedAt: new Date(),
          },
          {
            techId: techMaria.id,
            hours: 7.5,
            notes: 'Implemented biometric auth and local secure storage encryption.',
            gitCommitHash: 'c9a8b7c6d5e4f3a2b1c0987654321fedcba09876',
            isAutoApproved: false,
          },
        ],
      },
    },
  });

  // Project 3: PENDING_DEPOSIT (Intake completed, awaiting 50% initial payment)
  const project3 = await prisma.project.create({
    data: {
      title: 'Enterprise ERP Webhook Pipeline',
      description: 'Bi-directional webhook synchronization with SAP and automated reconciliation.',
      category: 'CUSTOM_INTEGRATION',
      status: 'PENDING_DEPOSIT',
      minEstimatedHours: 25,
      maxEstimatedHours: 45,
      hourlyRateCents: 8000,
      hardCapHours: 50,
      fundedHours: 0.0,
      consumedHours: 0.0,
      clientId: clientAcme.id,
      appliedRulesSnapshot: {
        category: 'CUSTOM_INTEGRATION',
        baselineHours: { min: 25, max: 45 },
        adjustments: [],
        finalHourRange: { min: 25, max: 45 },
        hourlyRateCents: 8000,
        calculatedAt: new Date().toISOString(),
      },
    },
  });

  console.log(`📁 Sample projects seeded:`);
  console.log(`   - "${project1.title}" (${project1.status})`);
  console.log(`   - "${project2.title}" (${project2.status}, claimed by Maria Santos)`);
  console.log(`   - "${project3.title}" (${project3.status})`);
  console.log('✅ Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
