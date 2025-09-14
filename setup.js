#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🏥 SehatShakti Setup Script');
console.log('============================\n');

// Check if we're in the right directory
if (!fs.existsSync('package.json')) {
  console.error('❌ Error: Please run this script from the sehat-shakti-app directory');
  process.exit(1);
}

// Check Node.js version
const nodeVersion = process.version;
const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);

if (majorVersion < 16) {
  console.error('❌ Error: Node.js version 16 or higher is required');
  console.error(`   Current version: ${nodeVersion}`);
  process.exit(1);
}

console.log(`✅ Node.js version: ${nodeVersion}`);

// Check if .env files exist
const backendEnvPath = path.join('backend', '.env');
const frontendEnvPath = '.env';

if (!fs.existsSync(backendEnvPath)) {
  console.log('⚠️  Backend .env file not found. Please configure your environment variables.');
  console.log('   Copy backend/.env.example to backend/.env and update the values.');
}

if (!fs.existsSync(frontendEnvPath)) {
  console.log('⚠️  Frontend .env file not found. Please configure your environment variables.');
  console.log('   Copy .env.example to .env and update the values.');
}

// Install dependencies
console.log('\n📦 Installing dependencies...');

try {
  console.log('   Installing frontend dependencies...');
  execSync('npm install', { stdio: 'inherit' });
  
  console.log('   Installing backend dependencies...');
  execSync('cd backend && npm install', { stdio: 'inherit' });
  
  console.log('✅ Dependencies installed successfully');
} catch (error) {
  console.error('❌ Error installing dependencies:', error.message);
  process.exit(1);
}

// Check if concurrently is installed
try {
  require('concurrently');
  console.log('✅ Concurrently is available for running both frontend and backend');
} catch (error) {
  console.log('⚠️  Concurrently not found. Installing...');
  try {
    execSync('npm install concurrently --save-dev', { stdio: 'inherit' });
    console.log('✅ Concurrently installed');
  } catch (installError) {
    console.error('❌ Error installing concurrently:', installError.message);
  }
}

// Create necessary directories
const directories = [
  'backend/logs',
  'backend/uploads',
  'backend/temp'
];

directories.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`✅ Created directory: ${dir}`);
  }
});

console.log('\n🎉 Setup completed successfully!');
console.log('\nNext steps:');
console.log('1. Configure your environment variables in backend/.env and .env');
console.log('2. Set up your database (PostgreSQL/Supabase)');
console.log('3. Run the database schema: backend/database/schema.sql');
console.log('4. Start the development servers:');
console.log('   - npm run dev (both frontend and backend)');
console.log('   - npm start (frontend only)');
console.log('   - npm run backend:dev (backend only)');
console.log('\nFor more information, see README.md');

// Check if we can start the servers
console.log('\n🔍 Testing server startup...');

try {
  // Test backend startup (just check if it can be required)
  require('./backend/app.js');
  console.log('✅ Backend can be started');
} catch (error) {
  console.log('⚠️  Backend startup test failed:', error.message);
  console.log('   This might be due to missing environment variables or database connection');
}

console.log('\n✨ Setup complete! Happy coding! 🚀');
