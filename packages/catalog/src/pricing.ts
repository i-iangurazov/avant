export type PriceMode = 'wholesale' | 'retail';

type PriceLike = {
  price: number;
  priceRetail?: number | null;
};

export const resolveVariantPrice = (variant: PriceLike, mode: PriceMode = 'wholesale') => {
  if (mode === 'retail') {
    // TODO: keep retail price logic centralized here when admin tooling starts managing it separately.
    return variant.priceRetail ?? variant.price;
  }
  return variant.price;
};
