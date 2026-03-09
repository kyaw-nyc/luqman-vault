# PROJECT_CONTEXT.md

## Project name
Luqman Vault

## What this project is
A private personal cloud dashboard for my Ubuntu home server.

I already built the infrastructure:
- Ubuntu server is installed and stable
- Tailscale is installed and working
- SSH works with key auth
- Samba works from my Mac
- rsync works with shell aliases
- storage folders already exist on the server
- a boot-time fix for my Wi-Fi adapter already exists and works

This is NOT a public app right now.
This is a private app for me.

---

## Core goal
Build a polished hacker-style web dashboard that lets me:
- browse files in my server storage
- upload files
- download files
- see storage stats
- view recent activity
- check server health

This should feel like a personal cloud / control panel, not a generic admin dashboard.

---

## Product intent
I want this to feel:
- sleek
- dark
- hacker / cyberpunk / terminal-inspired
- minimal but premium
- actually useful, not just aesthetic

Think:
- dark UI
- monospaced accents
- clean cards
- glowing status pills
- tasteful motion
- good spacing
- not cheesy

---

## Architecture
### Current architecture
- Frontend: Next.js app
- Backend: small API service running on Ubuntu server
- Storage: local filesystem on Ubuntu
- Network access: Tailscale only
- Remote machine name: `luqman-server`
- Storage root: `~/Storage`

### Important constraint
Do NOT make the backend public by default.

This is a private app.
Assume the backend should only be reachable inside my Tailscale network.

Use Tailscale Serve style thinking, not public exposure.

### What NOT to do
- Do not build around public anonymous access
- Do not assume S3
- Do not assume cloud object storage
- Do not assume Firebase
- Do not assume Supabase storage
- Do not assume public CDN for private files
- Do not require Docker for MVP
- Do not require Kubernetes or any overkill infra
- Do not build a giant enterprise system

Keep it lean and local-first.

---

## Existing server storage layout

`~/Storage/`
- `ServerSync/`
- `School/`
- `Projects/`
- `Media/`
- `Backups/`
- `Archive/`

Primary MVP folder to work with first:
- `~/Storage/ServerSync/`

---

## Existing workflows
### Mac aliases already exist
- `syncserver` pushes:
  `~/Documents/ServerSync/` -> `luqman-server:~/Storage/ServerSync/`
- `pullserver` pulls:
  `luqman-server:~/Storage/ServerSync/` -> `~/Documents/ServerSync/`

### Samba already works
I can browse the storage from my Mac in Finder.

### SSH already works
I can SSH into the server using:
- `ssh luqman-server`

---

## MVP to build first
Build Version 1 with these pages/features:

### 1. Dashboard page
Show:
- total disk space
- used disk space
- free disk space
- current hostname
- whether backend is reachable
- recent file activity
- service health summary

### 2. Files page
Show:
- file/folder browser for `~/Storage`
- ability to enter folders
- breadcrumb navigation
- file metadata:
  - name
  - size
  - modified time
  - type

### 3. Upload page
Allow:
- drag-and-drop upload
- normal file picker upload
- target folder selection
- upload progress
- success/error states

### 4. Health page
Show:
- tailscaled status
- smbd status
- ssh status
- wi-fi fix service status
- disk usage
- maybe uptime

### 5. Nice shell / command panel later
Not required in MVP.
Maybe later.

---

## MVP backend API
Build a very small backend with endpoints like:

- `GET /api/health`
- `GET /api/stats`
- `GET /api/files?path=...`
- `POST /api/upload`
- `GET /api/download?path=...`
- `DELETE /api/files?path=...` (optional for MVP)

The API should operate on local files under `~/Storage`.

### Important security rule
Never allow path traversal.
Never allow `..` to escape the storage root.
All filesystem operations must be constrained to the storage root.

---

## Tech preferences
### Frontend
Use:
- Next.js
- TypeScript
- App Router
- Tailwind CSS

### Good optional libraries
Allowed if useful:
- shadcn/ui
- lucide-react
- framer-motion
- zod
- react-dropzone

Do not bloat the project.

### Backend
Choose one:
- FastAPI
- Express
- Next.js Route Handlers if the deployment model makes sense

But be practical.
The easiest architecture that works is better than a fancy one.

---

## Design preferences
The UI should have:
- dark background
- strong typography
- nice spacing
- subtle glow
- clean borders
- terminal-inspired labels
- elegant status indicators

Avoid:
- toy-looking hacker UI
- overwhelming neon everywhere
- clutter
- dense walls of text
- fake gimmicky terminal effects on every component

This should look cool and credible.

---

## Code style
- TypeScript-first
- clean folder structure
- reusable components
- avoid giant files
- avoid overengineering
- write comments only where they help
- prioritize readable code
- use clear naming

---

## Folder structure suggestion
Use something like:

`app/`
- `(dashboard)/dashboard/page.tsx
- `(dashboard)/files/page.tsx
- `(dashboard)/upload/page.tsx
- `(dashboard)/health/page.tsx
- `api/...` if needed

`components/`
- `layout/`
- `cards/`
- `files/`
- `health/`
- `ui/`

`lib/`
- api client
- helpers
- formatters
- path utilities

`types/`
- file types
- stats types
- health types

---

## Data model suggestions
You can start with simple derived data, no database required.

### File item
- name
- path
- isDirectory
- size
- modifiedAt
- extension
- mimeType

### Health item
- serviceName
- status
- details
- checkedAt

### Storage stats
- totalBytes
- usedBytes
- freeBytes
- percentUsed

---

## Backend assumptions
Assume the Ubuntu server can run a small API service.
Assume the Next.js frontend may either:
1. be hosted privately and access that backend directly over Tailscale, or
2. later be deployed on Vercel while the backend stays private

For now, optimize for local/private development first.

Do not force a public deployment model yet.

---

## Phase 1 deliverable
I want the first iteration to include:
- a beautiful dashboard shell
- file browser UI
- mocked data first if needed
- then easy swap to real backend data

If you need to stage the work, do it in this order:
1. create app shell and design system
2. create dashboard and files UI with mock data
3. define backend contract types
4. wire real API
5. add uploads
6. add health page

---

## Phase 2 ideas
Later I may want:
- previews for images / PDFs / text files
- full-text search
- tags
- AI search over documents
- activity log
- version history
- expiring share links
- mobile-friendly layout
- command palette

But these are NOT required for V1.

---

## Existing machine details
Server hostname:
- `luqman-server`

Storage root:
- `/home/luqman/Storage`

Useful subfolder:
- `/home/luqman/Storage/ServerSync`

Important service that already exists:
- `ae1200-fix.service`

---

## What I want from the coding agent
Please help me:
1. scaffold the project cleanly
2. choose a good architecture for a private local-first app
3. build the UI first with mock data
4. then wire a minimal real backend
5. keep everything clean and tasteful

When making choices, prefer:
- simple
- elegant
- local-first
- secure
- easy to iterate

Do not overcomplicate the MVP.