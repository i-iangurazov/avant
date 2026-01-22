# Plumbing Store Web

## Local setup

```bash
pnpm -w install
pnpm --filter @plumbing/db run db:generate
pnpm --filter @plumbing/db run db:migrate
pnpm --filter @plumbing/web run dev
```

Open http://localhost:3000.

## Admin

- Sign in at `/login` with an admin phone + password.
- Manage taxonomy at `/admin/taxonomy`.
- Manage products at `/admin/products`.
- Manage customers at `/admin/customers`.
- Manage orders at `/admin/orders`.

## Seed data

```bash
pnpm --filter @plumbing/db run prisma:seed
```

## Taxonomy import

- Upload `.csv` or `.xlsx` files in `/admin/taxonomy`.
- CSV accepts both comma and semicolon delimiters.
- Use the “Download sample CSV” button as a starting template.

## Product images

The image upload endpoint uses S3-compatible storage. Set these env vars:

```
S3_ENDPOINT=
S3_REGION=auto
S3_BUCKET=
S3_ACCESS_KEY_ID=
S3_SECRET_ACCESS_KEY=
S3_PUBLIC_BASE_URL=
```

## Routes

Pages:
- `/` storefront
- `/login` admin sign in
- `/admin/taxonomy` taxonomy admin
- `/admin/products` products admin
- `/admin/customers` customers admin
- `/admin/orders` orders admin

API (admin routes require an admin session cookie):
- `GET /api/catalog?locale=en|ru|kg` catalog payload
- `POST /api/telegram-order` create order + trigger notifications
- `POST /api/auth/login` sign in
- `GET /api/auth/me` session info
- `POST /api/auth/logout` sign out
- `GET /api/admin/taxonomy` list taxonomy (`includeInactive=1` to include disabled)
- `GET /api/admin/taxonomy/export` download CSV
- `POST /api/admin/taxonomy/import-xlsx?mode=preview|sync` upload CSV/XLSX
- `POST /api/admin/taxonomy/categories` create category
- `PATCH /api/admin/taxonomy/categories/:id` update category
- `DELETE /api/admin/taxonomy/categories/:id` disable category + subcategories
- `POST /api/admin/taxonomy/subcategories` create subcategory
- `PATCH /api/admin/taxonomy/subcategories/:id` update subcategory
- `DELETE /api/admin/taxonomy/subcategories/:id` disable subcategory
- `GET /api/admin/products?q=&categoryId=&page=&pageSize=` list products
- `POST /api/admin/products` create product + variants
- `GET /api/admin/products/:id` product detail
- `PATCH /api/admin/products/:id` update product + variants
- `DELETE /api/admin/products/:id` disable product
- `POST /api/admin/products/upload-image` upload image (jpeg/png/webp, max 5MB)
- `GET /api/admin/customers?q=&page=&pageSize=` list customers
- `GET /api/admin/customers/:id` customer detail
- `POST /api/admin/customers` create customer
- `PATCH /api/admin/customers/:id` update customer
- `DELETE /api/admin/customers/:id` disable customer
- `GET /api/admin/orders?q=&status=&page=&pageSize=` list orders
- `GET /api/admin/orders/:id` order detail
- `POST /api/admin/orders` create order
- `PATCH /api/admin/orders/:id` update order
- `POST /api/admin/orders/:id/send-telegram` send order to Telegram
- `POST /api/internal/process-notifications` internal worker (`x-internal-secret`)

## Tests

```bash
pnpm --filter @plumbing/web test
pnpm --filter @plumbing/web test:db
pnpm --filter @plumbing/web test:ui
```

DB tests require a running test database and both `DATABASE_URL` and `DATABASE_URL_TEST` pointing to it. Example:

```bash
DATABASE_URL_TEST=postgresql://postgres:postgres@localhost:5432/plumbing_store_test \
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/plumbing_store_test \
pnpm --filter @plumbing/web test:db
```

## Command reference

```bash
# Install
pnpm -w install

# Database
pnpm --filter @plumbing/db run db:generate
pnpm --filter @plumbing/db run db:migrate
pnpm --filter @plumbing/db run db:reset
pnpm --filter @plumbing/db run prisma:seed
pnpm --filter @plumbing/db run prisma:studio

# Web
pnpm --filter @plumbing/web run dev
pnpm --filter @plumbing/web run build
pnpm --filter @plumbing/web run typecheck
pnpm --filter @plumbing/web run lint

# Tests
pnpm --filter @plumbing/web test
pnpm --filter @plumbing/web test:db
pnpm --filter @plumbing/web test:ui

# Docker (local DB)
docker compose -f infra/docker/compose.yml up -d
docker compose -f infra/docker/compose.yml down
docker compose -f infra/docker/compose.test.yml up -d
docker compose -f infra/docker/compose.test.yml down
```
