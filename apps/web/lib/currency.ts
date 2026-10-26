export const CURRENCY = process.env.NEXT_PUBLIC_CURRENCY ?? "EGP";

const currencyFormatter = new Intl.NumberFormat("en-EG", {
  style: "currency",
  currency: CURRENCY,
  maximumFractionDigits: 0,
});

const preciseCurrencyFormatter = new Intl.NumberFormat("en-EG", {
  style: "currency",
  currency: CURRENCY,
  maximumFractionDigits: 2,
});

export const formatCurrency = (amount: number): string =>
  currencyFormatter.format(amount);

export const formatMinorUnits = (amount: number): string =>
  preciseCurrencyFormatter.format(amount / 100);

export const formatCompactCurrency = (amount: number): string => {
  if (Math.abs(amount) >= 1_000_000) {
    return `${formatCurrency(amount / 1_000_000)}M`;
  }
  if (Math.abs(amount) >= 1_000) {
    return `${formatCurrency(amount / 1_000)}K`;
  }
  return formatCurrency(amount);
};
