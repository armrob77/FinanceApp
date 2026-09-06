import { SupportedCurrency } from '../types.ts';

export function formatCurrency(
  amount: number | string | null | undefined,
  currency: SupportedCurrency | string = 'CAD',
  options: { decimals?: number; showPlus?: boolean } = {}
): string {
  const num = typeof amount === 'string' ? parseFloat(amount) || 0 : amount ?? 0;
  const decimals = options.decimals ?? 2;

  const symbolMap: Record<string, string> = {
    CAD: 'CA$',
    USD: '$',
    EUR: '€',
    GBP: '£',
  };

  const symbol = symbolMap[currency] || '$';
  const prefix = options.showPlus && num > 0 ? '+' : '';

  // Format with commas and fixed decimals
  const formattedNumber = Math.abs(num).toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  if (num < 0) {
    return `-${symbol}${formattedNumber}`;
  }
  return `${prefix}${symbol}${formattedNumber}`;
}

export function formatPercent(value: number, showPlus: boolean = true): string {
  const prefix = showPlus && value > 0 ? '+' : '';
  return `${prefix}${value.toFixed(1)}%`;
}

export function formatDate(dateString: string): string {
  if (!dateString) return '';
  try {
    const parts = dateString.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const d = new Date(year, month, day);
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    }
    return dateString;
  } catch {
    return dateString;
  }
}

export function roundToCents(num: number): number {
  return Math.round((num + Number.EPSILON) * 100) / 100;
}
