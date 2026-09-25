# MedusaJS Commerce Platform Evaluation

A local containerised evaluation of Medusa as a commerce backend with a Next.js storefront. The stack brings together Medusa, PostgreSQL, Redis and seeded catalogue data to explore the platform boundary between administration, Store API and storefront behaviour. This is a development evaluation, not a production deployment.

## Architecture

- Medusa backend and Admin run in the backend container.
- PostgreSQL stores commerce data; Redis supports local session and cache workflows.
- The Next.js storefront reads published catalogue data from the Medusa Store API.
- Docker Compose wires service health checks, startup, database setup and seed steps.
- The seed creates an electronics catalogue with eight products across four categories, a GBP region, sale pricing, inventory and basic shipping options.

## Evaluation Focus

This project explores the integration model between commerce administration and a separate storefront, containerised local development, catalogue seeding, and the operational effect of storefront caching. The Admin includes a cache refresh workflow that rotates the shared cache namespace and asks the storefront to invalidate its previous data for the current browser session.

The cache design is intentionally scoped to this demo. It is not a substitute for evaluating production cache invalidation, multi-user consistency, deployment topology, secrets management, payment, fulfilment or operational support requirements.

## Run Locally

Prerequisites: Docker Engine or Docker Desktop, Docker Compose v2 and Git.

1. Copy the example environment file: `cp .env.example .env`.
2. Set a unique `POSTGRES_PASSWORD`, `JWT_SECRET`, `COOKIE_SECRET` and `ADMIN_PASSWORD` in the untracked `.env` file. Use separate random values; hexadecimal values from `openssl rand -hex 32` work for these local settings. The database password is used to construct the Compose database URL, so avoid characters that require URL encoding.
3. Start the stack:

```bash
docker compose up --build
```

Compose stops with a clear error if a required local secret is missing. The example file contains empty secret fields and must be filled before startup. Never commit the resulting `.env` file or reuse values from another environment.

The backend prepares the database and seeds the catalogue during startup. Admin is available at `http://localhost:9000/app`; the storefront is at `http://localhost:8000/gb`. Use localhost so the Admin and authentication cookies share an origin.

To stop while retaining local data, run `docker compose down`. A full reset removes local database and runtime volumes: `docker compose down -v --remove-orphans`.

## Trade-offs and Limitations

- This stack is for local evaluation; localhost ports and local storage are not production safeguards.
- The demo is GBP-only, uses placeholder product imagery and has no production payment or fulfilment integration.
- Redis supports local sessions and cache workflows; production topology and invalidation semantics need separate validation.
- Compose PostgreSQL disables SSL for local connectivity; do not carry that setup into a production database connection.
- A reused database volume may contain older seed data; reset only when you intend to discard that local data.

The repository is retained as a platform evaluation and implementation reference. For detailed implementation and troubleshooting, see the compose configuration and service scripts.
