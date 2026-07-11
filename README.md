# Mithridates-AMD-Developer-s-Hackathon-ACT-2
## AMD Hackathon Sprint Workspace


## Backend Initial Setup

### Prerequisites

- Docker
- Docker Compose

### 1. Configure Environment Variables

#### Root `.env`

In the project root directory, create a `.env` file and copy the contents from:

```
.env.sample
```

For development, you can either:

- Leave the PostgreSQL password as `postgres`, **or**
- Set your own password and update the `DATABASE_URI` in `backend/.env` accordingly.

#### Backend `.env`

In the `backend/` directory, create another `.env` file and copy the contents from:

```
backend/.env.sample
```

Generate a random string and set it as the value for:

```
SECRET_KEY=<your-random-secret>
```
Generate your GEMINI_API_KEY and set it as the value for:

```
GEMINI_API_KEY=<your-api-key>
```

---

### 2. Build and Start the Containers

From the project root directory (`Mithridates-AMD-Developer-s-Hackathon-ACT-2`), run:

```bash
docker compose build
docker compose up -d
```

---

### 3. Run Database Migrations

Open a shell inside the backend container:

```bash
docker exec -it backend-app sh
```

Then run:

```bash
flask db stamp head
flask db upgrade
```

---

### 4. Verify the Backend

The backend should now be running.

You can access:

- API: http://localhost:8000
- Swagger Documentation: http://localhost:8000/apidocs/

---


## Running the Backend

After completing the initial setup, start the backend from the project root directory (`Mithridates-AMD-Developer-s-Hackathon-ACT-2`):

```bash
docker compose build
docker compose up -d
```

---

## Whisper Model Setup (AMD GPU)

Transcription runs on Whisper `large-v3`, self-hosted on an **AMD GPU** using an
AMD Developer Cloud Jupyter notebook (ROCm 7.2.1, AMD Radeon Navi 3x). The
backend reaches it over a Cloudflare tunnel through `WHISPER_ENDPOINT_URL`.

All scripts live in `backend/core/scripts/`.

### 1. First-time notebook setup

Launch a GPU notebook from the AMD Developer portal and clone this repo into
`/workspace` (the only volume that persists across container restarts). Then run
once:

```bash
bash backend/core/scripts/setup_whisper_notebook.sh
```

This creates a Python venv, installs PyTorch built for ROCm and `openai-whisper`,
downloads the `cloudflared` binary, and caches the `large-v3` weights (~2.9 GB).
Everything is stored under `/workspace`, so a re-run after a restart only
reinstalls `ffmpeg`/`tmux` and skips the large downloads.

### 2. Start the server (each session)

```bash
bash backend/core/scripts/start_whisper_notebook.sh
```

This launches the Whisper HTTP server (port `8001`) and a Cloudflare quick tunnel
inside a detached `tmux` session, so both survive an SSH disconnect. Copy the
`https://xxxx.trycloudflare.com` URL it prints from the `tunnel` window.

On a fresh or resumed notebook you can chain pull + setup + start in one step:

```bash
bash backend/core/scripts/notebook_boot.sh
```

### 3. Point the backend at the tunnel

On the machine running the backend:

```bash
bash backend/core/scripts/set_whisper_url.sh https://xxxx.trycloudflare.com
```

This rewrites `WHISPER_ENDPOINT_URL` in `backend/.env`, checks the endpoint is
answering, and recreates the backend container.

> The quick tunnel prints a new URL on every notebook restart. For a fixed URL,
> `setup_cloudflare_tunnel.sh` sets up a named tunnel (requires a domain whose
> DNS is on Cloudflare).
