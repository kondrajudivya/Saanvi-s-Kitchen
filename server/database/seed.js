const db = require('../config/db');

async function seed() {
  console.log('[SEED] Running standalone database seed for Saanvi\'s Kitchen...');
  const success = await db.initDatabase();
  if (success) {
    console.log('[SEED] Database schema and initial seed data established successfully.');
  } else {
    console.log('[SEED] Completed with fallback memory store initialization.');
  }
  process.exit(0);
}

seed();
