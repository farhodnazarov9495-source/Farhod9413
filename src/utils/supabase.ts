/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { createClient } from '@supabase/supabase-js';
import { Store, Order } from '../types';
import { safeSetItem, safeSetOrdersItem } from './safeStorage';

const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// Table interfaces
export interface DbCourier {
  id: string;
  name: string;
  phone: string;
  password?: string;
  balance: number;
  is_online: boolean;
  is_blocked: boolean;
  transport: string;
  plate: string;
  rating: number;
  rating_count: number;
  orders_count: number;
  added_date: string;
  verified: boolean;
}

export interface DbOrder {
  id: string;
  items: string; // JSON string of CartItem[]
  total: number;
  store_name: string;
  address: string; // JSON string of Order['address']
  customer_name: string;
  customer_phone: string;
  payment_method: string;
  status: string;
  courier_comment?: string;
  admin_comment?: string;
  admin_voice_url?: string;
  price_breakdown_comment?: string;
  courier_claimed: boolean;
  is_manual_draft?: boolean;
  is_confirmed_by_customer?: boolean;
  is_custom_pending_price?: boolean;
  date: string;
  time: string;
  uploaded_cheque_url?: string;
  uploaded_cheque_urls?: string; // JSON string of string[]
  driver_rating?: number;
  claimed_at?: number;
  delivery_duration?: string;
  dispatched_at?: number;
  claimed_by?: string;
}

// Map database entities back and forth
export function mapDbCourierToApp(c: DbCourier) {
  return {
    id: c.id,
    name: c.name,
    phone: c.phone,
    password: c.password || '123456',
    balance: Number(c.balance),
    isOnline: !!c.is_online,
    isBlocked: !!c.is_blocked,
    transport: c.transport,
    plate: c.plate,
    rating: Number(c.rating),
    ratingCount: Number(c.rating_count),
    ordersCount: Number(c.orders_count),
    addedDate: c.added_date,
    verified: !!c.verified,
  };
}

export function mapAppCourierToDb(c: any): DbCourier {
  return {
    id: c.id,
    name: c.name,
    phone: c.phone,
    password: c.password || '123456',
    balance: Number(c.balance),
    is_online: !!c.isOnline,
    is_blocked: !!c.isBlocked,
    transport: c.transport || 'Mototsikl',
    plate: c.plate || '-',
    rating: Number(c.rating || 4.8),
    rating_count: Number(c.ratingCount || 0),
    orders_count: Number(c.ordersCount || 0),
    added_date: c.addedDate || new Date().toISOString().replace('T', ' ').substring(0, 16),
    verified: !!c.verified,
  };
}

export function mapDbOrderToApp(o: DbOrder): Order {
  let parsedItems = [];
  try {
    parsedItems = o.items ? JSON.parse(o.items) : [];
  } catch (e) {
    console.error("Error parsing DB order items:", e);
  }

  let parsedAddress = { mahalla: '', comment: '' };
  try {
    parsedAddress = o.address ? JSON.parse(o.address) : { mahalla: '', comment: '' };
  } catch (e) {
    console.error("Error parsing DB order address:", e);
  }

  let parsedChequeUrls = [];
  try {
    parsedChequeUrls = o.uploaded_cheque_urls ? JSON.parse(o.uploaded_cheque_urls) : [];
  } catch (e) {}

  return {
    id: o.id,
    items: parsedItems,
    total: Number(o.total),
    storeName: o.store_name,
    address: parsedAddress,
    customerName: o.customer_name,
    customerPhone: o.customer_phone,
    paymentMethod: o.payment_method as any,
    status: o.status as any,
    courierComment: o.courier_comment,
    adminComment: o.admin_comment,
    adminVoiceUrl: o.admin_voice_url,
    priceBreakdownComment: o.price_breakdown_comment,
    courierClaimed: !!o.courier_claimed,
    isManualDraft: !!o.is_manual_draft,
    isConfirmedByCustomer: !!o.is_confirmed_by_customer,
    isCustomPendingPrice: !!o.is_custom_pending_price,
    date: o.date,
    time: o.time,
    uploadedChequeUrl: o.uploaded_cheque_url,
    uploadedChequeUrls: parsedChequeUrls,
    driverRating: o.driver_rating ? Number(o.driver_rating) : undefined,
    claimedAt: o.claimed_at ? Number(o.claimed_at) : undefined,
    deliveryDuration: o.delivery_duration,
    dispatchedAt: o.dispatched_at ? Number(o.dispatched_at) : undefined,
    claimedBy: o.claimed_by,
  };
}

export function mapAppOrderToDb(o: Order): DbOrder {
  return {
    id: o.id,
    items: JSON.stringify(o.items || []),
    total: Number(o.total),
    store_name: o.storeName,
    address: JSON.stringify(o.address || {}),
    customer_name: o.customerName,
    customer_phone: o.customerPhone,
    payment_method: o.paymentMethod,
    status: o.status,
    courier_comment: o.courierComment,
    admin_comment: o.adminComment,
    admin_voice_url: o.adminVoiceUrl,
    price_breakdown_comment: o.priceBreakdownComment,
    courier_claimed: !!o.courierClaimed,
    is_manual_draft: !!o.isManualDraft,
    is_confirmed_by_customer: !!o.isConfirmedByCustomer,
    is_custom_pending_price: !!o.isCustomPendingPrice,
    date: o.date,
    time: o.time,
    uploaded_cheque_url: o.uploadedChequeUrl,
    uploaded_cheque_urls: JSON.stringify(o.uploadedChequeUrls || []),
    driver_rating: o.driverRating,
    claimed_at: o.claimedAt,
    delivery_duration: o.deliveryDuration,
    dispatched_at: o.dispatchedAt,
    claimed_by: o.claimedBy,
  };
}

// HIGH-LEVEL DB INTERACTION FUNCTIONS WITH HYBRID LOCAL FALLBACK

// 1. Couriers CRUD
export async function getCouriers(): Promise<any[]> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('couriers')
        .select('*')
        .order('name', { ascending: true });
      if (error) throw error;
      if (data && data.length > 0) {
        const appCouriers = data.map(mapDbCourierToApp);
        // Sync with local storage so fallback matches latest remote state
        safeSetItem('kasbigo-couriers-list', JSON.stringify(appCouriers));
        return appCouriers;
      }
    } catch (e) {
      console.warn("Supabase fetchCouriers failed, using localStorage:", e);
    }
  }

  // Fallback
  const saved = localStorage.getItem('kasbigo-couriers-list');
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (e) {}
  }
  return [];
}

export async function upsertCourier(courier: any): Promise<boolean> {
  // Update local storage first to ensure immediate responsiveness
  const saved = localStorage.getItem('kasbigo-couriers-list');
  let list = saved ? JSON.parse(saved) : [];
  const index = list.findIndex((c: any) => c.phone === courier.phone || c.id === courier.id);
  if (index > -1) {
    list[index] = { ...list[index], ...courier };
  } else {
    list.push(courier);
  }
  safeSetItem('kasbigo-couriers-list', JSON.stringify(list));

  // Sync with Supabase if configured
  if (isSupabaseConfigured && supabase) {
    try {
      const dbRow = mapAppCourierToDb({ ...list.find((c: any) => c.id === courier.id), ...courier });
      const { error } = await supabase
        .from('couriers')
        .upsert(dbRow, { onConflict: 'phone' });
      if (error) {
        console.error("Supabase upsert courier error:", error);
        return false;
      }
      return true;
    } catch (e) {
      console.error("Supabase upsert courier error:", e);
    }
  }
  return true;
}

export async function deleteCourierDb(courierId: string, phone: string): Promise<boolean> {
  const saved = localStorage.getItem('kasbigo-couriers-list');
  if (saved) {
    try {
      let list = JSON.parse(saved);
      list = list.filter((c: any) => c.id !== courierId && c.phone !== phone);
      safeSetItem('kasbigo-couriers-list', JSON.stringify(list));
    } catch (e) {}
  }

  if (isSupabaseConfigured && supabase) {
    try {
      const { error } = await supabase
        .from('couriers')
        .delete()
        .or(`id.eq.${courierId},phone.eq.${phone}`);
      if (error) throw error;
      return true;
    } catch (e) {
      console.error("Supabase delete courier error:", e);
    }
  }
  return true;
}

// 2. Orders CRUD
export async function getOrdersDb(): Promise<Order[]> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .order('id', { ascending: false });
      if (error) throw error;
      if (data) {
        const appOrders = data.map(mapDbOrderToApp);
        safeSetOrdersItem(appOrders);
        return appOrders;
      }
    } catch (e) {
      console.warn("Supabase fetchOrders failed, using localStorage:", e);
    }
  }

  // Fallback
  const saved = localStorage.getItem('kasbigo-orders-list');
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (e) {}
  }
  return [];
}

export async function upsertOrderDb(order: Order): Promise<boolean> {
  const saved = localStorage.getItem('kasbigo-orders-list');
  let list: Order[] = saved ? JSON.parse(saved) : [];
  const index = list.findIndex((o: Order) => o.id === order.id);
  if (index > -1) {
    list[index] = { ...list[index], ...order };
  } else {
    list.unshift(order);
  }
  safeSetOrdersItem(list);

  if (isSupabaseConfigured && supabase) {
    try {
      const dbRow = mapAppOrderToDb(order);
      const { error } = await supabase
        .from('orders')
        .upsert(dbRow, { onConflict: 'id' });
      if (error) {
        console.error("Supabase upsert order error:", error);
        return false;
      }
      return true;
    } catch (e) {
      console.error("Supabase upsert order error:", e);
    }
  }
  return true;
}

// Real-time listener setups
export function subscribeToOrdersChange(onUpdate: (order: Order) => void, onDelete?: (orderId: string) => void) {
  if (isSupabaseConfigured && supabase) {
    const channel = supabase
      .channel('public:orders')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        (payload) => {
          if (payload.eventType === 'DELETE') {
            if (onDelete && payload.old && payload.old.id) {
              onDelete(payload.old.id);
            }
          } else if (payload.new) {
            const order = mapDbOrderToApp(payload.new as DbOrder);
            onUpdate(order);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }

  // Local window event listener to sync across multiple tabs/frames
  const handler = (e: Event) => {
    const customEvent = e as CustomEvent;
    if (customEvent.detail && customEvent.detail.type === 'order_upsert') {
      onUpdate(customEvent.detail.order);
    }
  };
  window.addEventListener('kasbigo-db-update', handler);
  return () => {
    window.removeEventListener('kasbigo-db-update', handler);
  };
}

export function subscribeToCouriersChange(onUpdate: (courier: any) => void) {
  if (isSupabaseConfigured && supabase) {
    const channel = supabase
      .channel('public:couriers')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'couriers' },
        (payload) => {
          if (payload.new) {
            const courier = mapDbCourierToApp(payload.new as DbCourier);
            onUpdate(courier);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }

  const handler = (e: Event) => {
    const customEvent = e as CustomEvent;
    if (customEvent.detail && customEvent.detail.type === 'courier_upsert') {
      onUpdate(customEvent.detail.courier);
    }
  };
  window.addEventListener('kasbigo-db-update', handler);
  return () => {
    window.removeEventListener('kasbigo-db-update', handler);
  };
}

// Helper to broadcast custom event within the same page session
export function broadcastUpdate(detail: { type: 'order_upsert' | 'courier_upsert'; order?: Order; courier?: any }) {
  const event = new CustomEvent('kasbigo-db-update', { detail });
  window.dispatchEvent(event);
}
