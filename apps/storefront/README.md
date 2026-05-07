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

Create a separate Vercel project for this app with Root Directory set to
`apps/storefront`. Do not use the same Vercel project as `apps/web`.

This app has its own `vercel.json`:

- Install Command: `cd ../.. && pnpm install --frozen-lockfile`
- Build Command: `cd ../.. && pnpm --filter @plumbing/db run prisma:generate && pnpm --filter @plumbing/storefront run build`
- Output Directory: `.next`

The `cd ../..` prefix is intentional. The app depends on workspace packages in
`packages/catalog` and `packages/db`, so the build must install and build from
the monorepo root while Vercel still publishes this app's `.next` directory.

In the Vercel dashboard, keep "Include source files outside of the Root
Directory in the Build Step" enabled so the shared workspace packages are
available during install and build.

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
