/**
 * GST + multi-currency helpers for Module 5 (Budget & Financial Tracking).
 *
 * Per PRD §4 Module 5: GST tax handling (CGST/SGST/IGST, HSN/SAC).
 *
 * GST rules (India):
 *   - Intra-state supply  → CGST + SGST (each = half of applicable rate)
 *   - Inter-state supply  → IGST (full rate)
 *   - Export / non-GST    → none
 *
 * Common HSN/SAC rates (defaults if vendor doesn't specify):
 *   - 9983 (IT/Software services)  → 18%
 *   - 9985 (Packaged software)     → 18%
 *   - 998314 (Consulting)          → 18%
 *   - Hardware (most HSN)          → 18% (laptops), 12% (some peripherals)
 *
 * This is a simplified engine — production use should integrate with a
 * proper GST engine (ClearTax/Zoho Books APIs) before filing returns.
 */

/** Standard GST slabs in India (2026) */
export const GST_RATES = {
  exempt: 0,
  low: 5,
  standard_12: 12,
  standard_18: 18,
  high: 28,
} as const

/** Map common HSN/SAC codes to default GST rates */
export const HSN_SAC_DEFAULT_RATES: Record<string, number> = {
  // IT services
  '9983': 18,         // IT/software services
  '998314': 18,       // Consulting
  '9985': 18,         // Packaged software
  '998361': 18,       // Software dev
  '998362': 18,       // Software implementation
  // Hardware
  '8471': 18,         // Laptops/desktops
  '8471.30': 18,      // Portable computers
  '8471.50': 18,      // Desktops
  '8523': 18,         // Storage media
  '8517': 18,         // Phones
  // Office supplies
  '4820': 18,         // Office stationery
  '4901': 0,          // Books (exempt)
}

/** Common currency codes → symbol + decimal places */
export const CURRENCIES: Record<string, { symbol: string; decimals: number; name: string }> = {
  INR: { symbol: '₹', decimals: 0, name: 'Indian Rupee' },
  USD: { symbol: '$', decimals: 2, name: 'US Dollar' },
  EUR: { symbol: '€', decimals: 2, name: 'Euro' },
  GBP: { symbol: '£', decimals: 2, name: 'British Pound' },
  AED: { symbol: 'AED', decimals: 2, name: 'UAE Dirham' },
  SGD: { symbol: 'S$', decimals: 2, name: 'Singapore Dollar' },
  AUD: { symbol: 'A$', decimals: 2, name: 'Australian Dollar' },
  CAD: { symbol: 'C$', decimals: 2, name: 'Canadian Dollar' },
  JPY: { symbol: '¥', decimals: 0, name: 'Japanese Yen' },
}

/**
 * Approximate FX rates relative to INR (base = INR).
 * These are FALLBACK rates used when no live API is configured.
 * In production, set FX_API_URL + FX_API_KEY env vars to fetch live rates
 * daily from RBI or a paid FX API (openexchangerates.org, fixer.io, etc.).
 */
export const FX_RATES_TO_INR: Record<string, number> = {
  INR: 1,
  USD: 83.5,
  EUR: 90.2,
  GBP: 105.8,
  AED: 22.75,
  SGD: 62.4,
  AUD: 55.1,
  CAD: 61.3,
  JPY: 0.55,
}

// Cache for live rates — refreshed every 6 hours
let liveRatesCache: { rates: Record<string, number>; fetchedAt: number } | null = null
const LIVE_CACHE_TTL_MS = 6 * 60 * 60 * 1000 // 6 hours

/**
 * Fetch live FX rates from the configured API, if any.
 * Falls back to static FX_RATES_TO_INR if no API is configured or fetch fails.
 *
 * Supported APIs (set via env):
 *   - FX_API_URL=https://openexchangerates.org/api/latest.json?app_id=YOUR_ID&base=INR
 *   - FX_API_URL=https://api.fixer.io/latest?base=INR&access_key=YOUR_KEY
 *
 * The response must include a `rates` object mapping currency codes to rates.
 */
async function getLiveRates(): Promise<Record<string, number>> {
  const now = Date.now()
  if (liveRatesCache && now - liveRatesCache.fetchedAt < LIVE_CACHE_TTL_MS) {
    return liveRatesCache.rates
  }

  const apiUrl = process.env.FX_API_URL
  if (!apiUrl) {
    return FX_RATES_TO_INR
  }

  try {
    const res = await fetch(apiUrl, { signal: AbortSignal.timeout(5000) })
    if (!res.ok) throw new Error(`FX API returned ${res.status}`)
    const json = await res.json()
    // OpenExchangeRates format: { rates: { USD: 0.012, EUR: 0.011, ... } }
    // Fixer format: { rates: { USD: 0.012, EUR: 0.011, ... } }
    // Both use base=INR if configured, so rates are 1 INR → X foreign
    // We need the inverse: X foreign → 1 INR
    const apiRates = json.rates as Record<string, number>
    if (!apiRates) throw new Error('No "rates" field in FX API response')

    // Convert: API gives 1 INR = X foreign; we want 1 foreign = Y INR
    const ratesToINR: Record<string, number> = { INR: 1 }
    for (const [currency, rateFromINR] of Object.entries(apiRates)) {
      if (rateFromINR > 0) {
        ratesToINR[currency] = 1 / rateFromINR
      }
    }

    liveRatesCache = { rates: ratesToINR, fetchedAt: now }
    console.log(`[fx] Live rates fetched for ${Object.keys(ratesToINR).length} currencies`)
    return ratesToINR
  } catch (err) {
    console.warn(`[fx] Live fetch failed, using static rates:`, err instanceof Error ? err.message : err)
    return FX_RATES_TO_INR
  }
}

export interface GstBreakdown {
  gstType: 'none' | 'intra' | 'inter'
  cgstRate: number
  sgstRate: number
  igstRate: number
  cgstAmount: number
  sgstAmount: number
  igstAmount: number
  totalTax: number
  totalWithTax: number
}

/**
 * Compute GST breakdown given a base amount, GST type, and rate.
 *
 * @param amount - base amount (pre-tax)
 * @param gstType - 'none' | 'intra' (CGST+SGST) | 'inter' (IGST)
 * @param rate - the full GST rate (e.g. 18 for 18%)
 */
export function computeGst(amount: number, gstType: 'none' | 'intra' | 'inter', rate: number): GstBreakdown {
  if (gstType === 'none' || rate === 0) {
    return {
      gstType: 'none',
      cgstRate: 0, sgstRate: 0, igstRate: 0,
      cgstAmount: 0, sgstAmount: 0, igstAmount: 0,
      totalTax: 0, totalWithTax: amount,
    }
  }
  if (gstType === 'intra') {
    const half = rate / 2
    const cgst = round2(amount * half / 100)
    const sgst = round2(amount * half / 100)
    return {
      gstType: 'intra',
      cgstRate: half, sgstRate: half, igstRate: 0,
      cgstAmount: cgst, sgstAmount: sgst, igstAmount: 0,
      totalTax: cgst + sgst, totalWithTax: round2(amount + cgst + sgst),
    }
  }
  // inter
  const igst = round2(amount * rate / 100)
  return {
    gstType: 'inter',
    cgstRate: 0, sgstRate: 0, igstRate: rate,
    cgstAmount: 0, sgstAmount: 0, igstAmount: igst,
    totalTax: igst, totalWithTax: round2(amount + igst),
  }
}

/**
 * Look up a default GST rate for an HSN/SAC code.
 */
export function lookupHsnRate(hsnSac: string | null | undefined): number | null {
  if (!hsnSac) return null
  const trimmed = hsnSac.trim()
  // Try exact match first, then prefix match
  if (HSN_SAC_DEFAULT_RATES[trimmed] !== undefined) return HSN_SAC_DEFAULT_RATES[trimmed]
  // Try progressively shorter prefixes (8 chars, 6, 4)
  for (let len = 8; len >= 4; len -= 2) {
    if (trimmed.length >= len) {
      const prefix = trimmed.slice(0, len)
      if (HSN_SAC_DEFAULT_RATES[prefix] !== undefined) return HSN_SAC_DEFAULT_RATES[prefix]
    }
  }
  return null
}

/**
 * Convert an amount from one currency to another.
 * Uses live FX rates if FX_API_URL is configured, otherwise falls back to static rates.
 * Returns the converted amount and the rate used.
 */
export async function convertCurrency(
  amount: number,
  from: string,
  to: string
): Promise<{ converted: number; rate: number }> {
  if (from === to) return { converted: amount, rate: 1 }
  const rates = await getLiveRates()
  const fromRate = rates[from]
  const toRate = rates[to]
  if (!fromRate || !toRate) {
    throw new Error(`Unsupported currency pair: ${from} → ${to}`)
  }
  // Convert via INR as base
  const rate = fromRate / toRate
  return { converted: round2(amount * rate), rate }
}

/**
 * Synchronous version using static rates only (for backwards compat).
 * Prefer `convertCurrency` (async) for live rates.
 */
export function convertCurrencyStatic(
  amount: number,
  from: string,
  to: string
): { converted: number; rate: number } {
  if (from === to) return { converted: amount, rate: 1 }
  const fromRate = FX_RATES_TO_INR[from]
  const toRate = FX_RATES_TO_INR[to]
  if (!fromRate || !toRate) {
    throw new Error(`Unsupported currency pair: ${from} → ${to}`)
  }
  const rate = fromRate / toRate
  return { converted: round2(amount * rate), rate }
}

/**
 * Format a money amount with the correct symbol and decimal places.
 */
export function formatMoney(amount: number, currency: string = 'INR'): string {
  const c = CURRENCIES[currency] || { symbol: currency + ' ', decimals: 2 }
  return new Intl.NumberFormat('en-IN', {
    style: 'decimal',
    minimumFractionDigits: c.decimals,
    maximumFractionDigits: c.decimals,
  }).format(amount) + ' ' + c.symbol.trim()
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}
