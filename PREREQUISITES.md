# FU Corp Elite CRM - Enterprise System

## Project Overview
World-class enterprise CRM for 3 companies (VCS, BSL, DPL) with elite mobile-first interface inspired by Airbnb/Spotify/Notion.

## Tech Stack
- **Frontend**: Next.js 16 + TypeScript + Tailwind CSS v4
- **Backend**: Next.js API Routes + Prisma ORM
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth with RBAC
- **State**: React Server Components + Actions

## Data Models

### User & Roles
```prisma
enum Role {
  SUPER_ADMIN      // Owner - Full access
  PROJECT_MANAGER // All clients, all projects
  DEPT_HEAD       // Department leads
  TEAM_LEAD       // Team leads
  EMPLOYEE        // Only assigned tasks
}
```

### Hierarchy Flow
```
SUPER_ADMIN (Owner)
    └── PROJECT_MANAGER
            └── DEPT_HEAD
                    └── TEAM_LEAD
                            └── EMPLOYEE
```

### Client Package Structure
```
Client
    └── Package (e.g., "Web Development Premium")
            ├── Task: Landing Page → Web Dev Employee
            ├── Task: SEO Setup → SEO Agent  
            ├── Task: Video Edit → Video Editor
            ├── Task: Logo Design → Designer
            └── Status: Pending/Complete per task
```

## Features

### 1. Authentication
- Email/Password login
- Role-based redirects
- Session management
- Password reset

### 2. Elite Mobile Interface
- Notion/Airbnb level design
- Bottom navigation for mobile
- Smooth animations
- Glass morphism cards
- Gradient accents
- Dark theme elite aesthetic

### 3. Role-Based Dashboards
| Role | Dashboard Shows |
|------|----------------|
| Super Admin | All KPIs, All Clients, All Tasks, User Management |
| PM | Assigned Projects, Team Progress, Pending Approvals |
| Dept Head | Department Stats, Team Tasks, Department Reports |
| Employee | My Tasks, My Clients, My Performance |

### 4. Project Management
- Client packages with multiple services
- Task assignment by department
- Status tracking per task
- Progress indicators
- Timeline view

### 5. Task Management
- Department-based filtering
- Employee assignment
- Status: TODO → IN_PROGRESS → REVIEW → COMPLETED
- Due dates
- Priority levels
- File attachments

## Implementation Order
1. Prisma Schema with RBAC
2. Supabase Auth setup
3. Login/Register pages (elite design)
4. Role-based layouts
5. Dashboard components
6. Project/Task CRUD
7. Mobile-optimized navigation
8. Deploy
