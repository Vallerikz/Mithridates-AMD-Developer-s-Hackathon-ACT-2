# Mithridates-AMD-Developer-s-Hackathon-ACT-2
## AMD Hackathon Sprint Workspace


# Backend Setup

## Prerequisites

- Docker
- Docker Compose

## 1. Configure Environment Variables

### Root `.env`

In the project root directory, create a `.env` file and copy the contents from:

```
.env.sample
```

For development, you can either:

- Leave the PostgreSQL password as `postgres`, **or**
- Set your own password and update the `DATABASE_URI` in `backend/.env` accordingly.

### Backend `.env`

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

## 2. Build and Start the Containers

From the project root directory (`Mithridates-AMD-Developer-s-Hackathon-ACT-2`), run:

```bash
docker compose build
docker compose up -d
```

---

## 3. Run Database Migrations

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

## 4. Verify the Backend

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

## Running the Frontend

The frontend is built with Next.js and React. To run it locally:

1. Navigate to the `frontend` directory:
   ```bash
   cd frontend
   ```

2. Install the dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser to view the application.
