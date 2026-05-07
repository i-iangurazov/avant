# Product Surfaces

This repository now has two separate applications that intentionally share the same product database and catalog package.

## Core Admin And Catalogue

- Public catalogue entry: `/`.
- Backward-compatible catalogue alias: `/catalogue` redirects to `/`.
- Admin entry points: `/admin/products`, `/admin/taxonomy`, `/admin/customers`, `/admin/orders`.
- Product data source: Prisma-backed catalog data through `@plumbing/catalog` and `GET /api/catalog`.
- Catalogue scope: simple browsing, search, category/subcategory filtering, product cards, variants, and prices.
- Catalogue does not own cart, favourites, checkout, or storefront marketing flows.
- There must be no `/shop`, `/storefront-preview`, cart, favourites, checkout, or storefront marketing homepage routes in this app.

Run locally:

```bash
pnpm --filter @plumbing/web run dev
```

## Standalone E-commerce Storefront

- App location: `apps/storefront`.
- Storefront entry: `/`.
- Storefront shop: `/shop`.
- Scope: e-commerce homepage, retail product browsing, cart, checkout/request submission, language switcher, and storefront-specific layout/components.
- Product data source: `@plumbing/catalog`, which reads the same Prisma-backed product database as the web app.
- Order submission uses the same database-backed order model and notification helpers, not a separate static product source.
- This app is independently runnable and deployable from the admin/catalogue app.

Run locally:

```bash
pnpm --filter @plumbing/storefront run dev
```

## Shared Contracts

- Shared package: `packages/catalog`.
- Keep product, category, subcategory, variant, pricing, image, and order integrations backed by the shared database/API contracts.
- Do not duplicate catalog products into route-local fixtures for either surface.
- Checkout, cart, favourites, and retail marketing behavior belong to `apps/storefront` unless it is explicitly an admin order-management feature.
