FROM node:20-bookworm-slim

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
# Playwright is a host-only E2E dependency; never download browsers during the image build.
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1

RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

RUN corepack enable

WORKDIR /srv

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/backend/package.json apps/backend/package.json
COPY apps/storefront/package.json apps/storefront/package.json

RUN pnpm install --frozen-lockfile --filter @dtc/storefront...

COPY . .

WORKDIR /srv

EXPOSE 8000

CMD ["pnpm", "dev"]
