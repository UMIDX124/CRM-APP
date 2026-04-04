# FU Corp CRM — Complete Handoff Document
# From: Claude Opus Session 1 (builder) → To: Claude Opus Session 2 (redesign + stabilize)

## CRITICAL: READ THIS ENTIRE FILE BEFORE TOUCHING ANY CODE

---

## PROJECT INFO
- **Path:** D:\claude-Ai-Bot-main\claude-Ai-Bot-main
- **Live URL:** https://fu-corp-crm.vercel.app
- **GitHub:** https://github.com/UMIDX124/CRM-APP
- **Vercel Team:** team_BjOsCJbL5L5KHcwDbtmokjxk
- **Vercel Project:** prj_FLmw9lzKMAGENnKCLNvgJaqSzs6m
- **Port:** 3012 (dev)

## TECH STACK
- Next.js 16.2.1 (App Router)
- React 19.2.4
- Tailwind CSS 4
- Prisma 7 + @prisma/adapter-neon
- Neon Postgres (serverless HTTP)
- Groq AI (llama-3.3-70b-versatile)
- Vercel hosting

## DATABASE
- **Provider:** Neon Postgres
- **Connection:** Read from .env.local (DATABASE_URL) — DO NOT hardcode
- **13 tables:** brands, users, clients, tasks, leads, invoices, attendance, comments, notes, attachments, notifications, audit_logs, sessions
- **Seeded data:** 3 brands, 14 users, 8 clients, 8 tasks, 16 leads, 6 invoices
- **TCP port 5432 BLOCKED on this machine** — use @neondatabase/serverless (HTTP) for DB operations
- Connection string is in .env.local — read it from there

## ENV VARS (in .env.local + Vercel)
- DATABASE_URL — Neon pooler URL
- GROQ_API_KEY — in .env.local (DO NOT hardcode)
- GOOGLE_SHEETS_WEBHOOK_URL — Google Apps Script URL for lead sync

## LOGIN CREDENTIALS
- Credentials are in the database (bcrypt hashed) and in the seed script (prisma/seed.ts)
- Check scripts/setup-db.mjs for plain text passwords used during seeding

---

## KNOWN BUGS & ISSUES (MUST FIX)

### 1. useData hook was REMOVED — replaced with raw useEffect
**What happened:** I created a useData custom hook in src/lib/use-data.ts that caused infinite re-render loops because mockData array reference changed every render, triggering useCallback → useEffect → fetch → setState → re-render → infinite loop.

**Current state:** Each CRUD component (Clients, Employees, Tasks, Pipeline, Invoices) has a raw useEffect that fetches from API on mount. This works but is messy — 5 copies of similar fetch logic.

**Proper fix:** Create a STABLE data fetching hook:
```typescript
function useFetch<T>(url: string, fallback: T) {
  const [data, setData] = useState<T>(fallback);
  const [loading, setLoading] = useState(true);
  const fallbackRef = useRef(fallback); // MUST use ref, not direct dependency

  useEffect(() => {
    let cancelled = false;
    fetch(url)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (!cancelled && d) setData(d); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [url]); // ONLY url as dependency, nothing else

  return { data, setData, loading };
}
```

### 2. Type casting hacks everywhere
**Problem:** Components use `as unknown as Lead[]`, `as unknown as Task[]` etc because mock data types don't match component interfaces.

**Fix:** Define ONE shared type per entity in a types file. Make mock data AND API responses conform to the same type.

### 3. Pipeline brand field mismatch
**Problem:** Mock leads have brand embedded in `source` field ("Website - BSL") not as separate `brand` field. DB leads have `brandId` referencing brands table.

**Fix:** The `getBrand()` helper in PipelineModule extracts brand from source string. This is a hack. Properly map DB data to have a `brand` string field.

### 4. Auth is half-real half-demo
**Problem:** Login page calls /api/auth/login (real bcrypt auth against DB) but falls back to localStorage demo if API fails. Dashboard layout checks localStorage for auth state.

**Current flow:** Login → API call → if success, store in localStorage → layout reads localStorage
**Issue:** If user is logged in via localStorage (demo mode) and API routes require real auth session, API calls return 401 → components fall back to mock data.

### 5. Toast system works but Pipeline doesn't use it
**Problem:** I removed useToast from PipelineModule to fix a crash, so Pipeline has no toast notifications. Other components (Clients, Employees, Tasks, Invoices) still use useToast and it works.

### 6. Attendance mock data is generated randomly
**Problem:** AttendanceModule uses `generateAttendance()` which creates random data on every page load. Not fetched from DB.

### 7. Payroll/Expenses/Leaves are 100% mock
**Problem:** These modules have no API routes and no DB tables. They use local state with sample data.

### 8. Dashboard shows hardcoded mock KPIs
**Problem:** DashboardModule reads from mock-data.ts directly. The /api/dashboard route exists but Dashboard component doesn't call it.

---

## FILE STRUCTURE

```
src/
├── app/
│   ├── (dashboard)/          # Dashboard route group (has layout with sidebar)
│   │   ├── layout.tsx        # Main layout: sidebar, header, breadcrumbs, toast, command palette
│   │   ├── page.tsx          # Dashboard
│   │   ├── clients/page.tsx
│   │   ├── employees/page.tsx
│   │   ├── tasks/page.tsx
│   │   ├── pipeline/page.tsx
│   │   ├── attendance/page.tsx
│   │   ├── attendance/checkin/page.tsx
│   │   ├── invoices/page.tsx
│   │   ├── payroll/page.tsx
│   │   ├── leaves/page.tsx
│   │   ├── expenses/page.tsx
│   │   ├── calendar/page.tsx
│   │   ├── reports/page.tsx
│   │   ├── settings/page.tsx
│   │   ├── audit/page.tsx
│   │   ├── guide/page.tsx
│   │   └── shortcuts/page.tsx
│   ├── login/page.tsx        # Login (outside dashboard layout)
│   ├── kiosk/page.tsx        # PIN kiosk (standalone, no sidebar)
│   ├── api/                  # 18 API routes
│   │   ├── auth/login, logout, me, change-password
│   │   ├── employees, clients, tasks, leads, invoices
│   │   ├── attendance, notifications, audit, export
│   │   ├── email, upload, dashboard
│   │   ├── chat              # Groq AI
│   │   └── webhook/lead      # Public webhook for form capture
│   ├── globals.css           # Neon orange theme, animations, light/dark mode
│   └── layout.tsx            # Root layout (Inter font, PWA manifest)
├── components/
│   ├── DashboardModule.tsx
│   ├── ClientManagement.tsx   # Uses useEffect to fetch from /api/clients
│   ├── EmployeeDirectory.tsx  # Uses useEffect to fetch from /api/employees
│   ├── TaskManagement.tsx     # Uses useEffect to fetch from /api/tasks
│   ├── PipelineModule.tsx     # Uses useEffect to fetch from /api/leads
│   ├── InvoiceModule.tsx      # Uses useEffect to fetch from /api/invoices
│   ├── AttendanceModule.tsx   # Mock data (3 views: daily/monthly/range)
│   ├── AttendanceCheckin.tsx  # Self check-in, admin panel, PIN kiosk
│   ├── PayrollModule.tsx      # 100% mock
│   ├── LeaveModule.tsx        # 100% mock with approve/reject
│   ├── ExpenseModule.tsx      # 100% mock with approve/reject
│   ├── ReportsModule.tsx      # PDF generation via jsPDF
│   ├── SettingsModule.tsx     # Profile, company, notifications, security, appearance
│   ├── AIChat.tsx             # Groq-powered chat with FU Bot mascot
│   ├── FUMascot.tsx           # Animated SVG mascot (blinks, bobs, emotions)
│   ├── CommandPalette.tsx     # Ctrl+K search
│   ├── NotificationCenter.tsx # Bell dropdown
│   ├── EmailCompose.tsx       # Email modal
│   ├── layout/
│   │   ├── Sidebar.tsx        # Main navigation (11 items in 4 sections)
│   │   ├── MobileBottomNav.tsx
│   │   └── Logo.tsx           # SVG shield logo
│   └── ui/
│       ├── toast.tsx          # ToastProvider + useToast
│       ├── animated-counter.tsx
│       ├── breadcrumbs.tsx
│       ├── loading-skeleton.tsx
│       ├── empty-state.tsx
│       └── (shadcn components)
├── data/
│   └── mock-data.ts           # All mock data (brands, employees, clients, tasks, leads, etc.)
├── lib/
│   ├── db.ts                  # Prisma client with PrismaNeon adapter
│   ├── auth.ts                # Session auth (bcrypt, cookies, RBAC)
│   ├── audit.ts               # Audit log helper
│   ├── api.ts                 # API helpers (apiFetch, downloadCSV)
│   ├── use-data.ts            # BROKEN hook — do NOT use, rewrite it
│   └── i18n.ts                # EN + Urdu translations
└── prisma/
    ├── schema.prisma          # 13 models, 9 enums
    ├── prisma.config.ts       # Datasource URL config
    └── seed.ts                # Seed script (not usable via prisma, use scripts/setup-db.mjs)
```

---

## WHAT WORKS vs WHAT DOESN'T

| Component | Data Source | CRUD Works? | Issues |
|-----------|-----------|-------------|--------|
| Dashboard | Mock | No | Doesn't call /api/dashboard |
| Clients | DB + mock fallback | Add/Edit/Delete in session | Type casting hacks |
| Employees | DB + mock fallback | Hire/Edit/Remove in session | Type casting hacks |
| Tasks | DB + mock fallback | Create/Move/Delete in session | Type casting hacks |
| Pipeline | DB + mock fallback | Add/Move/Delete in session | getBrand() hack for mock data |
| Invoices | DB + mock fallback | Create/Mark Paid in session | Type casting hacks |
| Attendance | Mock only | View only | No check-in persistence |
| Payroll | Mock only | View only | Random data each load |
| Leaves | Mock only | Apply/Approve in session | No DB |
| Expenses | Mock only | Submit/Approve in session | No DB |
| Calendar | Mock only | View only | — |
| Reports | Mock only | PDF export works | — |
| Settings | Local state | Save in session | No DB persistence |
| AI Chat | Groq API | Works | — |
| Webhook | DB | Works perfectly | Tested, leads save to DB |
| Auth | DB + localStorage | Login works | Mixed real/demo |

---

## DESIGN ISSUES (user's feedback)
- "Generic, boring, basic, cliché"
- "No maza, pura structure layout hi nahi achi"
- "Apple/Microsoft level chahiye"
- Current theme: neon orange (#FF6B00) on dark (#09090B)
- Carbon fiber texture background
- Cards are plain boxes with white/10 borders
- Tables are basic — no sorting, no pagination
- No proper data visualization
- Sidebar is a flat list of links
- Mobile experience is basic

---

## COMPANY STRUCTURE
- FU Corp = Mother Company (hires all employees)
- VCS (Virtual Customer Solution) = Daughter company (orange)
- BSL (Backup Solutions LLC) = Daughter company (blue)
- DPL (Digital Point LLC) = Daughter company (green)

## WEBHOOK INTEGRATION
- DPL website (digitalpointllc.com) connected — 6 forms send to CRM webhook
- VCS and BSL not yet connected
- Webhook URL: https://fu-corp-crm.vercel.app/api/webhook/lead
- Auto lead scoring: budget + email type + company + service → 0-100 score → URGENT/HIGH/MEDIUM/LOW
- Google Sheets sync active (Apps Script web app)

---

## RULES FOR SESSION 2 — FOLLOW STRICTLY OR USER WILL CANCEL PLAN

### DO NOT:
- ❌ DO NOT create custom hooks for data fetching — they caused infinite loops last time. Use plain useEffect + useState
- ❌ DO NOT use "as unknown as" type casting — fix the actual types
- ❌ DO NOT add mockData as a dependency in useCallback or useEffect — this WILL cause infinite re-renders
- ❌ DO NOT deploy without testing EVERY page in browser first
- ❌ DO NOT rush — quality over quantity. 5 perfect pages > 19 broken pages
- ❌ DO NOT remove existing API routes or database connections
- ❌ DO NOT change .env.local or database credentials
- ❌ DO NOT use output: "export" in next.config — API routes need server
- ❌ DO NOT put objects/arrays in React hook dependency arrays — use refs or serialize to strings
- ❌ DO NOT skip error handling — every fetch needs try/catch with fallback

### DO:
- ✅ READ this entire file before writing ANY code
- ✅ Build and test after EVERY component change
- ✅ Use simple useEffect with cleanup (let mounted = true pattern)
- ✅ Keep mock data as fallback — if API fails, show mock, don't crash
- ✅ One page at a time — fix, test, verify, then next page
- ✅ Tell the user honestly if something will take time
- ✅ Make the UI genuinely premium — user is frustrated with generic design
- ✅ Check browser console for errors after each change
- ✅ Commit frequently with descriptive messages

### DEPLOYMENT RULE:
- **NEVER** trigger a production deploy unless actual source files have changed since the last deployment.
- Check `git diff HEAD~1 --stat` before deploying. If only config/lock files changed, skip the deploy.
- Avoid repeated force-redeploys from the same commit SHA — this wastes Vercel build minutes and pollutes deployment history.

### PREVIOUS BLUNDERS TO AVOID:
1. **useData hook infinite loop** — mockData in useCallback dependency caused infinite re-renders on ALL pages. Pages crashed with "This page couldn't load". Fix: use useRef for fallback data.
2. **Pipeline brand field** — mock leads don't have brand field, it's embedded in source string. Component crashed trying to access lead.brand.
3. **PipelineModule had leftover success() calls** after removing useToast import — caused build failure.
4. **next.config had output: "export"** — this disabled all API routes. Took time to debug.
5. **Prisma 7 broke db push** — TCP port 5432 blocked, had to use @neondatabase/serverless HTTP driver for schema creation instead.
6. **@prisma/client was in devDependencies** — caused build failures on Vercel.
7. **themeColor in metadata** — Next.js 16 requires it in separate viewport export, caused 13 build warnings.
8. **Light mode didn't work** — all components used hardcoded dark colors (bg-white/[0.03], text-white) instead of CSS variables.
</content>
