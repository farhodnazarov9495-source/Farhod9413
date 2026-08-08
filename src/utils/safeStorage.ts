import { Order } from '../types';

/**
 * Strips GPS coordinates, cheque photos, and voice messages for delivered and cancelled orders,
 * keeping only the mahalla name in address.
 */
export function cleanCompletedOrCancelledOrder(order: Order): Order {
  if (!order) return order;
  if (order.status !== 'Yetkazildi' && order.status !== 'Bekor qilindi') {
    return order;
  }

  const copy = { ...order };

  // Remove voice messages
  delete copy.adminVoiceUrl;

  // Remove cheque images
  delete copy.uploadedChequeUrl;
  delete copy.uploadedChequeUrls;

  // Retain ONLY mahalla name in address, stripping GPS coordinates and comments
  if (copy.address) {
    copy.address = {
      mahalla: copy.address.mahalla || '',
      comment: ''
    };
  }

  // Remove voice urls from products/items
  if (Array.isArray(copy.items)) {
    copy.items = copy.items.map(item => {
      if (!item) return item;
      const iCopy = { ...item };
      delete (iCopy as any).voiceUrl;
      if (iCopy.product) {
        const pCopy = { ...iCopy.product };
        delete pCopy.voiceUrl;
        iCopy.product = pCopy;
      }
      return iCopy;
    });
  }

  return copy;
}

/**
 * Strips or truncates huge base64 strings and limits total stored items
 * to prevent localStorage QuotaExceededError (~5MB limit).
 */
export function sanitizeOrdersForStorage(orders: Order[]): Order[] {
  if (!Array.isArray(orders)) return [];

  // Limit orders array length to prevent infinite growth in local cache
  const trimmed = orders.slice(0, 100);

  return trimmed.map(order => {
    let copy = { ...order };

    // Apply strict completed/cancelled order cleaning
    if (copy.status === 'Yetkazildi' || copy.status === 'Bekor qilindi') {
      copy = cleanCompletedOrCancelledOrder(copy);
    } else {
      // Sanitize adminVoiceUrl if it's a huge base64 string
      if (copy.adminVoiceUrl && copy.adminVoiceUrl.length > 30000) {
        delete copy.adminVoiceUrl;
      }

      // Sanitize items' voiceUrls or images if they are huge base64
      if (Array.isArray(copy.items)) {
        copy.items = copy.items.map(item => {
          if (!item || !item.product) return item;
          const pCopy = { ...item.product };

          if (pCopy.voiceUrl && pCopy.voiceUrl.length > 30000) {
            delete pCopy.voiceUrl;
          }
          if (pCopy.image && pCopy.image.startsWith('data:') && pCopy.image.length > 50000) {
            delete pCopy.image;
          }

          return { ...item, product: pCopy };
        });
      }
    }

    return copy;
  });
}

/**
 * Safely sets an item in localStorage without throwing QuotaExceededError or unhandled exceptions.
 */
export function safeSetItem(key: string, value: string): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(key, value);
  } catch (err) {
    console.warn(`localStorage.setItem failed for key "${key}":`, err);

    if (key === 'kasbigo-orders-list') {
      try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) {
          const sanitized = sanitizeOrdersForStorage(parsed);
          localStorage.setItem(key, JSON.stringify(sanitized));
          return;
        }
      } catch (e) {
        try {
          const parsed = JSON.parse(value);
          if (Array.isArray(parsed)) {
            const sanitized = sanitizeOrdersForStorage(parsed.slice(0, 40));
            localStorage.setItem(key, JSON.stringify(sanitized));
            return;
          }
        } catch (e2) {}
      }
    }
  }
}

/**
 * Specialized safe order list saver
 */
export function safeSetOrdersItem(orders: Order[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('kasbigo-orders-list', JSON.stringify(orders));
  } catch (err) {
    console.warn("safeSetOrdersItem initial setItem failed, applying sanitization...", err);
    try {
      const sanitized = sanitizeOrdersForStorage(orders);
      localStorage.setItem('kasbigo-orders-list', JSON.stringify(sanitized));
    } catch (err2) {
      console.warn("safeSetOrdersItem sanitized setItem failed, applying aggressive trimming...", err2);
      try {
        const minimal = sanitizeOrdersForStorage(orders.slice(0, 30));
        localStorage.setItem('kasbigo-orders-list', JSON.stringify(minimal));
      } catch (err3) {
        console.error("safeSetOrdersItem failed completely (quota exceeded):", err3);
      }
    }
  }
}
