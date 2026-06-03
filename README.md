# GatherUp — Full-Stack Event Registration Portal

## Project Description
GatherUp is a full-stack web application for discovering, creating, and registering for events. Attendees can browse events by category, location, and date, register with a single click, and receive a unique QR-code ticket. Admins (event organizers) get a dedicated dashboard to create and manage events, track registrations, and even run **live telecasts** with real-time viewer counts and registration-gated stream access. The application is built with a React + TypeScript frontend and an Express (Node.js) REST API, secured with JWT authentication and role-based access control.

---

## Project Details

### Problem Statement
Organizing and attending events usually means juggling scattered tools — sign-up forms, spreadsheets for attendee lists, separate ticketing services, and yet another platform for live streaming. GatherUp brings all of this into one place: event discovery, secure registration, QR ticketing, organizer management, and live streaming, behind a single login.

### Key Features
- **Event discovery** — browse, search (title/description), and filter events by category, location, and date range with pagination.
- **Authentication & roles** — JWT-based register/login with two roles: `user` (attendee) and `admin` (organizer). Passwords are hashed with bcrypt.
- **Event registration** — one-click registration with duplicate-registration and capacity (event-full) checks. Each registration gets a unique code and QR ticket payload.
- **QR-code tickets** — every registration generates a `GU…` registration code and QR data (`CODE-USERNAME-EVENTTITLE`) for check-in.
- **Attendee dashboard** — users see the events they've registered for and can cancel registrations.
- **Admin dashboard** — admins create, edit, and delete their own events and view the attendee list per event.
- **Live telecast / streaming** — admins can enable a live stream per event; access is gated to registered (confirmed) users, with public fallback access once an event is full. Live viewer counts are tracked in real time.
- **Security hardening** — Helmet headers, CORS allow-list, and rate limiting (100 requests / 15 min per IP).

### User Roles
| Role | Capabilities |
|------|--------------|
| **User** | Browse & search events, register/cancel, view personal dashboard, access live streams for registered events |
| **Admin** | Everything a user can do, plus create / edit / delete events, view registrations, manage live telecast settings, and view live stream stats |

### Data Layer
By default the backend runs on a lightweight **file-based JSON database** (`server/data/db.json`) through a custom service (`jsonDatabase.js`) that mimics a Mongoose-style API (`find`, `findOne`, `findById`, `create`, `populate`, etc.). This makes the project zero-setup — no database server required. Mongoose models and a MongoDB connection string are also included in the repo for an optional MongoDB-backed setup.

### Data Models
- **User** — `name`, `email`, `password` (hashed), `role` (`user` | `admin`).
- **Event** — `title`, `description`, `category` (Technology, Business, Arts, Sports, Music, Education, Health, Other), `location`, `date`, `time`, `capacity`, `ticketPrice`, `registeredCount`, `createdBy`, `status`, plus live-telecast fields (`isLiveTelecast`, `streamLink`, `liveViewerCount`, `isStreamActive`).
- **Registration** — `userId`, `eventId`, `status` (`confirmed` | `pending` | `cancelled`), `registrationCode`, `paymentStatus` (`paid` | `pending` | `free`), `ticketQR`.

### REST API Endpoints
**Auth** (`/api/auth`)
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/register` | Public | Register a new user, returns JWT |
| POST | `/login` | Public | Authenticate and return JWT |
| GET | `/me` | Private | Get the current logged-in user |

**Events** (`/api/events`)
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/` | Public | List events with filtering & pagination |
| GET | `/:id` | Public | Get a single event |
| GET | `/admin/my-events` | Admin | List events created by the admin |
| POST | `/` | Admin | Create an event |
| PUT | `/:id` | Admin | Update an event |
| DELETE | `/:id` | Admin | Delete an event |
| PUT | `/:id/live-telecast` | Admin | Update live telecast settings |
| GET | `/:id/live-stats` | Admin | Get live stream statistics |
| GET | `/:id/stream-access` | Private | Check stream access for a registered user |
| POST | `/:id/registered-viewer-join` | Private | Registered user joins the stream |
| POST | `/:id/viewer-join` | Public | Track a viewer joining |
| POST | `/:id/viewer-leave` | Public | Track a viewer leaving |
| POST | `/:id/public-stream-join` | Public | Join the public stream when the event is full |

**Registrations** (`/api/registrations`)
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/:eventId` | Private | Register for an event |
| DELETE | `/:eventId` | Private | Cancel a registration |
| GET | `/my-events` | Private | Get the user's registered events |
| GET | `/event/:eventId` | Admin | Get all registrations for an event |

---

## Tech Stack
**Frontend**
- React 18 + TypeScript
- Vite (build tool & dev server)
- React Router DOM (routing)
- React Query (server-state & caching)
- React Hook Form (forms)
- Tailwind CSS (styling)
- Lucide React (icons)
- Axios (HTTP client)

**Backend**
- Node.js + Express
- JSON Web Tokens (`jsonwebtoken`) for auth
- bcryptjs for password hashing
- Helmet, CORS, and express-rate-limit for security
- qrcode for ticket QR generation
- File-based JSON database (Mongoose / MongoDB optional)
- Nodemon (dev auto-reload)

---

## Getting Started

### Prerequisites
- Node.js 18+ and npm

### 1. Clone the repository
```bash
git clone https://github.com/DCode-v05/GatherUp.git
cd GatherUp
```

### 2. Install dependencies
```bash
npm install
```

### 3. Configure environment variables
Create a `.env` file in the project root:
```env
NODE_ENV=development
CLIENT_URL=http://localhost:5173
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
# Optional — only needed if you switch to the MongoDB-backed models
MONGODB_URI=mongodb://localhost:27017/gatherup
```
> The backend listens on port **3001** and the Vite frontend on **5173** (the frontend proxies `/api` calls to the backend).

### 4. Run the application
Start both the backend API and the frontend together:
```bash
npm run dev
```
Or run them individually:
```bash
npm run server   # Express API on http://localhost:3001
npm run client   # Vite dev server on http://localhost:5173
```
Then open **http://localhost:5173** in your browser.

### Build for production
```bash
npm run build     # Build the frontend
npm run preview   # Preview the production build
```

---

## Usage
1. **Sign up** as a user, or register with the `admin` role to manage events.
2. **Browse events** on the Events page — filter by category, location, or date, and search by keyword.
3. **Register** for an event from its detail page to receive a unique registration code and QR ticket.
4. **Track your events** on your personal Dashboard and cancel registrations if plans change.
5. **As an admin**, open the Admin Dashboard to create, edit, or delete events, view attendee lists, and enable live telecasts.
6. **Join a live stream** for events you're registered for (or via the public stream once an event is full).

---

## Project Structure
```
GatherUp/
│
├── index.html                  # Vite HTML entry point
├── package.json                # Scripts & dependencies
├── vite.config.ts              # Vite config (dev server + /api proxy)
├── tailwind.config.js          # Tailwind CSS config
├── tsconfig*.json              # TypeScript configs
├── eslint.config.js            # ESLint config
├── nodemon.json                # Nodemon config for the server
├── .env                        # Environment variables
│
├── src/                        # Frontend (React + TypeScript)
│   ├── main.tsx                # React entry point
│   ├── App.tsx                 # App routes & providers
│   ├── index.css               # Global / Tailwind styles
│   ├── pages/                  # Route pages
│   │   ├── Home.tsx
│   │   ├── Login.tsx
│   │   ├── Register.tsx
│   │   ├── Events.tsx
│   │   ├── EventDetails.tsx
│   │   ├── Dashboard.tsx
│   │   ├── AdminDashboard.tsx
│   │   ├── CreateEvent.tsx
│   │   └── EditEvent.tsx
│   ├── components/             # Reusable components
│   │   ├── ProtectedRoute.tsx  # Auth-gated route wrapper
│   │   ├── AdminRoute.tsx      # Admin-only route wrapper
│   │   └── layout/Navbar.tsx
│   ├── contexts/AuthContext.tsx# Global auth state
│   ├── hooks/useAuth.ts        # Auth hook
│   └── services/api.ts         # Axios instance & interceptors
│
└── server/                     # Backend (Node.js + Express)
    ├── index.js                # Express app & middleware
    ├── config/database.js      # JSON database initialization
    ├── routes/                 # API route handlers
    │   ├── auth.js
    │   ├── events.js
    │   └── registrations.js
    ├── models/                 # Data models
    │   ├── UserJSON.js         # JSON-DB models (default)
    │   ├── EventJSON.js
    │   ├── RegistrationJSON.js
    │   ├── User.js             # Mongoose models (optional)
    │   ├── Event.js
    │   └── Registration.js
    ├── middleware/auth.js      # JWT protect / adminOnly / optionalProtect
    ├── services/jsonDatabase.js# File-based JSON database engine
    └── data/db.json            # JSON data store
```

---

## Contributing

Contributions are welcome! To contribute:
1. Fork the repository
2. Create a new branch:
   ```bash
   git checkout -b feature/your-feature
   ```
3. Commit your changes:
   ```bash
   git commit -m "Add your feature"
   ```
4. Push to your branch:
   ```bash
   git push origin feature/your-feature
   ```
5. Open a pull request describing your changes.

---

## Contact
- **GitHub:** [DCode-v05](https://github.com/DCode-v05)
- **Email:** denistanb05@gmail.com
