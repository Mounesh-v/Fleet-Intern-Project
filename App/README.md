# JCB & Tipper Fleet Management

Android mobile application for managing JCB, Tipper, and Tata Ace vehicles, drivers, daily work entries, and expenses.

**Module 1 implemented:** Authentication & User Management (Admin + Driver roles).

## Project layout

```
Fleet_Management/
├── App/          # React Native CLI app (JavaScript in .tsx files)
│   └── src/
│       ├── features/auth/     # Login, auth context, auth service
│       ├── navigation/        # Auth / App / Admin / Driver navigators
│       ├── services/api.tsx   # Axios client + interceptors
│       ├── utils/tokenStorage.tsx  # Secure Keychain JWT storage
│       ├── screens/driver/    # Driver work screens
│       └── components/UI.js   # Shared UI kit
└── backend/      # Node.js + Express + MongoDB API (ESM, "type": "module")
    ├── api/           # API contract validation (authValidation)
    ├── service/       # Business logic layer (AuthService, BaseService)
    ├── controller/    # authController (HTTP only)
    ├── models/        # User
    ├── routes/        # authRoutes
    ├── middleware/    # authMiddleware, roleMiddleware
    ├── utility/       # env, db, token, errors, responses
    ├── scripts/       # createAdmin
    ├── app.js
    └── server.js
```

## Prerequisites

- Node.js >= 22.11
- MongoDB running locally (or a connection string)
- Android SDK + emulator (for the mobile app)

## Backend setup

```sh
cd backend
npm install

# Configure environment
copy .env.example .env
# Edit .env — set MONGODB_URI, JWT_SECRET, ADMIN_USERNAME, ADMIN_PASSWORD

# Create the initial admin account (reads ADMIN_* from .env)
npm run create-admin

# Start API (default http://localhost:5000)
npm start
# or with auto-restart:
npm run dev
```

### Environment variables (backend/.env)

| Variable | Description |
|---|---|
| `PORT` | API port (e.g. `5000`) |
| `MONGODB_URI` | MongoDB connection string |
| `JWT_SECRET` | Strong random secret for signing JWTs |
| `JWT_EXPIRES_IN` | Token lifetime (e.g. `12h`) |
| `ADMIN_USERNAME` | Initial admin username |
| `ADMIN_PASSWORD` | Initial admin password (min 8 chars) |

Never commit `.env`.

## Mobile app setup

```sh
cd App
npm install

# Start Metro
npm start

# In another terminal — build & run on Android emulator
npm run android
```

The app talks to the backend at `http://10.0.2.2:5000/api` (Android emulator → host machine).
For a physical device, change `API_BASE_URL` in `src/services/api.tsx` to your computer's LAN IP.
Cleartext HTTP is enabled in the debug Android build (`manifestPlaceholders` in `android/app/build.gradle`).

### Login

| Role | Username | Password |
|---|---|---|
| Admin | `admin` | value of `ADMIN_PASSWORD` in `backend/.env` (dev: `ChangeMe@12345`) |
| Driver (demo) | `driver1` | `Driver@123` |

The demo driver has a placeholder `driverId` until Module 2 (driver records) exists. Create real driver accounts with `POST /api/auth/create-driver` once drivers exist.

## API reference (Module 1)

Base URL: `http://localhost:5000/api`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/auth/login` | Public | Login → `{ token, user }` |
| GET | `/auth/me` | Bearer | Current user profile |
| POST | `/auth/logout` | Bearer | Invalidate current session server-side |
| POST | `/auth/create-driver` | Admin | Create driver login account |
| PUT | `/auth/reset-password/:userId` | Admin | Reset driver password |
| PATCH | `/auth/status/:userId` | Admin | Activate / deactivate driver |

### Response envelope

Success:
```json
{ "success": true, "message": "Login successful", "data": {} }
```

Error:
```json
{ "success": false, "message": "Invalid credentials" }
```

## Tests

```sh
# Frontend (Jest)
cd App
npm test

# Lint / typecheck
cd App
npm run lint
npm run typecheck
```

## Security notes

- Passwords are hashed with bcryptjs (cost 12).
- JWTs embed a `tokenVersion`; logout, deactivation, and password reset bump it so copied tokens die server-side.
- Tokens are stored in Android Keychain / iOS Keychain via `react-native-keychain` — not plain AsyncStorage.
- Role checks run on the backend (`roleMiddleware`); the mobile UI never trusts client-supplied roles.
- Drivers cannot see revenue, profit, billing, or other drivers' data (enforced by API design; financial modules are future work).

## Scripts summary

| Where | Command | Purpose |
|---|---|---|
| `backend/` | `npm start` | Run API |
| `backend/` | `npm run create-admin` | Seed admin user |
| `backend/` | `npm run dev` | Run API with auto-restart |
| `App/` | `npm start` | Metro bundler |
| `App/` | `npm run android` | Build & run Android app |
| `App/` | `npm test` | Frontend tests |
| `App/` | `npm run lint` | ESLint |
| `App/` | `npm run typecheck` | TypeScript check |
