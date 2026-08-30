# MaaS — Mobility as a Service

## Prerequisites

- [Docker](https://www.docker.com/) and Docker Compose installed
- [Node.js](https://nodejs.org/) (v18+ recommended)
- A clone of this repository on your machine

## Project layout

| Path | What it is |
|---|---|
| `maas-server/` | Backend: API + sensor ingestion (NestJS) |
| `maas-client/` | Frontend: web application (Nuxt) |
| `maas-services.yaml` | Docker Compose definition for the backend stack |

## Setup

### 1. Configure the server environment

Copy the example environment file into `maas-server/` and edit it as needed:

```bash
cp maas-server/.env.example maas-server/.env
```

> The `.env` file **must** be placed in the `maas-server/` folder, not the repository root.

### 2. Start the backend stack

From the repository root, start all databases, caches, and backend services:

```bash
docker compose -f maas-services.yaml up --build
```

This runs the API and ingestion services together with PostgreSQL, MongoDB, and Redis.

## Running the frontend client

The client is **separate** from the backend stack and runs on its own.

### 1. Configure the client environment

```bash
cp maas-client/.env.example maas-client/.env
```

Then set the API base URL (the MaaS API exposed by the backend stack):

```
NUXT_PUBLIC_BASE_URL=http://localhost:4081
```

### 2. Install dependencies

```bash
cd maas-client
npm install
```

### 3. Start the client

For development (with hot reload):

```bash
npm run dev
```

For a production build:

```bash
npm run build
npm run preview
```

The client runs at **http://localhost:3020** in development (see `nuxt.config.ts`).

## Services

| Service | URL / Port |
|---|---|
| MaaS client (dev) | http://localhost:3020 |
| MaaS API | http://localhost:4081 |
| Sensor ingestion | http://localhost:3001 |
| Swagger docs | http://localhost:4081/docs |

## Stopping

Stop the backend stack:

```bash
docker compose -f maas-services.yaml down
```

Stop the client with `Ctrl+C` in its terminal.

## Notes

- Databases, the cache, and admin tooling run on an internal network and are not exposed to the host.
- To reset the super admin seed, set `SEED_SUPER_ADMIN=true` in `maas-server/.env`.
