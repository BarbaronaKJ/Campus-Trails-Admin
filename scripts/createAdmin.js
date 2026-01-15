/**
 * Script to create an admin user
 * Usage: node scripts/createAdmin.js <email> <password>
 */

const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI not found in environment variables');
  process.exit(1);
}

const createAdmin = async () => {
  try {
    const email = process.argv[2];
    const password = process.argv[3];

    if (!email || !password) {
      console.error('❌ Usage: node scripts/createAdmin.js <email> <password>');
      process.exit(1);
    }

    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('✅ Connected to MongoDB');

    // Check if user already exists
    let user = await User.findOne({ email: email.toLowerCase() });

    if (user) {
      // Update existing user to admin
      user.role = 'admin';
      user.password = password; // Will be hashed by pre-save hook
      await user.save();
      console.log(`✅ Updated existing user "${email}" to admin role`);
    } else {
      // Create new admin user
      user = new User({
        email: email.toLowerCase(),
        password: password, // Will be hashed by pre-save hook
        role: 'admin'
      });
      await user.save();
      console.log(`✅ Created new admin user: ${email}`);
    }

    console.log('\n📋 Admin User Details:');
    console.log(`   Email: ${user.email}`);
    console.log(`   Role: ${user.role}`);
    console.log('\n✅ You can now login to the admin panel with these credentials');

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.code === 11000) {
      console.error('   User with this email already exists');
    }
    await mongoose.connection.close();
    process.exit(1);
  }
};

createAdmin();
