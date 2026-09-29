import { getRateForDate } from './usdRates';

/**
 * Fetches the current Dólar Blue sell rate from Bluelytics API or falls back to historical table.
 */
export async function getDollarBlueRate(): Promise<number> {
  try {
    const res = await fetch('https://api.bluelytics.com.ar/v2/latest', {
      next: { revalidate: 3600 },
    });
    if (!res.ok) {
      throw new Error(`HTTP error ${res.status}`);
    }
    const data = await res.json();
    if (data && data.blue && typeof data.blue.value_sell === 'number') {
      return data.blue.value_sell;
    }
    throw new Error('Invalid response structure');
  } catch (error) {
    console.error('Error fetching Dollar Blue rate from API:', error);
    const nowStr = new Date().toISOString().substring(0, 7);
    return getRateForDate(nowStr, 1450);
  }
}

/**
 * Resolves the dollar rate for a specific transaction date.
 * If the transaction date belongs to the current month, attempts to use liveRate if provided.
 * Otherwise uses historical usdRates dict for past months.
 */
export function resolveRateForTxDate(dateStr?: string | null, liveRate?: number): number {
  if (!dateStr) return liveRate || 1450;
  const txYearMonth = dateStr.split('T')[0].substring(0, 7);
  const currentYearMonth = new Date().toISOString().substring(0, 7);

  if (txYearMonth === currentYearMonth && liveRate && liveRate > 0) {
    return liveRate;
  }

  return getRateForDate(dateStr, liveRate || 1450);
}
