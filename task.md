Take-Home Assignment 1 - “DropLater”
Stack: Node.js + Express, MongoDB, Redis (Bull/BullMQ), tiny React admin.
Time: finishable in 3–4 days (about 12–16 hours of focused work).

How to submit your assignment?
0) What you’re building in one line
A small service where users create “notes” that should be sent to a webhook at/after a time. Delivery must be exactly once (idempotent), with retries on failure, and a tiny admin UI to create/list/replay.

1) Step-by-step flow (follow this order)
Step 1 - Project setup
Create a Node/Express API.


Add MongoDB and Redis clients.


Make a docker-compose.yml with services: api, worker, mongo, redis, and sink (webhook receiver).


Add .env.example with needed env vars.


Hints
Use pnpm or npm.


Keep one repo with /api, /worker, /sink, /admin (or serve admin from /api/public).


Suggested libs: express, zod (validation), mongoose, bullmq, pino (logs), dayjs (dates).



Step 2 - Data model (MongoDB)
notes collection:


title (string), body (string), releaseAt (ISO string), webhookUrl (string)


status ("pending" | "delivered" | "failed" | "dead")


attempts (array of { at, statusCode, ok, error? })


deliveredAt (date | null)


Indexes


releaseAt (asc) - to find due notes quickly


status - to list by status


Hints
Keep schema small. Add fields only when you need them.


If you’re new to indexes: just create those two; they’re enough here.



Step 3 - API endpoints (Express)
POST /api/notes - create note


Validate payload (title, body, releaseAt, webhookUrl).


Return the created id.


GET /api/notes?status=&page= - list notes (paginated 20 per page)


POST /api/notes/:id/replay - requeue a note that failed or is dead


GET /health - returns { ok: true }


Security (keep it simple)


A single Bearer token in Authorization header (from .env).


Rate limit: e.g., 60 req/min per IP.


Hints
Use zod for input validation, express-rate-limit for limits.


JSON errors: { error: "message", details: [...] }. Keep them human-readable.



Step 4 - The worker (Redis + Bull/BullMQ)
The worker is a separate process that delivers due notes.


Choose one (both are fine):


Delayed jobs: when creating a note, enqueue with delay = releaseAt - now.


Polling: every 5s, find notes where releaseAt <= now and status = "pending", then enqueue immediately.


Delivery logic:


POST the note as JSON to webhookUrl with headers:


X-Note-Id = note id


X-Idempotency-Key = a unique key for this delivery (see hints)


Retries: exponential backoff (e.g., 1s → 5s → 25s), max 3 tries


On success: set status = "delivered", deliveredAt = now


On final fail: set status = "dead"


Hints
Start with polling; it’s easier to reason about.


Idempotency key can be something stable like: sha256(noteId + releaseAt).


Store every attempt in attempts[] for debugging.



Step 5 - Webhook receiver (“sink” service)
Make a tiny Express app on another port:


POST /sink - accepts deliveries.


Idempotency at receiver:


Read X-Idempotency-Key


Use Redis SETNX key 1 EX 86400 (store for 1 day)


If already set → return 200 without doing anything (duplicate)


First time → log the body and return 200


Hints
This proves “exactly-once” behavior end-to-end.


Keep the sink dumb and obvious.



Step 6 - Tiny React admin
A single page with:


Create form: title, body, releaseAt, webhookUrl


Table: id, title, status, last attempt code, buttons: Replay


One micro-interaction (Framer Motion or GSAP): e.g., row pulses briefly when status changes to delivered.


Hints
Use react-hook-form for the form.


Keep styles minimal; focus on function.



Step 7 - DX, tests, docs
Scripts: dev, test, lint, format, seed


Tests (at least 2)


Unit: a pure function test (e.g., idempotency key generator or releaseAt parsing/validation)


Integration: create a note with past releaseAt and assert worker calls /sink once (mock HTTP)


README:


How to run with Docker Compose


Example curl commands


Env vars and sample .env


Hints
Keep tests short; show you can write them.


Use supertest or a tiny HTTP mock for the integration test.



2) What we will check (acceptance checklist)
docker compose up brings up api, worker, mongo, redis, sink (and admin if separate).


GET /health returns 200 { ok: true }.


Creating a note with past releaseAt triggers delivery within ~5 seconds.


If /sink returns 500 (you can toggle this via an env flag), the worker retries with backoff, then marks dead after max attempts.


Replay endpoint requeues a dead/failed note and can deliver successfully.


Idempotency: sending the same note twice should still lead to only one “real” process at the sink (second call should be recognized as duplicate).


Rate limit works (we’ll spam the API to see 429).


Tests run green.



3) Human-only proof steps
Commit trail: at least 8 meaningful commits over time (no single 2000-line dump).


2–4 min screencast:
 Show: compose up → create note (past time) → worker delivers → simulate a failure and retry → replay a dead note → explain why you chose your indexes and retry numbers.


Hand-drawn diagram: your flow (notes → queue/worker → webhook), initialed & dated; include one trade-off you considered and didn’t pick. Upload a photo.


Debug diary (short): 2 real issues you hit (paste actual error snippets/stack traces) and how you fixed them.


Commit messages: explain why you changed something, not just “fix”.



4) Hints, tips, and common pitfalls
Helpful hints
Idempotency key:

 key = sha256(`${noteId}:${releaseAt}`)
 Use the same key on every retry of the same note so duplicates are ignored.


Time math: Use dayjs or Date carefully. Always store times in UTC. Accept releaseAt as ISO.


Backoff: Simple array [1000, 5000, 25000] in ms is fine.


Validation: Reject releaseAt in the past only if you want to schedule. For this test, allow past times so we can see immediate delivery.


Logs: Log one structured line per attempt:

 { noteId, try, statusCode, ok, ms, at }
Security: One admin token in .env is enough. Don’t overbuild auth.


Keep it boring: No NestJS, no over-engineering. Clear functions, small files.


Common pitfalls (avoid these)
Forgetting to set unique/consistent idempotency keys across retries.


Treating a 500 at the sink as “delivered”. Only 2xx should mark delivered.


Making the sink idempotency in-memory only (will break on restart). Use Redis SETNX.


Mixing local time zones. Stick to UTC everywhere.



5) Minimal sample payloads (to test faster)
Create note
curl -X POST http://localhost:3000/api/notes \
 -H "Authorization: Bearer $ADMIN_TOKEN" \
 -H "Content-Type: application/json" \
 -d '{
  "title":"Hello",
  "body":"Ship me later",
  "releaseAt":"2020-01-01T00:00:10.000Z",
  "webhookUrl":"http://localhost:4000/sink"
 }'

List
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
"http://localhost:3000/api/notes?status=pending&page=1"

Replay
curl -X POST \
 -H "Authorization: Bearer $ADMIN_TOKEN" \
"http://localhost:3000/api/notes/<id>/replay"


6) What not to build
No multi-user auth, no UI theming, no Nginx, no cloud deploy, no CI.


Don’t chase perfect test coverage, 2-3 targeted tests are enough.



7) Submission
GitHub repo link (public or invite us).


Screencast link (Loom/Drive/YouTube unlisted) to a video where you explain how you implemented your program and demo the program


README with run steps and your short debug diary + diagram photo.




