/**
 * Comprehensive login diagnosis script
 * Checks user role, database connection, and login flow
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const User = require('../models/User');

const email = process.argv[2];

if (!email) {
  console.error('❌ Please provide an email address');
  console.error('Usage: node scripts/diagnoseLogin.js <email>');
  process.exit(1);
}

async function diagnose() {
  try {
    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
    
    if (!mongoUri) {
      console.error('❌ MONGODB_URI not found in environment variables');
      console.error('Please set MONGODB_URI in your .env file or pass it as an environment variable');
      process.exit(1);
    }

    console.log('🔍 Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB\n');

    // Find user
    const user = await User.findOne({ email: email.toLowerCase() });
    
    if (!user) {
      console.error(`❌ User not found: ${email}`);
      console.error('Please check the email address and try again');
      await mongoose.disconnect();
      process.exit(1);
    }

    console.log('📋 User Information:');
    console.log(`   Email: ${user.email}`);
    console.log(`   Username: ${user.username || 'N/A'}`);
    console.log(`   Role: ${user.role}`);
    console.log(`   Role Type: ${typeof user.role}`);
    console.log(`   Role Value (JSON): ${JSON.stringify(user.role)}`);
    console.log(`   _id: ${user._id}`);
    console.log(`   Created: ${user.createdAt}`);
    console.log(`   Updated: ${user.updatedAt}`);

    // Check role enum
    const roleEnum = User.schema.path('role').enumValues;
    console.log(`\n📋 Role Enum Values: ${JSON.stringify(roleEnum)}`);
    console.log(`   super_admin in enum: ${roleEnum.includes('super_admin')}`);

    // Role checks
    console.log('\n🔍 Role Checks:');
    console.log(`   user.role === 'admin': ${user.role === 'admin'}`);
    console.log(`   user.role === 'super_admin': ${user.role === 'super_admin'}`);
    console.log(`   user.role !== 'admin' && user.role !== 'super_admin': ${user.role !== 'admin' && user.role !== 'super_admin'}`);
    console.log(`   Can login to admin panel: ${user.role === 'admin' || user.role === 'super_admin'}`);

    // Check if role needs to be updated
    if (user.role !== 'super_admin') {
      console.log('\n⚠️  User role is not super_admin');
      console.log('   To set to super_admin, run:');
      console.log(`   node scripts/setSuperAdmin.js ${email}`);
    } else {
      console.log('\n✅ User role is super_admin - should be able to login');
      console.log('\n🔍 If login still fails, check:');
      console.log('   1. Backend is deployed with latest code (check Render)');
      console.log('   2. JWT_SECRET matches between environments');
      console.log('   3. Backend logs show the role check');
      console.log('   4. No typos in email/password');
    }

    // Test password comparison (without revealing password)
    console.log('\n🔍 Password Check:');
    console.log('   Password hash exists: ' + (user.password ? 'Yes' : 'No'));
    console.log('   Password hash length: ' + (user.password ? user.password.length : 0));

    await mongoose.disconnect();
    console.log('\n✅ Diagnosis complete');
  } catch (error) {
    console.error('❌ Error:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

diagnose();
