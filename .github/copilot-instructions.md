# Campus Trails Admin Panel - AI Agent Instructions

## Architecture Overview

**Full-stack MERN application** split across two deployment targets:

- **Backend**: Express.js + MongoDB, deploys to **Render** (`server.js` at root)
- **Frontend**: React 18 + Axios, deploys to **Vercel** (`client/` directory)
- **Communication**: JWT-based auth; frontend uses `REACT_APP_API_URL` environment variable pointing to backend

The backend serves the React build in production via `client/build/` while API routes live at `/api/admin/*`.

## Critical Workflows

### Development

```bash
npm run dev              # Terminal 1: Backend (watches with nodemon)
cd client && npm start   # Terminal 2: Frontend (React dev server)
```

### Building & Deployment

- **Frontend**: `cd client && npm run build` → outputs to `client/build/`, copies `_redirects` for SPA routing
- **Backend**: Just `npm install` and `node server.js`
- **Production env vars**: Backend needs `MONGODB_URI`, `JWT_SECRET`, `CORS_ORIGINS`, `NODE_ENV=production`; Frontend needs `REACT_APP_API_URL`

## Key Patterns & Conventions

### Authentication & Authorization

- **JWT tokens** stored in browser `localStorage` as `adminToken`
- **Token format**: `Bearer <token>` in Authorization header
- **Role-based access**: Only users with `role: 'admin'` or `'super_admin'` can access admin panel
- **Middleware location**: [middleware/auth.js](middleware/auth.js) enforces token validation and admin role checks
- **API client setup**: [client/src/services/api.js](client/src/services/api.js) automatically attaches tokens to all requests via `getAuthHeaders()`

### Database Models

Located in [models/](models/):

- All models use **MongoDB indexes** on frequently queried fields (email, role, pinType, buildingNumber, etc.)
- **Pin model** is complex: supports nested `floors[]` with `rooms[]`, geographic coordinates (x, y), and category/pinType enums
- **User model** uses bcrypt for passwords via `comparePassword()` instance method; supports `pushToken` for push notifications

### API Endpoint Structure

All routes prefixed with `/api/admin/`:

- [routes/auth.js](routes/auth.js) - Login only (no registration from admin panel)
- [routes/pins.js](routes/pins.js) - Full CRUD on campus pins (complex nested data)
- [routes/users.js](routes/users.js) - Admin user management
- [routes/campuses.js](routes/campuses.js) - Campus data (references pins via campusId)
- [routes/notifications.js](routes/notifications.js) - Push notifications
- [routes/feedbacks.js](routes/feedbacks.js), [routes/suggestions_and_feedbacks.js](routes/suggestions_and_feedbacks.js) - Feedback management
- **New route checklist**: Add route file → Mount in [server.js](server.js) before line 39 → Update `/api/admin` response

### Frontend Data Flow

- **Auth Context** ([client/src/context/AuthContext.js](client/src/context/AuthContext.js)): Wraps app, provides `useAuth()` hook with `isAuthenticated`, `user`, `loading`
- **Protected routes**: [App.js](client/src/App.js) uses `<ProtectedRoute>` to guard all non-login paths
- **Page components** ([client/src/pages/](client/src/pages/)): Each page uses API methods from [client/src/services/api.js](client/src/services/api.js) (e.g., `pinsAPI.getAll()`, `usersAPI.update()`)
- **Layout wrapper**: [Layout.js](client/src/components/Layout.js) provides sidebar navigation for all protected routes

## Environment & Configuration

### Backend (.env at root)

```
MONGODB_URI=mongodb+srv://...
JWT_SECRET=<strong-secret>
CORS_ORIGINS=http://localhost:3000,https://yourdomain.com
PORT=5001
NODE_ENV=development
```

### Frontend (.env in client/)

```
REACT_APP_API_URL=http://localhost:5001  # dev; use Render URL in production
```

### Vercel Deployment Settings

- **Root Directory**: `client`
- **Build Command**: `npm run build`
- **Output Directory**: `build`
- **Auto-set env var**: `REACT_APP_API_URL` to your Render backend URL

## Common Development Tasks

### Adding a New Admin Resource (e.g., Events)

1. Create schema in `models/Events.js` following existing patterns (timestamps, indexes, enums)
2. Add routes file `routes/events.js` with GET/POST/PUT/DELETE endpoints
3. Mount route in `server.js` under API routes section
4. Create API service in `client/src/services/api.js` (e.g., `export const eventsAPI = { ... }`)
5. Create page component in `client/src/pages/EventsManagement.js`
6. Add route in `App.js` under ProtectedRoute
7. Add sidebar link in [Layout.js](client/src/components/Layout.js)

### Modifying Existing Endpoints

- Backend logic changes: Edit route handler in `routes/*.js`, verify middleware runs first
- Changing response shape: Must update corresponding frontend API service (search for `axios.get/post/put/delete`)
- **Never change `/api/admin` base path** without updating both `client/src/services/api.js` and `AuthContext.js`

### Handling Token Expiration

- Backend: JWT expires based on sign options in [routes/auth.js](routes/auth.js)
- Frontend: `AuthContext` auto-verifies token on mount; expired tokens trigger redirect to `/login`
- **Login stores token** in localStorage; logout clears it

## Debugging Tips

- **API URL mismatch**: Check console output `🔍 Services API URL:` in frontend; verify `REACT_APP_API_URL` matches backend deployment URL
- **Auth failures**: Backend logs login attempts with email/role; check network tab for `Authorization: Bearer` header
- **Build not found in production**: Backend responds with helpful message if `NODE_ENV=production` but `client/build` missing—run `cd client && npm run build` before deploying
- **MongoDB connection**: Server doesn't block startup on connection failure; check logs for `✅ MongoDB connected` or `❌ MongoDB connection error:`

## File Organization Summary

```
.
├── server.js                 # Express app setup, route mounting
├── middleware/auth.js        # JWT + role verification
├── models/                   # Mongoose schemas
├── routes/                   # API endpoints for each resource
├── client/src/
│   ├── App.js               # Route definitions + ProtectedRoute
│   ├── index.js             # Entry point with AuthProvider
│   ├── context/AuthContext.js    # Token storage, useAuth hook
│   ├── services/api.js      # Axios client with token attachment
│   ├── pages/               # Admin panel pages (CRUD interfaces)
│   └── components/Layout.js # Sidebar + outlet
└── .env                      # Backend config (MongoDB, JWT_SECRET, etc.)
```
