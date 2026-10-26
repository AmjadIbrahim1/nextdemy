export const formatMoney = (
  amount: number,
  currency: string,
  locale = "en-EG"
): string =>
  new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  }).format(amount);

export const toMinorUnits = (amount: number): number =>
  Math.round(amount * 100);

export const fromMinorUnits = (amount: number): number => amount / 100;
