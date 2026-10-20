import { MetalRates } from '../types';

const API_BASE_URL = 'https://custom-gold-api-pu4h.onrender.com';

export interface LiveRateResult {
  gold24k: number;
  gold22k: number;
  gold18k: number;
  gold14k: number;
  silver999: number;
  silver925: number;
  source: string;
  timestamp: string;
  provider: string;
}

export async function fetchLiveBullionRates(sourceEndpoint: 'default' | 'ibja' = 'default'): Promise<LiveRateResult> {
  const goldEndpoint = sourceEndpoint === 'ibja' ? '/gold/ibja' : '/gold';
  const silverEndpoint = '/silver';

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12000); // 12s timeout for free-tier wakeups

  try {
    const [goldRes, silverRes] = await Promise.all([
      fetch(`${API_BASE_URL}${goldEndpoint}`, { signal: controller.signal }),
      fetch(`${API_BASE_URL}${silverEndpoint}`, { signal: controller.signal }),
    ]);

    clearTimeout(timeoutId);

    if (!goldRes.ok) {
      throw new Error(`Gold API returned HTTP ${goldRes.status}`);
    }

    const goldData = await goldRes.json();
    const silverData = silverRes.ok ? await silverRes.json() : null;

    // Parse Gold Prices
    const raw24k = goldData.prices?.['24k']?.per_gram || goldData.prices?.['24K']?.per_gram || 0;
    const raw22k = goldData.prices?.['22k']?.per_gram || goldData.prices?.['22K']?.per_gram || 0;

    const gold24k = Math.round(Number(raw24k)) || 14920;
    const gold22k = Math.round(Number(raw22k)) || Math.round(gold24k * 0.916);
    const gold18k = Math.round(gold24k * 0.75);
    const gold14k = Math.round(gold24k * (14 / 24));

    // Parse Silver Prices
    const rawSilver = silverData?.prices?.silver?.per_gram || silverData?.prices?.['silver']?.per_gram || 208;
    const silver999 = Math.round(Number(rawSilver) * 10) / 10 || 208;
    const silver925 = Math.round(silver999 * 0.925 * 10) / 10 || 192;

    const sourceName = goldData.meta?.source || (sourceEndpoint === 'ibja' ? 'IBJA Official' : 'All India Bullion');

    return {
      gold24k,
      gold22k,
      gold18k,
      gold14k,
      silver999,
      silver925,
      source: sourceName,
      timestamp: new Date().toISOString(),
      provider: goldData.provider || 'Bullion API',
    };
  } catch (err: any) {
    clearTimeout(timeoutId);
    console.error('Failed to fetch live bullion rates from custom-gold-api:', err);
    throw new Error(err.name === 'AbortError' ? 'Gold API request timed out' : err.message || 'Network error fetching gold rates');
  }
}

export type TrendDirection = 'up' | 'down' | 'same';

export interface RateTrendInfo {
  direction: TrendDirection;
  emoji: string;         // '🔼' | '🔽' | '➖'
  diff: number;          // Absolute difference
  diffText: string;      // "+₹15" or "-₹20" or "0"
  colorClass: string;    // 'text-emerald-400' | 'text-rose-400' | 'text-stone-400'
  bgClass: string;       // 'bg-emerald-950/60 text-emerald-300' etc
  borderClass: string;   // 'border-emerald-700/60' etc
}

export function getRateTrend(current: number, previous?: number): RateTrendInfo {
  if (previous === undefined || previous === null || previous === current || previous === 0) {
    return {
      direction: 'same',
      emoji: '➖',
      diff: 0,
      diffText: '0',
      colorClass: 'text-stone-400',
      bgClass: 'bg-stone-800/60 text-stone-300',
      borderClass: 'border-stone-700',
    };
  }

  if (current > previous) {
    const diff = Math.round((current - previous) * 10) / 10;
    return {
      direction: 'up',
      emoji: '🔼',
      diff,
      diffText: `+₹${diff}`,
      colorClass: 'text-emerald-400',
      bgClass: 'bg-emerald-950/60 text-emerald-300',
      borderClass: 'border-emerald-700/60',
    };
  } else {
    const diff = Math.round((previous - current) * 10) / 10;
    return {
      direction: 'down',
      emoji: '🔽',
      diff,
      diffText: `-₹${diff}`,
      colorClass: 'text-rose-400',
      bgClass: 'bg-rose-950/60 text-rose-300',
      borderClass: 'border-rose-700/60',
    };
  }
}
