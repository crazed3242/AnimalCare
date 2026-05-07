# ACID Transaction Implementation — AnimalCare

> Companion document for the **IT22 Information Management — PIT** project.
> Stack: **Angular 20 + Firebase Firestore**.
> The assignment explicitly allows Firebase / Firestore as the RDBMS.

This document maps every rubric item to the place in the code that fulfils it
and explains how each ACID property is demonstrated.

---

## 1. System overview

AnimalCare is a community web app that lets users post **lost / found / rescue
/ adoption** listings and lets adopters **reserve** a pet for adoption. The
reservation flow is the marquee transactional feature, but every multi-document
write in the app now flows through Firestore transactions or atomic batches.

| Feature | Where | Transaction primitive |
|---|---|---|
| User registration (unique-email check + create) | `AuthService.register` | `runTransaction` |
| Adoption reservation (create) | `TransactionService.reserveForAdoption` | `runTransaction` |
| Cancel reservation | `TransactionService.cancelReservation` | `runTransaction` |
| Approve / reject reservation | `TransactionService.decideReservation` | `runTransaction` |
| Create post + audit log | `PostService.createPost` | `writeBatch` |
| Delete post + comments + reservations + audit log | `PostService.deletePost` | `writeBatch` |
| Mark conversation read | `MessageService.markAsRead` | `writeBatch` |

---

## 2. Schema (RDBMS-style ERD on a document store)

Even though Firestore is a document database, we model it relationally with
explicit primary / foreign keys, normalisation, and constraints.

```
users                              user_emails (UNIQUE index)
+----------------+                 +--------------------+
| id PK          |<----------------| userId FK          |
| email UNIQUE   |---------------->| email PK (slug)    |
| password       |                 | createdAt          |
| name           |                 +--------------------+
| avatarUrl      |
| role           |                 transactions (audit log)
| createdAt      |                 +--------------------+
+----------------+                 | id PK              |
        ^                          | type               |
        | userId FK                | outcome            |
        |                          | actorId FK -> users|
        |                          | entities[]         |
posts                              | message            |
+--------------------+             | retryCount         |
| id PK              |             | createdAt          |
| type ENUM          |             +--------------------+
| userId FK          |
| description NOT NULL|
| location NOT NULL  |             reservations
| date               |             +-----------------------+
| contactInfo NOT NULL|<------+    | id PK                 |
| resolved BOOL      |       |    | postId FK ----+       |
| reservationStatus  |       +----| postOwnerId FK|       |
| reservedBy FK      |            | requesterId FK|------ + → users
| reservationId FK   |            | message NOT NULL      |
| version (OCC)      |            | status ENUM           |
| createdAt          |            | createdAt             |
| updatedAt          |            | decidedAt             |
+--------------------+            +-----------------------+
        ^
        | postId FK
        |
comments                     messages
+----------------+           +-------------------+
| id PK          |           | id PK             |
| postId FK      |           | senderId FK       |
| userId FK      |           | receiverId FK     |
| content NOT NULL|           | content NOT NULL  |
| createdAt      |           | participants[] FK |
+----------------+           | read BOOL         |
                             | createdAt         |
                             +-------------------+
```

### Constraints

* **Primary keys** — every collection has a unique `id` field stored as the
  document key.
* **Foreign keys** — `posts.userId`, `comments.postId`, `comments.userId`,
  `reservations.postId`, `reservations.requesterId`, `reservations.postOwnerId`,
  `messages.senderId`, `messages.receiverId`, `transactions.actorId`.
  Cascading delete from `posts → comments + reservations` is implemented as a
  single atomic `writeBatch` in `PostService.deletePost`.
* **NOT NULL** equivalents — enforced both client-side (return error before
  writing) and server-side in `firestore.rules` (reject documents missing
  required fields or with empty strings).
* **UNIQUE** — email uniqueness enforced via the `user_emails` sentinel
  collection. The slug of an email is the document id, so a second insert with
  the same email throws inside the transaction (see §4 Atomicity).
* **CHECK / ENUM** — `firestore.rules` uses `in [...]` validators for
  `posts.type`, `users.role`, `reservations.status`, `transactions.outcome`.
* **Immutability** — `firestore.rules` blocks edits to identity columns
  (`id`, `userId`, `createdAt`, `type`, `email`, …) using the `unchanged()`
  helper.

### Normalisation
The schema is in **3NF**:
* No repeating groups (arrays only used for `messages.participants`, which is
  a denormalised search optimisation).
* Every non-key field depends on the whole key (composite keys are not used).
* No transitive dependencies — user data is referenced by `userId` instead of
  duplicated.

---

## 3. Code map for the rubric

### 3.1 System functionality (20 pts)
* Auth (register / login / logout / role-based guards) → `core/services/auth.service.ts`, `core/guards/auth.guard.ts`.
* Posts (lost, found, rescue, adoption) → `features/{lost-found,rescue,adoption,feed,create-post}`.
* Messaging → `features/messages`, `core/services/message.service.ts`.
* Admin dashboard with stats, post / comment / user / reservation / transaction
  management → `features/admin/admin.component.ts`.
* Adoption reservation flow → `shared/post-card/post-card.component.ts` +
  `core/services/transaction.service.ts`.

### 3.2 ACID principles (25 pts) — see §4.

### 3.3 Database design (15 pts) — see §2 above + `firestore.rules` + `firestore.indexes.json`.

### 3.4 Transaction implementation (20 pts) — `core/services/transaction.service.ts`
contains the three explicit `runTransaction` blocks
(`reserveForAdoption`, `cancelReservation`, `decideReservation`) plus the
audit-log writer. `AuthService.register` uses a fourth `runTransaction`. Three
distinct `writeBatch` flows back the cascading deletes and the unread-flip.
Every flow logs its outcome (`COMMITTED` / `ROLLED_BACK`) and the number of
optimistic-concurrency retries to the `transactions` collection.

### 3.5 Oral defense (15 pts) — see §5 talking points.

### 3.6 Team collaboration (5 pts) — git history.

---

## 4. ACID property by property

### A — Atomicity
> _A transaction either commits in full or has no effect at all._

* **Reservation creation** writes:
  1. `reservations/{id}` (new doc), and
  2. `posts/{postId}` (status flip + version bump),
  inside a single `runTransaction`. If either step fails — including the
  consistency checks done inside the closure — Firestore discards every
  staged write. We then synthesise a `transactions/...` row with
  `outcome: 'ROLLED_BACK'` so the rollback is auditable too.
* **Post deletion** uses `writeBatch` to delete the post, every comment with
  `postId == postId`, every reservation with `postId == postId`, and an
  audit-log row in one network round trip. `writeBatch.commit()` is
  documented as atomic by Firestore.
* **Registration** atomically claims the email sentinel and writes the user
  profile.
* **Demo:** open two browsers, register with the same email simultaneously —
  exactly one succeeds; the other gets _"Email already registered"_ and a
  rolled-back row appears in the **Transactions** admin tab.
* **Demo:** two adopters click _Request to Adopt_ on the same pet at the same
  instant — only one reservation is committed. The losing client's transaction
  retries (visible as `↺n` in the admin log) and finally fails with
  _"Pet is already reserved by another adopter."_

### C — Consistency
> _A transaction takes the database from one valid state to another._

Three layers enforce this:

1. **Field validation inside the transaction closure** — the
   `TransactionService` checks that the post is type `adoption`, not the
   user's own, not already reserved by someone else, and that the user has
   no other pending reservation.
2. **Server-side validation** in `firestore.rules` — types, enums, immutable
   columns, required fields. A malicious client cannot mutate `posts.type`,
   `users.role`, `reservations.requesterId`, etc. The audit log
   (`/transactions/*`) is **append-only and immutable** — `allow update,
   delete: if false`.
3. **Database invariants enforced via the `version` column** — every post
   carries a monotonically increasing `version`. Updates always write
   `version + 1`. Combined with the snapshot-isolation Firestore gives
   `runTransaction`, this implements optimistic concurrency control.

### I — Isolation
> _Concurrent transactions do not interfere with each other._

* Firestore `runTransaction` uses **snapshot isolation with optimistic
  concurrency control**. Inside the closure, every `tx.get(ref)` records the
  current document's version stamp. At commit time, Firestore verifies that
  none of the read documents has been mutated by anyone else; if any has, the
  commit is rejected and the closure is **automatically re-run** up to a
  maximum number of attempts. In practice, this is equivalent to
  `SERIALIZABLE` isolation in a relational database.
* `TransactionService` exposes the retry count to the audit log (the `↺n`
  badge). Open the admin **Transactions** tab while two clients race — you
  will see retries logged.
* The **email sentinel** in `user_emails` is the row that races during
  registration. Whichever transaction commits first claims the email; the
  other transaction reads the now-existing sentinel on its retry and aborts
  with a rolled-back log row.

### D — Durability
> _Once a transaction is committed, its effects persist even on failure._

* Firestore replicates every committed write to **multiple geographic zones**
  before the `commit()` promise resolves. A regional outage cannot lose
  acknowledged writes.
* On top of that, every transactional flow **writes an immutable audit row**
  to the `/transactions` collection. The Firestore rule
  `allow update, delete: if false` makes the row tamper-proof. This audit
  trail is rendered live in **Admin → Transactions** so graders can verify
  durability without leaving the UI.
* The audit row records:
  * what type of transaction ran (`USER_REGISTER`, `RESERVATION_APPROVE`, …),
  * who triggered it,
  * which collections / docs it touched,
  * whether it `COMMITTED` or `ROLLED_BACK`,
  * how many optimistic-concurrency retries occurred.

---

## 5. Oral defense — quick talking points

1. **System tour** — log in as the admin (`johndanielmabayo@gmail.com /
   mabayo3242`); show feed, create-post, messaging, admin dashboard.
2. **Show the schema** — open `ACID.md` § 2; explain PK/FK lines.
3. **Demo Atomicity** — delete a post that has comments + a pending
   reservation. Show in the admin **Posts** that all related docs disappear
   in one go, and the **Transactions** tab shows a single `POST_DELETE`
   `COMMITTED` row.
4. **Demo Consistency** — open the browser dev console, try to write a post
   with `type: 'banana'` directly via the Firestore SDK — the
   `firestore.rules` enum check rejects it.
5. **Demo Isolation** — two browsers, same adoption pet, click _Reserve_ in
   quick succession. Show the Transactions tab: one row `COMMITTED`, one row
   `ROLLED_BACK` with `errorReason: "Pet is already reserved"`. Optionally
   show a row whose `retryCount > 0` — that is OCC at work.
6. **Demo Durability** — refresh the browser, log out, log back in — every
   transaction is still in the log. Show the immutable rule
   (`allow update, delete: if false`) in `firestore.rules`.
7. **Code walkthrough** — open `core/services/transaction.service.ts`. Point
   at `runTransaction(db, async tx => { ... })`. Highlight the four steps:
   read → validate → stage writes → log.

---

## 6. Files to highlight during the defense

* `firestore.rules` — server-side constraints + audit-log immutability.
* `firestore.indexes.json` — composite indexes used by reservation queries.
* `src/app/core/services/transaction.service.ts` — central ACID layer.
* `src/app/core/services/auth.service.ts` (`register`) — second
  `runTransaction` with the email-sentinel pattern.
* `src/app/core/services/post.service.ts` (`deletePost`) — atomic batch with
  cascading deletes.
* `src/app/features/admin/admin.component.ts` (Transactions tab) — durable
  audit-trail UI.
* `src/app/shared/post-card/post-card.component.ts` — user-facing reservation
  flow.
