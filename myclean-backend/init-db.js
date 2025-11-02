// Database initialization script for production
// This runs automatically on server startup

const { execSync } = require('child_process');

console.log('🔄 Initializing database...');

try {
  // Push database schema
  console.log('📊 Creating database tables...');
  execSync('npx prisma db push --accept-data-loss --skip-generate', { 
    stdio: 'inherit' 
  });
  console.log('✅ Database tables created!');

  // Check if database is empty (no users)
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();
  
  prisma.user.count().then(async (count) => {
    if (count === 0) {
      console.log('📦 Database is empty, seeding sample data...');
      try {
        execSync('npm run seed', { stdio: 'inherit' });
        console.log('✅ Database seeded successfully!');
      } catch (seedError) {
        console.log('⚠️  Seeding skipped (not critical)');
      }
    } else {
      console.log(`✅ Database already has ${count} users, skipping seed`);
    }
    await prisma.$disconnect();
  }).catch(async (error) => {
    console.log('⚠️  Could not check database, proceeding anyway');
    await prisma.$disconnect();
  });

} catch (error) {
  console.error('❌ Database initialization error:', error.message);
  console.log('⚠️  Continuing anyway - database might already be initialized');
}

console.log('🚀 Starting server...');

