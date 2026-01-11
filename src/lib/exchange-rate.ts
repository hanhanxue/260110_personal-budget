import type { Currency, ExchangeRates } from './types';

const API_KEY = process.env.EXCHANGE_RATE_API_KEY;
const BASE_URL = 'https://v6.exchangerate-api.com/v6';

// In-memory cache for exchange rates
// Key format: "CURRENCY-YYYY-MM-DD"
const rateCache = new Map<string, ExchangeRates>();

function getCacheKey(currency: Currency, date: string): string {
  return `${currency}-${date}`;
}

export async function getExchangeRates(
  fromCurrency: Currency,
  date: string
): Promise<ExchangeRates> {
  // Check cache first
  const cacheKey = getCacheKey(fromCurrency, date);
  const cached = rateCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  // If the currency is CAD, we need rates to USD
  // If the currency is USD, we need rates to CAD
  // For other currencies, we need rates to both CAD and USD

  try {
    // Use latest rates for today, historical for past dates
    const today = new Date().toISOString().split('T')[0];
    const isToday = date === today;

    let rates: ExchangeRates;

    if (fromCurrency === 'CAD') {
      // CAD is base, get USD rate
      const usdRate = await fetchRate('CAD', 'USD', date, isToday);
      rates = { CAD: 1, USD: usdRate };
    } else if (fromCurrency === 'USD') {
      // USD is base, get CAD rate
      const cadRate = await fetchRate('USD', 'CAD', date, isToday);
      rates = { CAD: cadRate, USD: 1 };
    } else {
      // Other currency, get both CAD and USD rates
      const [cadRate, usdRate] = await Promise.all([
        fetchRate(fromCurrency, 'CAD', date, isToday),
        fetchRate(fromCurrency, 'USD', date, isToday),
      ]);
      rates = { CAD: cadRate, USD: usdRate };
    }

    // Cache the result
    rateCache.set(cacheKey, rates);

    return rates;
  } catch (error) {
    console.error('Failed to fetch exchange rates:', error);
    throw new Error('Failed to fetch exchange rates');
  }
}

async function fetchRate(
  from: Currency,
  to: 'CAD' | 'USD',
  date: string,
  isToday: boolean
): Promise<number> {
  if (!API_KEY) {
    throw new Error('EXCHANGE_RATE_API_KEY not configured');
  }

  // exchangerate-api.com endpoints
  // Latest: /v6/{API_KEY}/latest/{BASE}
  // Historical: /v6/{API_KEY}/history/{BASE}/{YEAR}/{MONTH}/{DAY}

  let url: string;

  if (isToday) {
    url = `${BASE_URL}/${API_KEY}/latest/${from}`;
  } else {
    const [year, month, day] = date.split('-');
    url = `${BASE_URL}/${API_KEY}/history/${from}/${year}/${month}/${day}`;
  }

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Exchange rate API error: ${response.status}`);
  }

  const data = await response.json();

  if (data.result !== 'success') {
    throw new Error(`Exchange rate API error: ${data['error-type']}`);
  }

  const rates = data.conversion_rates;

  if (!rates || !rates[to]) {
    throw new Error(`Rate not found for ${from} to ${to}`);
  }

  return rates[to];
}

// Calculate converted amounts
export function convertAmount(
  amount: number,
  rates: ExchangeRates
): { cadAmount: number; usdAmount: number } {
  return {
    cadAmount: Math.round(amount * rates.CAD * 100) / 100,
    usdAmount: Math.round(amount * rates.USD * 100) / 100,
  };
}

// Clear cache (useful for testing)
export function clearRateCache(): void {
  rateCache.clear();
}
