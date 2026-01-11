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
    // Always use latest rates endpoint
    // The free plan doesn't support historical data, so we always fetch current rates
    // regardless of the requested date
    const todayStr = new Date().toISOString().split('T')[0];
    console.log(`Requested date: ${date}, Today: ${todayStr}, Using latest rates (free plan limitation)`);

    let rates: ExchangeRates;

    if (fromCurrency === 'CAD') {
      // CAD is base, get USD rate (always use latest rates)
      const usdRate = await fetchRate('CAD', 'USD', todayStr, true);
      rates = { CAD: 1, USD: usdRate };
    } else if (fromCurrency === 'USD') {
      // USD is base, get CAD rate (always use latest rates)
      const cadRate = await fetchRate('USD', 'CAD', todayStr, true);
      rates = { CAD: cadRate, USD: 1 };
    } else {
      // Other currency, get both CAD and USD rates (always use latest rates)
      const [cadRate, usdRate] = await Promise.all([
        fetchRate(fromCurrency, 'CAD', todayStr, true),
        fetchRate(fromCurrency, 'USD', todayStr, true),
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
    console.error('EXCHANGE_RATE_API_KEY is not configured. Available env vars:', Object.keys(process.env).filter(k => k.includes('EXCHANGE')));
    throw new Error('EXCHANGE_RATE_API_KEY not configured');
  }
  
  console.log(`Fetching rate: ${from} to ${to} for date ${date} (isToday: ${isToday})`);

  // exchangerate-api.com endpoints
  // Latest: /v6/{API_KEY}/latest/{BASE}
  // Historical: /v6/{API_KEY}/history/{BASE}/{YEAR}/{MONTH}/{DAY}

  let url: string;

  if (isToday) {
    url = `${BASE_URL}/${API_KEY}/latest/${from}`;
  } else {
    const [year, month, day] = date.split('-');
    if (!year || !month || !day) {
      throw new Error(`Invalid date format: ${date}`);
    }
    url = `${BASE_URL}/${API_KEY}/history/${from}/${year}/${month}/${day}`;
  }

  console.log(`Fetching exchange rate from: ${url.replace(API_KEY, '***')}`);

  const response = await fetch(url);

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`Exchange rate API error (${response.status}):`, errorText);
    throw new Error(`Exchange rate API error: ${response.status} - ${errorText.substring(0, 100)}`);
  }

  const data = await response.json();

  if (data.result !== 'success') {
    const errorType = data['error-type'] || 'Unknown error';
    console.error('Exchange rate API error:', errorType, data);
    throw new Error(`Exchange rate API error: ${errorType}`);
  }

  const rates = data.conversion_rates;

  if (!rates || !rates[to]) {
    console.error(`Rate not found for ${from} to ${to}. Available rates:`, Object.keys(rates || {}));
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
