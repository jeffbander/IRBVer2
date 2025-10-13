#!/usr/bin/env node

/**
 * Migration script: SQLite to PostgreSQL
 *
 * This script migrates data from SQLite (dev) to PostgreSQL (production)
 *
 * Usage:
 *   node scripts/migrate-sqlite-to-postgres.js
 *
 * Environment variables required:
 *   - SQLITE_DATABASE_URL: Path to SQLite database (e.g., file:./prisma/dev.db)
 *   - POSTGRES_DATABASE_URL: PostgreSQL connection string
 */

const { PrismaClient: PrismaClientSQLite } = require('@prisma/client');
const { PrismaClient: PrismaClientPostgres } = require('@prisma/client');

// SQLite client
const sqliteClient = new PrismaClientSQLite({
  datasources: {
    db: {
      url: process.env.SQLITE_DATABASE_URL || 'file:./prisma/dev.db'
    }
  }
});

// PostgreSQL client
const postgresClient = new PrismaClientPostgres({
  datasources: {
    db: {
      url: process.env.POSTGRES_DATABASE_URL
    }
  }
});

async function migrateData() {
  console.log('Starting migration from SQLite to PostgreSQL...\n');

  try {
    // 1. Migrate Roles
    console.log('Migrating Roles...');
    const roles = await sqliteClient.role.findMany();
    for (const role of roles) {
      await postgresClient.role.upsert({
        where: { id: role.id },
        update: role,
        create: role,
      });
    }
    console.log(`✓ Migrated ${roles.length} roles\n`);

    // 2. Migrate Users
    console.log('Migrating Users...');
    const users = await sqliteClient.user.findMany();
    for (const user of users) {
      await postgresClient.user.upsert({
        where: { id: user.id },
        update: user,
        create: user,
      });
    }
    console.log(`✓ Migrated ${users.length} users\n`);

    // 3. Migrate Studies
    console.log('Migrating Studies...');
    const studies = await sqliteClient.study.findMany();
    for (const study of studies) {
      await postgresClient.study.upsert({
        where: { id: study.id },
        update: study,
        create: study,
      });
    }
    console.log(`✓ Migrated ${studies.length} studies\n`);

    // 4. Migrate Participants
    console.log('Migrating Participants...');
    const participants = await sqliteClient.participant.findMany();
    for (const participant of participants) {
      await postgresClient.participant.upsert({
        where: { id: participant.id },
        update: participant,
        create: participant,
      });
    }
    console.log(`✓ Migrated ${participants.length} participants\n`);

    // 5. Migrate Enrollments
    console.log('Migrating Enrollments...');
    const enrollments = await sqliteClient.enrollment.findMany();
    for (const enrollment of enrollments) {
      await postgresClient.enrollment.upsert({
        where: { id: enrollment.id },
        update: enrollment,
        create: enrollment,
      });
    }
    console.log(`✓ Migrated ${enrollments.length} enrollments\n`);

    // 6. Migrate Documents
    console.log('Migrating Documents...');
    const documents = await sqliteClient.document.findMany();
    for (const document of documents) {
      await postgresClient.document.upsert({
        where: { id: document.id },
        update: document,
        create: document,
      });
    }
    console.log(`✓ Migrated ${documents.length} documents\n`);

    // 7. Migrate AutomationLogs
    console.log('Migrating AutomationLogs...');
    const automationLogs = await sqliteClient.automationLog.findMany();
    for (const log of automationLogs) {
      await postgresClient.automationLog.upsert({
        where: { id: log.id },
        update: log,
        create: log,
      });
    }
    console.log(`✓ Migrated ${automationLogs.length} automation logs\n`);

    // 8. Migrate AuditLogs
    console.log('Migrating AuditLogs...');
    const auditLogs = await sqliteClient.auditLog.findMany();
    for (const log of auditLogs) {
      await postgresClient.auditLog.upsert({
        where: { id: log.id },
        update: log,
        create: log,
      });
    }
    console.log(`✓ Migrated ${auditLogs.length} audit logs\n`);

    console.log('✓ Migration completed successfully!');

    // Print summary
    console.log('\n=== Migration Summary ===');
    console.log(`Roles: ${roles.length}`);
    console.log(`Users: ${users.length}`);
    console.log(`Studies: ${studies.length}`);
    console.log(`Participants: ${participants.length}`);
    console.log(`Enrollments: ${enrollments.length}`);
    console.log(`Documents: ${documents.length}`);
    console.log(`Automation Logs: ${automationLogs.length}`);
    console.log(`Audit Logs: ${auditLogs.length}`);
    console.log('========================\n');

  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await sqliteClient.$disconnect();
    await postgresClient.$disconnect();
  }
}

// Run migration
migrateData()
  .then(() => {
    console.log('Migration script completed.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration script failed:', error);
    process.exit(1);
  });
