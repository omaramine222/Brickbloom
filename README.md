# ▦ Brickbloom — v1

An **original** 2D multiplayer sandbox web game: build, farm, splice seeds, trade, run parkour and play with friends on phone or PC.
All names, art (procedurally drawn pixel art in `public/game.js`), items and code are original.

## Run locally
```bash
npm install
OWNER_USERNAME=Omar PORT=3000 ./run.sh     # auto-restart loop, logs in server.log
# or: OWNER_USERNAME=Omar npm start
npm test                                   # 40 tests (logic, SQLite restart, live websocket test)
```
Open http://localhost:3000 and **register the owner username first** (the account whose name equals `OWNER_USERNAME` becomes owner).
Promote/demote later in-game (`/setrole name mod|admin|user`) or offline: `node scripts/set-role.js name admin`.

## What's new in v2/v3
- **SQLite storage** (`data/brickbloom.db`, WAL mode, one transaction per save every 3 s). Logins survive restarts (30-day sessions). v1 JSON data is migrated automatically.
- **🌟 Mythic Path**: legendary quest chain (harvest 20 → heal 3 patients → finish parkour → collect 500 gems → 5-question quiz, 4/5 to pass, 10-min cooldown). Unlocks at level 5, then +5 levels per completion. Reward: a guaranteed legendary.
- **Installable app (PWA)**: manifest, icons, offline-capable service worker. Phone: browser menu → *Add to Home screen*. Better mobile layout (chat at top and collapsible with 💬, bigger buttons, scrollable hotbar, safe-area support).
- **Sound & music**: all synthesised live with WebAudio (no audio files). Toggle in 🎵 settings.
- **👥 Friends & private messages**: add/accept/decline/remove, online status, join a friend's world, `/msg name text`.
- **Carnival**: Lantern Wheel + 🏮 Lantern Shuffle + 🃏 Higher or Lower (server-decided, gems only, rates shown).
- **Hand-made parkour courses**: RUN1 *Sunny Steps*, RUN2 *Bounce Canyon*, RUN3 *Magma Sprint* (a test proves each is completable). Random RUN worlds still work.
- **Owner tools**: 💲 price editor table, 🚫 ban/mute/staff list with unban/unmute/demote.
- **Polish**: particles (block breaks, dust, confetti, level-up ring), walk animation, 24-minute day/night cycle with stars, sun/moon and glowing lanterns/magma.

## Controls
- **Phone:** ◀ ▶ walk, ⤒ jump, ⛏/🧱/✋ toggles Break / Place / Use. Tap a tile to act (hold to keep hitting). Tap a hotbar slot to pick a block.
- **PC:** A/D or arrows, W/Space jump, left-click = current mode, right-click = place, 1-9 hotbar, E inventory, Q use mode, Enter chat.
- Chat commands: `/help`, `/warp NAME`, `/trade player`, `/access player`, `/unaccess player`.

## Roles
| Role | Powers |
|---|---|
| owner (from `OWNER_USERNAME`) | everything: `/give player itemId count`, `/gems player n`, item spawner, `/setrole`, `/ban`, market prices, carnival start/stop, economy logs |
| admin | kick, mute, temp-ban, unban, tp/summon, broadcast, lock/unlock any world |
| mod | kick, mute, temp-ban, tp/summon |
| user | play |
Admins/mods can **never** spawn items/gems or change roles (checked server-side, covered by tests).

## Deploy for free on Render (step by step, ~10 minutes)
You need 2 free accounts: **GitHub** (github.com) and **Render** (render.com — sign up *with* GitHub). No credit card needed for the free plan.

1. **Make a GitHub repo.** Go to github.com → **+** (top right) → **New repository** → name it `brickbloom` → **Create**.
2. **Upload the code.** This folder is already a git repo with one clean commit (no passwords, no database). Either
   - run: `git remote add origin https://github.com/YOUR_NAME/brickbloom.git && git push -u origin main`, or
   - on the new repo page click **uploading an existing file** and drag in everything from the folder (not `node_modules`, `data`).
3. **Deploy.** Go to render.com → **New +** → **Blueprint** → pick the `brickbloom` repo. Render reads `render.yaml` by itself.
4. It asks for **OWNER_USERNAME** → type `Omar` → **Apply**. Wait 3–5 minutes for "Live".
5. **Play.** Open the link (like `https://brickbloom-xxxx.onrender.com`). **Register `Omar` first** — that account becomes owner 👑. Then send the link to friends. On a phone: browser menu → **Add to Home screen**.
6. **Check it works:** open `https://YOUR-LINK/healthz` → should show `{"ok":true,...}`.

**Important limits of Render free:**
- The game sleeps after 15 minutes with nobody online. The first person to open it waits ~1 minute.
- Free Render has **no permanent disk**: accounts and worlds are **reset when the server restarts or you redeploy**. Good for playing with friends; to keep progress forever, use a paid Render disk (add a disk at `/var/data` and set `DB_PATH=/var/data/brickbloom.db`) or Option C below.

### Settings (environment variables)
| Name | What it does | Default |
|---|---|---|
| `OWNER_USERNAME` | The username that becomes owner | none |
| `PORT` | Web port (Render sets it automatically) | 3000 |
| `DB_PATH` | Full path of the SQLite file | `data/brickbloom.db` |
| `DATA_DIR` | Folder for the database (if `DB_PATH` not set) | `data` |

Health check: `GET /healthz` (also `/health`).

### Option B — Fly.io / Railway (Docker)
`Dockerfile` + `fly.toml` are included. Fly: `fly launch --copy-config`, `fly volumes create bb_data --size 1`, `fly secrets set OWNER_USERNAME=Omar`, `fly deploy`.
Railway: New project → Deploy from GitHub → add variable `OWNER_USERNAME`, add a volume mounted at `/data`, set `DATA_DIR=/data`. (Both need a card nowadays.)

### Option C — Oracle Cloud Always Free VPS (free forever, keeps data)
1. Create an Always Free Ubuntu VM, open port 3000 in the VCN security list and `sudo iptables -I INPUT -p tcp --dport 3000 -j ACCEPT`.
2. `sudo apt install -y nodejs npm git && git clone <your repo> && cd brickbloom && npm install --omit=dev`
3. `OWNER_USERNAME=Omar nohup ./run.sh &` → share `http://<VM public IP>:3000`.

## v5 changes (new look + more game)
- **Brand-new art, all drawn by code** (`public/art.js`): shaded/outlined blocks with highlights and textures (dirt, grass caps, cobblestone, magma, wood, bricks, tiles, ores with gems, glass, lanterns, banners, crystals, seals), seeds as plump beans, trees with 3 growth stages + swaying + fruit, cute big-head characters with blinking eyes, walk/jump/punch animations and skins that really change the look (crown, fez, beanie, shades, hoodie, jacket, robe, sash, auras). Parallax clouds and hills, glowing sun/moon, twinkling stars, chunky outlined block-break particles, gem sparkles and drop shadows.
- **Candy UI**: Fredoka font (bundled, SIL Open Font License in `public/fonts/OFL.txt`), rounded 3D buttons, pill HUD, new logo + login screen, round phone buttons.
- **🎁 Daily login reward** with a 7-day streak (20→120 gems, day 7 adds a Mystery Crate).
- **🏆 Stats panel**: top levels, richest players (staff not ranked), searchable **price guide for every item**, and **trade history** — players see their own trades/Barter Box sales; the owner sees **every** trade in the game (also from 👑 → "🤝 All trades").
- **🌱 FARM worlds** (any world named FARM…, e.g. FARMOMAR; button in 🌍): long dirt shelves for planting big rows of trees.

## v4 changes (deploy + mobile polish)
- `/healthz` endpoint, `DB_PATH` env, `PORT` env, listens on 0.0.0.0, data saved on shutdown (SIGTERM/SIGINT).
- Rate limits now use the real player IP behind Render's proxy (before, all friends shared one limit).
- WebSocket heartbeat drops dead phone connections; phones reconnect with backoff and when you come back to the tab.
- Logging in on a second device no longer makes both devices kick each other forever; kicked/banned players stop auto-reconnecting.
- Touch: multi-touch fixed (hold ◀/▶ and jump while tapping blocks), buttons release if the finger slides off, bigger buttons, landscape layout, small-phone layout.
- Barter Box reach now matches break/place reach.

## Data
SQLite database `data/brickbloom.db` (users, worlds, sessions, settings, economy audit log). Back it up by copying the file while the server is stopped. Set `DATA_DIR` to move it (e.g. `/data` on a volume).
Note: `better-sqlite3` is a native module; Render/Railway/Fly download a prebuilt binary automatically (the Dockerfile also installs build tools as a fallback).
