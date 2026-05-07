# Plumbing Storefront

Independent e-commerce storefront app for the shared plumbing catalog.

## Scope

- `/` renders the storefront marketing/home experience.
- `/shop` renders the retail product browsing and cart flow.
- Storefront-specific components live in `src/components/retail`, `src/components/avantech`, `src/lib/retail`, and `src/lib/cart`.
- Product data comes from `@plumbing/catalog`, which reads the same Prisma-backed database as `apps/web`.
- Do not add admin/product-management routes here. Those stay in `apps/web`.

## Local Development

From the repository root:

```bash
pnpm --filter @plumbing/storefront run dev
```

The default dev port is `3001`; override it with `PORT=3002` if needed.

The app loads environment variables from the repository root `.env`, root `.env.local`, and app-local `.env` files. It needs the same database and notification environment values used by the main web app.

## Build And Checks

```bash
pnpm --filter @plumbing/storefront run lint
pnpm --filter @plumbing/storefront run typecheck
pnpm --filter @plumbing/storefront run build
```

## Vercel Deployment

Deploy the storefront from the repository root, not from `apps/storefront`.
The storefront depends on the workspace packages in `packages/catalog` and
`packages/db`, so Vercel must see the root `pnpm-lock.yaml`,
`pnpm-workspace.yaml`, and shared packages.

From the repository root:

```bash
vercel link
vercel --prod
```

The root `vercel.json` is configured for the storefront:

- Install Command: `pnpm install --frozen-lockfile`
- Build Command: `pnpm --filter @plumbing/db run prisma:generate && pnpm --filter @plumbing/storefront run build`
- Output Directory: `apps/storefront/.next`

If configuring the project in the Vercel dashboard/Git integration, keep the
project root at the repository root. Do not set the root directory to
`apps/storefront`, otherwise Vercel may run `npm install` inside the app and
fail on `workspace:^` dependencies.

Set the production environment variables in Vercel before deploying:

- `DATABASE_URL`
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_CHAT_ID`
- `INTERNAL_SECRET`
- `WHATSAPP_PHONE_NUMBER_ID`
- `WHATSAPP_BUSINESS_ACCESS_TOKEN`
- `WHATSAPP_API_VERSION`
- `WHATSAPP_RECIPIENTS`
- `WHATSAPP_MODE`
- `WHATSAPP_TEMPLATE_NAME_ORDER`
- `WHATSAPP_TEMPLATE_LANG`
- `S3_PUBLIC_BASE_URL`
