require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const User = require('../models/User');

const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI;

if (!MONGODB_URI) {
  console.error('❌ Error: MONGODB_URI not found in environment variables');
  console.error('Please set MONGODB_URI in your .env file');
  process.exit(1);
}

async function setSuperAdmin() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Get email from command line argument
    const email = process.argv[2];
    if (!email) {
      console.error('❌ Error: Email is required');
      console.log('Usage: node scripts/setSuperAdmin.js <email>');
      process.exit(1);
    }

    console.log(`\n🔍 Looking for user with email: ${email}`);

    // Find user
    const user = await User.findOne({ email: email.toLowerCase() });
    
    if (!user) {
      console.error(`❌ Error: User with email ${email} not found`);
      process.exit(1);
    }

    console.log(`✅ Found user: ${user.email}`);
    console.log(`   Current role: ${user.role}`);
    console.log(`   Username: ${user.username || 'N/A'}`);

    // Update role to super_admin
    user.role = 'super_admin';
    await user.save();

    console.log(`\n✅ Successfully set ${email} to super_admin role!`);
    console.log(`   New role: ${user.role}`);

    // Verify the update
    const updatedUser = await User.findOne({ email: email.toLowerCase() });
    console.log(`\n🔍 Verification:`);
    console.log(`   Email: ${updatedUser.email}`);
    console.log(`   Role: ${updatedUser.role}`);
    console.log(`   Role is super_admin: ${updatedUser.role === 'super_admin'}`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

setSuperAdmin();
