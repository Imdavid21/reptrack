# HEALTH/OS - Personal Health Operating System

> **Version:** 1.0.0 | **Platform:** Progressive Web App (PWA) + Capacitor Native  
> **Production:** https://reps-and-reminders.lovable.app

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Technology Stack](#technology-stack)
3. [Architecture](#architecture)
4. [Database Schema](#database-schema)
5. [Authentication Flow](#authentication-flow)
6. [User Flows](#user-flows)
7. [Core Hooks](#core-hooks)
8. [Components](#components)
9. [Edge Functions](#edge-functions)
10. [Design System](#design-system)
11. [API Reference](#api-reference)
12. [Development](#development)
13. [Deployment](#deployment)

---

## Project Overview

**HEALTH/OS** is a comprehensive personal health operating system that centralizes fitness tracking, nutrition logging, vitals monitoring, and workout planning into a single mobile-first PWA.

### Core Features
- **Workout Logging**: Set-by-set exercise tracking with progressive overload
- **Nutrition Tracking**: AI-powered food analysis from photos + manual calorie logging
- **Hydration**: Water intake tracking with Telegram reminder integration
- **Daily Check-ins**: Morning/night vitals logging (sleep, energy, weight, steps)
- **Analytics**: Strength progression, body composition, correlation insights
- **AI Workout Generation**: Personalized PPL routines based on goals
- **Personal Records**: Automatic PR detection across all exercises
- **MCP Server**: Model Context Protocol for AI assistant integration

---

## Technology Stack

### Frontend
| Technology | Version | Purpose |
|------------|---------|---------|
| **React** | ^18.3.1 | UI library |
| **TypeScript** | ^5.x | Type safety |
| **Vite** | ^5.x | Build tool & dev server |
| **Material UI (MUI)** | ^7.3.7 | UI component framework |
| **Tailwind CSS** | ^3.x | Utility CSS |
| **Framer Motion** | ^12.29.2 | Animations |
| **React Router** | ^6.30.1 | Client-side routing |
| **TanStack React Query** | ^5.83.0 | Server state management |
| **Recharts** | ^2.15.4 | Data visualization |

### Backend (Lovable Cloud / Supabase)
| Technology | Purpose |
|------------|---------|
| **Supabase Auth** | Email/password authentication |
| **Supabase Database** | PostgreSQL with RLS policies |
| **Supabase Storage** | Meal photo uploads |
| **Edge Functions (Deno)** | AI integration, notifications, API |

### Native (Capacitor)
| Package | Version | Purpose |
|---------|---------|---------|
| **@capacitor/core** | ^8.0.1 | Native bridge |
| **@capacitor/ios** | ^8.0.1 | iOS platform |
| **@capacitor/android** | ^8.0.1 | Android platform |
| **@perfood/capacitor-healthkit** | ^1.3.2 | HealthKit integration |

### Key Dependencies
```json
{
  "@emotion/react": "^11.14.0",
  "@emotion/styled": "^11.14.1",
  "@supabase/supabase-js": "^2.90.0",
  "date-fns": "^3.6.0",
  "lucide-react": "^0.462.0",
  "sonner": "^1.7.4",
  "zod": "^3.25.76",
  "react-hook-form": "^7.61.1",
  "vaul": "^0.9.9"
}
```

---

## Architecture

### Directory Structure
```
src/
├── App.tsx                    # Root component with providers
├── main.tsx                   # Entry point
├── index.css                  # Global styles & CSS variables
│
├── pages/                     # Route components
│   ├── Index.tsx              # Auth gate + onboarding + dashboard
│   ├── Dashboard.tsx          # Main dashboard view
│   ├── LogWorkout.tsx         # Workout logging wizard
│   ├── CreateRoutine.tsx      # AI routine generator
│   ├── Insights.tsx           # Analytics & charts
│   ├── History.tsx            # Workout history list
│   ├── WorkoutDetail.tsx      # Single workout view
│   ├── Settings.tsx           # User preferences
│   └── NotFound.tsx           # 404 page
│
├── components/
│   ├── auth/                  # Auth forms
│   ├── dashboard/             # Dashboard widgets
│   ├── health/                # Check-in cards, nutrition
│   ├── analytics/             # Charts & insights
│   ├── workout/               # Exercise logging components
│   ├── onboarding/            # Onboarding flow
│   ├── layout/                # Header, BottomNav, MainLayout
│   ├── settings/              # Settings sections
│   └── ui/                    # shadcn/ui primitives
│
├── hooks/                     # Custom React hooks
├── contexts/                  # React contexts (Theme, DateRange)
├── integrations/supabase/     # Auto-generated Supabase types
├── lib/                       # Utilities (exercise library, haptics)
└── theme/                     # MUI theme configuration

supabase/
├── config.toml                # Supabase configuration
└── functions/                 # Edge functions (Deno)
    ├── analyze-food/          # AI food image analysis
    ├── generate-workout/      # AI workout generation
    ├── parse-food-text/       # Natural language food parsing
    ├── api-key/               # User API key management
    ├── api/                   # Public REST API
    ├── mcp/                   # Model Context Protocol server
    ├── send-auth-email/       # Custom auth emails via Resend
    └── telegram-water-reminder/ # Telegram bot integration
```

### High-Level System Architecture

```mermaid
flowchart TB
    subgraph Client["Frontend (React PWA)"]
        UI[UI Components]
        Hooks[Custom Hooks]
        RQ[React Query Cache]
        LS[localStorage]
    end

    subgraph Backend["Lovable Cloud (Supabase)"]
        Auth[Supabase Auth]
        DB[(PostgreSQL + RLS)]
        Storage[Storage Buckets]
        Edge[Edge Functions]
    end

    subgraph External["External Services"]
        AI[Lovable AI Gateway]
        TG[Telegram Bot API]
        RS[Resend Email]
    end

    UI --> Hooks
    Hooks --> RQ
    Hooks --> LS
    RQ <--> Auth
    RQ <--> DB
    RQ <--> Storage
    RQ <--> Edge
    Edge --> AI
    Edge --> TG
    Edge --> RS
```

### Data Flow: Workout Logging

```mermaid
sequenceDiagram
    participant U as User
    participant UI as LogWorkout.tsx
    participant Draft as useDraftWorkout
    participant LS as localStorage
    participant WH as useWorkouts
    participant RQ as React Query
    participant DB as Supabase DB

    U->>UI: Select workout day
    UI->>Draft: saveDraft(exercises)
    Draft->>LS: Store in-progress
    
    loop For each set
        U->>UI: Log weight/reps
        UI->>Draft: Update draft
        Draft->>LS: Persist changes
    end

    U->>UI: Complete workout
    UI->>WH: createWorkout(data)
    WH->>DB: INSERT workouts
    WH->>DB: INSERT exercise_sets
    WH->>DB: INSERT habits
    DB-->>RQ: Success
    RQ->>RQ: Invalidate queries
    WH->>Draft: clearDraft()
    Draft->>LS: Remove draft
```

### Data Flow: AI Food Analysis

```mermaid
sequenceDiagram
    participant U as User
    participant UI as CalorieTracker
    participant SB as Supabase Storage
    participant EF as analyze-food Function
    participant AI as Gemini 2.5 Flash
    participant DB as Supabase DB

    U->>UI: Take food photo
    UI->>SB: Upload image
    SB-->>UI: Public URL
    UI->>EF: invoke(imageUrl)
    EF->>AI: Analyze image
    AI-->>EF: {foods, calories, confidence}
    EF-->>UI: Analysis result
    U->>UI: Confirm/adjust
    UI->>DB: INSERT meals
```

### Component-Hook-Database Relationships

```mermaid
flowchart LR
    subgraph Pages
        D[Dashboard]
        L[LogWorkout]
        I[Insights]
        H[History]
    end

    subgraph Hooks
        uW[useWorkouts]
        uDM[useDailyMetrics]
        uM[useMeals]
        uWL[useWaterLogs]
        uPR[usePersonalRecords]
        uHA[useHealthAnalytics]
    end

    subgraph Tables
        workouts[(workouts)]
        exercise_sets[(exercise_sets)]
        daily_metrics[(daily_metrics)]
        meals[(meals)]
        water_logs[(water_logs)]
    end

    D --> uHA --> workouts
    D --> uDM --> daily_metrics
    D --> uWL --> water_logs
    D --> uPR --> exercise_sets

    L --> uW --> workouts
    L --> uW --> exercise_sets

    I --> uHA --> workouts
    I --> uDM --> daily_metrics
    I --> uM --> meals

    H --> uW --> workouts
```

### Authentication & Authorization Flow

```mermaid
flowchart TD
    Start([App Launch]) --> Check{Session exists?}
    Check -->|No| Auth[AuthForm]
    Check -->|Yes| Prefs{Preferences exist?}
    
    Auth -->|Sign Up| Create[Create Account]
    Auth -->|Sign In| Login[Authenticate]
    Create --> AutoConfirm[Auto-confirm Email]
    AutoConfirm --> Prefs
    Login --> Prefs

    Prefs -->|No/Not Complete| Onboard[OnboardingFlow]
    Prefs -->|Yes| Dashboard[Dashboard]
    Onboard --> SavePrefs[Save Preferences]
    SavePrefs --> Dashboard

    subgraph RLS["Row Level Security"]
        Dashboard -->|All Queries| RLSCheck{auth.uid() = user_id?}
        RLSCheck -->|Yes| Data[(User's Data)]
        RLSCheck -->|No| Denied[Access Denied]
    end
```

### Edge Function Architecture

```mermaid
flowchart TB
    subgraph Client
        App[React App]
    end

    subgraph EdgeFunctions["Edge Functions (Deno)"]
        AF[analyze-food]
        GW[generate-workout]
        PF[parse-food-text]
        AK[api-key]
        API[api]
        MCP[mcp]
        SAE[send-auth-email]
        TWR[telegram-water-reminder]
    end

    subgraph Services
        LAI[Lovable AI Gateway]
        TG[Telegram API]
        RE[Resend API]
    end

    App --> AF
    App --> GW
    App --> PF
    App --> AK
    
    AF --> LAI
    GW --> LAI
    PF --> LAI
    
    SAE --> RE
    TWR --> TG

    API --> DB[(Database)]
    MCP --> DB
```

---

## Database Schema

### Tables Overview

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `profiles` | User profile data | id, email |
| `user_preferences` | Onboarding & goals | water_goal, calorie_goal, sleep_goal |
| `workouts` | Workout sessions | date, day, day_name, duration, checkin scores |
| `exercises` | Legacy exercise records | name, category, weight, reps |
| `exercise_sets` | Normalized set data | exercise_name, set_number, weight, reps |
| `exercise_templates` | User custom exercises | name, muscles, equipment |
| `habits` | Workout-linked habits | pullups, water, sleep, supplements |
| `daily_metrics` | Daily health data | sleep, energy, bodyweight, supplements |
| `morning_checkins` | AM vitals | sleep_time, wake_time, energy, heart_rate |
| `night_checkins` | PM vitals | performance, steps, is_rest_day |
| `meals` | Food logs | calories, protein, carbs, fat, photo_url |
| `calorie_burns` | Exercise calories | source, calories, duration |
| `water_logs` | Hydration tracking | amount, timestamp, method |
| `blood_pressure_readings` | BP vitals | systolic, diastolic, pulse |
| `blood_sugar_readings` | Glucose vitals | glucose_level, reading_type |
| `custom_routines` | AI-generated routines | routine_name, routine_data (JSON) |
| `recovery_metrics` | Recovery tracking | hrv, sleep_quality, fatigue |
| `deload_weeks` | Deload scheduling | week_start, week_end, reduction % |
| `api_keys` | User API keys | api_key, last_used_at |
| `water_reminder_configs` | Telegram reminders | telegram_username, frequency |

### Row-Level Security (RLS)

All tables use RLS with policies following this pattern:
```sql
CREATE POLICY "Users can view own [table]"
ON public.[table]
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own [table]"
ON public.[table]
FOR INSERT
WITH CHECK (auth.uid() = user_id);
```

### Key Relationships
```
workouts (1) ──────┬──── (N) exercises
                   ├──── (N) exercise_sets
                   └──── (1) habits

user (1) ──────────┬──── (N) workouts
                   ├──── (N) daily_metrics
                   ├──── (N) meals
                   ├──── (N) water_logs
                   ├──── (N) morning_checkins
                   ├──── (N) night_checkins
                   ├──── (1) user_preferences
                   └──── (1) profiles
```

---

## Authentication Flow

### Implementation: `src/hooks/useAuth.ts`

```typescript
interface AuthAPI {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp(email: string, password: string): Promise<AuthResponse>;
  signIn(email: string, password: string): Promise<AuthResponse>;
  signOut(): Promise<void>;
  resetPassword(email: string): Promise<void>;
}
```

### Flow Sequence
```
App Launch → Check Session → No Auth → AuthForm → Sign Up/In → Check Preferences
                          ↓
                       Has Auth → Check Preferences → Onboarding (if needed) → Dashboard
```

- Email confirmation: **Auto-confirmed** (no email verification)
- Password reset: Uses Supabase + Resend fallback

---

## User Flows

### 1. New User Onboarding
```
Step 1: Goal Selection (Lose Weight / Maintain / Build Muscle)
Step 2: Hydration Goal (1L - 5L slider)
Step 3: Training & Nutrition (workouts/week, daily calories)
Step 4: Recovery (sleep goal hours)
→ Save to user_preferences → Redirect to Dashboard
```

### 2. Workout Logging Flow
```
Select Day (Push A, Pull A, etc.)
  → Exercise List (pre-populated from routine)
    → For each exercise/set: Enter weight + reps, mark complete
      → Post-Workout Check-in (difficulty, satisfaction, duration)
        → Save to DB (workouts, exercise_sets, habits)
```

### 3. Meal Logging Flow
```
Photo Method: Take photo → Upload → AI analyze → Confirm/adjust → Save
Text Method: Enter text ("2 tacos") → AI parse → Save
Manual Method: Enter food name + macros → Save
```

### 4. Daily Check-in Flow
```
Morning (before 12 PM): Sleep time, wake time, energy, weight, heart rate
Night (after 6 PM): Performance, energy, steps, is rest day
```

---

## Core Hooks

### Authentication & User
| Hook | Purpose |
|------|---------|
| `useAuth` | Auth state, signIn/signUp/signOut |
| `useUserPreferences` | Goals, onboarding status |

### Workout Data
| Hook | Purpose |
|------|---------|
| `useWorkouts` | CRUD workouts, list history |
| `useExerciseSets` | Query normalized set data |
| `useDraftWorkout` | localStorage persistence for in-progress |
| `useLastUsedWeights` | Pre-fill weights from last session |
| `usePersonalRecords` | Calculate and track PRs |
| `useWorkoutDetails` | Single workout with exercises |

### Health Data
| Hook | Purpose |
|------|---------|
| `useDailyMetrics` | Daily health data (sleep, weight, etc.) |
| `useMorningCheckin` | AM check-in CRUD |
| `useNightCheckin` | PM check-in CRUD |
| `useMeals` | Meal/nutrition CRUD |
| `useCalorieBurn` | Calorie expenditure tracking |
| `useWaterLogs` | Water intake tracking |
| `useHydrationData` | Aggregated hydration analytics |

### Analytics
| Hook | Purpose |
|------|---------|
| `useHealthAnalytics` | Dashboard stats (streaks, PRs) |
| `useHealthInsights` | AI-generated health insights |
| `useCorrelationAnalysis` | Sleep/energy correlations |
| `useVolumeData` | Volume trends over time |
| `useBodyPartsProgress` | Muscle group progression |
| `useMLInsights` | Machine learning predictions |

### Utilities
| Hook | Purpose |
|------|---------|
| `useTheme` | Dark/light mode toggle |
| `useTimezone` | User timezone handling |
| `useAutoMetrics` | Auto-calculate workout duration |
| `useDataExport` | Export data as JSON/CSV |

---

## Components

### Dashboard Widgets
| Component | Purpose |
|-----------|---------|
| `ProgressHeader` | Weekly progress ring + streak |
| `QuickActionsBar` | Quick log buttons |
| `TodayStats` | Horizontal scroll stats |
| `DailyRitualCard` | Time-aware check-in prompt |
| `WaterTracker` | Hydration progress + log |
| `CalorieTrackerCompact` | Calorie in/out summary |
| `PersonalRecords` | Latest PRs list |
| `RecentActivity` | Last 5 workouts |
| `Heatmap` | Workout frequency calendar |

### Analytics Charts
| Component | Purpose |
|-----------|---------|
| `StrengthOverviewChart` | Muscle group sparkline grid |
| `BodyweightChart` | Weight trend line |
| `SleepEnergyChart` | Sleep + energy correlation |
| `HydrationChart` | Water intake bar chart |
| `VolumeSankeyChart` | Volume flow diagram |
| `SupplementAdherence` | Supplement consistency |
| `EfficiencyChart` | Workout efficiency metrics |
| `MLCoachInsights` | AI recommendations |

### Workout Components
| Component | Purpose |
|-----------|---------|
| `DaySelector` | Workout day picker |
| `ExerciseList` | Exercise grid with sets |
| `SetBySetCard` | Individual exercise logging |
| `SingleExerciseCard` | Quick single-exercise mode |
| `ExercisePicker` | Add exercise modal |
| `PostWorkoutCheckin` | Post-workout survey |

### Layout
| Component | Purpose |
|-----------|---------|
| `MainLayout` | App shell with header + nav |
| `BottomNav` | Fixed bottom navigation |
| `Header` | Page header with actions |
| `AnimatedPage` | Page transition wrapper |

---

## Edge Functions

### `analyze-food`
**Purpose**: AI-powered food image analysis  
**Model**: `google/gemini-2.5-flash`  
**Input**: `{ imageUrl: string }`  
**Output**:
```json
{
  "foods": [{ "name": "...", "portion": "...", "calories": 300 }],
  "total_calories": 650,
  "confidence": 0.85
}
```

### `generate-workout`
**Purpose**: AI workout routine generation  
**Model**: `google/gemini-2.5-flash`  
**Input**: `{ goals: string }`  
**Output**: 6-day PPL routine with exercises, sets, target weights

### `parse-food-text`
**Purpose**: Natural language food parsing  
**Input**: `{ text: "2 tacos and a coke" }`  
**Output**: Parsed food items with estimated calories

### `api-key`
**Purpose**: User API key management  
**Methods**: GET (retrieve), POST (regenerate)  
**Format**: `ftrk_[32 alphanumeric chars]`

### `api`
**Purpose**: Read-only REST API for external access  
**Endpoints**: `/api/workouts`, `/api/meals`, `/api/metrics`  
**Auth**: API key via `x-api-key` header

### `mcp`
**Purpose**: Model Context Protocol server for AI assistants  
**Protocol**: JSON-RPC 2.0 with SSE transport  
**Tools**: 9 tools including `get_today_summary`, `get_workouts`, `get_personal_records`

### `telegram-water-reminder`
**Purpose**: Send water reminders via Telegram bot  
**Required Secret**: `TELEGRAM_BOT_TOKEN`

### `send-auth-email`
**Purpose**: Custom auth emails via Resend  
**Required Secret**: `RESEND_API_KEY`

---

## API Reference

### Base URL
```
https://kfifgbqkykyvnrirxwze.supabase.co/functions/v1
```

### Authentication
```bash
# API Key header
curl -H "x-api-key: ftrk_your_api_key" \
  https://kfifgbqkykyvnrirxwze.supabase.co/functions/v1/api/workouts

# Bearer token
curl -H "Authorization: Bearer ftrk_your_api_key" \
  https://kfifgbqkykyvnrirxwze.supabase.co/functions/v1/api/workouts
```

### REST API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/workouts` | GET | List recent workouts |
| `/api/workouts/:id` | GET | Get single workout with exercises |
| `/api/meals` | GET | List meals for date range |
| `/api/metrics` | GET | Get daily metrics |

### MCP Server Tools

| Tool | Description |
|------|-------------|
| `get_today_summary` | Today's health summary |
| `get_workouts` | Recent workout history |
| `get_personal_records` | PRs across all exercises |
| `get_weekly_stats` | Current week statistics |
| `get_daily_metrics` | Metrics for specific date |
| `get_meals` | Meals for date range |
| `get_water_logs` | Water intake logs |
| `get_performance_insights` | AI-generated insights |
| `get_body_metrics` | Body composition data |

### Rate Limits

| Function | Limit |
|----------|-------|
| analyze-food | 10/min |
| generate-workout | 5/min |
| parse-food-text | 20/min |
| api | 100/min |
| mcp | 60/min |

---

## Design System

### Color Tokens (index.css)
```css
:root {
  --background: 0 0% 100%;
  --foreground: 0 0% 3.9%;
  --primary: 0 0% 9%;
  --secondary: 0 0% 96.1%;
  --muted: 0 0% 96.1%;
  --destructive: 0 84.2% 60.2%;
}

.dark {
  --background: 0 0% 3.9%;
  --foreground: 0 0% 98%;
}
```

### MUI Theme (`src/theme/muiTheme.ts`)
```typescript
const lightTheme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#171717' },
    background: { default: '#ffffff', paper: '#ffffff' },
  },
  shape: { borderRadius: 16 },
});
```

### Animation Presets
```typescript
const staggerContainer = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

const staggerItem = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
};
```

---

## Development

### Prerequisites
- Node.js & npm ([install with nvm](https://github.com/nvm-sh/nvm))

### Local Setup
```bash
# Clone repository
git clone <YOUR_GIT_URL>
cd <YOUR_PROJECT_NAME>

# Install dependencies
npm install

# Start development server
npm run dev
```

### Environment Variables
```env
VITE_SUPABASE_URL=https://[project-id].supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=[anon-key]
VITE_SUPABASE_PROJECT_ID=[project-id]
```

### Required Secrets (Edge Functions)
| Secret | Purpose |
|--------|---------|
| `LOVABLE_API_KEY` | Lovable AI gateway access |
| `TELEGRAM_BOT_TOKEN` | Water reminder Telegram bot |
| `RESEND_API_KEY` | Custom auth emails |

---

## Deployment

### Lovable
Simply open [Lovable](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and click **Share → Publish**.

### Capacitor Native
```bash
# iOS
npx cap sync ios
npx cap open ios

# Android  
npx cap sync android
npx cap open android
```

### Custom Domain
Navigate to **Project > Settings > Domains** and click **Connect Domain**.

---

## Missing / Future Enhancements

### Not Yet Implemented
1. **HealthKit Integration**: Capacitor plugin installed but not integrated
2. **Offline Support**: No service worker / offline data sync
3. **Push Notifications**: Only Telegram reminders exist
4. **Social Features**: No sharing or community features

### Recommended Additions
1. **Real-time Sync**: Supabase realtime for multi-device
2. **Data Migration**: Import from other fitness apps
3. **Wearable Sync**: Apple Watch / Fitbit integration
4. **Export Reports**: PDF progress reports

---

*Documentation generated: January 2026*
