# Solus — frontend

Vite + React (JS) + Tailwind. Talks to `../backend` over HTTP and Server-Sent
Events, with a real JWT attached to every request. No fixed demo scenario
anywhere — every document, slide deck, and code fix is generated from what
you type in.

## Run

```
npm install
npm run dev
```

Opens on `http://localhost:5173`. Start the backend too:

```
cd ../backend
npm install
npm run dev
```

## Demo accounts (see login screen)

Password is `demo` for every role account, `admin` for the admin account.
Login runs a real bcrypt check on the backend and returns a signed JWT,
stored in `localStorage` and attached as `Authorization: Bearer <token>`
on every subsequent request (and as a `?token=` query param for the
Server-Sent Events trace stream, since browsers can't attach custom
headers to `EventSource`).

Each account is locked to one role workbench — `r.iyer` never sees
`CodeAgent` or the sandbox terminal, because Procurement doesn't need it.
Only `admin` can switch roles, and every switch is written to the audit log.

## Using the real agent features

- **Any document-producing role** (Inspection, Process, HSE, Procurement,
  Board) → Deliverable Canvas → type a free-text request → **Generate**.
  Streams the real Planner → Retrieval → DocAgent → Verifier → Composer
  trace and lands on a real downloadable `.docx` (or `.pptx` for Board).
- **IT / Automation** → Deliverable Canvas → edit the prefilled source
  code, test code, and task description (or replace them entirely) →
  **Fix with CodeAgent**. Shows the real patched code and real pytest
  output.
- **Any role** → Files → upload an image → **Analyze with VisionAgent**.
- **Marketplace → Models** → register a new Ollama model, pull it with
  real streaming progress, and assign it to a capability — genuinely
  changes which model the backend calls next.

All of this calls `frontend/src/hooks/useAgentRun.js`, which POSTs to
start a run and consumes its trace via `EventSource` — if the backend or
Ollama isn't reachable, this surfaces a real connection error rather than
falling back to placeholder output.

## Structure

```
src/
  data/fallback.js              bundled mock data (six-role UI offline fallback)
  lib/api.js                    fetch wrapper -> backend (attaches JWT), falls back to fallback.js
  hooks/useAgentRun.js          starts a real backend run, consumes its SSE trace
  hooks/useHotkeys.js
  context/AuthContext.jsx       real login/logout, token verification on load, role-locked session
  context/WorkbenchContext.jsx  role/workspace/model/plugin/audit state
  components/
    auth/        LoginPage, ProtectedRoute
    layout/      TopBar, LeftRail, RightRail, StatusBar, WorkspaceSwitcher, ProfileMenu
    canvas/      DocGenerator.jsx (shared free-text generator used by 5 roles),
                 CanvasCode.jsx (editable code-fix tool), PaperShell, Cite
    files/       FilesView, FileUploadModal (includes real VisionAgent trigger), HistoryView
    terminal/    TerminalView
    modals/      CommandPalette, HumanGateModal, AuditDrawer, ModelManagerModal
    marketplace/ PluginCard, ModelRegistryPanel (real add/pull/use/remove)
    banners/     ModelMissingBanner
  pages/         WorkbenchPage, MarketplacePage, ProfilePage
  router.jsx, App.jsx, main.jsx
```

## What's real vs. seeded

Real: authentication (bcrypt + JWT, enforced on every route), free-text
document/deck generation for every document-producing role, the editable
code-fix tool, vision analysis, the model registry (add/pull/use/remove),
file upload + classification, plugin install/uninstall, audit log writes,
workspace create/switch/search, command palette, hotkeys.

Seeded: the six-role Trace/Evidence/Files shown outside of an active real
run come from `backend/data/*.json` (workspace names, knowledge-base
scope, tool lists). See `backend/README.md` for the exact split.
