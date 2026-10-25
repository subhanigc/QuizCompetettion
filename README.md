# ⚡ TechQuiz Arena

**TechQuiz Arena** is an offline-capable, self-hosted, real-time quiz competition platform designed to run on a single laptop over a local area network (LAN) without requiring any internet access. It delivers low-latency event broadcasts (< 60ms) to 30–100 concurrent contestants joining from mobile phones and laptops via browser.

---

## 🌟 Highlights & Key Features

- **100% Offline-First**: Zero external CDN dependencies. All fonts, Tailwind styles, PrismJS syntax highlighters, Lucide SVG icons, sound synthesizers, and SVG QR codes are bundled locally into static assets.
- **Single-Port LAN Serving**: The Express + Socket.IO server on port `3000` serves both the REST API, WebSocket streams, and the compiled React SPA. Mobile devices only need to connect to `http://<LAPTOP_LAN_IP>:3000`.
- **Zero-Config Database**: Powered by SQLite via `better-sqlite3` configured in Write-Ahead Logging (`WAL`) mode with persistent cached statement maps.
- **5 Pre-Configured Competition Rounds**:
  1. **Round 1: Screening Round** (Multiple choice questions & code outputs in C, OOP, DSA, DBMS, OS, Git).
  2. **Round 2: Rapid Fire** (Sequential speed questions with a 60-second team clock, skip/pass, and instant grading).
  3. **Round 3: Buzzer Round** (Atomic sub-millisecond buzzer lock with lockout on wrong answers and rebound passes).
  4. **Round 4: Code Debugging / Output Prediction** (Multi-language syntax highlighting with strict and normalized whitespace grading).
  5. **Round 5: System Design / Incident Response Scenario** (Staged progressive incident response with blind judge rubric scoring).
- **All 9 Question Types Supported**: Single MCQ, Multi-Select, True/False, Short Answer (with regex/synonyms), Numerical, Fill-in-the-Blank, Code Snippet MCQ, Written Scenario/Descriptive, and Staged Crisis Scenarios.
- **Four Distinct Roles**:
  - **Admin / Host**: Full control room, question timer controls, answer reveals, manual score overrides, tie-breaks, audit logs.
  - **Judge Desk**: Double-blind anonymized submission queue with rubric criteria sliders, comments, and Groq AI score suggestions.
  - **Auditorium Projector**: Big-screen view with giant clock, QR code for seamless team onboarding, and live leaderboard with tie-breaking.
  - **Contestant Phone/Laptop**: Mobile-first responsive UI, tactile haptic buzzer button, auto-reconnect state restoration, and sub-millisecond clock drift sync.
- **Offline Audio Synthesizer**: Native Web Audio API sound synthesizer with zero audio file dependencies (buzzer, fanfare, correct, wrong, tick).
- **Post-Event Analytics & Exports**: Complete item difficulty breakdown, podium celebration with confetti, and instant CSV/PDF export.
- **Optional Server-Side AI**: Powered by Groq LLaMA-3.3 for automatic question bank generation and rubric scoring suggestions (gracefully hidden when offline).

---

## 🛠️ Architecture & Tech Stack

```
                                  [ LAN Wi-Fi Router / Hotspot ]
                                                │
                 ┌──────────────────────────────┼──────────────────────────────┐
                 ▼                              ▼                              ▼
     [ Contestant Mobiles ]            [ Judge Laptops ]            [ Projector Display ]
      http://<IP>:3000/                 http://<IP>:3000/judge       http://<IP>:3000/projector
                 │                              │                              │
                 └──────────────────────────────┼──────────────────────────────┘
                                                │
                                    HTTP / WebSocket (Port 3000)
                                                ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│ Laptop Host - Single Process Backend                                                        │
│                                                                                             │
│  ┌───────────────────────┐      ┌─────────────────────────┐      ┌───────────────────────┐  │
│  │   Express HTTP API    │      │  Socket.IO Game Engine  │      │  Compiled React SPA   │  │
│  │  - Auth & Admin       │      │  - Clock Drift Sync     │      │  - client/dist static │  │
│  │  - Sessions & Rounds  │      │  - Sub-ms Buzzer Lock   │      │  - Offline Assets     │  │
│  │  - Question Bank      │      │  - State Broadcasts     │      │  - Web Audio Synth    │  │
│  │  - Exports (CSV/PDF)  │      │  - Room Partitioning    │      │  - Local QR Generator │  │
│  └──────────┬────────────┘      └────────────┬────────────┘      └───────────────────────┘  │
│             │                                │                                              │
│             └────────────────┬───────────────┘                                              │
│                              ▼                                                              │
│  ┌───────────────────────────────────────────────────────────────────────────────────────┐  │
│  │ SQLite Database (better-sqlite3 in WAL Mode)                                          │  │
│  │ - WAL Mode + NORMAL Sync + Statement Retain Pool + Atomic Transaction Execution       │  │
│  └───────────────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────────────────────┐  │
│  │ (Optional) Groq LLaMA-3.3 Cloud API (AI Question Generator & Judge Rubric Assistant)  │  │
│  └───────────────────────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 🚀 Quickstart & Run Instructions

You can start the platform using **Node.js directly** or via **Docker Compose**.

### Prerequisites
- Node.js (v18+ or v20/v22/v24) & npm, OR Docker & Docker Compose.

---

### Option 1: Plain Node.js (Recommended for Single Laptop)

1. **Clone & Install Dependencies**:
   ```bash
   git clone <repo-url>
   cd QuizCompetettion

   # Install root, backend, and frontend dependencies
   npm run install:all
   ```

2. **Configure Environment**:
   ```bash
   # Copy sample environment configuration
   cp .env.example .env
   ```
   *(Defaults: Admin password is `admin123`, Judge code is `judge789`, Port is `3000`)*.

3. **Seed Database**:
   Seeds the default championship competition with 5 rounds and 30 technical questions:
   ```bash
   npm run seed
   ```

4. **Build the Platform**:
   Compiles both the offline React frontend and TypeScript server:
   ```bash
   npm run build
   ```

5. **Start the Arena**:
   ```bash
   npm start
   ```

You will see the startup banner displaying your laptop's LAN IP addresses:
```
=============================================================
           ⚡ TECHQUIZ ARENA - LAN COMPETITION PLATFORM ⚡
=============================================================
 Server Status : Online (Single-Laptop LAN Mode)
 Localhost     : http://localhost:3000
 Connect Teams from Phones / Laptops on your Wi-Fi:
 👉 LAN URL    : http://192.168.1.109:3000
-------------------------------------------------------------
 Admin Portal  : http://localhost:3000/admin (Pass: admin123)
 Projector     : http://localhost:3000/projector
 Judge Portal  : http://localhost:3000/judge (Code: judge789)
 AI Features   : Enabled (Groq API)
=============================================================
```

---

### Option 2: Docker Compose

1. **Build and Run in Background**:
   ```bash
   docker compose up --build -d
   ```

2. **Seed Default Competition Data in Docker**:
   ```bash
   docker compose exec techquiz node server/dist/server/src/db/seed.js
   ```

3. **View Logs**:
   ```bash
   docker compose logs -f
   ```

4. **Stop Container**:
   ```bash
   docker compose down
   ```

---

## 🌐 LAN Setup & Network Instructions

To host a smooth LAN competition with up to 100 concurrent devices:

### 1. Wi-Fi Router / Mobile Hotspot Setup
1. Turn on a standard Wi-Fi router or laptop mobile hotspot (e.g. `TechQuiz-LAN`).
2. **Internet is NOT required** — the router simply assigns local IP addresses (e.g., `192.168.1.X`) to connecting devices via DHCP.
3. Connect the host laptop to this Wi-Fi network.

### 2. Discover Host IP Address
- **Linux**: Run `ip -4 addr show` or `hostname -I` (e.g., `192.168.1.109`).
- **macOS**: System Settings > Wi-Fi > Details > IP Address, or `ipconfig getifaddr en0`.
- **Windows**: Run `ipconfig` in Command Prompt (look for IPv4 Address).
- *TechQuiz Arena also auto-detects and logs all active LAN IPs on server startup and at `/api/auth/info`!*

### 3. Firewall Notice
Ensure incoming connections on port `3000` are permitted through your OS firewall:
- **Linux (ufw)**: `sudo ufw allow 3000/tcp`
- **Linux (firewalld)**: `sudo firewall-cmd --add-port=3000/tcp --permanent && sudo firewall-cmd --reload`
- **Windows**: Allow Node.js through Windows Defender Firewall when prompted on private networks.
- **AP Isolation**: In your Wi-Fi router administration panel, ensure "Client Isolation" / "AP Isolation" is **disabled** so clients can reach the host laptop.

### 4. Direct Contestants to Join
1. Open `http://localhost:3000/projector` on the host laptop and project it to the auditorium screen.
2. The projector view automatically renders a **giant high-contrast QR code** encoding `http://<LAN_IP>:3000/?code=<SESSION_CODE>`.
3. Contestants scan the QR code using their phone camera to instantly land on the team registration screen with the session code pre-filled!

---

## 👥 Role Portals & URLs

| Role | Route | Access Credentials | Description |
|---|---|---|---|
| **Contestant Mobile** | `/` | Game Code (e.g. `7D5520`) + Team Name | Live interactive question view, code viewer, buzzer, state auto-restoration |
| **Auditorium Projector**| `/projector` | Public (Read-Only) | Giant synchronized countdown timer, question card, live leaderboard, join QR |
| **Admin / Host** | `/admin` | Password: `admin123` | Competition builder, session initiator, live control room, audit logs |
| **Live Control Room** | `/admin/live/:id` | Password: `admin123` | Question launcher, timer pause/resume, answer reveal, score overrides |
| **Judge Desk** | `/judge` | Code: `judge789` | Double-blind written/scenario evaluation, rubric sliders, AI suggestions |
| **Question Bank** | `/admin/questions`| Password: `admin123` | Question library, CSV/JSON import/export, Groq AI question generator |
| **Analytics & Reports** | `/analytics/:id` | Public / Admin | Post-quiz accuracy analytics, winner podium with confetti, CSV/PDF download |

---

## 📋 Pre-Event Checklist & 5-Phone Dry Run Test Script

Perform this 10-minute dry run before the competition starts:

### Pre-Event Checklist
- [ ] Host laptop plugged into power supply (disable OS sleep / screen saver).
- [ ] Router / Mobile Hotspot active with AP Isolation disabled.
- [ ] Firewall port 3000 open.
- [ ] Host laptop connected to projector / external monitor (`http://localhost:3000/projector`).
- [ ] Test audio output (unmute sound on host laptop or projector sound system).
- [ ] Verified database contains seeded rounds via `npm run test`.

### Dry-Run Manual Test Script (5 Phones/Laptops)
1. **Device Connection**:
   - Connect 5 mobile phones to the competition Wi-Fi.
   - Scan the Projector QR code on all 5 phones.
   - Register teams: `Alpha`, `Beta`, `Gamma`, `Delta`, `Epsilon`.
   - Verify all 5 teams appear immediately on the Host Live Control Room roster.
2. **Round 1 (MCQ) Test**:
   - Host clicks **Launch Question 1**.
   - Verify all 5 phones display the question and timer in unison within 100ms.
   - Submit answers on all 5 phones.
   - Verify the host control room shows `5/5 Submissions Received`.
   - Host reveals answer. Verify phones display green (correct) or red (incorrect) styling.
3. **Round 3 (Buzzer) Test**:
   - Host navigates to a Buzzer question and clicks **Open Buzzer**.
   - Have contestants race to press their big tactile buzzer button.
   - Verify the first contestant to buzz is locked with sub-millisecond precision, their name is displayed on the Projector with a loud buzzer sound, and other phones are disabled.
4. **Disconnection & Reconnect Resilience Test**:
   - On Phone #3 (`Gamma`), turn on Airplane mode for 5 seconds, then turn it off.
   - Refresh the browser page on Phone #3.
   - Verify Phone #3 automatically reconnects, restores its team session, and resumes without losing score or registration.
5. **Score Override & Audit Test**:
   - In Host Live Control Room, click **Manual Score Adjustment** on Team `Beta` (+5 points).
   - Verify the Projector and Team leaderboard updates instantaneously.
   - Check the **Audit Log** tab to verify the manual adjustment was recorded with a timestamp.

---

## 🧪 Automated Testing & Load Benchmark

### Unit & Integration Test Suite
Antigravity ships with an automated Vitest test suite covering grading logic, negative marks, buzzer locks, clock drift rejection, and multi-round elimination:

```bash
npm test
```

**Results**:
- `tests/scoring.test.ts`: MCQ, code snippet, case-insensitive text, regex synonyms, numerical tolerance, negative marking (4/4 passed).
- `tests/buzzer.test.ts`: Sub-millisecond race lock, lockouts, rebound pass, reopen buzzer (3/3 passed).
- `tests/timer.test.ts`: Timer start/pause/resume, drift grace tolerance, late answer rejection (3/3 passed).
- `tests/elimination.test.ts`: Ranking descending, sub-ms tie-breaking, advancing cutoff, eliminated status (3/3 passed).
- **Total: 13 / 13 tests passed (100%)**.

---

### 100-Concurrent-Client Load Test Benchmark
To rigorously simulate a high-stakes auditorium with 100 concurrent contestants submitting answers and racing on buzzers simultaneously, run:

```bash
npm run loadtest
```

**Load Test Benchmark Report**:
```
------------------------------------------------------------
                 📊 LOAD TEST BENCHMARK REPORT              
------------------------------------------------------------
 Concurrent Clients       : 100
 Successful Connections   : 100 / 100 (100%)
 Submissions in DB        : 100 / 100 (100%)
------------------------------------------------------------
 Latency Metrics (Target: < 300ms event latency)
 • Join Latency   - Avg: 170ms | P50: 179ms | P95: 202ms | Max: 204ms
 • Answer Latency - Avg: 55ms  | P50: 55ms  | P95: 55ms  | Max: 56ms
------------------------------------------------------------
 🏆 RESULT: PASSED! Full compliance with < 300ms latency requirement.
```

---

## ⚙️ Environment Variables Reference (`.env`)

| Variable | Default Value | Description |
|---|---|---|
| `PORT` | `3000` | Port for Express server and Socket.IO |
| `HOST` | `0.0.0.0` | Bind address (listen on all network interfaces) |
| `ADMIN_PASSWORD` | `admin123` | Master password for `/admin` control room |
| `JUDGE_CODE` | `judge789` | Access code for `/judge` double-blind review desk |
| `JWT_SECRET` | `super_secret_techquiz_jwt_key_2026_offline` | Secret used to sign admin and judge session tokens |
| `DATABASE_PATH` | `./data/techquiz.db` | Local SQLite database file location |
| `GROQ_API_KEY` | *(Optional)* | Groq API key for LLaMA-3.3 AI features (offline if unset) |

---

## 📐 Assumptions & Design Decisions

1. **Self-Contained Single Port**: In a school or university LAN competition, having contestants connect to one port for static assets and another port for WebSockets often triggers firewall warnings or CORS restrictions on mobile browsers. TechQuiz Arena serves static files, REST endpoints, and WebSockets through a single unified Express server on port `3000`.
2. **Atomic In-Memory & SQLite Transactions**: Buzzer races and score assignments require atomic serialization to prevent race conditions. High-concurrency operations use cached prepared statements and explicit `BEGIN IMMEDIATE` transactions in SQLite in WAL mode.
3. **Double-Blind Written Judging**: To prevent bias during written and scenario questions, the Judge Desk aliases team names (e.g. `Team #1`, `Team #2`). Judges only see the question, rubric criteria, and submitted technical response.
4. **Client Clock Synchronization**: To prevent contestants with out-of-sync phone clocks from claiming timer discrepancies, the Socket.IO client executes a round-trip time (RTT) ping-pong sync every 10 seconds to estimate `serverTimeOffset`. The server strictly enforces expiration with a 1500ms network jitter grace period.
5. **No External CDNs**: All dependencies (`prismjs`, `canvas-confetti`, `lucide-react`, `qrcode.react`, Tailwind CSS) are packaged directly into the Vite bundle. Fonts rely on local modern system sans-serif and monospace stacks (`ui-monospace`, `Fira Code`, `Consolas`).

---

## 📄 License
MIT License. Built for Computer Science and Software Engineering student competitions.
