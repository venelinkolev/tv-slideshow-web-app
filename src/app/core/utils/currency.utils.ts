// src/app/core/utils/currency.utils.ts

/**
 * Currency conversion utilities
 * 
 * Temporary EUR currency support for promotional period
 * BGN to EUR conversion rate: 1.95583 (fixed rate)
 */

/**
 * Convert BGN price to EUR with proper formatting
 * Formula: EUR = BGN / 1.95583
 * 
 * @param bgnPrice - Price in BGN
 * @returns Formatted EUR price string with € symbol (e.g., "15.32 €")
 */
export function convertBgnToEur(bgnPrice: number): string {
    const eurPrice = bgnPrice / 1.95583;
    return eurPrice.toFixed(2) + ' €';
}

/**
 * Check if EUR currency should be displayed
 * Returns true if current date is before the end date
 * 
 * Configuration:
 * - Enable date: Immediate (when deployed)
 * - Disable date: 2025-02-28 23:59:59 (end of February)
 * 
 * To disable EUR display:
 * - Option 1: Change the date to past date
 * - Option 2: Simply return false
 * 
 * @returns true if EUR should be shown, false otherwise
 */
export function shouldShowEurCurrency(): boolean {
    // ✅ SET END DATE HERE - Easy to change
    const enabledUntil = new Date('2026-12-31T23:59:59');

    // ✅ QUICK DISABLE - Uncomment line below to disable immediately
    // return false;

    return new Date() <= enabledUntil;
}