import { NextRequest, NextResponse } from 'next/server';
import { getExchangeRates } from '@/lib/exchange-rate';
import type { ApiResponse, Currency, ExchangeRateResponse } from '@/lib/types';
import { CURRENCIES } from '@/lib/types';

export async function GET(
  request: NextRequest
): Promise<NextResponse<ApiResponse<ExchangeRateResponse>>> {
  console.log('Exchange rate API called');
  const searchParams = request.nextUrl.searchParams;
  const from = searchParams.get('from') as Currency;
  const date = searchParams.get('date');
  
  console.log('Params:', { from, date });

  // Validate currency
  if (!from || !CURRENCIES.includes(from)) {
    return NextResponse.json(
      {
        success: false,
        error: `Invalid currency. Must be one of: ${CURRENCIES.join(', ')}`,
      },
      { status: 400 }
    );
  }

  // Validate date
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json(
      {
        success: false,
        error: 'Invalid date. Must be in YYYY-MM-DD format',
      },
      { status: 400 }
    );
  }

  // For future dates, use today's rates
  const today = new Date().toISOString().split('T')[0];
  const effectiveDate = date > today ? today : date;

  try {
    const rates = await getExchangeRates(from, effectiveDate);

    return NextResponse.json({
      success: true,
      data: {
        from,
        date,
        rates,
      },
    });
  } catch (error) {
    console.error('Error fetching exchange rates:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch exchange rates',
      },
      { status: 500 }
    );
  }
}
