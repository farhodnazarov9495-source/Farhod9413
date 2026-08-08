import { CartItem, Store } from '../types';

/**
 * Utility functions for payment method restrictions across KasbiGo.
 *
 * Business Rule:
 * If ANY order/item category is in mandatoryCategories (e.g., 'Fast Food', 'Oshxona', 'Gullar')
 * OR order total amount > maxCashLimit (cashlessLimit):
 * "Naqd" (Cash) payment option is strictly prohibited. Only "Online" (Online payment) is allowed.
 */

const DEFAULT_MANDATORY_CATEGORIES = ['Fast Food', 'fastfood', 'fast_food', 'Oshxona', 'Gullar'];

/**
 * Normalizes a category string for strict matching (strips non-alphanumeric characters)
 */
const normalizeCategory = (cat: string | undefined | null): string => {
  if (!cat) return '';
  return cat.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
};

/**
 * Checks if cash payment ("Naqd") is allowed for the given category, order amount, and max cash limit.
 */
export function isCashPaymentAllowed(
  category: string | undefined | null,
  amount: number,
  maxCashLimit: number,
  mandatoryCategories: string[] = DEFAULT_MANDATORY_CATEGORIES
): boolean {
  if (category) {
    const norm = normalizeCategory(category);
    if (norm) {
      const activeMandatory = (mandatoryCategories && mandatoryCategories.length > 0) 
        ? mandatoryCategories 
        : DEFAULT_MANDATORY_CATEGORIES;

      const isRestrictedCategory = activeMandatory.some(mc => {
        const mcNorm = normalizeCategory(mc);
        if (!mcNorm) return false;
        return norm === mcNorm || norm.includes(mcNorm) || mcNorm.includes(norm);
      });

      if (isRestrictedCategory) {
        return false;
      }
    }
  }

  if (typeof amount === 'number' && amount > maxCashLimit) {
    return false;
  }

  return true;
}

/**
 * Returns allowed payment methods for given category, amount, and maxCashLimit.
 * Returns ['Online'] if cash is disallowed, otherwise ['Naqd', 'Online'].
 */
export function getAllowedPaymentMethods(
  category: string | undefined | null,
  amount: number,
  maxCashLimit: number,
  mandatoryCategories: string[] = DEFAULT_MANDATORY_CATEGORIES
): ('Naqd' | 'Online')[] {
  if (isCashPaymentAllowed(category, amount, maxCashLimit, mandatoryCategories)) {
    return ['Naqd', 'Online'];
  }
  return ['Online'];
}

/**
 * Requirement A:
 * Checks if the cart or order requires online payment (disallowing cash).
 * Returns true if AT LEAST ONE category in the cart (or draft order) belongs to mandatoryCategories
 * OR if totalAmount exceeds maxCashLimit.
 */
export function doesCartRequireOnlinePayment(
  items: CartItem[] = [],
  stores: Store[] = [],
  mandatoryCategories: string[] = DEFAULT_MANDATORY_CATEGORIES,
  totalAmount: number = 0,
  maxCashLimit: number = 150000,
  extraCategories: (string | undefined | null)[] = []
): boolean {
  return getMandatoryOnlineReason(items, stores, mandatoryCategories, totalAmount, maxCashLimit, "+998712004545", extraCategories).isMandatory;
}

/**
 * Returns the exact warning message for mandatory online payment.
 * Priority 1: Category constraint (Task 4)
 * Priority 2: Max Cash limit constraint (Task 5)
 * If both conditions are met at the same time, ONLY priority 1 (category) warning is returned.
 */
export function getMandatoryOnlineReason(
  items: CartItem[] = [],
  stores: Store[] = [],
  mandatoryCategories: string[] = DEFAULT_MANDATORY_CATEGORIES,
  totalAmount: number = 0,
  maxCashLimit: number = 150000,
  adminPhone: string = "+998712004545",
  extraCategories: (string | undefined | null)[] = []
): { isMandatory: boolean; reasonText: string; type?: 'category' | 'amount' } {
  const activeMandatory = (mandatoryCategories && mandatoryCategories.length > 0) 
    ? mandatoryCategories 
    : DEFAULT_MANDATORY_CATEGORIES;

  // 1. Gather all categories present across cart items and extra categories
  const categoriesSet = new Set<string>();

  extraCategories.forEach(cat => {
    if (cat && cat.trim()) categoriesSet.add(cat.trim());
  });

  items.forEach(item => {
    if ((item as any).storeCategory) {
      categoriesSet.add((item as any).storeCategory);
    }
    const store = stores.find(s => s.id === item.storeId);
    if (store && store.category && store.category.trim()) {
      categoriesSet.add(store.category.trim());
    }
  });

  // Check category match first (Task 4)
  let categoryMatch = false;
  for (const cat of categoriesSet) {
    const norm = normalizeCategory(cat);
    if (!norm) continue;

    const isMandatory = activeMandatory.some(mc => {
      const mcNorm = normalizeCategory(mc);
      if (!mcNorm) return false;
      return norm === mcNorm || norm.includes(mcNorm) || mcNorm.includes(norm);
    });

    if (isMandatory) {
      categoryMatch = true;
      break;
    }
  }

  if (categoryMatch) {
    return {
      isMandatory: true,
      type: 'category',
      reasonText: `Diqqat! Onlayn to'lov majburiy. Siz tanlagan ba'zi mahsulotlarga oldindan (onlayn) to'lov tizimi amal qiladi. Naqd to'lamoqchi bo'lsangiz, admin bilan bog'laning: ${adminPhone}. Tushunganingiz uchun rahmat!`
    };
  }

  // Check amount limit next (Task 5)
  if (typeof totalAmount === 'number' && totalAmount > maxCashLimit) {
    const formattedLimit = maxCashLimit.toLocaleString('uz-UZ');
    return {
      isMandatory: true,
      type: 'amount',
      reasonText: `Diqqat! Onlayn to'lov majburiy. Hurmatli mijoz, ${formattedLimit} so'mdan ortiq to'lovlar uchun oldindan (onlayn) to'lov tizimi amal qiladi. Naqd to'lamoqchi bo'lsangiz, admin bilan bog'laning: ${adminPhone}. Tushunganingiz uchun rahmat!`
    };
  }

  return { isMandatory: false, reasonText: '' };
}

