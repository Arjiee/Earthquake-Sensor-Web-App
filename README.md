# SEERS — Smart Earthquake Emergency Response System

A full-stack earthquake early-response system for a school/campus (ORCR, Philsca — Pasay).

- An **ESP8266 + MPU6050** sensor streams acceleration data over WiFi every ~500 ms.
- A **Node.js + TypeScript** server ingests readings in real time, detects earthquakes,
  manages the student roster, exposes an admin API, and broadcasts everything over WebSocket.
- A **PostgreSQL** database stores admins, students, earthquakes, and the event log.
- A **Python facial-recognition service** watches the safe-zone camera and automatically
  marks recognized students as **SAFE**.
- A **React + TypeScript (Tailwind)** dashboard shows live seismic data, the headcount,
  face/QR check-ins, and the evacuation summary — behind an admin login.

> The Figma Make preview only renders the **frontend**. Because there is no backend
> reachable from the preview, it shows a "waiting for hardware / offline" state. To see
> everything working, run the full stack locally as described below.

## Architecture

```
ESP8266 (MPU6050) ──HTTP POST /ingest/reading──┐
                                                ▼
Safe-zone camera ─▶ face-service (Python) ─▶ Node server (Express + ws) ─▶ PostgreSQL
                     POST /ingest/recognition        │  ▲
                                                      │  │ REST + WebSocket
                                                      ▼  │
                                          React dashboard (this app)
```

## Repository layout

```
code/
├─ src/                 # React + TypeScript frontend (Figma Make previewable)
│  └─ app/
│     ├─ App.tsx        # auth gate → dashboard
│     ├─ components/    # dashboard UI
│     └─ lib/           # api client, websocket hook, auth, types
├─ server/              # Node + TypeScript backend (Express, ws, pg)
│  └─ src/
├─ face-service/        # Python facial recognition (Flask + face_recognition)
├─ db/                  # PostgreSQL schema
└─ firmware/            # ESP8266 (Arduino) sketch for the MPU6050 sensor
```

## Prerequisites

- Node.js 18+ and pnpm
- PostgreSQL 14+
- Python 3.10+ (with `cmake` for building dlib)
- Arduino IDE (only to flash the sensor)

## 1. Database

```bash
createdb seers                      # or: psql -c "CREATE DATABASE seers;"
```

## 2. Backend server

```bash
cd server
cp .env.example .env                # edit DATABASE_URL, JWT_SECRET, DEVICE_TOKEN
pnpm install
pnpm seed                           # applies db/schema.sql + seeds admin & sample students
pnpm dev                            # starts http://localhost:4000  (ws at /ws)
```

Default admin: **admin / seers123** (change it after first login).

## 3. Frontend dashboard

The frontend talks to the backend on the same hostname, port **4000** (see
`src/app/lib/config.ts`). Run it with any Vite-based dev flow / your Figma Make
environment and log in with the admin credentials.

## 4. Facial-recognition service

```bash
cd face-service
cp .env.example .env                # match DEVICE_TOKEN with the server
pip install cmake
pip install -r requirements.txt

# Enroll a student's face (repeat per student):
python enroll.py 2021-00123         # SPACE to capture, Q to finish

python main.py                      # starts recognition + preview on :5001
```

When a registered student appears in the camera, the service POSTs to
`/ingest/recognition` and the dashboard marks them **SAFE** automatically.
The dashboard's Face Recognition panel embeds the live preview from `:5001/stream`.

### Managing enrollment from the dashboard

You can add/update/delete students and enroll their faces entirely from the web
app (no need for `enroll.py`):

- **Add / Edit / Delete** — use the roster's *Add Student* button and the
  *Edit* / *Del* row actions. Deleting a student also removes their face
  templates from the face-service.
- **Enroll a face** — click *Enroll* on a student row. A modal opens the
  admin's webcam; capture a few shots from different angles and *Save*. The
  images are sent through the backend to the face-service, which validates that
  each contains a detectable face, stores them under `faces/<studentId>/`, and
  reloads its templates immediately. The student's row then shows **Face ✓**.
- **Re-enroll / clear** — clicking *Face ✓* reopens the modal, where you can add
  more shots or *Clear Enrollment*.

`enroll.py` is still available for bulk/offline enrollment directly on the
safe-zone PC. Both paths write to the same `faces/` directory.

Relevant endpoints (admin-authenticated, proxied to the face-service):

| Endpoint | Purpose |
|---|---|
| `PUT /api/students/:id` | Update name / section |
| `POST /api/students/:id/enroll` | Upload face shots (data URLs) |
| `DELETE /api/students/:id/enroll` | Clear face templates |
| `DELETE /api/students/:id` | Delete student + templates |

## 5. Sensor firmware (ESP8266 + MPU6050)

1. Open `firmware/seers_sensor/seers_sensor.ino` in the Arduino IDE.
2. Install libraries: *Adafruit MPU6050*, *Adafruit Unified Sensor*, and the
   *ESP8266* board package.
3. Set `WIFI_SSID`, `WIFI_PASSWORD`, `SERVER_URL` (your PC's LAN IP + `:4000/ingest/reading`),
   and `DEVICE_TOKEN` (match `server/.env`).
4. Wire: MPU6050 `SDA→D2`, `SCL→D1`, `VCC→3V3`, `GND→GND`.
5. Flash. It POSTs a JSON reading every 500 ms and the dashboard updates live.

## How earthquake detection works

The server computes the acceleration vector magnitude and its deviation from
rest (~1 g). When the peak exceeds `EQ_THRESHOLD_G` (default 0.25 g) it opens an
earthquake event, flips every student to **missing**, raises the evacuation
banner, and starts accounting for students via face/QR. The event auto-clears
after `EQ_CLEAR_SECONDS` of calm (or an admin can reset it).

## Data flow / endpoints

| Endpoint | Auth | Purpose |
|---|---|---|
| `POST /api/auth/login` | — | Admin login → JWT |
| `GET /api/students` | admin | Roster |
| `POST /api/students/:id/safe` | admin | Manual/QR check-in |
| `POST /ingest/reading` | device token | Sensor reading (ESP8266) |
| `POST /ingest/recognition` | device token | Face match (face-service) |
| `WS /ws` | — | Live readings, students, logs, status |

## Security notes

- Device endpoints use a shared `DEVICE_TOKEN`; admin endpoints use JWTs.
- Change `JWT_SECRET`, `DEVICE_TOKEN`, and the default admin password before any
  real deployment. Put the services behind HTTPS on a trusted network.
