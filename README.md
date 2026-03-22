# TicTacToe — Multiplayer Game with Nakama Backend

A production-ready, server-authoritative multiplayer Tic-Tac-Toe game built with React on the frontend and Nakama as the game backend. Every game action — move validation, turn management, win detection, timers, and leaderboard scoring — runs entirely on the server. The client is a pure renderer.

---

## Live Links

| Resource | URL |
|---|---|
| 🎮 Playable Game | https://tictactoe-nakama-frontend.onrender.com |
| ⚙️ Nakama Server | https://tictactoe-nakama-backend.onrender.com |
| 📂 Source Code | https://github.com/Nayan-95/tictactoe-nakama |

---

## Features

- ✅ **Random Matchmaking** — finds an open match or creates a new one automatically
- ✅ **Private Rooms** — create a room, get a 6-character invite code, share with a friend
- ✅ **VS CPU Bot** — minimax AI that plays perfect, unbeatable Tic-Tac-Toe
- ✅ **Turn Timer** — 30 seconds per move, auto-forfeit on timeout
- ✅ **Global Leaderboard** — top 10 players ranked by total wins
- ✅ **Win/Loss/Draw Tracking** — persistent stats per player across sessions
- ✅ **Server-Authoritative** — all game logic runs on the server, no client cheating possible
- ✅ **Real-time Updates** — WebSocket-based state broadcast to all players in a match
- ✅ **Disconnect Handling** — opponent leaving mid-game triggers an immediate win for the remaining player
- ✅ **Mobile Responsive** — designed mobile-first, works on all screen sizes

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, Zustand, plain JavaScript |
| Backend Runtime | Nakama 3.22.0 (server-side JavaScript via Goja engine) |
| Real-time Transport | Nakama WebSocket (nakama-js SDK) |
| Authentication | Nakama Device Authentication |
| Database | PostgreSQL 12 (managed by Nakama) |
| Deployment | Render.com (both frontend and backend) |
| Node.js | v22.12.0 |

---

## Architecture and Design Decisions

### Server-Authoritative Game Logic

All game state lives exclusively on the Nakama server inside `backend/src/index.js`. The client sends only a single integer (the board position 0–8) when a player taps a cell. The server then:

1. Validates the sender is the current turn holder
2. Validates the position is within bounds (0–8) and the cell is empty
3. Applies the move to the board
4. Runs win/draw detection
5. Decrements the turn timer every tick (1 tick = 1 second)
6. Broadcasts the new state to all connected clients

The client cannot manipulate the board, skip turns, or fake a win. If an invalid move is received, it is silently rejected and the sender's state is not updated.

```
Player taps cell 4
  ↓
Client sends: { position: 4 }  via WebSocket (OpCode 1)
  ↓
Nakama matchLoop validates:
  - Is this the sender's turn?      → reject if not
  - Is position 4 in range 0–8?    → reject if not
  - Is cell 4 empty?               → reject if not
  - Apply move, check win/draw
  - Switch turn, reset timer to 30s
  ↓
Server broadcasts new board state to both clients (OpCode 2)
  ↓
Both frontends re-render from server data
```

### Frontend Architecture — Three-Layer Pattern

The frontend is split into three distinct layers so each can be changed independently:

**NakamaService** (`src/services/NakamaService.js`)
A plain class that owns all Nakama SDK calls. No React, no hooks, no state. Independently testable. React components never import from `@heroiclabs/nakama-js` directly — all SDK access goes through this class.

**Zustand Store** (`src/store/useGameStore.js`)
All application state in one place. Chosen over React Context because components can subscribe to exact slices they need — a timer update does not re-render the lobby, for example. Also provides built-in devtools support for debugging match state.

**useNakama Hook** (`src/hooks/useNakama.js`)
A thin orchestration layer that composes the service (I/O) with the store (state mutations). The hook holds zero internal state. Screens call actions through this hook and re-render from the store.

```
Screen Component
     ↓ calls action
  useNakama hook
     ↓ I/O              ↓ state write
NakamaService      useGameStore
     ↓
Nakama Server
```

### Authentication — Device Auth

The app uses Nakama's device authentication. When a user types their handle (e.g. `Nova`), a stable device ID is derived:

```
deviceId = "neon-ttt-nova"
```

Nakama creates an account on first use and logs into the same account on every subsequent use. No password, no signup screen — same handle always maps to the same persistent account and leaderboard records.

**Known tradeoff:** Two different people using the same handle would share an account. For a production release, this would be replaced with OAuth or email/password auth. For this submission it is an intentional simplicity tradeoff, noted here transparently.

### AI Bot — Minimax Algorithm

The CPU opponent runs entirely server-side inside `matchLoop`. It uses the minimax algorithm with a depth penalty:

- Score `10 - depth` for an AI win (prefers faster wins)
- Score `depth - 10` for a human win (prefers slower losses)
- Score `0` for a draw

The AI is theoretically unbeatable. It plays the optimal move every time. A 1-tick delay (1 second) is added before the AI plays so the human's move visually registers before the response appears.

The game tree for Tic-Tac-Toe has at most 9! = 362,880 nodes, so minimax runs without alpha-beta pruning and still completes in under 1ms.

### Real-time Communication — Op Codes

All WebSocket messages use integer op codes. These must match exactly between backend and frontend:

| Op Code | Name | Direction | Payload |
|---|---|---|---|
| 1 | MOVE | Client → Server | `{ position: number }` |
| 2 | STATE | Server → Client | Full board state |
| 3 | GAME_OVER | Server → Client | Winner, reason, winLine |
| 4 | TICK | Server → Client | `{ turn, timeLeft }` |
| 5 | READY | — | Reserved |

### Leaderboard Design

Three separate Nakama leaderboards track stats independently:

- `ttt_wins` — incremented on win
- `ttt_losses` — incremented on loss
- `ttt_draws` — incremented on draw

All writes happen inside `resolveGameOver()` on the server. The AI bot (`AI_PLAYER_ID`) is excluded from all leaderboard writes. Stats are persistent across sessions because they are stored in Nakama's PostgreSQL database keyed by the player's internal userId.

---

## Project Structure

```
/
├── backend/
│   └── src/
│       └── index.js          ← Entire Nakama server module (single file)
│
├── frontend/
│   ├── index.html
│   ├── vite.config.js
│   ├── package.json
│   └── src/
│       ├── main.jsx
│       ├── App.jsx
│       ├── index.css
│       ├── types/
│       │   └── game.js       ← Op codes + JSDoc type definitions
│       ├── services/
│       │   └── NakamaService.js
│       ├── store/
│       │   └── useGameStore.js
│       ├── hooks/
│       │   └── useNakama.js
│       └── components/
│           ├── screens/
│           │   ├── LoginScreen.jsx
│           │   ├── LobbyScreen.jsx
│           │   ├── GameScreen.jsx
│           │   └── LeaderboardScreen.jsx
│           └── ui/
│               ├── Board.jsx
│               ├── TurnTimer.jsx
│               ├── PlayerCard.jsx
│               ├── GameOverModal.jsx
│               ├── StatsGrid.jsx
│               └── Toast.jsx
│
├── docker-compose.yml        ← Local development only
└── README.md
```

---

## Setup and Installation

### Prerequisites

- Node.js v22.12.0 or higher
- Docker and Docker Compose (for running Nakama locally)
- Git

### 1. Clone the Repository

```bash
git clone https://github.com/Nayan-95/tictactoe-nakama.git
cd tictactoe-nakama
```

### 2. Run Nakama Locally

The `docker-compose.yml` at the project root starts a local Nakama server with PostgreSQL. It automatically mounts `backend/src/index.js` as the runtime module.

```bash
docker-compose up
```

Wait until you see this line in the logs:

```
{"level":"info","msg":"Tictactoe module loaded successfully."}
```

Nakama is now running at:
- API: `http://localhost:7350`
- Console: `http://localhost:7351` (admin: `admin` / `password`)

### 3. Install Frontend Dependencies

```bash
cd frontend
npm install
```

### 4. Configure Environment

Create a `.env` file inside the `frontend/` folder:

```env
VITE_NAKAMA_HOST=localhost
VITE_NAKAMA_PORT=7350
VITE_NAKAMA_KEY=defaultkey
```

For connecting to the deployed server instead:

```env
VITE_NAKAMA_HOST=tictactoe-nakama-backend.onrender.com
VITE_NAKAMA_PORT=443
VITE_NAKAMA_KEY=defaultkey
```

### 5. Start the Frontend Dev Server

```bash
npm run dev
```

Open `http://localhost:5173` in your browser.

---

## API / Server Configuration Details

### Nakama Server Key

```
defaultkey
```

### Registered RPC Endpoints

All RPCs are called from the frontend via `NakamaService.callRpc(name, payload)`.

| RPC Name | Payload | Response | Description |
|---|---|---|---|
| `rpc_find_match` | `{}` | `{ matchId }` | Finds open match or creates new one |
| `rpc_create_match` | `{}` | `{ matchId }` | Creates a fresh public match |
| `rpc_create_private_match` | `{}` | `{ matchId, inviteCode }` | Creates private room with 6-char code |
| `rpc_join_by_code` | `{ code }` | `{ matchId }` or `{ error }` | Joins a private room by invite code |
| `rpc_create_ai_match` | `{}` | `{ matchId }` | Creates a match against the CPU bot |
| `rpc_get_leaderboard` | `{}` | `{ records[] }` | Top 10 players by wins |
| `rpc_get_my_stats` | `{}` | `{ wins, losses, draws }` | Calling user's personal stats |

### Leaderboard IDs

| ID | Tracks |
|---|---|
| `ttt_wins` | Total wins per player |
| `ttt_losses` | Total losses per player |
| `ttt_draws` | Total draws per player |

### Match Configuration

| Setting | Value |
|---|---|
| Tick rate | 1 tick/second |
| Turn timer | 30 seconds |
| Max players per match | 2 |
| Match label | `tictactoe` |
| AI player ID | `ai-bot-system` |

### Environment Variables (Frontend)

| Variable | Default | Description |
|---|---|---|
| `VITE_NAKAMA_HOST` | `localhost` | Nakama server hostname |
| `VITE_NAKAMA_PORT` | `7350` | Nakama API port (use `443` for deployed HTTPS) |
| `VITE_NAKAMA_KEY` | `defaultkey` | Nakama server key |

---

## Deployment

Both the frontend and Nakama backend are deployed on [Render](https://render.com).

### Backend (Nakama) on Render

The backend is a Docker-based service. Render builds and runs the `docker-compose.yml` configuration which:

1. Starts a PostgreSQL 12 database
2. Runs Nakama 3.22.0 with the runtime pointed at `backend/src/`
3. Loads `index.js` as the entrypoint module via `--runtime.js_entrypoint index.js`

The critical Docker flag that tells Nakama where to find the module:

```
--runtime.path /backend/src
--runtime.js_entrypoint index.js
```

**Backend live endpoint:** `https://tictactoe-nakama-backend.onrender.com`

### Frontend on Render

The frontend is a static site deployed from the `frontend/` directory.

Build command:
```bash
npm install && npm run build
```

Publish directory:
```
frontend/dist
```

Environment variables set in Render dashboard:
```
VITE_NAKAMA_HOST=tictactoe-nakama-backend.onrender.com
VITE_NAKAMA_PORT=443
VITE_NAKAMA_KEY=defaultkey
```

**Frontend live URL:** `https://tictactoe-nakama-frontend.onrender.com`

---

## How to Test the Multiplayer Functionality

### Test 1 — Random Matchmaking (2 players)

1. Open `https://tictactoe-nakama-frontend.onrender.com` in **two separate browser tabs** (or two different browsers/devices)
2. In Tab 1: type any handle (e.g. `PlayerOne`) and click **JACK IN**
3. In Tab 2: type a different handle (e.g. `PlayerTwo`) and click **JACK IN**
4. In Tab 1: click **QUICK MATCH**
5. In Tab 2: click **QUICK MATCH**
6. Both tabs should enter the game screen within a few seconds
7. Click cells — moves should appear on both tabs in real time
8. Let the timer run out on one player — the other should win automatically

### Test 2 — Private Room with Invite Code

1. Open two tabs, log in with different handles in each
2. In Tab 1: click **CREATE PRIVATE ROOM**
3. A 6-character code appears (e.g. `XK7P2Q`)
4. In Tab 2: click **JOIN WITH CODE**, enter the exact code, click **JOIN**
5. Both tabs should enter the same game

### Test 3 — VS CPU Bot

1. Log in with any handle
2. Click **VS CPU BOT**
3. The game starts immediately — the bot plays as O
4. Try to beat it — you cannot (minimax is perfect)
5. Let your timer run out — you lose by timeout

### Test 4 — Leaderboard Persistence

1. Play 3 matches and win at least 2
2. Click **LEADERBOARD** from the lobby
3. Your username should appear ranked by win count
4. Close the tab completely, reopen, log in with the same handle
5. Your stats (W/L/D) in the lobby should show the same numbers as before — confirming persistence

### Test 5 — Disconnect Handling

1. Start a random match with two tabs
2. While a game is in progress, close Tab 2 (the opponent's tab)
3. Tab 1 should immediately show a game over screen with "Opponent disconnected" as the reason
4. The remaining player is awarded a win on the leaderboard

---

## Author

**Manabodha Mahananda**
GitHub: https://github.com/Nayan-95/tictactoe-nakama