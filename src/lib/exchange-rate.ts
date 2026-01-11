import type { Currency, ExchangeRates } from './types';

const BASE_URL = 'https://api.frankfurter.dev/v1';

// In-memory cache for exchange rates
// Key format: "CURRENCY-YYYY-MM-DD"
const rateCache = new Map<string, ExchangeRates>();

function getCacheKey(currency: Currency, date: string): string {
  return `${currency}-${date}`;
}

interface FrankfurterResponse {
  base: string;
  date: string;
  rates: Record<string, number>;
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

  try {
    // Check if date is today or in the future
    const todayStr = new Date().toISOString().split('T')[0];
    const isToday = date === todayStr;
    const isFuture = date > todayStr;
    
    // Use latest endpoint for today or future dates, historical endpoint for past dates
    const endpoint = (isToday || isFuture) ? 'latest' : date;
    const url = `${BASE_URL}/${endpoint}?base=${fromCurrency}&symbols=CAD,USD`;
    
    console.log(`Fetching rates: ${fromCurrency} for date ${date} (endpoint: ${endpoint})`);

    const response = await fetch(url);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Frankfurter API error (${response.status}):`, errorText);
      throw new Error(`Exchange rate API error: ${response.status} - ${errorText.substring(0, 100)}`);
    }

    const data: FrankfurterResponse = await response.json();

    if (!data.rates) {
      console.error('Invalid response from Frankfurter API:', data);
      throw new Error('Invalid response from exchange rate API');
    }

    // Build the rates object
    // If fromCurrency is CAD, rates.USD gives us CAD to USD rate
    // If fromCurrency is USD, rates.CAD gives us USD to CAD rate
    // If fromCurrency is something else, rates.CAD and rates.USD give us rates from that currency
    let rates: ExchangeRates;

    if (fromCurrency === 'CAD') {
      // Base is CAD, so CAD = 1, get USD rate from response
      const usdRate = data.rates.USD;
      if (!usdRate) {
        throw new Error('USD rate not found in response');
      }
      rates = { CAD: 1, USD: usdRate };
    } else if (fromCurrency === 'USD') {
      // Base is USD, so USD = 1, get CAD rate from response
      const cadRate = data.rates.CAD;
      if (!cadRate) {
        throw new Error('CAD rate not found in response');
      }
      rates = { CAD: cadRate, USD: 1 };
    } else {
      // Base is another currency, get both CAD and USD rates
      const cadRate = data.rates.CAD;
      const usdRate = data.rates.USD;
      if (!cadRate || !usdRate) {
        throw new Error('CAD or USD rate not found in response');
      }
      // Convert to rates relative to the fromCurrency
      // If we have EUR -> CAD and EUR -> USD, we need to calculate CAD and USD relative to fromCurrency
      // Actually, the rates are already from fromCurrency to CAD/USD, so we can use them directly
      // But we need to normalize them to have fromCurrency = 1
      // Wait, the response gives us rates FROM fromCurrency TO CAD/USD
      // So if fromCurrency is EUR and we get rates.CAD = 1.5, that means 1 EUR = 1.5 CAD
      // But our ExchangeRates interface expects rates relative to the fromCurrency
      // So if fromCurrency is EUR, we want { CAD: 1.5, USD: 1.1 } meaning 1 EUR = 1.5 CAD and 1 EUR = 1.1 USD
      // That's exactly what the API gives us!
      rates = { CAD: cadRate, USD: usdRate };
    }

    // Cache the result
    rateCache.set(cacheKey, rates);

    console.log(`Fetched rates for ${fromCurrency} on ${date}:`, rates);
    return rates;
  } catch (error) {
    console.error('Failed to fetch exchange rates:', error);
    throw new Error('Failed to fetch exchange rates');
  }
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
