# Medusa Demo Store

Local Medusa demo store for evaluating the Medusa backend, Medusa Admin, PostgreSQL, Redis, demo catalog data, and the Next.js storefront.

Tested with Medusa `2.16.0`.

## What Is Included

- Medusa backend on `http://localhost:9000`
- Medusa Admin on `http://localhost:9000/app`
- PostgreSQL in Docker
- Redis in Docker
- Seeded electronics catalog with 8 products across 4 categories
- Optional Next.js storefront on `http://localhost:8000`

## Prerequisites

- Docker Desktop or Docker Engine
- Docker Compose v2
- Git

You do not need a globally installed Medusa CLI. All Medusa commands run inside the project containers.

## Start The Environment

1. Copy the example environment file if you want to override defaults:

```bash
cp .env.example .env
```

2. Start the stack:

```bash
docker compose up --build
```

This starts PostgreSQL, Redis, the Medusa backend, and the storefront.

What happens during startup:

- The backend prepares the database with `pnpm db:setup --no-interactive`
- Demo data is seeded before the production build so the catalog is ready when the server starts
- Medusa builds the application into `.medusa/server`
- The backend starts from the built `.medusa/server` directory
- The storefront waits for the backend health check and then starts

## Create An Admin User

The stack provisions a default admin user automatically on first startup and after a full reset.

Credentials:

- Email: `admin@medusa.local`
- Password: `MedusaDemo123!`

If you want to create the user manually or restore it after changing credentials:

```bash
docker compose exec backend sh -lc 'cd /srv/apps/backend && pnpm user --email admin@medusa.local --password "MedusaDemo123!"'
```

To use different credentials, set `ADMIN_EMAIL` and `ADMIN_PASSWORD` in `.env` before starting the stack.

## Create A Product In Medusa Admin

Use the Admin UI at `http://localhost:9000/app` to create products that will appear on the storefront.

Recommended product setup:

1. Open `Catalog > Products` and select `Create`.
2. Enter a title and a URL-safe handle.
3. Add at least one variant.
4. Add at least one price in `PKR`.
5. Upload a product image.
6. Set the product status to `Published`.
7. Assign the product to the default sales channel.
8. Save the product.

For this demo store, keep `Manage inventory` off unless you explicitly want to test Medusa inventory management. The storefront does not rely on pickup fulfillment or stock reservation.

If a new product does not appear at `http://localhost:8000/pk/products/<handle>`, confirm:

- The handle matches the storefront URL exactly.
- The product is published.
- The product has a price in `PKR`.
- The product is linked to the default sales channel.

If the product is saved in Admin but the storefront still shows an older version, open `Admin > Cache Refresh` at `http://localhost:9000/app/cache` and click `Refresh Storefront Cache`. This rotates the shared `_medusa_cache_id` namespace and asks the storefront to invalidate the previous cached data for the current browser session.

Recommended product workflow:

1. Create or edit the product in `Catalog > Products`.
2. Add a stable handle and at least one variant.
3. Add a price in `PKR` for the default sales channel.
4. Upload the product image and set the status to `Published`.
5. Save the product.
6. Refresh the storefront cache from `Admin > Cache Refresh`.
7. Reload the storefront product URL.

## Seed Demo Data

Demo data is seeded automatically during `docker compose up --build`.

To run the seed step again on an already running stack:

```bash
docker compose exec backend sh -lc 'cd /srv/apps/backend && pnpm seed'
```

The seed includes:

- 8 products
- 4 category niches
- Sale pricing
- Inventory quantity
- Pakistan region setup with `PKR`
- Basic shipping options

The storefront homepage shows category tiles and featured products from the seeded catalog.

The seed also writes the storefront runtime env file used by the Next.js container.

## URLs

- Backend: `http://localhost:9000`
- Admin: `http://localhost:9000/app`
- Storefront: `http://localhost:8000/pk`
- Storefront root redirects to the default region route at `/pk`
- Use `localhost` in the browser so the Medusa Admin and auth cookies stay on the same origin.

## Stop The Environment

```bash
docker compose down
```

This stops the containers but keeps the volumes.

## Reset Database And Volumes

```bash
docker compose down -v --remove-orphans
```

This removes the containers and clears the PostgreSQL, Redis, and runtime volumes.

Use this when you want a fully clean reinstall.

## Known Limitations

- This is a local demo stack, not a production deployment.
- Redis is used for local development and Medusa session storage.
- The storefront is optional in the sense that it can be removed later, but it is enabled in this demo compose file.
- Demo images are generated from placeholder URLs for predictable catalog seeding.
- If you target a legacy demo product that was created before the option fix, the first variant save may materialize a default `Configuration` option/value automatically.
- The storefront product page is rendered live from the Store API, so product edits in Admin should be visible after a refresh.
- The storefront cache is namespace-based per browser session. Use `Admin > Cache Refresh` when you need to force the storefront to pick up newly published catalog data immediately.

## Troubleshooting

### Backend does not reach healthy state

- Run `docker compose logs -f backend`.
- Confirm PostgreSQL and Redis containers are healthy.
- If you changed the Medusa config, make sure `projectConfig.databaseDriverOptions` still disables SSL for Docker Compose PostgreSQL.

### Migrations or setup appear to hang

- This stack uses the Medusa Docker workaround for PostgreSQL SSL.
- If you are on a modified checkout and the backend stalls during `db:setup`, verify the database driver options in `apps/backend/medusa-config.ts`.
- Reset the stack with `docker compose down -v --remove-orphans` and start again.

### Admin login fails

- Confirm the stack has been started after the latest database reset.
- Confirm the admin user exists with `docker compose exec backend pnpm user --email admin@medusa.local --password "MedusaDemo123!"` only if you need to recreate it manually.
- Confirm you are logging in at `http://localhost:9000/app`
- If you want to test the auth route directly, the admin login endpoint is `POST /auth/user/emailpass`

### Variant save returns an error

- If a product has no saved options yet, the first variant save will create a default `Configuration` option/value on that product.
- If you submit the same option combination twice, Medusa will return an `invalid_data` duplicate-variant error instead of creating another copy.

### Storefront starts but shows no products

- Confirm the backend is healthy.
- Confirm the seed step completed in the backend logs.
- Confirm the publishable key was written to `/runtime/storefront.env` inside the backend container.

### Legacy currency data still appears

- This demo store is PKR-only.
- If you reused an older database volume and still see EUR in the storefront or product prices, reset the stack with `docker compose down -v --remove-orphans` and start again.
- Then rerun the seed step if you want to repopulate the catalog without stale currency rows.

### Port already in use

- Change the host port mappings in `docker-compose.yml`, or stop the process using the conflicting port.
- Common conflicts:
  - `9000` for the backend and admin
  - `8000` for the storefront
  - `5432` for PostgreSQL
  - `6379` for Redis

### Docker build issues

- Make sure Docker Desktop has enough memory for Node, PostgreSQL, Redis, and the storefront build.
- Rebuild after dependency or config changes with `docker compose up --build`.

## Useful Commands

```bash
docker compose up --build
docker compose down
docker compose down -v --remove-orphans
docker compose logs -f backend
docker compose logs -f storefront
docker compose exec backend sh -lc 'cd /srv/apps/backend && pnpm seed'
docker compose exec backend sh -lc 'cd /srv/apps/backend && pnpm user --email admin@medusa.local --password "MedusaDemo123!"'
```
