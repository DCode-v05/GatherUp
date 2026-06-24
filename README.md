# GatherUp

**A full-stack event portal where people discover and register for events, get a QR ticket, and join a registration-gated live stream — all behind one login.**

![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat&logo=typescript&logoColor=white) ![React](https://img.shields.io/badge/React_18-20232A?style=flat&logo=react&logoColor=61DAFB) ![Vite](https://img.shields.io/badge/Vite-646CFF?style=flat&logo=vite&logoColor=white) ![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat&logo=nodedotjs&logoColor=white) ![Express](https://img.shields.io/badge/Express-000000?style=flat&logo=express&logoColor=white) ![JWT](https://img.shields.io/badge/JWT-000000?style=flat&logo=jsonwebtokens&logoColor=white) ![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=flat&logo=tailwindcss&logoColor=white)

## Overview

GatherUp is a web app for running and attending events without stitching together a sign-up form, a spreadsheet for the attendee list, a separate ticketing tool, and yet another platform for streaming. It puts all of that behind a single account: attendees browse events by category, location, and date, register in one click, and get a unique QR ticket; organizers get a dashboard to create and manage events, view who registered, and flip on a registration-gated live stream with a running viewer count.

It's a college-level full-stack project built with a React + TypeScript front end and an Express REST API. The notable design choice is the data layer — the backend ships with a custom file-based JSON database so the whole thing runs with zero external setup (no database server), while Mongoose models are also included if you want to swap in MongoDB later.

## Key Features

- **Event discovery** — list events with search across title/description, filters by category, location (case-insensitive match), and date range, plus pagination. Public visitors and regular users see upcoming events; admins can scope the list to events they created.
- **Auth and roles** — register/login issuing a JWT (30-day expiry). Two roles: `user` (attendee) and `admin` (organizer). Passwords are hashed with bcrypt and never returned in API responses.
- **Event registration** — one-click registration with duplicate-registration and capacity ("event is full") checks. Paid events mark the registration `pending`; free events mark it `free`. Each registration carries a unique code.
- **QR-code tickets** — every registration generates a `GU…` registration code and a QR payload of the form `CODE-USERNAME-EVENTTITLE` for check-in.
- **Attendee dashboard** — users see the events they're registered for and can cancel a registration (which decrements the event's registered count).
- **Admin dashboard** — admins create, edit, and delete only their own events and view the per-event attendee list.
- **Live telecast** — admins can attach an external stream link to an event and toggle it on/off. Access to the link is gated: confirmed registrants get in, and once an event is full the stream opens to the public as a fallback. A simple join/leave counter tracks how many viewers are currently on the stream.
- **Security middleware** — Helmet for HTTP headers, a CORS allow-list, and rate limiting (100 requests per 15 minutes per IP). Request bodies are capped at 10 MB.
- **Input validation** — server-side checks on event fields (title ≤ 100 chars, description ≤ 1000 chars, category from a fixed set of 8, time in `HH:MM`, date not in the past, capacity ≥ 1, non-negative ticket price) and on registration/payment status enums.

## How It Works

GatherUp is split into a Vite-served React client and a standalone Express API. In development the Vite dev server runs on port `5173` and proxies any `/api` request to the Express server on port `3001`, so the front end and back end talk over a single origin.

### Front end (React + TypeScript)

`src/App.tsx` wires up routing with React Router and wraps the tree in a React Query client and an `AuthProvider`. Routes split into three tiers:

- **Public** — Home, Login, Register, the Events list, and an event detail page.
- **`ProtectedRoute`** — the user Dashboard (any logged-in user).
- **`AdminRoute`** — the Admin dashboard plus the create/edit-event pages.

Auth state lives in `AuthContext`, and `src/services/api.ts` is an Axios instance with two interceptors: a request interceptor that attaches the JWT from `localStorage` as a `Bearer` token, and a response interceptor that, on any `401`, clears the token and bounces the user to `/login`. React Query handles server-state fetching and caching (window-focus refetch off, one retry).

### Back end (Express REST API)

`server/index.js` builds the app: Helmet, the CORS allow-list, the rate limiter, and a 10 MB JSON body parser, then mounts three routers — `/api/auth`, `/api/events`, `/api/registrations` — plus an `/api/health` check and a JSON 404/error handler.

Auth is JWT-based. On register/login the server signs a token with the user id (`expiresIn: 30d`) and returns it with the user record. Three middleware guards protect routes:

- `protect` — requires a valid `Bearer` token, loads the user, and attaches a sanitized (password-stripped) copy to `req.user`.
- `adminOnly` — runs after `protect` and rejects non-admins with `403`.
- `optionalProtect` — attaches the user if a valid token is present but never rejects, used on the public events list so admins can see an extended view.

Ownership is enforced per route: update, delete, registration-list, and live-stats handlers all check `event.createdBy === req.user._id` before doing anything.

### Data layer (file-based JSON database)

Instead of a database server, `server/services/jsonDatabase.js` is a small engine that reads and writes a single `server/data/db.json` file holding `users`, `events`, `registrations`, and counters. It exposes a Mongoose-shaped API — `create`, `findAll`, `findOne`, `findById`, `updateById`, `deleteById`, `countDocuments`, and a simplified `populate` — and supports filtering (including a basic `$text` search over title/description/name/email, date-range `$gte`/`$lte`, and regex matches), sorting, and skip/limit pagination. IDs are generated from a timestamp plus a random suffix, and records get `createdAt`/`updatedAt` timestamps automatically.

The model classes (`UserJSON.js`, `EventJSON.js`, `RegistrationJSON.js`) sit on top of this engine and add validation, password hashing/comparison, the registration-code/QR-payload generators, and `populate` helpers that join `createdBy` → user and `eventId`/`userId` references (always stripping the password off populated users). This JSON store is the active path the running server uses. The repo also contains Mongoose models and a `mongoose` dependency for an optional MongoDB-backed setup, but nothing imports them at runtime — `server/index.js` only initializes the JSON DB.

### Live telecast flow

The "live" feature is deliberately lightweight: `streamLink` is just a stored URL pointing at an external stream (e.g. a YouTube/Meet link), and the viewer count is an integer the API increments and decrements. There's no WebSocket, video server, or push — what GatherUp owns is the *access control* around the link:

- An admin sets `isLiveTelecast`, `streamLink`, and `isStreamActive` via `PUT /:id/live-telecast`.
- A logged-in user calls `GET /:id/stream-access`; the server only hands back the link if the stream is active **and** the user has a `confirmed` registration for that event.
- `POST /:id/registered-viewer-join` and `POST /:id/viewer-leave` bump the `liveViewerCount` up and down (floored at 0).
- If an event is full (`registeredCount >= capacity`), `POST /:id/public-stream-join` opens the same stream to anyone as a fallback.
- Admins read live stats (viewer count, registered count, capacity, active flag) from `GET /:id/live-stats`.

## Data Models

- **User** — `name`, `email`, `password` (bcrypt-hashed), `role` (`user` | `admin`).
- **Event** — `title`, `description`, `category` (Technology, Business, Arts, Sports, Music, Education, Health, Other), `location`, `date`, `time`, `capacity`, `ticketPrice`, `registeredCount`, `createdBy`, `status`, `imageUrl`, and live-telecast fields (`isLiveTelecast`, `streamLink`, `liveViewerCount`, `isStreamActive`).
- **Registration** — `userId`, `eventId`, `status` (`confirmed` | `pending` | `cancelled`), `registrationCode`, `paymentStatus` (`paid` | `pending` | `free`), `ticketQR`.

## REST API

**Auth** (`/api/auth`)

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/register` | Public | Register a user, returns a JWT |
| POST | `/login` | Public | Authenticate and return a JWT |
| GET | `/me` | Private | Get the current logged-in user |

**Events** (`/api/events`)

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/` | Public/optional auth | List events with filtering and pagination |
| GET | `/:id` | Public | Get a single event |
| GET | `/admin/my-events` | Admin | Events created by the admin |
| POST | `/` | Admin | Create an event |
| PUT | `/:id` | Admin (owner) | Update an event |
| DELETE | `/:id` | Admin (owner) | Delete an event |
| PUT | `/:id/live-telecast` | Admin (owner) | Update live-telecast settings |
| GET | `/:id/live-stats` | Admin (owner) | Live-stream statistics |
| GET | `/:id/stream-access` | Private | Check stream access for a registrant |
| POST | `/:id/registered-viewer-join` | Private | Registered user joins the stream |
| POST | `/:id/viewer-join` | Public | Track a viewer joining |
| POST | `/:id/viewer-leave` | Public | Track a viewer leaving |
| POST | `/:id/public-stream-join` | Public | Join the public stream when the event is full |

**Registrations** (`/api/registrations`)

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/:eventId` | Private | Register for an event |
| DELETE | `/:eventId` | Private | Cancel a registration |
| GET | `/my-events` | Private | The user's registered events |
| GET | `/event/:eventId` | Admin (owner) | All registrations for an event |

## Tech Stack

- **Languages:** TypeScript (front end), JavaScript / Node.js (back end)
- **Frontend:** React 18, Vite, React Router DOM, React Query, React Hook Form, Tailwind CSS, Lucide React icons, Axios
- **Backend:** Express, jsonwebtoken (JWT), bcryptjs, qrcode, Helmet, CORS, express-rate-limit, dotenv
- **Data:** custom file-based JSON database (default); Mongoose models included for an optional MongoDB swap
- **Tooling:** Vite, Nodemon, Concurrently, ESLint, TypeScript, PostCSS, Autoprefixer

## Getting Started

### Prerequisites

- Node.js 18+ and npm

### Installation

```bash
git clone https://github.com/DCode-v05/GatherUp.git
cd GatherUp
npm install
```

### Configure environment

Create a `.env` file in the project root:

```env
NODE_ENV=development
CLIENT_URL=http://localhost:5173
JWT_SECRET=your-secret-jwt-key-change-this-in-production
# Optional — only needed if you switch to the MongoDB-backed models
MONGODB_URI=mongodb://localhost:27017/gatherup
```

The API listens on port `3001` and the Vite dev server on `5173`, with the front end proxying `/api` calls to the back end.

### Running

Start the API and the front end together:

```bash
npm run dev
```

Or run them separately:

```bash
npm run server   # Express API on http://localhost:3001
npm run client   # Vite dev server on http://localhost:5173
```

Then open `http://localhost:5173`.

### Production build

```bash
npm run build     # build the front end
npm run preview   # preview the production build
```

## Usage

1. **Sign up** as a `user`, or register with the `admin` role to manage events.
2. **Browse events** on the Events page — filter by category, location, or date, and search by keyword.
3. **Register** for an event from its detail page to get a registration code and QR ticket.
4. **Track your events** on your Dashboard and cancel registrations if plans change.
5. **As an admin**, open the Admin dashboard to create, edit, or delete events and view attendee lists.
6. **Enable a live telecast** by attaching a stream link to an event and turning it active; registered users (or anyone, once the event is full) can then join.

## Project Structure

```
GatherUp/
├── index.html                   # Vite HTML entry point
├── package.json                 # scripts and dependencies
├── vite.config.ts               # Vite config (port 5173 + /api proxy to 3001)
├── tailwind.config.js           # Tailwind config
├── tsconfig*.json               # TypeScript configs
├── eslint.config.js             # ESLint config
├── nodemon.json                 # Nodemon config for the server
│
├── src/                         # Front end (React + TypeScript)
│   ├── main.tsx                 # React entry point
│   ├── App.tsx                  # routes and providers
│   ├── pages/                   # Home, Login, Register, Events, EventDetails,
│   │                            #   Dashboard, AdminDashboard, CreateEvent, EditEvent
│   ├── components/              # ProtectedRoute, AdminRoute, layout/Navbar
│   ├── contexts/AuthContext.tsx # global auth state
│   ├── hooks/useAuth.ts         # auth hook
│   └── services/api.ts          # Axios instance + JWT/401 interceptors
│
└── server/                      # Back end (Node.js + Express)
    ├── index.js                 # Express app, middleware, route mounting
    ├── config/database.js       # JSON database initialization
    ├── routes/                  # auth.js, events.js, registrations.js
    ├── models/                  # *JSON.js (active) + Mongoose models (optional)
    ├── middleware/auth.js       # protect / adminOnly / optionalProtect
    ├── services/jsonDatabase.js # file-based JSON database engine
    └── data/db.json             # JSON data store
```

---

## Contact

<table>
  <tr><td><b>Portfolio:</b> <a href="https://www.denistan.me">Denistan</a></td><td><b>LinkedIn:</b> <a href="https://www.linkedin.com/in/denistanb">denistanb</a></td></tr>
  <tr><td><b>GitHub:</b> <a href="https://github.com/DCode-v05">DCode-v05</a></td><td><b>LeetCode:</b> <a href="https://leetcode.com/u/Denistan_B">Denistan_B</a></td></tr>
  <tr><td colspan="2" align="center"><b>Email:</b> <a href="mailto:denistanb05@gmail.com">denistanb05@gmail.com</a></td></tr>
</table>

Made with ❤️ by **Denistan B**
