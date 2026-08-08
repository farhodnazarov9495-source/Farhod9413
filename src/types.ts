/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Product {
  id: string;
  name: string;
  price: number;
  image: string;
  description?: string;
  volume?: string;
  voiceUrl?: string;
}

export interface Store {
  id: string;
  name: string;
  rating: number;
  reviewsCount?: number;
  deliveryTime: string;
  minOrder: number;
  status: 'Ochiq' | 'Yopiq';
  location: string;
  category: string;
  image: string;
  icon?: string;
  products: Product[];
}

export interface Category {
  id: string;
  name: string;
  count: string;
  icon: string;
  color: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
  storeId: string;
  storeName: string;
}

export interface DeliveryZone {
  id: string;
  zoneName: string;
  distanceLabel: string;
  price: number;
  mahallas: string[];
  name?: string;
  distance?: string;
}

export interface Order {
  id: string;
  items: CartItem[];
  total: number;
  deliveryFee?: number;
  extraStopsFee?: number;
  storeName: string;
  category?: string;
  address: {
    mahalla: string;
    comment: string;
    additionalComment?: string;
    latitude?: number;
    longitude?: number;
  };
  customerName: string;
  customerPhone: string;
  paymentMethod: 'Naqd' | 'Online';
  status: 'Yangi' | 'Narx belgilashda' | 'Kutishda' | 'Mijoz tasdiqlashini kutmoqda' | 'Kuryer qidirilmoqda' | 'Kuryerda' | 'Yetkazildi' | 'Bekor qilindi';
  orderMethod?: 'Savatdan' | 'Yozma' | 'Ovozli' | 'Qo\'ng\'iroq qilingan';
  courierComment?: string;
  adminComment?: string;
  adminVoiceUrl?: string;
  priceBreakdownComment?: string;
  courierClaimed?: boolean;
  isManualDraft?: boolean;
  isConfirmedByCustomer?: boolean;
  isCustomPendingPrice?: boolean;
  date: string;
  time: string;
  uploadedChequeUrl?: string;
  uploadedChequeUrls?: string[];
  driverRating?: number;
  driverRatingComment?: string;
  claimedAt?: number;
  deliveryDuration?: string;
  dispatchedAt?: number;
  createdAt?: number;
  visibleToAll?: boolean;
  claimedByBalance?: number;
  claimedBy?: string;
  courierDebtAmount?: number;
  courierDebtSettled?: boolean;
  pickupPointsCount?: number;
  stores?: { storeId: string; storeName: string }[];
}

export interface PromoBanner {
  id: string;
  storeId: string;
  title: string;
  tag: string;
  desc: string;
  bg: string; // Base64 or standard URL for full background image
  emoji?: string; // Optional / legacy
  actionText: string;
  targetType?: 'store' | 'category' | 'url';
  targetValue?: string;
}

export interface PopularPartner {
  id: string;
  name: string;
  image: string; // Base64 or standard URL
  rating: number;
  deliveryTime: string;
  minOrder: number;
  location: string;
  storeId?: string;
}

export type ScreenType =
  | 'home'
  | 'categories'
  | 'stores'
  | 'store-detail'
  | 'cart'
  | 'address'
  | 'checkout'
  | 'payment'
  | 'success'
  | 'orders'
  | 'profile'
  | 'help';

export type CourierTransport = 'Velosiped' | 'Skuter' | 'Yengil avtomobil' | 'Yuk avtomobili (Labo)' | 'Yuk mototsikli';

export function normalizeCourierTransport(rawTransport: string): CourierTransport {
  if (!rawTransport) return 'Yengil avtomobil';
  const t = rawTransport.trim();
  if (t === 'Avtomobil') return 'Yengil avtomobil';
  if (t === 'Mototsikl') return 'Yuk mototsikli';
  if (t === 'Velosiped' || t === 'Skuter' || t === 'Yengil avtomobil' || t === 'Yuk avtomobili (Labo)' || t === 'Yuk mototsikli') {
    return t as CourierTransport;
  }
  return 'Yengil avtomobil';
}

export interface Courier {
  id: string;
  name: string;
  phone: string;
  password?: string;
  balance: number;
  isOnline: boolean;
  isBlocked: boolean;
  transport: CourierTransport | string;
  plate: string;
  rating: number;
  ratingCount: number;
  ordersCount: number;
  addedDate: string;
  verified: boolean;
  manualCashDebt?: number;
}

