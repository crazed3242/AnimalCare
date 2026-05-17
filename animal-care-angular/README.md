# Animal Care (Angular)

Angular front end for the **Animal Care System** — a community platform for lost and found pets, rescue updates, adoption listings, events, direct messaging, and admin moderation. Data is stored in **Firebase Firestore** with real-time listeners; authentication and session state use Firestore-backed users plus browser `localStorage` for the active session.

Part of the [animal-care-system](../) monorepo.

## Features

| Area | Description |
|------|-------------|
| **Feed** | Unified view of community posts |
| **Lost & Found** | Report and browse lost or found animals |
| **Rescue** | Share rescue-related posts with urgency levels |
| **Adoption** | List animals for adoption, including reservation status |
| **Events** | Propose and browse pet-related events (admin approval workflow) |
| **Create post** | Multi-image posts (up to 10 images) with type-specific fields |
| **Messages** | User-to-user messaging |
| **Profile** | View and manage user profiles |
| **Admin** | Admin-only dashboard (event approval, moderation) |

Route guards separate **guest**, **user**, and **admin** access. Admins are redirected to `/admin`; regular users to `/feed`.

## Tech stack

- [Angular](https://angular.dev/) 21 (standalone components, lazy-loaded routes)
- [Firebase](https://firebase.google.com/) 12 (Firestore)
- [Angular SSR](https://angular.dev/guide/ssr) with Express
- [Vitest](https://vitest.dev/) via `ng test`
- TypeScript 5.9

## Prerequisites

- **Node.js** 20+ (LTS recommended)
- **npm** 11+ (see `packageManager` in `package.json`)
- A Firebase project with **Firestore** enabled and security rules that allow your dev environment

## Getting started

From this directory (`animal-care-angular/`):

```bash
npm install
npm start
```

Open [http://localhost:4200/](http://localhost:4200/). The dev server reloads when source files change.

### Firebase configuration

Firebase settings live in environment files:

- `src/environments/environment.ts` — development
- `src/environments/environment.prod.ts` — production builds

Update the `firebase` object in both files with your project credentials (from the Firebase console: Project settings → Your apps). Firestore initializes in the browser only; SSR paths do not require a live Firestore connection at build time.

Ensure Firestore rules and indexes match your collections (`posts`, `comments`, `users`, `user_emails`, `reservations`, `transactions`, and messaging-related data as used by the services).

## npm scripts

| Script | Command | Purpose |
|--------|---------|---------|
| `start` | `ng serve` | Development server |
| `build` | `ng build` | Production build (output in `dist/`) |
| `watch` | `ng build --watch --configuration development` | Development build with watch |
| `test` | `ng test` | Unit tests (Vitest) |
| `serve:ssr:animal-care-angular` | `node dist/animal-care-angular/server/server.mjs` | Run SSR server after a production build |

### Production build and SSR

```bash
npm run build
npm run serve:ssr:animal-care-angular
```

Build artifacts are written to `dist/animal-care-angular/`.

## Application routes

| Path | Access | Description |
|------|--------|-------------|
| `/` | — | Redirects to `/feed` |
| `/login`, `/register` | Guest | Authentication |
| `/feed` | User | Main feed |
| `/lost-found`, `/rescue`, `/adoption`, `/events` | User | Category feeds |
| `/create-post`, `/create-post/:type` | User | New post |
| `/messages`, `/messages/:userId` | User | Messaging |
| `/profile`, `/profile/:id` | User | User profile |
| `/admin` | Admin | Admin dashboard |

## Project structure

```
src/
├── app/
│   ├── core/
│   │   ├── firebase/       # Firebase app & Firestore init
│   │   ├── guards/         # auth, user, admin, guest guards
│   │   ├── models/         # Post, User, Message, etc.
│   │   ├── services/       # Auth, posts, comments, messages, transactions
│   │   └── utils/          # Storage helpers, navigation utilities
│   ├── features/           # Route-level feature components
│   ├── shared/             # Navbar, post card, shared UI
│   ├── app.routes.ts
│   └── app.config.ts
├── environments/           # Firebase & environment flags
└── styles.css
```

Post types: `lost`, `found`, `rescue`, `adoption`, `event`. Multi-document writes use Firestore transactions via `TransactionService` for consistency.

## Code scaffolding

Generate components, services, and more with the Angular CLI:

```bash
ng generate component component-name
ng generate --help
```

## Testing

```bash
npm test
```

Unit tests run through Angular’s Vitest integration (`ng test`).

## Additional resources

- [Angular documentation](https://angular.dev/)
- [Angular CLI command reference](https://angular.dev/tools/cli)
- [Firebase Firestore](https://firebase.google.com/docs/firestore)
