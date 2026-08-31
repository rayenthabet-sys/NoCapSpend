# NoCapSpend 💰

A modern, character-driven personal finance and budget planning mobile application built with **React Native**, **Expo SDK 52**, and **Supabase**.

NoCapSpend turns daily financial tracking into an engaging, disciplined habit using real-time character reactions, daily spending limits with automated locks, category budget management, dedicated savings goals, and visual trend analytics.

---

## ✨ Key Features

### 🎭 Character-Driven UX Engine (P0–P7 Resolver)
An intelligent presentation engine evaluates your financial health in real time, triggering animated reactions from a stylized character cast:
- **Robert Freeman (Host / Baseline)**: Keeps you grounded with steady financial guidance.
- **Uncle Ruckus (Emergency & Alarm)**: Alerts you loudly when budgets exceed 95% or breach 100%.
- **Stinkmeaner (High-Spends)**: Roasts any expense strictly greater than **25 DT**.
- **Riley Freeman (Light Spends)**: Reacts to everyday discretionary purchases (≤ 25 DT).
- **A Pimp Named Slickback (Income Recorded)**: Celebrates new cash flow and big earnings.
- **Jazmine Dubois (Savings Goals)**: Cheers you on as you reach savings goal milestones.
- **Tom Dubois (Caution Warning)**: Warns you as monthly or daily spending reaches 80%–94%.
- **Ed Wuncler III (Wealth State)**: Unlocked when accumulated available balance is high.
- **Huey Freeman (Analytics)**: Hosts the analytics and trends dashboard.

---

### 📊 Daily Spending Meter & Expense Lock
- **Visual Daily Progress**: Tracks today's spending vs. your daily budget with color-coded states (Normal, Caution 80%, Critical 95%, Exceeded 100%).
- **Automated Midnight Reset**: Date-based queries automatically refresh daily totals at midnight without deleting transaction history.
- **Daily Expense Lock**: Optional safety setting that blocks new expenses once today's spending limit is reached. Income logging remains unrestricted.

---

### 🎯 Savings Goals
- Create targeted goals with deadlines.
- Funds contributed to goals are locked from your **Available Balance** to prevent accidental overspending.
- Interactive detail view with progress indicators, contribution, and withdrawal options.

---

### 📁 Category Budgets & Rollover
- Custom expense categories (Food, Transportation, Studio, Utilities, etc.).
- Set monthly budget limits per category with customizable rollover modes:
  - **Reset**: Starts fresh each month.
  - **Rollover**: Unspent budget rolls over to the next month.
  - **Save Diff**: Unspent difference automatically reserves to total savings.

---

### 📈 Analytics & Trends
- **Savings Over Time**: Interactive line chart showing cumulative savings trends across months.
- **Category Breakdown**: Dynamic pie chart displaying where funds were spent.
- **Key Metrics**: Savings rate, highest expenditure sector, and monthly net flow.

---

### 🔄 Recurring Transactions & Automation
- Monthly recurring income and expenses auto-generate on the first of each month upon app launch.

---

## 🛠️ Tech Stack

- **Framework**: [React Native](https://reactnative.dev/) (0.86) with [Expo](https://expo.dev/) (SDK 52) & [Expo Router v4](https://docs.expo.dev/router/introduction/)
- **Backend & Database**: [Supabase](https://supabase.com/) (PostgreSQL with Row Level Security & Auth)
- **Local Storage**: `@react-native-async-storage/async-storage` for device-local settings
- **Charts & Visualization**: `react-native-chart-kit` and `react-native-svg`
- **Compiler & Runtime**: React Compiler enabled with Hermes engine
- **Typography & Theme**: Google Fonts (`Space Grotesk` & `Bebas Neue`) in sleek dark-mode palette

---

## 🚀 Getting Started

### 1. Clone the Repository
```bash
git clone https://github.com/rayenthabet004-spec/NoCapSpend.git
cd NoCapSpend
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment Variables
Create a `.env` file in the project root:
```env
EXPO_PUBLIC_SUPABASE_URL=your_supabase_project_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 4. Start the Development Server
```bash
npx expo start
```
- Press `w` to open in web browser.
- Press `a` for Android emulator or scan QR code with Expo Go.

---

## 📦 Building for Production

### Android Standalone APK (Preview / Testing)
```bash
npx eas-cli build -p android --profile preview
```

### Android App Bundle (Google Play Store)
```bash
npx eas-cli build -p android --profile production
```

---

## 📄 License
This project is for personal / portfolio use. All rights reserved.
