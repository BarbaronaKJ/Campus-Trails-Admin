/**
 * Migration script to update old pin categories to standardized categories
 * Maps old category values to new standardized categories
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const Pin = require('../models/Pin');

// Category mapping from old values to new standardized values
const categoryMapping = {
  'Academic': 'Academic Core Zone',
  'Administration': 'Admin/Operation Zone',
  'Facilities': 'Other',
  'Services': 'Auxillary Services Zone',
  'Recreational': 'Other',
  'Other': 'Other',
  // Add any other old category values here
};

async function migrateCategories() {
  try {
    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
    
    if (!mongoUri) {
      console.error('❌ MONGODB_URI not found in environment variables');
      console.error('Please set MONGODB_URI in your .env file');
      process.exit(1);
    }

    console.log('🔍 Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB\n');

    // Get all pins
    const pins = await Pin.find({});
    console.log(`📋 Found ${pins.length} pins to check\n`);

    let updatedCount = 0;
    let skippedCount = 0;
    const updates = [];

    for (const pin of pins) {
      const oldCategory = pin.category;
      
      // Check if category needs migration
      if (oldCategory && categoryMapping[oldCategory]) {
        const newCategory = categoryMapping[oldCategory];
        
        if (oldCategory !== newCategory) {
          updates.push({
            pinId: pin._id,
            title: pin.title,
            oldCategory,
            newCategory
          });
          
          pin.category = newCategory;
          await pin.save();
          updatedCount++;
          console.log(`✅ Updated pin "${pin.title}" (${pin._id}): "${oldCategory}" → "${newCategory}"`);
        } else {
          skippedCount++;
        }
      } else if (!oldCategory || oldCategory === 'Other') {
        // No category or already "Other", skip
        skippedCount++;
      } else {
        // Category doesn't match any mapping, might be already standardized
        const standardizedCategories = [
          'Commercial Zone',
          'Admin/Operation Zone',
          'Academic Core Zone',
          'Auxillary Services Zone',
          'Dining',
          'Comfort Rooms',
          'Research Zones',
          'Clinic',
          'Parking',
          'Security',
          'Other'
        ];
        
        if (!standardizedCategories.includes(oldCategory)) {
          console.log(`⚠️  Pin "${pin.title}" (${pin._id}) has unknown category: "${oldCategory}"`);
          console.log(`   Setting to "Other"`);
          pin.category = 'Other';
          await pin.save();
          updatedCount++;
        } else {
          skippedCount++;
        }
      }
    }

    console.log(`\n📊 Migration Summary:`);
    console.log(`   Total pins: ${pins.length}`);
    console.log(`   Updated: ${updatedCount}`);
    console.log(`   Skipped: ${skippedCount}`);

    if (updates.length > 0) {
      console.log(`\n📋 Updated Pins:`);
      updates.forEach(update => {
        console.log(`   - ${update.title}: "${update.oldCategory}" → "${update.newCategory}"`);
      });
    }

    await mongoose.disconnect();
    console.log('\n✅ Migration complete');
  } catch (error) {
    console.error('❌ Error:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

migrateCategories();
