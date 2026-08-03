# Project Site — Build Plan

## 0. What this document is

A complete, self-contained spec for building the team's software engineering
project website. It defines every page, every data structure, and every
feature in enough detail that it can be built section by section without
guesswork. Follow it top to bottom; each phase produces something runnable.

---

## 1. Goals

- Give the team (and the professor/TA) one place to see: who's on the team,
  what the plan is, what's been presented, what's changed recently, and what
  files exist — with history, not just the latest copy.
- Keep the public parts read-only for visitors, and gate uploads/edits behind
  team login.
- Track file changes the way GitHub tracks commits: every upload is a new
  version with an author, a timestamp, and a message — never a silent
  overwrite.

## 2. Assumptions (stated so nobody has to guess)

- Team size: 4 members (adjust `TEAM` config wherever it appears).
- No real backend exists yet — this plan includes one, because "GitHub-like
  version control" needs persistence that survives a page refresh; in-memory
  state does not.
- Recommended stack (swap only if there's a strong reason not to):
  - **Frontend:** React + TypeScript + Vite, React Router, Tailwind CSS
  - **Backend/DB/Auth/Storage:** Supabase (Postgres + Auth + Storage bucket).
    Free tier is enough for a class project. If Supabase is off the table,
    substitute a small Express + SQLite server with local file storage —
    the data model below doesn't change, only where it lives.
  - **Deployment:** Vercel or Netlify for the frontend; Supabase hosts itself.

---

## 3. Site Map

| Route | Access | Purpose |
|---|---|---|
| `/` | Public | Intro: project name, one-line pitch, team member cards, links into the rest of the site |
| `/planning` | Public read / Team edit | Roadmap, milestones, task board |
| `/presentations` | Public read / Team upload | Slide decks and presentation files, versioned |
| `/files` | Public read / Team upload | General project files (docs, reports, planning artifacts), versioned |
| `/files/:fileId/history` | Public read | GitHub-like commit history for one file |
| `/updates` | Public read / Team post | Dated progress log / changelog |
| `/login` | Public | Team-only sign in |
| `/dashboard` | Team only | Post-login hub: quick links to upload, pending tasks assigned to you, recent activity |

Nav bar on every page: `Home · Planning · Presentations · Files · Updates ·
Sign In` (swaps to `Dashboard · Sign Out` once logged in).

---

## 4. Data Model

Use these tables/collections regardless of backend choice. Every foreign key
(FK) is called out in its own column — a blank FK column means that field is
not a reference to another table. `Null?` says whether the column allows
`NULL` — this matches the constraints in the §7 SQL exactly.

**team_members** — no FKs; every other table references this one
| field | type | FK → | Null? | notes |
|---|---|---|---|---|
| id | uuid | | not null | primary key |
| auth_user_id | uuid | `auth.users.id` | nullable | links this profile to a real login; null until you create/link the auth user |
| name | text | | not null | |
| role | text | | nullable | e.g. "Frontend", "Backend", "PM" |
| email | text | | not null | used for login allowlist; must be unique |
| bio | text | | nullable | optional, 1–2 sentences |
| avatar_url | text | | nullable | optional |
| created_at | timestamp | | not null | defaults to now() |

**milestones** — no FKs; `tasks` references this one
| field | type | FK → | Null? | notes |
|---|---|---|---|---|
| id | uuid | | not null | primary key |
| title | text | | not null | |
| description | text | | nullable | |
| due_date | date | | nullable | |
| status | enum | | not null | `not_started \| in_progress \| done`, defaults to `not_started` |

**tasks** — 2 FKs
| field | type | FK → | Null? | notes |
|---|---|---|---|---|
| id | uuid | | not null | primary key |
| milestone_id | uuid | `milestones.id` | nullable | a task can exist before it's assigned to a milestone |
| title | text | | not null | |
| assignee_id | uuid | `team_members.id` | nullable | unassigned tasks are allowed |
| status | enum | | not null | `todo \| in_progress \| done`, defaults to `todo` |
| priority | enum | | not null | `low \| medium \| high`, defaults to `medium` |

**files** — 1 FK (added after `file_versions` exists — see §7 SQL)
| field | type | FK → | Null? | notes |
|---|---|---|---|---|
| id | uuid | | not null | primary key |
| name | text | | not null | display name |
| category | enum | | not null | `presentation \| planning \| report \| other`, defaults to `other` |
| visibility | enum | | not null | `private \| public`, defaults to `private`; team flips to `public` when ready to show visitors |
| current_version_id | uuid | `file_versions.id` | nullable | null until the first version is uploaded |

**file_versions** (the version-control core) — 2 FKs
| field | type | FK → | Null? | notes |
|---|---|---|---|---|
| id | uuid | | not null | primary key |
| file_id | uuid | `files.id` | not null | every version must belong to a file |
| version_number | int | | not null | increments per file, starts at 1 |
| uploaded_by | uuid | `team_members.id` | nullable | kept nullable so a version survives if the uploader's row is later deleted |
| uploaded_at | timestamp | | not null | defaults to now() |
| storage_url | text | | not null | link to the actual blob in storage |
| commit_message | text | | not null | required on every upload |
| size_bytes | int | | nullable | |

**updates** — 1 FK
| field | type | FK → | Null? | notes |
|---|---|---|---|---|
| id | uuid | | not null | primary key |
| author_id | uuid | `team_members.id` | nullable | survives author deletion |
| date | timestamp | | not null | defaults to now() |
| title | text | | not null | |
| body | text | | not null | markdown supported |
| tags | text[] | | not null | defaults to `{}` (empty array, not null) |

**activity_log** (powers the Activity Feed, §5.7) — 1 FK
| field | type | FK → | Null? | notes |
|---|---|---|---|---|
| id | uuid | | not null | primary key |
| type | enum | | not null | `file_upload \| file_published \| task_status \| milestone_done \| new_update` |
| actor_id | uuid | `team_members.id` | nullable | survives actor deletion |
| target_id | uuid | | nullable | id of the file/task/milestone/update this event is about — **not a true FK**, since it can point into any of 4 different tables depending on `type` |
| summary_text | text | | not null | short human-readable line, e.g. "uploaded v3 of Sprint 2 Deck" |
| created_at | timestamp | | not null | defaults to now() |

### Foreign key summary

| From table.field | → To table.field |
|---|---|
| `team_members.auth_user_id` | `auth.users.id` |
| `tasks.milestone_id` | `milestones.id` |
| `tasks.assignee_id` | `team_members.id` |
| `files.current_version_id` | `file_versions.id` |
| `file_versions.file_id` | `files.id` |
| `file_versions.uploaded_by` | `team_members.id` |
| `updates.author_id` | `team_members.id` |
| `activity_log.actor_id` | `team_members.id` |

Note the one cycle: `files` ↔ `file_versions` reference each other
(`files.current_version_id` → `file_versions.id`, `file_versions.file_id` →
`files.id`). That's why the SQL in §7 creates `files` first without that
constraint, creates `file_versions`, then adds the FK onto `files` afterward.

---

## 5. Feature Specs

### 5.1 Home (`/`)
- Project title, one-sentence pitch, "View Planning" and "View Presentations" buttons.
- Team member cards (name, role, photo/avatar, one-line bio) pulled from `team_members`.
- Brief "how this site works" section: 3–4 short steps explaining the login → upload → version history flow, for a first-time visitor (professor/TA) to understand without asking.

### 5.2 Planning (`/planning`)
- Milestone timeline (ordered by `due_date`), each showing status as a colored badge.
- Task board grouped by status (`todo / in_progress / done`) — simple kanban columns, not drag-and-drop unless there's time; a status dropdown per task is enough.
- Logged-in team members can add/edit tasks and milestones; visitors see read-only.

### 5.3 Presentations (`/presentations`) and Files (`/files`)
- List of files in the relevant category, each row showing: name, current version number, last uploaded by, last uploaded date, visibility (private/public), download link, and a "History" link to `/files/:fileId/history`.
- **Upload is drag-and-drop**, only visible when logged in: a drop zone that also accepts a click-to-browse fallback. This is the primary upload interaction — prioritize it over a plain file-input button. Uploading:
  - If the file name matches an existing file, it creates a **new version** of that file (never overwrites).
  - If it's a new name, it creates a new `files` row with version 1, defaulting to `visibility: private`.
  - A commit message is **required** before the upload completes (mirrors a git commit — this is the whole point of the feature).
- **Visibility toggle**: a "Publish" / "Make private" control on each file, team-only. Visitors (logged out) only ever see `public` files in the list — `private` files simply don't render for them. This is what lets a presentation draft stay hidden until the team is ready to show it.

### 5.4 Version History (`/files/:fileId/history`)
- Reverse-chronological list of every `file_versions` row for that file: version number, author, timestamp, commit message, size, download link.
- "Restore this version" button on any past version — creates a new version whose content matches the restored one (so history is append-only, like git revert, not a destructive rollback).

### 5.5 Updates (`/updates`)
- Chronological feed of `updates` entries, newest first. Each entry: author, date, title, body (renders markdown), optional tags for filtering.
- Logged-in members can post new entries. Think of this as the changelog / sprint log the team and grader can skim to see progress over time.

### 5.6 Login (`/login`) and Dashboard (`/dashboard`)
- Email + password form. Only emails present in `team_members` can sign in (allowlist, same spirit as the earlier prototype, but backed by real auth now instead of a hardcoded array).
- On success, redirect to `/dashboard`: shows tasks assigned to the logged-in member, a shortcut to upload a file, and the 5 most recent `updates` entries.

### 5.7 Activity Feed
- A merged, reverse-chronological timeline of everything that's happened: new file version uploaded, file made public, task status changed, milestone completed, new update posted. One event type, rendered differently by icon/color per kind (e.g. upload / status-change / new-post).
- Lives on `/dashboard` (team-only, full detail) and a lighter public version can sit on `/updates` or `/` so visitors get a sense of momentum without needing to check every page.
- Implementation note: simplest version is a single `activity_log` table (`id`, `type`, `actor_id`, `target_id`, `summary_text`, `created_at`) written to whenever the other tables change — no separate reconstruction logic needed.

---

## 6. Not in the current build, but worth knowing about

Considered and deliberately left out of §5 for now. Revisit if there's time left after the core build:

- **Inline file preview** — render files in-browser instead of forcing a download. Realistic scope for now is **PDF only** (well-supported libraries); `.pptx` can't be rendered natively by browsers and would need converting to PDF/images on upload or embedding an external viewer, which is a real chunk of extra work. Do this last, and only for PDFs.
- **Risk register** — a table of things that could derail the project (likelihood/impact/mitigation). No code complexity, just a page — cheap to add later if you want it for a grading checkpoint.
- **Sprint retrospectives** — a structured, recurring variant of the Updates feed (went well / didn't / changing next). Reuses the existing `updates` table, just with a fixed template.
- **Grading rubric tracker** — maps the professor's rubric line items to the deliverable that satisfies each one, with a status per item.
- **Viewer vs. member roles** — a lightweight "viewer" role (e.g. for the professor/TA) that can comment without full edit access.
- **Comments on tasks/updates** — inline feedback instead of over text/Slack.
- **Burndown / progress chart** — tasks completed over time vs. the milestone timeline.
- **Real GitHub commit feed embed** — if the code lives in a GitHub repo, pull its commit history via the GitHub API onto `/updates` alongside the site's own log.
- **Site-wide search** — across files, updates, and tasks.
- **Export progress report as PDF** — pulls milestones + updates + rubric status into one submittable PDF.
- **Basic diff view for text files** — line-level diff for `.md`/`.txt` between versions; skip for binary files.

---

## 7. Supabase Setup Guide (first-time walkthrough)

You've never used Supabase — here's the path from zero to a working backend. Do this once, near the start of Phase 2 below.

1. **Create the project.** Go to supabase.com, sign in with GitHub, click "New Project." Pick a name and a database password (save it somewhere — you'll rarely need it directly, but it's your Postgres root password). Pick the region closest to you. Wait ~2 minutes for provisioning.
2. **Grab your keys.** Project Settings → API. You'll need the `Project URL` and the `anon public` key — these go into your frontend's environment variables (`.env`), never the `service_role` key (that one's server-only/never shipped to the browser).
3. **Create the tables.** Use the Table Editor (or the SQL editor, faster once you're comfortable) to create each table from §4: `team_members`, `milestones`, `tasks`, `files`, `file_versions`, `updates`, `activity_log`. Match the field names and types listed there — foreign keys reference the table's `id`.
4. **Turn on Row Level Security (RLS).** Supabase enables this by default per table — keep it on. It's what enforces "visitors can only read `public` files" and "only logged-in team members can write" at the database level, not just in your frontend code. Roughly: a `select` policy allowing everyone to read rows where `visibility = 'public'` (or unconditionally for tables like `milestones`/`updates` that are meant to be fully public), plus a stricter policy for team-only tables. A policy is just a SQL condition — Supabase's UI has a template picker for common ones to start from.
5. **Set up Auth.** Authentication → Providers → enable Email. Then, since only your 4 teammates should be able to sign in, either (a) manually create their 4 users under Authentication → Users, or (b) enable signups but check the submitted email against `team_members` in your own signup logic and reject anyone not on the list.
6. **Create the storage bucket.** Storage → New Bucket, e.g. `project-files`. Set it private (not public) by default, and control read access the same way as the `files` table — via a policy checking `visibility`, or by having your frontend request a signed URL for private files.
7. **Wire it into the frontend.** `npm install @supabase/supabase-js`, create one `supabaseClient.ts` that reads the URL/anon key from env vars, and use it for all auth/DB/storage calls from there.

That's the whole setup — everything after this is normal frontend work against that client. I can walk through any of these steps live when you're actually building, especially the RLS policies, which are the part most people find fiddly the first time.

---

## 8. Build Order

1. **Skeleton** — Vite + React + Router + Tailwind, all routes above rendering static placeholder content, nav working, no backend yet.
2. **Backend + data model** — follow §7 to stand up Supabase, create the tables in §4 (including `visibility` and `activity_log`), seed `team_members` with real data.
3. **Auth** — login page wired to Supabase Auth, allowlist check against `team_members`, session persisted, dashboard gated.
4. **Files + version control** — storage bucket, **drag-and-drop** upload flow with required commit message, version history page, restore action, private/public visibility toggle.
5. **Planning + Updates** — milestone/task CRUD, updates feed, both gated for writes / open for reads.
6. **Activity feed** — `activity_log` writes triggered from the actions in steps 3–5, feed rendered on `/dashboard` and a public version on `/updates` or `/`.
7. **Polish** — home page team cards, empty states, mobile layout pass, deploy to Vercel/Netlify + Supabase.
8. **Stretch** — pick from §6 based on remaining time.

---

## 9. Acceptance Checklist

- [ ] Visiting `/` with no login shows team + project intro, no broken links.
- [ ] All 4 team members and only those 4 can log in.
- [ ] Uploading a file with an existing name creates version N+1, not an overwrite.
- [ ] Every upload is blocked until a commit message is entered.
- [ ] Upload works via drag-and-drop, with click-to-browse as a fallback.
- [ ] A `private` file never appears in the list or search for a logged-out visitor.
- [ ] Publishing a file flips it to visible for logged-out visitors immediately.
- [ ] `/files/:fileId/history` shows every past version with working downloads.
- [ ] Restoring an old version appears as a new version at the top of history, not a deletion of newer ones.
- [ ] The activity feed reflects a new upload, task status change, and new update post without a page refresh needed on next load.
- [ ] Logged-out visitors cannot see any upload/edit controls anywhere.
- [ ] Site is usable on a phone-width screen (nav collapses, cards stack).