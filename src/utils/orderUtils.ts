import { Order } from '../types';
import { safeSetItem } from './safeStorage';

/**
 * Renumbers an array of orders sequentially: KG000001, KG000002, KG000003...
 * Ensures there are no sequence gaps when orders are added or deleted.
 * Updates 'kasbigo-last-order-number' in localStorage.
 *
 * Note: Assumes index 0 is the newest order, index len-1 is the oldest order.
 */
export const renumberOrders = (ordersList: Order[]): Order[] => {
  if (!ordersList || !Array.isArray(ordersList)) return [];

  const len = ordersList.length;
  const renumbered = ordersList.map((order, index) => {
    const num = len - index;
    const newId = `KG${String(num).padStart(6, '0')}`;
    return { ...order, id: newId };
  });

  if (typeof window !== 'undefined') {
    safeSetItem('kasbigo-last-order-number', len.toString());
  }

  return renumbered;
};
