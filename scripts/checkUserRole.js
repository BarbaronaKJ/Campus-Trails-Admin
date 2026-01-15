require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const User = require('../models/User');

const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI;

if (!MONGODB_URI) {
  console.error('❌ Error: MONGODB_URI not found in environment variables');
  console.error('Please set MONGODB_URI in your .env file');
  process.exit(1);
}

async function checkUserRole() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Get email from command line argument
    const email = process.argv[2];
    if (!email) {
      console.error('❌ Error: Email is required');
      console.log('Usage: node scripts/checkUserRole.js <email>');
      process.exit(1);
    }

    console.log(`🔍 Looking for user with email: ${email}\n`);

    // Find user
    const user = await User.findOne({ email: email.toLowerCase() });
    
    if (!user) {
      console.error(`❌ Error: User with email ${email} not found`);
      process.exit(1);
    }

    console.log('✅ User found:');
    console.log(`   Email: ${user.email}`);
    console.log(`   Username: ${user.username || 'N/A'}`);
    console.log(`   Role: ${user.role}`);
    console.log(`   _id: ${user._id}`);
    console.log(`\n🔍 Role checks:`);
    console.log(`   Is admin: ${user.role === 'admin'}`);
    console.log(`   Is super_admin: ${user.role === 'super_admin'}`);
    console.log(`   Can login to admin panel: ${user.role === 'admin' || user.role === 'super_admin'}`);

    // Check User model schema
    console.log(`\n📋 User Model Schema:`);
    const roleEnum = User.schema.path('role').enumValues;
    console.log(`   Allowed roles: ${roleEnum.join(', ')}`);
    console.log(`   super_admin in enum: ${roleEnum.includes('super_admin')}`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

checkUserRole();
