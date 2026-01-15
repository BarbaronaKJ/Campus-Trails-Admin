# Testing Total Searches and Pathfinding Routes

## Overview

The Dashboard tracks:
- **Total Searches**: Number of search queries performed by users
- **Total Pathfinding Routes**: Number of pathfinding routes calculated

These are stored in each user's `activity.searchCount` and `activity.pathfindingCount` fields.

## How It Works

### Search Tracking
- Triggered when a user types in the search bar
- Debounced (waits 500ms after user stops typing)
- Increments `searchCount` in user's activity
- Sent to backend via `updateUserActivity` API

### Pathfinding Tracking
- Triggered when a user calculates a path between two points
- Increments `pathfindingCount` in user's activity
- Sent to backend via `updateUserActivity` API

## Testing Steps

### Prerequisites
1. Make sure you're logged in to the mobile app
2. Have the admin panel Dashboard open
3. Have access to check the database (optional, for verification)

### Test 1: Search Tracking

#### Step 1: Perform Searches in the App
1. Open the Campus Trails mobile app
2. Make sure you're **logged in** (tracking only works for logged-in users)
3. Tap the search icon to open the search modal
4. Type a search query (e.g., "Building 1", "Library", "Cafeteria")
5. Wait for results to appear
6. **Important**: The search count increments after you **stop typing** for 500ms (debounced)
7. Repeat this 3-5 times with different search terms

#### Step 2: Verify in Dashboard
1. Go to Admin Panel → Dashboard
2. Look at the "Simple Local Tracking Data" section
3. Check the **"Total Searches"** number
4. Refresh the Dashboard (the count should increase)

#### Step 3: Verify in Database (Optional)
```bash
# Check a specific user's search count
# You can use MongoDB Compass or a script
```

### Test 2: Pathfinding Tracking

#### Step 1: Calculate Paths in the App
1. Open the Campus Trails mobile app
2. Make sure you're **logged in**
3. Tap the pathfinding icon (route/wayfinding button)
4. Select **Point A** (first location)
5. Select **Point B** (destination)
6. Tap "Find Path" or "Calculate Route"
7. Wait for the path to be calculated and displayed
8. Repeat this 2-3 times with different locations

#### Step 2: Verify in Dashboard
1. Go to Admin Panel → Dashboard
2. Look at the "Simple Local Tracking Data" section
3. Check the **"Total Pathfinding Routes"** number
4. Refresh the Dashboard (the count should increase)

#### Step 3: Verify in Database (Optional)
Check the user's `activity.pathfindingCount` field in the database.

## Expected Behavior

### Search Tracking
- ✅ Each search query increments the count by 1
- ✅ Count persists after app restart
- ✅ Count is visible in Dashboard immediately (after refresh)
- ✅ Count is per-user (each user has their own count)

### Pathfinding Tracking
- ✅ Each path calculation increments the count by 1
- ✅ Count persists after app restart
- ✅ Count is visible in Dashboard immediately (after refresh)
- ✅ Count is per-user (each user has their own count)

## Troubleshooting

### Searches Not Counting

**Issue**: Total Searches stays at 0

**Possible Causes:**
1. User is not logged in (tracking only works for logged-in users)
2. Search is not being debounced properly
3. API call to `updateUserActivity` is failing
4. Backend is not saving the count

**How to Debug:**
1. Check if user is logged in (look for user profile icon)
2. Open browser/device console and check for API errors
3. Check backend logs for `updateUserActivity` calls
4. Verify the user's `activity.searchCount` in the database

**Fix:**
- Make sure you're logged in before searching
- Check network connectivity
- Verify backend API is working

### Pathfinding Not Counting

**Issue**: Total Pathfinding Routes stays at 0

**Possible Causes:**
1. User is not logged in
2. Path calculation is failing
3. API call to `updateUserActivity` is failing
4. Backend is not saving the count

**How to Debug:**
1. Check if user is logged in
2. Verify pathfinding actually calculates a path (shows route on map)
3. Open browser/device console and check for API errors
4. Check backend logs for `updateUserActivity` calls
5. Verify the user's `activity.pathfindingCount` in the database

**Fix:**
- Make sure you're logged in before using pathfinding
- Make sure pathfinding actually works (shows a route)
- Check network connectivity
- Verify backend API is working

## Quick Test Checklist

- [ ] User is logged in to the mobile app
- [ ] Performed at least 3 searches
- [ ] Waited for search debounce (500ms after typing stops)
- [ ] Calculated at least 2 pathfinding routes
- [ ] Refreshed the Dashboard
- [ ] Verified counts increased in Dashboard
- [ ] Checked "Avg Searches Per User" and "Avg Pathfinding Per User" (should show averages)

## Testing with Multiple Users

To test properly:
1. Create or use multiple user accounts
2. Have each user perform searches and pathfinding
3. Check Dashboard - should show totals across all users
4. Check averages - should divide total by number of users

## API Endpoints Used

- `PUT /api/users/:id/activity` - Updates user activity (searchCount, pathfindingCount)
- `GET /api/admin/users` - Fetches all users for Dashboard

## Database Schema

User model includes:
```javascript
activity: {
  searchCount: Number,        // Total searches by this user
  pathfindingCount: Number,   // Total pathfinding routes by this user
  savedPins: Array,
  feedbackHistory: Array,
  lastActiveDate: Date
}
```

## Notes

- Tracking is **per-user** - each user has their own counts
- Dashboard shows **totals** across all users
- Counts are **cumulative** - they don't reset
- Tracking only works for **logged-in users**
- Search tracking is **debounced** (waits 500ms after typing stops)
