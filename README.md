# NoCapSpend 💰 — Financial Discipline & The Grind

A modern, character-driven personal finance and behavioral execution mobile application built with **React Native**, **Expo SDK 52**, and **Supabase**.

NoCapSpend merges strict financial budgeting with **The Grind** — an execution and habit engine powered by behavioral analytics, weekly lock-ins, and animated character reactions from a stylized cast.

---

## 🌟 Table of Contents
1. [Core Financial System](#-core-financial-system)
   - [Daily Spending Meter & Carryover Rule](#1-daily-spending-meter--carryover-balance)
   - [Character Reaction Engine](#2-character-reaction-engine-p0p7-resolver)
   - [Category Budgets & Rollover](#3-category-budgets--rollover-modes)
   - [Savings Goals & Isolation](#4-savings-goals--fund-reservation)
   - [Recurring Transactions](#5-recurring-transactions--automation)
   - [Statistics & Trends](#6-statistics--trends)
   - [Offline Storage & Auto-Sync](#7-offline-storage--auto-sync)
2. [The Grind — Behavioral Execution Suite](#-the-grind--behavioral-execution-suite)
   - [Daily Command Center](#1-daily-command-center)
   - [Goal Lifecycle Management](#2-goal-lifecycle-active-pause-complete-archive)
   - [Weekly Planning & The Lock-In Ritual](#3-weekly-planning--the-lock-in-ritual)
   - [Weekly Scoring & Grind Receipts](#4-weekly-scoring--weekly-grind-receipts)
   - [Character Court](#5-character-court)
   - [Behavioral Intelligence & Analytics](#6-behavioral-intelligence--analytics)
   - [30/90 Day Timeline & Trajectory](#7-3090-day-timeline--trajectory)
   - [Achievements & Personal Records](#8-achievements--personal-records)
   - [Notes & Note → Goal Conversion](#9-notes--note--goal-conversion)
3. [Tech Stack](#-tech-stack)
4. [Getting Started & Local Setup](#-getting-started--local-setup)
5. [Deployment (Cloudflare Pages)](#-deployment-cloudflare-pages)

---

## 💳 Core Financial System

### 1. Daily Spending Meter & Carryover Balance
- **Canonical Daily Limit**: Configure your daily budget limit (e.g., `15.00 DT`). Every day starts fresh against your configured daily budget.
- **Informational Carryover Indicator**: 
  - If you previously overspent, the meter displays **`{X} DT SHORT`** without reducing your daily budget.
  - If you underspent, the meter displays **`{X} DT SURPLUS`**.
  - If on schedule, displays **`ON TARGET`**.
- **Real-Time Meter States**:
  - `Normal` (0–79% spent): Green progress with Granddad Robert.
  - `Caution` (80–94% spent): Amber indicator showing remaining DT allowance.
  - `Critical` (95–99% spent): Orange alarm showing proximity to limit.
  - `Exceeded` (≥100% spent): Red emergency alert showing exact overspent amount in DT (e.g. `⛔ LIMIT EXCEEDED (+50.50 DT)`).
- **Daily Expense Lock**: An optional safety mode in Settings that prevents logging new expenses when today's limit is breached (Income logging remains open).

### 2. Character Reaction Engine (P0–P7 Resolver)
A real-time presentation engine triggers animated character dialogues and alerts based on financial actions:
- **Uncle Ruckus** (`ruckus_emergency`, `ruckus_alarm`): Triggers when budget is exceeded or at 95–100% critical threshold with frantic agitation.
- **Granddad Robert Freeman** (`robert_neutral`, `robert_guidance`, `robert_reassure`): Baseline host on Dashboard, guidance on streaks, and logout farewell.
- **Colonel Stinkmeaner** (`stink_stern`, `stink_explosive`): Roasts any single expense strictly greater than **25.00 DT**.
- **Riley Freeman** (`riley_light`, `riley_spend`): Reacts to small discretionary expenses (≤ 25.00 DT) and daily check-ins.
- **A Pimp Named Slickback** (`slickback_cash`, `slickback_bigcash`): Celebrates income additions (< 100 DT standard, ≥ 100 DT raining money).
- **Jazmine DuBois** (`jazmine_progress`, `jazmine_complete`): Hosts Savings Goals and celebrates when goal targets are 100% fulfilled.
- **Tom DuBois** (`tom_caution`, `tom_alarm`): Advises caution when approaching 80–94% budget threshold or monthly deficits.
- **Ed Wuncler III** (`ed_wealth`, `ed_surplus`): Unlocked when available savings exceed **500.00 DT** with zero budget warnings.
- **Huey Freeman** (`huey_neutral`, `huey_analyze`, `huey_review`): Hosts the Statistics & Analytics screen.

### 3. Category Budgets & Rollover Modes
- Create custom expense categories with dedicated icons and colors.
- Assign monthly budget limits per category with three rollover options:
  - **Reset**: Starts fresh each month.
  - **Rollover**: Positive/negative unused budget rolls into the next month's category balance.
  - **Save Diff**: Positive unspent difference is automatically reserved to total savings.

### 4. Savings Goals & Fund Reservation
- Create named savings goals with target amounts and target dates.
- Contributing to a goal automatically reserves funds from your **Available Balance**, preventing accidental spending while preserving accumulated net worth.
- Interactive detail screen supporting direct contributions, withdrawals, and completion milestones.

### 5. Recurring Transactions & Automation
- Set up recurring monthly bills, subscriptions, or salaries.
- Automatically generated on the first of each month when the app is launched.

### 6. Statistics & Trends
- **Savings Over Time**: Interactive charts showing cumulative net balance progression across months.
- **Category Breakdown**: Proportional donut/pie charts illustrating expense distribution.
- **Financial Health KPIs**: Monthly net flow, savings rate percentage, and top expense categories.

### 7. Offline Storage & Auto-Sync
- Complete offline capability via local persistent caching (`offlineStore.js`).
- Transactions created while offline are queued with optimistic UI updates and automatically synced to Supabase when internet connectivity is restored.

---

## ⚡ The Grind — Behavioral Execution Suite

**The Grind** is a dedicated discipline and personal execution framework built inside the app to track non-financial missions, habits, and long-term milestones.

### 1. Daily Command Center (`/grind`)
- **Daily Briefing**: Provides your streak counter, completion rate, daily execution status, and character reaction.
- **The One Thing**: Automatically identifies and elevates your single highest-priority mission for the day.
- **Daily Missions List**:
  - **1-Tap Quick Done**: Instantly complete daily check-ins.
  - **Numeric Progress**: Increment/decrement reps, pages, minutes, or counts.
  - **Checklists**: Toggle items on multi-step tasks.

### 2. Goal Lifecycle (Active, Pause, Complete, Archive)
- **Active**: Actively tracked in daily briefings and weekly lock-ins.
- **Pause with Reasons**: Temporarily pause goals (e.g., *Travel, Illness, Burnout, Priority Shift*). Paused goals do not count against weekly scores or trigger court cases.
- **Complete**: Mark one-time milestones as finished with celebration badges.
- **Archive & Restore**: Cleanly archive completed or retired goals while preserving historical records.

### 3. Weekly Planning & The Lock-In Ritual (`/grind/week`)
- **Intention Setting**: Select which goals you are committing to for the upcoming week.
- **Lock-In Mechanism**: Lock in your weekly commitment. Once locked in, goals are graded at the end of the week.
- **Renegotiation Window**: Gracefully adjust weekly commitments if priorities shift mid-week without penalty.

### 4. Weekly Scoring & Weekly Grind Receipts
- **Automated Sunday Scoring**:
  - **Elite Week** (90–100%): Gold badge & Jazmine celebration.
  - **Solid Week** (75–89%): Green badge & steady execution.
  - **Struggling** (1–49%): Amber alert & Stinkmeaner roast.
  - **Disaster** (0%): Red failure flag.
- **Grind Receipts**: Shareable, stylized summary receipts summarizing weekly mission execution, streaks, and reflections.

### 5. Character Court (`/grind/court`)
- If a committed goal is neglected or broken across multiple consecutive weeks, a **Court Case** is opened.
- **Colonel Stinkmeaner** and **Uncle Ruckus** preside over the court.
- Resolve cases by completing backlogged missions or accepting disciplinary renegotiation.

### 6. Behavioral Intelligence & Analytics (`/grind/insights`)
- Identifies personal execution patterns:
  - **Best Execution Day**: Determines which days of the week you perform best.
  - **Habit Clustering**: Shows which habits are frequently completed together.
  - **Completion Heatmaps**: Visualizes consistency over 30/90 day periods.

### 7. 30/90 Day Timeline & Trajectory (`/grind/timeline`)
- Long-term visual trajectory map displaying milestones, completed goals, streak records, and weekly grades.
- Shows trajectory status: `IMPROVING`, `STEADY`, or `DECLINING`.

### 8. Achievements & Personal Records
- Unlocks badges for milestones (e.g., *7-Day Streak, First Elite Week, 100 Missions Cleared*).
- Tracks all-time personal records for longest streaks and best monthly execution.

### 9. Notes & Note → Goal Conversion
- In-app scratchpad for quickly jotting down ideas, workout logs, or thoughts.
- **1-Tap Convert**: Turn any note directly into an active Grind Goal or Daily Mission.

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | [React Native](https://reactnative.dev/) (0.86) + [Expo](https://expo.dev/) (SDK 52) |
| **Routing** | [Expo Router v4](https://docs.expo.dev/router/introduction/) (File-based navigation) |
| **Backend & Auth** | [Supabase](https://supabase.com/) (PostgreSQL with Row Level Security) |
| **Local Persistence** | `@react-native-async-storage/async-storage` + Offline Sync Manager |
| **Animations** | React Native Animated API + `expo-image` WebP / PNG pipelines |
| **Typography** | Google Fonts: `Space Grotesk` & `Bebas Neue` |
| **Styling** | Custom Design Tokens (`theme.js`) with Dark Theme & Glassmorphism |

---

## 🚀 Getting Started & Local Setup

### 1. Clone the Repository
```bash
git clone https://github.com/rayenthabet-sys/NoCapSpend.git
cd NoCapSpend
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Set Up Environment Variables
Create a `.env` file in the project root:
```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 4. Start Development Server
```bash
npx expo start
```
- Press **`w`** to open in web browser.
- Press **`a`** for Android emulator or scan the QR code with **Expo Go**.

---

## 🌐 Deployment (Cloudflare Pages)

NoCapSpend is configured for seamless deployment to **Cloudflare Pages** for free global CDN hosting.

### 1. Build Web Bundle
```bash
npx expo export -p web
```

### 2. Configure SPA Redirects
Create `dist/_redirects` with:
```text
/*    /index.html   200
```

### 3. Deploy
- **Via Cloudflare Dashboard**: Connect your GitHub repo, set Build Command to `npx expo export -p web`, and Output Directory to `dist`.
- **Via Drag & Drop**: Upload the `dist/` directory directly in the Cloudflare Pages dashboard.

---

## 🔒 Security
- Row Level Security (RLS) is enforced across all Supabase tables (`expenses`, `income_entries`, `goals`, `categories`).
- Financial metrics are calculated authoritatively and isolated from presentation character logic.

---

## 📄 License
Licensed under the [MIT License](LICENSE).
