# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

NextWorth is a portfolio management platform with AI capabilities, developed as a Final Degree Project (TFG). The application allows users to manage investment portfolios with multi-currency support and real-time market data integration.

## Monorepo Structure

```
nextworth/
├── backend/        # Express.js REST API server
├── frontend/       # React + Vite client application
├── ml-service/     # Machine learning service (not yet implemented)
└── db/             # Database scripts/migrations (not yet implemented)
```

## Development Commands

### Backend (Express + PostgreSQL)

```bash
cd backend
npm install
npm run dev      # Start development server with nodemon (port 4000)
npm start        # Start production server

# Database management
node src/scripts/reset_db.js  # Drop user_portfolio table
```

**Backend Configuration**: Create `backend/.env` with:
```
PORT=4000
DATABASE_URL=postgres://postgres:postgres@localhost:5432/nextworth_db
JWT_SECRET=your-secret-here
FINNHUB_API_KEY=your-api-key-here
```

**Prerequisites**: PostgreSQL must be running locally. Database tables are auto-created on server startup via `backend/src/config/db.js`.

### Frontend (React + Vite + Tailwind)

```bash
cd frontend
npm install
npm run dev      # Start Vite dev server (port 3000)
npm run build    # Build for production
npm run preview  # Preview production build
```

**Frontend Configuration**: Create `frontend/.env` with:
```
VITE_API_URL=http://localhost:4000/api
```

## Architecture & Code Organization

### Backend Architecture (MVC Pattern)

**Entry Point**: `backend/src/index.js` → loads `app.js` and starts server

**Request Flow**: Routes → Middleware → Controllers → Services → Database

**Directory Structure**:
- `config/db.js` - PostgreSQL connection pool + auto table creation
- `routes/*.routes.js` - Express route definitions
- `controllers/*Controller.js` - Request handlers and business logic
- `middleware/auth.js` - JWT authentication middleware (`authRequired`)
- `services/` - External integrations (Yahoo Finance, market data)

**API Routes**:
- `/api/auth/*` - Authentication (login, register)
- `/api/users/*` - User management
- `/api/portfolio/*` - Portfolio CRUD operations
- `/api/market/*` - Real-time market data quotes

**Authentication Flow**:
All protected routes use the `authRequired` middleware which:
1. Extracts JWT from `Authorization: Bearer <token>` header
2. Verifies token with `JWT_SECRET`
3. Injects decoded user data into `req.user` (contains `userId`)

### Frontend Architecture (React Context + React Router)

**Entry Point**: `frontend/src/main.jsx` → renders `App.jsx`

**Component Hierarchy**:
```
<AuthProvider>               # Global auth state (Context API)
  <Router>                   # React Router
    <ProtectedRoute>         # Auth guard wrapper
      <Layout>               # Sidebar + main content layout
        <Page />             # Individual page components
```

**Directory Structure**:
- `context/AuthContext.jsx` - Global authentication state & methods
- `components/` - Reusable UI components (Login, Register, Layout, Sidebar, etc.)
- `pages/` - Route-level page components (Dashboard, AddAsset, AssetList, Settings)
- `services/` - API client modules (organized by domain)
  - `api.js` - Axios instance with JWT interceptors
  - `authService.js`, `portfolioService.js`, etc.

**Authentication Pattern**:
- Token stored in `localStorage` with key `token`
- User object stored in `localStorage` with key `user`
- `services/api.js` interceptor automatically adds JWT to all requests
- Automatic logout on 401 responses

**State Management**:
Uses React Context API exclusively. The `AuthContext` provides:
- `user` - Current user object
- `isAuthenticated` - Boolean auth status
- `login()`, `register()`, `logout()` - Auth methods
- `updateUserCurrency()` - Update base currency preference

### Database Schema (PostgreSQL)

**Tables**:

1. **users**
   - id (SERIAL PRIMARY KEY)
   - name, email, password_hash
   - base_currency (USD/EUR)
   - created_at

2. **assets** (catalog of all traded assets)
   - id (SERIAL PRIMARY KEY)
   - symbol, name, asset_type, currency
   - risk_level
   - UNIQUE(symbol, asset_type)

3. **user_portfolio** (user positions)
   - id (SERIAL PRIMARY KEY)
   - user_id (FK → users), asset_id (FK → assets)
   - quantity, avg_buy_price
   - Bond-specific: tae, face_value, coupon_rate, coupon_frequency, maturity_date
   - created_at, updated_at
   - UNIQUE(user_id, asset_id)

**Supported Asset Types**: stocks, crypto, cash, savings, bonds

**Database Initialization**: Tables are automatically created on backend startup if they don't exist (see `backend/src/config/db.js`).

## Key Implementation Patterns

### Market Data Integration

The backend integrates with Yahoo Finance for real-time asset prices:

- `services/yahooFinanceService.js` - Direct Yahoo Finance API wrapper
- `services/marketDataService.js` - Higher-level service with FX rate support
- Controllers use services sequentially (not parallel) to avoid API timeouts
- Fallback: If real-time price unavailable, uses `avg_buy_price` as estimate

**Symbol Format**: Yahoo Finance format (e.g., `AAPL`, `BTC-USD`, `GC=F`)

### Multi-Currency Support

Users can set a base currency (USD or EUR). The portfolio controller:
1. Fetches all user positions with their native currencies
2. Gets current prices in native currency
3. Applies FX rates to convert everything to user's base currency
4. Calculates totals (invested, current value, profit/loss) in base currency

FX rates are cached per request to minimize API calls.

### Authentication & Protected Routes

**Backend**: Apply `authRequired` middleware to protect routes. User ID available via `req.user.userId`.

**Frontend**: Wrap routes with `<ProtectedRoute>` component. Access auth state via `useAuth()` hook.

## Important Development Notes

- **Database Setup**: Ensure PostgreSQL is running before starting backend. Connection string in `backend/.env`.
- **CORS**: Backend allows all origins by default. Restrict in production.
- **ES Modules**: Both frontend and backend use `"type": "module"` in package.json.
- **Error Handling**: Controllers should always catch errors and return appropriate status codes.
- **Asset Upsert**: Adding an asset to portfolio uses UPSERT logic - updates if exists, inserts if new.
- **FX Rate Caching**: When processing multiple assets, cache FX rates to reduce API calls (see `portfolioController.js:165-176`).
- **Sequential Processing**: Market data fetching is done sequentially (for loop) to avoid timeout issues with external APIs.

## Common Development Workflows

### Adding a New API Route

1. Create route handler in `backend/src/routes/*.routes.js`
2. Create controller function in `backend/src/controllers/*Controller.js`
3. Add service logic if needed in `backend/src/services/`
4. Create frontend service method in `frontend/src/services/`
5. Use service in React component/page

### Adding Database Fields

1. Update table creation query in `backend/src/config/db.js`
2. Drop existing table: `node backend/src/scripts/reset_db.js`
3. Restart backend to recreate table with new schema
4. Update controllers to handle new fields
5. Update frontend components to display/edit new fields

### Debugging Authentication Issues

1. Check JWT token in browser DevTools → Application → Local Storage
2. Verify `JWT_SECRET` matches between backend `.env` and token generation
3. Check backend logs for JWT verification errors
4. Ensure `Authorization: Bearer <token>` header is present in requests (automatic via api.js interceptor)
