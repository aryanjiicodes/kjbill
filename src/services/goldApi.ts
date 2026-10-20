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
