/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Bike, 
  MapPin, 
  Phone, 
  Navigation, 
  CheckSquare,
  CheckCircle2,
  Wallet,
  History,
  User,
  AlertTriangle,
  Lock,
  ArrowRight,
  LogOut,
  XCircle,
  Bell,
  Calendar,
  Filter,
  ArrowUpRight,
  ArrowDownLeft
} from 'lucide-react';
import { Order, normalizeCourierTransport } from '../types';
import { safeSetItem, safeSetOrdersItem } from '../utils/safeStorage';
import { INITIAL_COURIERS } from '../data';
import { PhoneInput } from './PhoneInput';
import { useActionGuard } from '../hooks/useActionGuard';

interface CourierPanelProps {
  orders: Order[];
  setOrders: React.Dispatch<React.SetStateAction<Order[]>>;
  courierName?: string;
  setCourierName?: (val: string) => void;
  courierPhone?: string;
  setCourierPhone?: (val: string) => void;
  isCourierOnline?: boolean;
  setIsCourierOnline?: (val: boolean) => void;
  courierBalance?: number;
  setCourierBalance?: React.Dispatch<React.SetStateAction<number>>;
  courierTransactions?: Transaction[];
  setCourierTransactions?: React.Dispatch<React.SetStateAction<Transaction[]>>;
  courierCoords?: { latitude: number; longitude: number } | null;
  setCourierCoords?: React.Dispatch<React.SetStateAction<{ latitude: number; longitude: number } | null>>;
  theme?: 'light' | 'dark';
  setTheme?: (theme: 'light' | 'dark') => void;
  courierList?: any[];
  setCourierList?: React.Dispatch<React.SetStateAction<any[]>>;
  extraStopFee?: number;
  deliveryCommissionRate?: number;
  adminPhone?: string;
  adminTelegram?: string;
}

interface Transaction {
  id: string;
  type: 'refill' | 'deduction';
  amount: number;
  description: string;
  time: string;
  date: string;
}

export const CourierPanel: React.FC<CourierPanelProps> = ({ 
  orders, 
  setOrders,
  courierName: propCourierName,
  setCourierName: propSetCourierName,
  courierPhone: propCourierPhone,
  setCourierPhone: propSetCourierPhone,
  isCourierOnline: propIsCourierOnline,
  setIsCourierOnline: propSetIsCourierOnline,
  courierBalance: propCourierBalance,
  setCourierBalance: propSetCourierBalance,
  courierTransactions: propCourierTransactions,
  setCourierTransactions: propSetCourierTransactions,
  courierCoords: propCourierCoords,
  setCourierCoords: propSetCourierCoords,
  theme = 'dark',
  setTheme,
  courierList,
  setCourierList,
  extraStopFee = 6000,
  deliveryCommissionRate = 20,
  adminPhone: propAdminPhone,
  adminTelegram: propAdminTelegram,
}) => {
  // Navigation active tab: 'home' (Asosiy) | 'orders' (Buyurtmalar) | 'earnings' (Daromad) | 'profile' (Profil)
  const [activeTab, setActiveTab] = useState<'home' | 'orders' | 'earnings' | 'profile'>('home');

  // Courier States (with fallback)
  const [localIsOnline, setLocalIsOnline] = useState<boolean>(false);
  const isOnline = propIsCourierOnline !== undefined ? propIsCourierOnline : localIsOnline;
  const setIsOnline = propSetIsCourierOnline || setLocalIsOnline;

  const [localCourierName, setLocalCourierName] = useState<string>('Alisher Qodirov');
  const courierName = propCourierName !== undefined ? propCourierName : localCourierName;

  const [localCourierPhone, setLocalCourierPhone] = useState<string>('');
  const courierPhone = propCourierPhone !== undefined ? propCourierPhone : localCourierPhone;

  // Aliases for prop functions
  const setCourierName = propSetCourierName || setLocalCourierName;
  const setCourierPhone = propSetCourierPhone || setLocalCourierPhone;
  const setIsCourierOnline = propSetIsCourierOnline || setIsOnline;

  // Courier real-time GPS coordinate states (no hardcoded fallback)
  const [localCourierCoords, setLocalCourierCoords] = useState<{ latitude: number; longitude: number } | null>({ latitude: 38.8351, longitude: 65.3621 });
  const courierCoords = propCourierCoords !== undefined ? propCourierCoords : localCourierCoords;
  const setCourierCoords = propSetCourierCoords || setLocalCourierCoords;

  const getCouriersListFromStorage = () => {
    try {
      const saved = localStorage.getItem('kasbigo-couriers-list');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return INITIAL_COURIERS;
  };

  const [loggedInPhone, setLoggedInPhone] = useState<string | null>(() => {
    const saved = localStorage.getItem('kasbigo-active-courier-phone');
    return saved && saved !== '' ? saved : null;
  });

  const [loginPhone, setLoginPhone] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  // Synchronize loggedInPhone with propCourierPhone
  useEffect(() => {
    if (propCourierPhone && propCourierPhone !== '') {
      setLoggedInPhone(propCourierPhone);
    } else {
      setLoggedInPhone(null);
    }
  }, [propCourierPhone]);

  // Load from local storage or props list on mount or changes
  useEffect(() => {
    const list = courierList && courierList.length > 0 ? courierList : getCouriersListFromStorage();
    const activePhone = localStorage.getItem('kasbigo-active-courier-phone');
    if (activePhone && activePhone !== '') {
      const found = list.find((c: any) => c.phone === activePhone);
      if (found) {
        setLoggedInPhone(found.phone);
        if (propCourierPhone !== found.phone && setCourierPhone) {
          setCourierPhone(found.phone);
        }
      } else {
        setLoggedInPhone(null);
        if (propCourierPhone !== '' && setCourierPhone) {
          setCourierPhone('');
        }
      }
    } else {
      setLoggedInPhone(null);
      if (propCourierPhone !== '' && setCourierPhone) {
        setCourierPhone('');
      }
    }
  }, [courierList, propCourierPhone]);

  const [isDetectingCourierGPS, setIsDetectingCourierGPS] = useState(false);
  const [courierGpsMessage, setCourierGpsMessage] = useState('');

  const [calledOrders, setCalledOrders] = useState<Record<string, boolean>>({});
  const activeAudioContextRef = useRef<AudioContext | null>(null);
  const activeNotificationRef = useRef<Notification | null>(null);

  // Requirement 3: Custom React Modal state for Logout (No window.confirm)
  const [showLogoutModal, setShowLogoutModal] = useState<boolean>(false);
  const [orderToCancelId, setOrderToCancelId] = useState<string | null>(null);
  const [notifPermission, setNotifPermission] = useState<string>(
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'granted'
  );
  
  // Custom stateful toast container inside courier terminal
  const [courierToast, setCourierToast] = useState<string>('');
  const showCourierToast = (msg: string) => {
    setCourierToast(msg);
    setTimeout(() => {
      setCourierToast(prev => prev === msg ? '' : prev);
    }, 5000);
  };

  const [isBlocked, setIsBlocked] = useState<boolean>(false);
  
  useEffect(() => {
    const checkBlocked = () => {
      if (courierList && courierList.length > 0) {
        const found = courierList.find((c: any) => c.phone === courierPhone);
        if (found) {
          const currentlyBlocked = !!found.isBlocked;
          setIsBlocked(currentlyBlocked);
          if (currentlyBlocked && isOnline && setIsCourierOnline) {
            setIsCourierOnline(false);
          }
          return;
        }
      }
      try {
        const blockedStr = localStorage.getItem('kasbigo-blocked-couriers');
        if (blockedStr) {
          const blockedList: string[] = JSON.parse(blockedStr);
          const currentlyBlocked = blockedList.includes(courierPhone);
          setIsBlocked(currentlyBlocked);
          if (currentlyBlocked && isOnline && setIsCourierOnline) {
            setIsCourierOnline(false);
          }
        } else {
          setIsBlocked(false);
        }
      } catch (e) {
        setIsBlocked(false);
      }
    };
    
    checkBlocked();
    const interval = setInterval(checkBlocked, 1000);
    return () => clearInterval(interval);
  }, [courierPhone, courierList, isOnline, setIsCourierOnline]);

  const detectCourierLocation = () => {
    if (navigator.geolocation) {
      setIsDetectingCourierGPS(true);
      setCourierGpsMessage("GPS sun'iy yo'ldoshidan kuryer lokatsiyasi aniqlanmoqda...");
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          setCourierCoords({ latitude: lat, longitude: lng });
          setCourierGpsMessage(`📍 Kuryer haqiqiy GPS lokatsiyasi aniqlandi!`);
          setIsDetectingCourierGPS(false);
        },
        (error) => {
          console.warn("Courier geolocation failed:", error);
          setCourierCoords(null);
          setCourierGpsMessage("❌ Kuryer GPS signalini aniqlab bo'lmadi. Iltimos ruxsatnomani yoqing.");
          setIsDetectingCourierGPS(false);
        },
        { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
      );
    } else {
      setCourierGpsMessage("❌ Qurilmangiz Geolocation API-ni qo'llab-quvvatlamaydi!");
    }
  };

  // Trigger on mount
  useEffect(() => {
    detectCourierLocation();
  }, []);
  
  // Courier Balance state
  // Initial 350,000 UZS balance. Note: decrease this dynamically on each completed delivery.
  const [localCourierBalance, setLocalCourierBalance] = useState<number>(350000);
  const courierBalance = propCourierBalance !== undefined ? propCourierBalance : localCourierBalance;
  const setCourierBalance = propSetCourierBalance || setLocalCourierBalance;

  // Track checked stores in active claimed orders
  const [pickedStoresMap, setPickedStoresMap] = useState<Record<string, boolean>>({});
  const toggleStorePicked = (key: string) => {
    setPickedStoresMap(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const deductionPerOrder = 12000; // static commission limit (badge removed from UI per request)

  // Real-time tick to refresh cash debt from localStorage or orders every second
  const [debtRefreshTick, setDebtRefreshTick] = useState<number>(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setDebtRefreshTick(prev => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Calculate current courier debt / cash to submit for Market or cash orders
  const myDebtAmount = (() => {
    // Touch tick to register dependency
    const _t = debtRefreshTick;
    if (!courierPhone) return 0;
    const cleanMyPhone = courierPhone.replace(/\D/g, '');

    // Check if courier list in localStorage has an explicit manualCashDebt set by admin
    try {
      const savedCouriers = localStorage.getItem('kasbigo-couriers-list');
      if (savedCouriers) {
        const list: any[] = JSON.parse(savedCouriers);
        const matchedCourier = list.find(c => c.phone && c.phone.replace(/\D/g, '') === cleanMyPhone);
        if (matchedCourier && typeof matchedCourier.manualCashDebt === 'number') {
          return matchedCourier.manualCashDebt;
        }
      }
    } catch (e) {
      // fallback to auto calculation
    }

    return orders.reduce((sum, o) => {
      if (!o.claimedBy) return sum;
      const cleanO = o.claimedBy.replace(/\D/g, '');
      if (cleanO !== cleanMyPhone) return sum;
      if (o.status !== 'Yetkazildi') return sum;
      if (o.courierDebtSettled) return sum;

      if (typeof o.courierDebtAmount === 'number' && o.courierDebtAmount > 0) {
        return sum + o.courierDebtAmount;
      } else if (o.paymentMethod === 'Naqd') {
        const itemsSum = o.items && o.items.length > 0 
          ? o.items.reduce((acc, item) => acc + (item.product.price * item.quantity), 0)
          : o.total;
        return sum + itemsSum;
      }
      return sum;
    }, 0);
  })();

  // Transaction history log state
  const [localTransactions, setLocalTransactions] = useState<Transaction[]>([]);
  const transactions = propCourierTransactions !== undefined ? propCourierTransactions : localTransactions;
  const setTransactions = propSetCourierTransactions || setLocalTransactions;

  // Filtering orders by status
  // 1) Unclaimed orders (pool of all couriers)
  const unclaimedOrders = orders.filter(o => (o.status === 'Kuryerda' || o.status === 'Kuryer qidirilmoqda') && !o.courierClaimed);
  
  // 2) Claimed orders (specific to active courier)
  const claimedOrders = orders.filter(o => o.status === 'Kuryerda' && o.courierClaimed === true && o.claimedBy === loggedInPhone);

  // Stats calculation
  const completedOrders = orders.filter(o => o.status === 'Yetkazildi' && o.claimedBy === loggedInPhone);

  // Requirement 4: Calculate product-only price paid by customer (no delivery fee added)
  const getProductTotalOnly = (o: Order): number => {
    if (o.items && o.items.length > 0) {
      return o.items.reduce((sum, item) => sum + ((item.product?.price || 0) * (item.quantity || 1)), 0);
    }
    return typeof o.total === 'number' ? Math.max(0, o.total - (o.deliveryFee || 0)) : 0;
  };

  // Requirement 7: Combined Archive List for Completed and Cancelled Orders
  const allArchiveOrders = orders.filter(o => {
    if (o.status !== 'Yetkazildi' && o.status !== 'Bekor qilindi') return false;
    if (!o.claimedBy && !o.courierClaimed) return false;
    const cleanClaimed = (o.claimedBy || '').replace(/\D/g, '');
    const cleanLogged = (loggedInPhone || '').replace(/\D/g, '');
    return cleanClaimed === cleanLogged || o.claimedBy === loggedInPhone;
  });
  
  // Requirement E: BUGUNGI UMUMIY DAROMAD — FAQAT bugun yetkazilgan buyurtmalarning YETKAZISH NARXI + QO'SHIMCHA NUQTA HAQI
  const todayStr = new Date().toISOString().split('T')[0];
  const todayCompletedOrders = completedOrders.filter(o => {
    const dStr = o.deliveredAt || o.updatedAt || o.createdAt;
    if (!dStr) return true;
    try {
      return new Date(dStr).toISOString().split('T')[0] === todayStr;
    } catch (e) {
      return true;
    }
  });

  const todayDeliveryEarnings = todayCompletedOrders.reduce((sum, o) => {
    const deliveryFee = typeof o.deliveryFee === 'number' && o.deliveryFee > 0 ? o.deliveryFee : 15000;
    const extraFee = o.extraStopsFee || o.extraStopFee || 0;
    return sum + deliveryFee + extraFee;
  }, 0);

  // Requirement B: Calendar & Date Range Filter for Earnings
  const [datePreset, setDatePreset] = useState<'today' | 'week' | 'month' | 'all' | 'custom'>('today');
  const [customStartDate, setCustomStartDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [customEndDate, setCustomEndDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [earningsSubTab, setEarningsSubTab] = useState<'earnings_list' | 'balance_history'>('earnings_list');

  // Date range checking helper
  const isDateInRange = (dateInput?: any) => {
    if (!dateInput) return true;
    let targetDate: Date;
    if (dateInput instanceof Date) {
      targetDate = dateInput;
    } else if (typeof dateInput === 'string' || typeof dateInput === 'number') {
      targetDate = new Date(dateInput);
    } else if (typeof dateInput === 'object' && dateInput !== null && 'seconds' in dateInput) {
      targetDate = new Date((dateInput as any).seconds * 1000);
    } else {
      try {
        targetDate = new Date(dateInput);
      } catch {
        return true;
      }
    }

    if (!targetDate || typeof targetDate.getTime !== 'function' || isNaN(targetDate.getTime())) return true;

    const now = new Date();
    const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
    const endOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);

    if (datePreset === 'today') {
      return targetDate >= startOfDay(now) && targetDate <= endOfDay(now);
    }
    if (datePreset === 'week') {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return targetDate >= startOfDay(weekAgo) && targetDate <= endOfDay(now);
    }
    if (datePreset === 'month') {
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      return targetDate >= startOfDay(monthAgo) && targetDate <= endOfDay(now);
    }
    if (datePreset === 'all') {
      return true;
    }
    if (datePreset === 'custom') {
      const start = customStartDate ? startOfDay(new Date(customStartDate)) : new Date(0);
      const end = customEndDate ? endOfDay(new Date(customEndDate)) : new Date(8640000000000000);
      return targetDate >= start && targetDate <= end;
    }
    return true;
  };

  // Filtered orders for selected period
  const periodCompletedOrders = completedOrders.filter(o => isDateInRange(o.deliveredAt || o.updatedAt || o.createdAt));
  const periodDeliveryEarnings = periodCompletedOrders.reduce((sum, o) => {
    const deliveryFee = typeof o.deliveryFee === 'number' && o.deliveryFee > 0 ? o.deliveryFee : 15000;
    const extraFee = o.extraStopsFee || o.extraStopFee || 0;
    return sum + deliveryFee + extraFee;
  }, 0);

  const periodCommissionDeducted = periodCompletedOrders.reduce((sum, o) => {
    const deliveryFee = typeof o.deliveryFee === 'number' && o.deliveryFee > 0 ? o.deliveryFee : 15000;
    const extraFee = o.extraStopsFee || o.extraStopFee || 0;
    const netFee = deliveryFee + extraFee;
    const comm = typeof o.courierCommission === 'number' && o.courierCommission > 0 
      ? o.courierCommission 
      : Math.round(netFee * ((deliveryCommissionRate || 20) / 100));
    return sum + comm;
  }, 0);

  // Requirement B: Real Transactions List combining Admin Top-ups + Order Payouts & Commission Deductions
  const realTransactionsList = React.useMemo(() => {
    const list: Array<{
      id: string;
      type: 'refill' | 'deduction' | 'payout';
      amount: number;
      description: string;
      dateStr: string;
      rawDate: Date;
      orderId?: string;
    }> = [];

    // 1. Admin Balance Top-ups (Refills)
    transactions.forEach(tx => {
      if (tx.type === 'refill') {
        let d: Date;
        if (tx.createdAt) {
          d = new Date(tx.createdAt);
        } else if (tx.date && tx.date.includes('.')) {
          const parts = tx.date.split('.');
          d = new Date(`${parts[2]}-${parts[1]}-${parts[0]}T${tx.time || '12:00'}:00`);
        } else if (tx.date === 'Kecha') {
          d = new Date(Date.now() - 86400000);
        } else {
          d = new Date();
        }

        if (isNaN(d.getTime())) d = new Date();
        
        list.push({
          id: tx.id || `refill-${Math.random()}`,
          type: 'refill',
          amount: tx.amount,
          description: tx.description || "Admin tomonidan balans to'ldirildi",
          dateStr: `${tx.time || '12:00'} • ${tx.date || 'Bugun'}`,
          rawDate: d,
        });
      }
    });

    // 2. Real Delivered Orders
    completedOrders.forEach(o => {
      // Use static timestamp stored on order (deliveredAt, createdAt, or fallback to fixed date)
      const orderTimeVal = o.deliveredAt || o.createdAt || (o.date && o.time ? `${o.date}T${o.time}` : null);
      let orderDate: Date;
      if (orderTimeVal) {
        orderDate = new Date(orderTimeVal);
      } else {
        // Fallback anchor date based on order numeric ID so it remains static across renders
        const numId = parseInt((o.id || '').replace(/\D/g, '')) || 1000;
        orderDate = new Date(1770000000000 + (numId % 100000) * 1000);
      }

      if (isNaN(orderDate.getTime())) {
        orderDate = new Date();
      }

      const dateFormatted = `${orderDate.getHours().toString().padStart(2, '0')}:${orderDate.getMinutes().toString().padStart(2, '0')} • ${o.date || orderDate.toLocaleDateString('uz-UZ')}`;

      const deliveryFee = typeof o.deliveryFee === 'number' && o.deliveryFee > 0 ? o.deliveryFee : 15000;
      const extraFee = o.extraStopsFee || o.extraStopFee || 0;
      const netDeliveryFee = deliveryFee + extraFee;
      const commFee = typeof o.courierCommission === 'number' && o.courierCommission > 0 
        ? o.courierCommission 
        : Math.round(netDeliveryFee * ((deliveryCommissionRate || 20) / 100));

      // Commission deduction transaction
      list.push({
        id: `comm-${o.id}`,
        type: 'deduction',
        amount: commFee,
        description: `Buyurtma #${o.id} — Tizim komissiyasi yechildi`,
        dateStr: dateFormatted,
        rawDate: orderDate,
        orderId: o.id
      });
    });

    // Sort newest first
    list.sort((a, b) => (b.rawDate?.getTime?.() || 0) - (a.rawDate?.getTime?.() || 0));

    // Filter by selected date range
    return list.filter(tx => isDateInRange(tx.rawDate));
  }, [transactions, completedOrders, datePreset, customStartDate, customEndDate]);

  // Average driver rating based on customer feedback (Requirement 3)
  const ratedOrders = orders.filter(o => {
    const rVal = o.driverRating || o.rating;
    if (!rVal || rVal <= 0) return false;
    const cleanClaimed = (o.claimedBy || '').replace(/\D/g, '');
    const cleanPhone = (loggedInPhone || '').replace(/\D/g, '');
    if (cleanPhone && cleanClaimed && cleanClaimed === cleanPhone) return true;
    if (courierName && (o.courierName === courierName || o.claimedBy === courierName)) return true;
    return false;
  });
  const averageRating = ratedOrders.length > 0 
    ? (ratedOrders.reduce((sum, o) => sum + (o.driverRating || o.rating || 0), 0) / ratedOrders.length).toFixed(1)
    : "5.0";

  // Requirement 2: 1 ta buyurtmani manzilga yetkazmaguncha kuryerda faqat shu faol buyurtma oynasi ochiq qoladi va boshqa imkoniyatlar cheklanadi.
  const hasActiveClaimed = claimedOrders.length > 0;

  // Force tab to 'orders' whenever there is an active claimed order
  useEffect(() => {
    if (hasActiveClaimed && activeTab !== 'orders') {
      setActiveTab('orders');
    }
  }, [hasActiveClaimed, activeTab]);

  // Get other real couriers from storage
  const OTHER_COURIERS = (courierList && courierList.length > 0 ? courierList : getCouriersListFromStorage())
    .filter((c: any) => {
      const cleanPhone = c.phone.replace(/\D/g, '');
      const cleanLogged = (loggedInPhone || '').replace(/\D/g, '');
      return cleanPhone !== cleanLogged;
    })
    .map((c: any) => {
      const cleanPhone = c.phone.replace(/\D/g, '');
      const rated = orders.filter(o => {
        if (!o.claimedBy) return false;
        const cleanO = o.claimedBy.replace(/\D/g, '');
        return cleanO === cleanPhone && o.driverRating && o.driverRating > 0;
      });
      const rating = rated.length > 0
        ? Number((rated.reduce((sum, o) => sum + o.driverRating!, 0) / rated.length).toFixed(1))
        : (c.rating || 5.0);
      return { name: c.name, phone: c.phone, rating, balance: c.balance || 0, isOnline: c.isOnline ?? true };
    });

  // Calculate player's rating purely from real customer ratings (averageRating)
  const playerRating = parseFloat(averageRating) || 5.0;

  // Filter only ONLINE couriers to determine top 3
  const onlineCouriers = [
    { name: courierName, phone: loggedInPhone || '', rating: playerRating, balance: courierBalance || 0, isPlayer: true, isOnline },
    ...OTHER_COURIERS.filter((c: any) => c.isOnline)
  ].sort((a, b) => {
    if (b.rating !== a.rating) return b.rating - a.rating;
    return (b.balance || 0) - (a.balance || 0);
  });

  const top3Names = onlineCouriers.slice(0, 3).map(c => c.name);
  const isPlayerInTop3 = top3Names.includes(courierName);

  // Requirement 3: Archive collapse state (open list by default)
  const [showArchive, setShowArchive] = useState<boolean>(true);
  // Calendar & date preset filter state for courier's orders tab
  const [ordersDateFilter, setOrdersDateFilter] = useState<string>('');
  const [ordersPresetFilter, setOrdersPresetFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');
  // Requirement 2: Claim confirmation modal state
  const [claimConfirmOrder, setClaimConfirmOrder] = useState<Order | null>(null);
  
  // Priority overlay modal for new orders (Requirement 2: yangi buyurtma qabul qilinganda / kelganda ustuvor shaklda ochiladi)
  const [priorityOrderModal, setPriorityOrderModal] = useState<Order | null>(null);
  const [dismissedPriorityOrderIds, setDismissedPriorityOrderIds] = useState<string[]>([]);

  // Requirement 1: Helper to safely extract epoch ms from order creation/dispatch
  const getOrderTimestampMs = (o: Order): number => {
    if (typeof o.dispatchedAt === 'number' && !isNaN(o.dispatchedAt)) return o.dispatchedAt;
    if (typeof (o as any).createdAtMs === 'number' && !isNaN((o as any).createdAtMs)) return (o as any).createdAtMs;
    if (o.createdAt) {
      if (typeof o.createdAt === 'number' && !isNaN(o.createdAt)) return o.createdAt;
      const parsed = new Date(o.createdAt).getTime();
      if (!isNaN(parsed)) return parsed;
    }
    return Date.now() - 5000;
  };

  const nowMs = Date.now();
  const filteredUnclaimedOrders = unclaimedOrders.filter(o => {
    if (o.visibleToAll) return true;
    const dispatchedTime = getOrderTimestampMs(o);
    const elapsedMs = nowMs - dispatchedTime;
    
    if (isPlayerInTop3) {
      // Top 3 online couriers see it immediately
      return true;
    } else {
      // Other online couriers see it starting from 4th second (>= 3000 ms)
      return elapsedMs >= 3000;
    }
  });

  // Priority overlay modal for new orders disabled per requirement 3
  useEffect(() => {
    if (priorityOrderModal) setPriorityOrderModal(null);
  }, []);

  // Persistent AudioContext ref to prevent browser autoplay blocking
  const persistentAudioCtxRef = useRef<AudioContext | null>(null);

  // Requirement D: Function to initialize & unlock AudioContext and request notification permissions on direct user click gesture
  const handleToggleOnline = () => {
    if (hasActiveClaimed) return;
    const nextOnlineState = !isOnline;
    setIsOnline(nextOnlineState);

    console.log(`[NOTIF STATE] Kuryer statusi almashdi: isOnline = ${nextOnlineState}`);

    if (nextOnlineState) {
      // 1. Request notification permission directly inside user click handler
      console.log("[NOTIF PERMISSION] 'Onlayn' tugmasi bosildi. Amaldagi Notification.permission:", Notification.permission);
      if (typeof window !== 'undefined' && 'Notification' in window) {
        if (Notification.permission === 'default') {
          Notification.requestPermission().then((perm) => {
            console.log("[NOTIF PERMISSION] Foydalanuvchi ruxsat berdi:", perm);
            setNotifPermission(perm);
          }).catch((err) => {
            console.warn("[NOTIF PERMISSION] Ruxsat so'rovi xatosi:", err);
          });
        } else {
          console.log("[NOTIF PERMISSION] Ruxsat holati allaqachon:", Notification.permission);
        }
      }

      // 2. Unlock/Resume AudioContext directly on user click gesture
      console.log("[NOTIF AUDIO] Web Audio Context tayyorlanmoqda...");
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
          if (!persistentAudioCtxRef.current || persistentAudioCtxRef.current.state === 'closed') {
            persistentAudioCtxRef.current = new AudioCtx();
          }
          if (persistentAudioCtxRef.current.state === 'suspended') {
            persistentAudioCtxRef.current.resume().then(() => {
              console.log("[NOTIF AUDIO] AudioContext resume() bajarildi. State:", persistentAudioCtxRef.current?.state);
            });
          } else {
            console.log("[NOTIF AUDIO] AudioContext tayyor holatda. State:", persistentAudioCtxRef.current.state);
          }

          // Trigger a short silent chime buffer to warm up audio pipeline
          const ctx = persistentAudioCtxRef.current;
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          gain.gain.setValueAtTime(0.0001, ctx.currentTime);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start();
          osc.stop(ctx.currentTime + 0.05);
        }
      } catch (e) {
        console.warn("[NOTIF AUDIO] AudioContext tayyorlash xatosi:", e);
      }
    }
  };

  // Requirement D: Sound notification player using persistent audio context
  const playNotificationSound = () => {
    console.log("[NOTIF AUDIO] playNotificationSound chaqirildi.");
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) {
        console.warn("[NOTIF AUDIO] Brauzer Web Audio API ni qo'llab-quvvatlamaydi.");
        return;
      }

      let ctx = persistentAudioCtxRef.current;
      if (!ctx || ctx.state === 'closed') {
        ctx = new AudioCtx();
        persistentAudioCtxRef.current = ctx;
      }

      if (ctx.state === 'suspended') {
        console.log("[NOTIF AUDIO] AudioContext suspended, resume() qilinmoqda...");
        ctx.resume().catch(err => console.warn("[NOTIF AUDIO] resume() error:", err));
      }

      console.log("[NOTIF AUDIO] 'Ding-ding' chime ovozi ijro etilmoqda... Context state:", ctx.state);
      const now = ctx.currentTime;
      
      const playChimeNote = (freq: number, startTime: number, duration: number, volume: number) => {
        const oscBody = ctx!.createOscillator();
        const gainBody = ctx!.createGain();
        oscBody.type = 'sine';
        oscBody.frequency.setValueAtTime(freq, startTime);
        
        const oscStrike = ctx!.createOscillator();
        const gainStrike = ctx!.createGain();
        oscStrike.type = 'triangle';
        oscStrike.frequency.setValueAtTime(freq * 2.0, startTime);

        gainBody.gain.setValueAtTime(0, startTime);
        gainBody.gain.linearRampToValueAtTime(volume * 0.9, startTime + 0.02);
        gainBody.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
        
        gainStrike.gain.setValueAtTime(0, startTime);
        gainStrike.gain.linearRampToValueAtTime(volume * 0.5, startTime + 0.01);
        gainStrike.gain.exponentialRampToValueAtTime(0.001, startTime + 0.3);

        oscBody.connect(gainBody);
        gainBody.connect(ctx!.destination);
        
        oscStrike.connect(gainStrike);
        gainStrike.connect(ctx!.destination);
        
        oscBody.start(startTime);
        oscStrike.start(startTime);
        
        oscBody.stop(startTime + duration);
        oscStrike.stop(startTime + duration);
      };

      // Play pleasant clear double "ding-ding" chime
      playChimeNote(587.33, now, 0.8, 0.30);        // D5 note
      playChimeNote(880.00, now + 0.18, 1.1, 0.35);  // A5 note
      playChimeNote(1174.66, now + 0.36, 1.3, 0.40); // D6 note

      console.log("[NOTIF AUDIO] Ovoz ijro etildi ✅");
    } catch (e) {
      console.warn("[NOTIF AUDIO] Ovoz chiqarishda xatolik:", e);
    }
  };

  const stopNotificationSound = () => {
    if (persistentAudioCtxRef.current) {
      try {
        persistentAudioCtxRef.current.close();
      } catch (e) {}
      persistentAudioCtxRef.current = null;
    }
  };

  const stopSpeech = () => {
    try {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    } catch (e) {}
  };

  // Sync notification permission state
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setNotifPermission(Notification.permission);
    }
  }, [isOnline]);

  // Requirement D: Sound and Background System Notification triggering mechanism with full console logging
  const prevUnclaimedCountRef = useRef<number>(filteredUnclaimedOrders.length);

  useEffect(() => {
    const currentCount = filteredUnclaimedOrders.length;
    const prevCount = prevUnclaimedCountRef.current;

    console.log(`[NOTIF DETECT] Tizim buyurtmalarini tekshirish: isOnline=${isOnline}, Qolgan unclaimed soni=${currentCount}, Oldingisi=${prevCount}`);

    if (currentCount > prevCount) {
      console.log(`[NOTIF DETECT] 🔔 YANGI BUYURTMA KELDI! (${prevCount} -> ${currentCount})`);
      if (isOnline) {
        console.log("[NOTIF DETECT] Kuryer Onlayn, bildirishnoma zanjiri bajarilmoqda...");
        playNotificationSound();

        const latestOrder = filteredUnclaimedOrders[filteredUnclaimedOrders.length - 1];

        if (typeof window !== 'undefined' && 'Notification' in window) {
          console.log("[NOTIF PERMISSION] Native notification banner holati:", Notification.permission);
          if (Notification.permission === 'granted' && latestOrder) {
            try {
              if (activeNotificationRef.current) {
                activeNotificationRef.current.close();
              }
              const notification = new Notification("KasbiGo: YANGI BUYURTMA! 🔔", {
                body: `${latestOrder.storeName || 'KasbiGo'} do'konidan yangi buyurtma kirdi. Jami: ${latestOrder.total?.toLocaleString('uz-UZ') || 0} so'm.`,
                icon: "https://i.ibb.co/p64BNF4B/a34c4781-022c-440d-8f9e-4b75d867aea3.png",
                tag: "new-order-alert",
                requireInteraction: false
              });
              activeNotificationRef.current = notification;
              
              setTimeout(() => {
                notification.close();
                if (activeNotificationRef.current === notification) {
                  activeNotificationRef.current = null;
                }
              }, 5000);
              console.log("[NOTIF PERMISSION] Tizim banneri chiqarildi ✅");
            } catch (e) {
              console.warn("[NOTIF PERMISSION] Notification banner xatosi: ", e);
            }
          }
        }
      } else {
        console.log("[NOTIF DETECT] Kuryer Oflayn bo'lgani uchun bildirishnoma berilmadi.");
      }
    } else if (currentCount < prevCount) {
      console.log(`[NOTIF DETECT] Buyurtma kamaydi/qabul qilindi (${prevCount} -> ${currentCount}).`);
      stopNotificationSound();
      stopSpeech();
      if (activeNotificationRef.current) {
        activeNotificationRef.current.close();
        activeNotificationRef.current = null;
      }
    }

    prevUnclaimedCountRef.current = currentCount;
  }, [filteredUnclaimedOrders.length, isOnline]);

  const { executeGuarded: executeGuardedCourierAction, isProcessingRef: isCourierProcessingRef } = useActionGuard(500);

  // Handle claiming order from public pool (Requirements 4 & 5)
  const handleClaimOrder = executeGuardedCourierAction((orderId: string) => {
    // Read freshest order list directly from localStorage to handle real-time concurrency across tabs/views
    let currentOrdersList: Order[] = orders;
    const stored = localStorage.getItem('kasbigo-orders-list');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          currentOrdersList = parsed;
        }
      } catch (e) {}
    }

    const targetOrder = currentOrdersList.find(o => o.id === orderId);
    const myIdentifier = loggedInPhone || courierName;

    // Requirement 4: Check if already claimed by someone else
    if (!targetOrder || targetOrder.courierClaimed || (targetOrder.claimedBy && targetOrder.claimedBy !== '' && targetOrder.claimedBy !== myIdentifier)) {
      showCourierToast("Afsuski, bu buyurtma allaqachon boshqa kuryerga berildi! ⚠️");
      setOrders(currentOrdersList);
      return;
    }

    // Requirement 5: Near-simultaneous claim handling
    // If another courier claimed it in storage with higher balance within last 2 seconds
    if (targetOrder.claimedAt && (Date.now() - targetOrder.claimedAt < 2000)) {
      const otherBalance = targetOrder.claimedByBalance || 0;
      if (otherBalance > courierBalance) {
        showCourierToast("Afsuski, bu buyurtma boshqa kuryerga berildi! ⚠️");
        setOrders(currentOrdersList);
        return;
      }
    }

    const now = Date.now();
    const updatedList = currentOrdersList.map(o => {
      if (o.id === orderId) {
        return { 
          ...o, 
          status: 'Kuryerda' as const, 
          courierClaimed: true, 
          claimedBy: myIdentifier, 
          claimedAt: now,
          claimedByBalance: courierBalance
        };
      }
      return o;
    });

    safeSetOrdersItem(updatedList);
    setOrders(updatedList);
    // Requirement 3: Automatically close/hide archive section when new order is claimed
    setShowArchive(false);
    showCourierToast("Buyurtma muvaffaqiyatli qabul qilindi! 🚚");
  });

  // Handle canceling/releasing claimed order via custom React modal
  const handleCancelClaimedOrder = (orderId: string) => {
    setOrderToCancelId(orderId);
  };

  const confirmCancelClaimedOrder = executeGuardedCourierAction((orderId: string) => {
    setOrders(prev => prev.map(o => {
      if (o.id === orderId) {
        return { 
          ...o, 
          status: 'Kuryer qidirilmoqda', 
          courierClaimed: false, 
          claimedBy: '', 
          claimedAt: undefined 
        };
      }
      return o;
    }));
    setOrderToCancelId(null);
    showCourierToast("Buyurtma bekor qilindi va umumiy ro'yxatga qaytarildi! 🔄");
  });

  // Handle final completion of delivery
  const handleCompleteDelivery = executeGuardedCourierAction((orderId: string) => {
    if (!calledOrders[orderId]) {
      showCourierToast("⚠️ Buyurtmani yakunlash uchun avval mijozga qo'ng'iroq qiling (yashil telefon tugmasini bosing)!");
      return;
    }

    setOrders(prev => {
      return prev.map(o => {
        if (o.id === orderId) {
          let durationStr = "1 daqiqa";
          if (o.claimedAt) {
            const diffMs = Date.now() - o.claimedAt;
            const totalSecs = Math.max(1, Math.floor(diffMs / 1000));
            const mins = Math.floor(totalSecs / 60);
            const secs = totalSecs % 60;
            if (mins > 0) {
              durationStr = `${mins} daqiqa ${secs} soniya`;
            } else {
              durationStr = `${secs} soniya`;
            }
          }
          return { 
            ...o, 
            status: 'Yetkazildi', 
            deliveryDuration: durationStr,
            deliveredAt: Date.now(),
            deliveredTimeStr: new Date().toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })
          };
        }
        return o;
      });
    });
    
    // Requirement C: Calculate dynamic platform commission from delivery + extra stops fee
    const targetOrderObj = orders.find(o => o.id === orderId);
    const orderDeliveryFee = targetOrderObj 
      ? ((targetOrderObj.deliveryFee || 0) + (targetOrderObj.extraStopsFee || 0))
      : 10000;
    const commRate = deliveryCommissionRate || 20;
    const deductionAmount = Math.round(orderDeliveryFee * (commRate / 100));

    // Decrease the courier's balance by commission
    const newBalance = courierBalance - deductionAmount;
    setCourierBalance(newBalance);

    // Requirement D: Auto-block courier if new balance < 0
    if (newBalance < 0) {
      setIsBlocked(true);
      if (setIsCourierOnline) setIsCourierOnline(false);
      if (setCourierList) {
        setCourierList((prev: any[]) => prev.map(c => c.phone === courierPhone ? { ...c, isBlocked: true } : c));
      }
      try {
        const blockedStr = localStorage.getItem('kasbigo-blocked-couriers');
        const blockedList: string[] = blockedStr ? JSON.parse(blockedStr) : [];
        if (!blockedList.includes(courierPhone)) {
          blockedList.push(courierPhone);
          safeSetItem('kasbigo-blocked-couriers', JSON.stringify(blockedList));
        }
        const savedCouriers = localStorage.getItem('kasbigo-couriers-list');
        if (savedCouriers) {
          const list = JSON.parse(savedCouriers);
          const updated = list.map((c: any) => c.phone === courierPhone ? { ...c, isBlocked: true } : c);
          safeSetItem('kasbigo-couriers-list', JSON.stringify(updated));
        }
      } catch (e) {}
      showCourierToast("🚨 Balansingiz manfiy bo'lganligi sababli hisobingiz AVTOMATIK BLOKLANDI! Balansni to'ldiring.");
    }

    // Record the deduction transaction
    const orderLabel = targetOrderObj ? targetOrderObj.id : orderId;
    const nowTxTime = new Date().toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' });
    const nowTxDate = new Date().toLocaleDateString('uz-UZ');
    
    setTransactions(prevTx => [
      {
        id: `tx-${Math.floor(1000 + Math.random() * 9000)}`,
        type: 'deduction',
        amount: deductionAmount,
        description: `Buyurtma #${orderLabel} — Tizim komissiyasi yechildi`,
        time: nowTxTime,
        date: nowTxDate,
        createdAt: Date.now()
      },
      ...prevTx
    ]);
  });

  const formatPrice = (price: number) => {
    return price.toLocaleString('uz-UZ') + " so'm";
  }  // Requirement 14 & 3 Updated:
  // - 15,000 gacha qizil gardient
  // - 30,000 gacha apelsin gardient
  // - 30,000+ bolsa yashil rangda (yashil gardient)
  const getBalanceStyle = (balance: number) => {
    if (balance <= 15000) {
      return {
        gradientClass: "bg-gradient-to-r from-red-600 via-rose-500 to-red-600 text-white shadow-red-500/30",
        label: "Balans: Yetarli emas",
        isGold: false,
        pulse: false
      };
    } else if (balance <= 30000) {
      return {
        gradientClass: "bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 text-white shadow-orange-500/30",
        label: "Balans: Kam",
        isGold: false,
        pulse: false
      };
    } else {
      return {
        gradientClass: "bg-gradient-to-r from-emerald-600 via-teal-500 to-emerald-600 text-white shadow-emerald-500/30",
        label: "Balans: Yaxshi",
        isGold: false,
        pulse: false
      };
    }
  };

  const currentBalanceStyle = getBalanceStyle(courierBalance);

  if (!loggedInPhone) {
    return (
      <div className="flex flex-col bg-white border border-slate-200 dark:bg-[#0B1220] dark:border-slate-800 rounded-[32px] p-6 text-slate-800 dark:text-white shadow-xl relative overflow-hidden h-full min-h-[550px] items-stretch justify-center select-none font-sans">
        {/* Decorative elements */}
        <div className="absolute -top-16 -right-16 w-36 h-36 rounded-full bg-emerald-500/10 blur-xl"></div>
        <div className="absolute -bottom-16 -left-16 w-36 h-36 rounded-full bg-indigo-500/10 blur-xl"></div>

        <div className="text-center mb-8 shrink-0">
          <div className="mx-auto h-20 w-20 flex items-center justify-center p-1 mb-3">
            <img 
              src="https://i.ibb.co/p64BNF4B/a34c4781-022c-440d-8f9e-4b75d867aea3.png" 
              alt="KasbiGo" 
              className="w-full h-full object-contain filter drop-shadow-md"
              referrerPolicy="no-referrer"
            />
          </div>
          <div className="flex items-center justify-center space-x-1.5 mb-1">
            <span className="text-[14px] font-black text-emerald-600 dark:text-emerald-450 uppercase tracking-widest block">KASBI GO 24/7</span>
            <span className="h-2 w-2 bg-emerald-500 rounded-full animate-ping" />
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-bold">Kuryerlar uchun ishchi terminali</p>
        </div>

        {/* Login input form */}
        <div className="space-y-4">
          <div>
            <label className="block text-[10px] font-black uppercase mb-1 tracking-wider text-slate-400 dark:text-slate-500">
              📞 Telefon raqamingiz:
            </label>
            <PhoneInput
              value={loginPhone}
              onChange={(val) => {
                setLoginPhone(val);
                setLoginError('');
              }}
              className="w-full px-4 py-2.5 text-xs font-bold font-mono rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-[10px] font-black uppercase mb-1 tracking-wider text-slate-400 dark:text-slate-500">
              🔑 Maxfiy Parol:
            </label>
            <input
              type="password"
              value={loginPassword}
              onChange={(e) => {
                setLoginPassword(e.target.value);
                setLoginError('');
              }}
              placeholder="••••••"
              className="w-full px-4 py-2.5 text-xs font-bold font-mono rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 placeholder-slate-400"
            />
          </div>

          {loginError && (
            <div className="text-[10px] font-bold text-rose-500 text-center bg-rose-500/5 py-1 px-2 rounded-lg border border-rose-500/10">
              ⚠️ {loginError}
            </div>
          )}

          <button
            onClick={() => {
              let cleanInput = loginPhone.replace(/\D/g, '');
              // Format if starting with 998
              if (cleanInput.startsWith('998') && cleanInput.length > 3) {
                cleanInput = cleanInput.slice(3);
              }
              if (!cleanInput) {
                setLoginError("Iltimos, telefon raqamini kiriting.");
                return;
              }
              if (!loginPassword) {
                setLoginError("Iltimos, parolingizni kiriting.");
                return;
              }

              const activeCouriersList = courierList && courierList.length > 0 ? courierList : getCouriersListFromStorage();
              const found = activeCouriersList.find((c: any) => {
                let cleanPhone = c.phone.replace(/\D/g, '');
                if (cleanPhone.startsWith('998') && cleanPhone.length > 3) {
                  cleanPhone = cleanPhone.slice(3);
                }
                return cleanPhone === cleanInput;
              });

              if (found) {
                const blockedStr = localStorage.getItem('kasbigo-blocked-couriers');
                let isPhoneBlocked = false;
                if (blockedStr) {
                  try {
                    const blockedList = JSON.parse(blockedStr);
                    isPhoneBlocked = blockedList.includes(found.phone);
                  } catch (e) {}
                }
                if (found.isBlocked || isPhoneBlocked) {
                  setLoginError("Sizning hisobingiz bloklangan");
                  return;
                }
                const correctPassword = found.password || '123456';
                if (loginPassword === correctPassword) {
                  safeSetItem('kasbigo-active-courier-phone', found.phone);
                  setLoggedInPhone(found.phone);
                  if (setCourierName) setCourierName(found.name);
                  if (setCourierPhone) setCourierPhone(found.phone);
                  if (setCourierBalance) setCourierBalance(found.balance);
                  
                  // When logging in, automatically transition to ONLINE status (Requirement 5)
                  if (setIsCourierOnline) setIsCourierOnline(true);
                  if (setCourierList) {
                    setCourierList(prev => prev.map(c => c.phone === found.phone ? { ...c, isOnline: true } : c));
                  }
                  setLoginError('');
                } else {
                  setLoginError("Kiritilgan parol noto'g'ri!");
                }
              } else {
                setLoginError("Bunday telefon raqamli kuryer topilmadi!");
              }
            }}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-extrabold text-xs tracking-wider uppercase transition-all shadow-md cursor-pointer flex items-center justify-center space-x-1.5"
          >
            <span>Tizimga kirish</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    );
  }

  if (isBlocked) {
    return (
      <div className="flex flex-col bg-rose-50 border border-rose-200 dark:bg-[#0B1220] dark:border-rose-900/50 rounded-[32px] p-6 text-rose-800 dark:text-rose-200 shadow-xl relative overflow-hidden h-full min-h-[500px] items-center justify-center text-center select-none">
        <div className="h-20 w-20 rounded-full bg-rose-100 dark:bg-rose-950/40 flex items-center justify-center text-rose-600 dark:text-rose-450 text-4xl mb-6 shadow-md border border-rose-300/30 animate-pulse">
          🚫
        </div>
        <h2 className="text-lg font-black text-rose-600 dark:text-rose-450 uppercase tracking-wider mb-2">HISOBINGIZ BLOKLANGAN!</h2>
        <p className="text-xs text-rose-500 dark:text-rose-300 w-full max-w-xs leading-relaxed mb-6 font-semibold">
          Hurmatli {courierName}, sizning haydovchilik/kuryerlik profilingiz dispetcher tomonidan vaqtincha bloklandi.
        </p>
        <div className="bg-white/60 dark:bg-slate-900/40 border border-rose-200/50 dark:border-rose-900/30 rounded-2xl p-4 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400 font-bold w-full max-w-xs">
          ℹ️ Qayta faollashtirish yoki savollar bo'yicha dispetcherlik xizmati bilan bog'laning.
          <div className="mt-3 text-rose-600 dark:text-rose-400 font-mono text-xs font-bold">
            Tel: {propAdminPhone || '+998712004545'}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col bg-white border border-slate-200 rounded-[32px] p-6 text-slate-800 shadow-xl relative overflow-hidden h-full min-h-0 select-none">
      
      {/* Custom Simulation Toast notification banner */}
      {courierToast && (
        <div className="absolute top-4 left-4 right-4 z-[99] bg-amber-500 text-slate-950 px-4 py-3 rounded-2xl shadow-xl border border-amber-450 font-black text-[11px] flex items-center space-x-2 animate-bounce">
          <span>⚠️</span>
          <span>{courierToast}</span>
        </div>
      )}

      {/* Sleek Device Status Bar Decorator */}
      <div className="flex justify-between items-center text-[10px] text-slate-400 font-bold mb-4 px-1 shrink-0">
        <span className="font-mono">12:30</span>
        <div className="h-4 w-12 rounded-full bg-slate-100 flex items-center justify-center text-[8px] font-black tracking-widest text-slate-400">
          KURYER
        </div>
        <div className="flex items-center space-x-1.5">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="font-mono text-[9px] uppercase tracking-wide">5G • GPS</span>
        </div>
      </div>

      {/* 1) Header: Kasbi Go 24/7 Top and Courier subtitle */}
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100 shrink-0 z-10">
        <div className="flex items-center space-x-2.5">
          <div className="relative h-10 w-10 flex items-center justify-center shrink-0">
            <img 
              src="https://i.ibb.co/p64BNF4B/a34c4781-022c-440d-8f9e-4b75d867aea3.png" 
              alt="KasbiGo" 
              className="w-full h-full object-contain filter drop-shadow-xs"
              referrerPolicy="no-referrer"
            />
          </div>
          <div>
            <div className="flex items-center space-x-1">
              <span className="text-[12px] font-black text-emerald-600 uppercase tracking-wider block">KASBI GO 24/7</span>
              <span className="h-1.5 w-1.5 bg-emerald-500 rounded-full" />
            </div>
            <h1 className="text-sm font-bold text-slate-500 tracking-tight leading-none mt-0.5">Kuryer Terminali</h1>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {/* Theme Toggle Button */}
          {setTheme && (
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className={`p-1.5 rounded-full border cursor-pointer transition-all ${
                theme === 'dark'
                  ? 'bg-amber-500/10 text-amber-400 border-amber-500/25 hover:bg-amber-500/20'
                  : 'bg-indigo-500/10 text-indigo-600 border-indigo-500/25 hover:bg-indigo-500/20'
              }`}
              title={theme === 'dark' ? 'Kunduzgi' : 'Tungi'}
            >
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>
          )}

          {/* 2) Onlayn / Oflayn shift status switcher. Disable switcher when courier has an active claimed order to prevent cheating. */}
          <button
            onClick={handleToggleOnline}
            disabled={hasActiveClaimed}
            className={`px-3 py-1.5 rounded-full flex items-center space-x-1.5 border transition-all cursor-pointer ${
              hasActiveClaimed ? 'opacity-50 cursor-not-allowed bg-slate-150 border-slate-200 text-slate-400' :
              isOnline
                ? 'bg-emerald-50 border-emerald-200 text-emerald-600 shadow-xs'
                : 'bg-slate-100 border-slate-200 text-slate-500'
            }`}
          >
            <span className={`h-2 w-2 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
            <span className="text-[10px] font-black uppercase tracking-wider">
              {isOnline ? 'Onlayn' : 'Oflayn'}
            </span>
          </button>
        </div>
      </div>

      {/* Requirement 6 & 7: Prominent Cash Handover Notification Window */}
      {myDebtAmount > 0 && (
        <div className="bg-amber-500/10 border-2 border-amber-500/40 p-3.5 rounded-2xl mb-4 shadow-sm text-slate-900 dark:text-amber-100 flex items-center justify-between space-x-3 shrink-0 z-10 animate-fade-in">
          <div className="flex items-center space-x-3 min-w-0">
            <div className="p-3 bg-amber-500 text-slate-950 rounded-2xl font-black text-xl shrink-0 shadow-xs">
              💵
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-700 dark:text-amber-400 block truncate">
                Naqd pul topshiring:
              </span>
              <div className="text-base font-black font-mono text-slate-900 dark:text-white">
                {formatPrice(myDebtAmount)} topshiring
              </div>
              <p className="text-[9.5px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                Mijozlardan olingan naqd pul yig'indisi.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Requirement 14 & 3: Courier Balance display with clean gradients & no simulation triggers */}
      <div className={`relative rounded-2xl p-4 mb-4 shrink-0 z-10 shadow-lg overflow-hidden transition-all duration-500 ${currentBalanceStyle.gradientClass}`}>
        
        <div className="flex justify-between items-center mb-1 relative z-10">
          <div className="flex items-center space-x-1.5 opacity-90">
            <Wallet className="h-4 w-4" />
            <span className="text-[10px] font-extrabold uppercase tracking-wider block">Kuryer Balansi</span>
          </div>
          <span className="text-[8px] font-mono font-black opacity-80 bg-black/10 px-1.5 py-0.5 rounded">
            ID: #KURYER-777
          </span>
        </div>
        
        <div className="flex flex-wrap items-center justify-between gap-2 relative z-10">
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-black tracking-tight font-mono">
              {formatPrice(courierBalance)}
            </span>
            <span className="text-[8px] font-extrabold uppercase tracking-widest px-1.5 py-0.5 rounded bg-black/15 text-white">
              {currentBalanceStyle.label}
            </span>
          </div>

          <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl font-bold text-[10.5px] backdrop-blur-md shadow-xs border ${
            myDebtAmount > 50000
              ? 'bg-rose-950/70 text-rose-100 border-rose-400/50'
              : myDebtAmount > 0
                ? 'bg-amber-950/70 text-amber-100 border-amber-400/50'
                : 'bg-black/25 text-white/90 border-white/15'
          }`}>
            <span>💵 Naqd pul topshiring:</span>
            <span className="font-mono font-black">{formatPrice(myDebtAmount)}</span>
          </div>
        </div>
      </div>

      {/* 4) Main Content Section: clean & white-themed workspace */}
      <div className="flex-1 overflow-y-auto pr-1 space-y-4 z-10 scrollbar-thin">
        
        {/* Asosiy (Home) Tab */}
        {activeTab === 'home' && !hasActiveClaimed && (
          <>
            {/* Waiting pool for new orders - "bo'sh toza hudud" */}
            <div className="space-y-2.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center">
                  <span className={`h-1.5 w-1.5 rounded-full ${isOnline ? 'bg-emerald-500 animate-ping' : 'bg-slate-300'} mr-1.5`} />
                  Kuryerlar buyurtmalar zali ({isOnline ? filteredUnclaimedOrders.length : 0})
                </span>
              </div>

              {isOnline ? (
                filteredUnclaimedOrders.length > 0 ? (
                  <div className="space-y-3">
                    {filteredUnclaimedOrders.map((order) => {
                      return (
                        <div 
                          key={order.id}
                          className="p-3.5 rounded-2xl bg-white border border-slate-200 hover:border-emerald-400 transition-all text-xs space-y-2.5 shadow-xs"
                        >
                          {/* Top Row: Order ID + Payment Method Badge (Left) & Total Price (Right) */}
                          <div className="flex items-center justify-between bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                            <div className="flex items-center space-x-2">
                              <span className="font-mono text-sm font-black text-slate-900">#{order.id}</span>
                              <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${
                                order.paymentMethod === 'Online' 
                                  ? 'bg-blue-100 text-blue-700 border border-blue-200' 
                                  : 'bg-amber-100 text-amber-700 border border-amber-200'
                              }`}>
                                To'lov: {order.paymentMethod === 'Online' ? '💳 Online' : '💵 Naqd'}
                              </span>
                            </div>
                            <span className="font-mono text-emerald-600 font-black text-sm bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-lg">
                              {formatPrice(order.total)}
                            </span>
                          </div>

                          {/* Horizontal 2-Column Grid: Pickup Point & Delivery Mahalla */}
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            {/* Pickup */}
                            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 flex flex-col justify-center">
                              <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-wider block mb-0.5">
                                🏬 Olish Joyi ({order.stores && order.stores.length > 1 ? `${order.stores.length} ta` : '1 ta'}):
                              </span>
                              <span className="text-slate-900 font-black text-xs leading-snug">
                                {order.stores && order.stores.length > 1 
                                  ? order.stores.map(s => s.storeName).join(' ➔ ')
                                  : order.storeName}
                              </span>
                              {order.stores && order.stores.length > 1 && (
                                <span className="text-[9px] font-bold text-emerald-600 mt-0.5">
                                  +{formatPrice((order.stores.length - 1) * (extraStopFee || 6000))} ko'p nuqta
                                </span>
                              )}
                            </div>

                            {/* Destination Mahalla */}
                            <div className="bg-emerald-50/70 p-2.5 rounded-xl border border-emerald-100 flex flex-col justify-center">
                              <span className="text-[9px] text-emerald-800 font-extrabold uppercase tracking-wider block mb-0.5">
                                🏡 Yetkazish Mahalla:
                              </span>
                              <span className="text-slate-900 font-black text-xs leading-snug">
                                {order.address.mahalla}
                              </span>
                              {order.deliveryFee && (
                                <span className="text-[9.5px] font-mono font-bold text-emerald-700 mt-0.5 block">
                                  Yetkazish haqi: {formatPrice(order.deliveryFee)}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Order Items & Comment */}
                          <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 space-y-1">
                            <div className="flex justify-between items-center text-[9px] text-slate-400 font-extrabold uppercase">
                              <span>📦 Buyurtma tarkibi ({order.items.length} xil):</span>
                              {order.address.comment && <span className="text-slate-500 italic">Mo'ljal: {order.address.comment}</span>}
                            </div>
                            <div className="space-y-0.5">
                              {order.items.map((item, idx) => (
                                <div key={idx} className="text-slate-700 text-xs font-bold flex justify-between items-center">
                                  <span className="truncate pr-2">• {item.product.name}</span>
                                  <span className="font-mono font-bold text-slate-500 shrink-0">{item.quantity} ta</span>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Admin / Dispatcher Comment */}
                          {(order.adminComment || order.courierComment || order.comment || (order as any).dispatcherNote) && (
                            <div className="bg-amber-500/10 border border-amber-500/30 p-2.5 rounded-xl text-amber-950 text-xs space-y-0.5">
                              <span className="text-[9px] font-black uppercase text-amber-800 block">💬 Admin / Dispetcher izohi:</span>
                              <p className="font-bold text-slate-900 leading-snug">
                                {order.adminComment || order.courierComment || order.comment || (order as any).dispatcherNote}
                              </p>
                            </div>
                          )}

                          {/* Green accept button - triggers confirmation modal (Requirement 2) */}
                          <button
                            onClick={() => setClaimConfirmOrder(order)}
                            className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-black text-xs uppercase tracking-wider rounded-xl flex items-center justify-center space-x-1.5 transition-all shadow-md active:scale-95 cursor-pointer border-none"
                          >
                            <CheckCircle2 className="h-4 w-4" />
                            <span>QABUL QILDIM</span>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  /* Pulsing Radar Scanning State when empty */
                  <div className="flex flex-col items-center justify-center p-12 text-center border border-dashed border-slate-200 rounded-[24px] bg-slate-50/50 relative overflow-hidden min-h-[300px]">
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="h-16 w-16 rounded-full border border-emerald-200/40 animate-ping" />
                      <div className="h-32 w-32 rounded-full border border-emerald-100/20 animate-ping [animation-delay:1.2s]" />
                    </div>
                    <span className="text-3xl animate-bounce relative z-10 mb-2">📡</span>
                    <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider relative z-10">Yangi Buyurtmalar Kutish Zali</h3>
                    <p className="text-[10px] text-slate-400 mt-2.5 leading-relaxed w-full max-w-xs relative z-10">
                      Hozirda siz ko'ra oladigan yangi buyurtmalar mavjud emas. Radar faol holatda yangi tushgan buyurtmalarni skanerlamoqda...
                    </p>
                  </div>
                )
              ) : (
                /* Offline notice block */
                <div className="flex flex-col items-center justify-center p-12 text-center border border-dashed border-slate-200 rounded-[24px] bg-slate-50">
                  <span className="text-3xl opacity-55 mb-2">📴</span>
                  <h3 className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">Siz Oflaynsiz</h3>
                  <p className="text-[10px] text-slate-400 mt-2.5 leading-relaxed w-full max-w-xs">
                    Sizning holatingiz hozirda oflayn. Yangi buyurtmalarni skanerlashni boshlash uchun yuqoridagi statusni <strong>Onlayn</strong> holatga o'tkazing.
                  </p>
                </div>
              )}
            </div>
          </>
        )}

        {/* Buyurtmalar (Orders) Tab — displays the forced lock screen if they have claimed an order */}
        {activeTab === 'orders' && (
          <div className="space-y-4">
            
            {/* Faol Buyurtmalar */}
            <div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">
                MENING FAOL BUYURTMALARIM ({claimedOrders.length})
              </span>
              
              {claimedOrders.length > 0 ? (
                <div className="space-y-4">
                  {claimedOrders.map((order) => {
                    return (
                      <div 
                        key={order.id}
                        className="p-5 rounded-2xl border bg-white dark:bg-[#111827] border-emerald-500/35 text-xs space-y-4.5 shadow-sm animate-fade-in"
                      >
                        {/* 1. Header block */}
                        <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-800">
                          <div className="flex flex-col space-y-1">
                            <div className="flex items-center space-x-1.5">
                              <span className="font-mono text-xs font-black text-slate-900 dark:text-white">{order.id}</span>
                              <span className="text-[8px] bg-emerald-500 text-slate-950 px-1.5 py-0.5 rounded-md font-black uppercase tracking-wider">Mening faol</span>
                            </div>
                            <div>
                              <span className={`text-[8.5px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${
                                order.paymentMethod === 'Online' 
                                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300 border border-blue-200/30' 
                                  : 'bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300 border border-amber-200/30'
                              }`}>
                                To'lov: {order.paymentMethod === 'Online' ? '💻 Online' : '💵 Naqd'}
                              </span>
                            </div>
                          </div>
                          <span className="font-mono text-emerald-500 font-black text-sm">{formatPrice(order.total)}</span>
                        </div>

                        {/* 2. Store & Pickup */}
                        <div className="space-y-2.5 bg-slate-50 dark:bg-slate-950/40 p-3 rounded-xl border border-slate-100 dark:border-slate-800/40">
                          <div className="flex items-center justify-between">
                            <span className="text-[8.5px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider block">
                              🏪 Olib ketiladigan do'konlar ({order.stores && order.stores.length > 0 ? order.stores.length : 1} ta):
                            </span>
                          </div>

                          {/* Interactive checkboxes for stores */}
                          <div className="space-y-1.5">
                            {(order.stores && order.stores.length > 0
                              ? order.stores
                              : [{ storeId: 'single', storeName: order.storeName }]
                            ).map((st, stIdx) => {
                              const key = `${order.id}-${st.storeId || st.storeName}`;
                              const isPicked = !!pickedStoresMap[key];
                              return (
                                <div
                                  key={stIdx}
                                  onClick={() => toggleStorePicked(key)}
                                  className={`flex items-center justify-between p-2 rounded-xl border cursor-pointer transition-all ${
                                    isPicked
                                      ? 'bg-emerald-50/90 border-emerald-300 dark:bg-emerald-950/50 dark:border-emerald-800'
                                      : 'bg-white border-slate-200/80 dark:bg-slate-900 dark:border-slate-800'
                                  }`}
                                >
                                  <div className="flex items-center space-x-2">
                                    <input
                                      type="checkbox"
                                      checked={isPicked}
                                      onChange={() => {}}
                                      className="h-4 w-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
                                    />
                                    <span className={`text-[11px] font-extrabold ${isPicked ? 'text-emerald-800 dark:text-emerald-300 line-through' : 'text-slate-800 dark:text-slate-200'}`}>
                                      {st.storeName}
                                    </span>
                                  </div>
                                  {isPicked && (
                                    <span className="text-[9px] font-black text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/60 px-2 py-0.5 rounded-md">
                                      ✅ Olindi
                                    </span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                          
                          {/* Contents list */}
                          <div className="pt-2 border-t border-slate-200/40 dark:border-slate-800/40">
                            <span className="font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider text-[8px] block mb-1">Xarid mahsulotlari:</span>
                            <div className="space-y-1.5">
                              {order.items.map((item, idx) => (
                                <div key={idx} className="flex justify-between text-slate-700 dark:text-slate-300 font-bold text-[10.5px]">
                                  <span>• {item.quantity}x {item.product.name} {item.storeName && <span className="text-slate-400">({item.storeName})</span>}</span>
                                  <span className="font-mono text-slate-500 dark:text-slate-400">{formatPrice(item.product.price)}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* 3. Customer Info & Call */}
                        <div className="space-y-3.5 bg-slate-50 dark:bg-slate-950/40 p-3.5 rounded-xl border border-slate-100 dark:border-slate-800/40">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <span className="text-base">👤</span>
                              <div>
                                <span className="text-[8px] text-slate-400 dark:text-slate-500 font-black uppercase tracking-wider block">Mijoz ismi:</span>
                                <span className="font-black text-slate-800 dark:text-slate-200 text-[11.5px] block">{order.customerName}</span>
                              </div>
                            </div>
                            <a 
                              href={`tel:${order.customerPhone}`}
                              onClick={() => {
                                setCalledOrders(prev => ({ ...prev, [order.id]: true }));
                              }}
                              className="bg-emerald-500 hover:bg-emerald-600 dark:bg-emerald-500 dark:hover:bg-emerald-600 text-slate-950 dark:text-slate-950 font-black px-3 py-1.5 rounded-lg text-[10px] flex items-center space-x-1 transition-all shadow-xs shrink-0"
                            >
                              <Phone className="h-3 w-3 shrink-0" />
                              <span className="font-mono">{order.customerPhone}</span>
                            </a>
                          </div>

                          {/* Destination address */}
                          <div className="pt-2 border-t border-slate-200/40 dark:border-slate-800/40 space-y-1">
                            <div className="flex items-start space-x-1.5">
                              <MapPin className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
                              <div className="flex-1">
                                <span className="text-[8px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider block">Yetkazish manzili (Mahalla):</span>
                                <span className="text-slate-800 dark:text-slate-200 font-black text-xs block leading-relaxed">{order.address.mahalla}</span>
                                {order.deliveryFee && (
                                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold font-mono block mt-0.5">
                                    Yetkazish haqi: {formatPrice(order.deliveryFee)} {order.pickupPointsCount && order.pickupPointsCount > 1 ? `(${order.pickupPointsCount} nuqta: +${formatPrice(order.extraStopsFee || 0)})` : (order.extraStopsFee && order.extraStopsFee > 0 ? `(+${formatPrice(order.extraStopsFee)} ko'p nuqta)` : '')}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Mo'ljal */}
                            <div className="mt-2 pt-2 border-t border-slate-200/40 dark:border-slate-800/40">
                              <span className="text-[8px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider block mb-1">✍️ Mijoz qoldirgan qo'shimcha mo'ljal:</span>
                              {order.address.comment ? (
                                <div className="bg-amber-500/10 text-amber-700 dark:text-amber-400 p-2.5 rounded-lg border border-amber-500/20 text-[10.5px] font-bold leading-relaxed shadow-xs">
                                  "{order.address.comment}"
                                </div>
                              ) : (
                                <div className="text-[10px] text-slate-400 italic">
                                  Mijoz tomonidan qo'shimcha mo'ljal kiritilmagan.
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* 4. Comments and Audio Instructions - Task 10b: Single primary dispatcher note block */}
                        {(order.courierComment || order.adminComment || order.comment || (order as any).dispatcherNote || order.items.some(item => item.product.voiceUrl) || order.adminVoiceUrl) && (
                          <div className="space-y-2.5 bg-slate-50 dark:bg-slate-950/40 p-3.5 rounded-xl border border-slate-100 dark:border-slate-800/40 text-left">
                            <span className="text-[8px] text-indigo-500 dark:text-indigo-400 font-extrabold uppercase tracking-wider block">💬 Dispetcher va Ovozli Ko'rsatmalar:</span>
                            
                            {(order.courierComment || order.adminComment || order.comment || (order as any).dispatcherNote) && (
                              <div className="bg-amber-500/10 dark:bg-amber-500/15 border border-amber-500/30 p-2.5 rounded-xl text-[11px] space-y-0.5">
                                <span className="text-[8px] text-amber-800 dark:text-amber-300 font-black uppercase tracking-wider block">💬 Dispetcher izohi:</span>
                                <p className="text-slate-900 dark:text-slate-100 font-bold leading-snug">
                                  {order.courierComment || order.adminComment || order.comment || (order as any).dispatcherNote}
                                </p>
                              </div>
                            )}

                            {/* Voice comments from client */}
                            {order.items.map((item, idx) => item.product.voiceUrl && (
                              <div key={`${item.product.id}-${idx}`} className="space-y-1 bg-white dark:bg-[#1e293b]/50 p-2 rounded-lg border border-slate-150 dark:border-slate-800">
                                <span className="text-[8px] text-indigo-500 font-bold block">🎙️ Mijoz Ovozli Ko'rsatmasi:</span>
                                <audio src={item.product.voiceUrl} controls className="w-full h-8 max-w-full accent-indigo-500" />
                              </div>
                            ))}

                            {/* Voice comments from admin */}
                            {order.adminVoiceUrl && (
                              <div className="space-y-1 bg-white dark:bg-[#1e293b]/50 p-2 rounded-lg border border-slate-150 dark:border-slate-800">
                                <span className="text-[8px] text-amber-500 font-bold block">🎙️ Admin Ovozli Ko'rsatmasi:</span>
                                <audio src={order.adminVoiceUrl} controls className="w-full h-8 max-w-full accent-amber-500" />
                              </div>
                            )}
                          </div>
                        )}

                        {/* 5. Actions: Yandex Maps Directions & Finish */}
                        <div className="space-y-2 pt-1">
                          {Boolean(order.address.latitude && order.address.longitude) && (
                            <a
                              href={`https://yandex.ru/maps/?rtext=${courierCoords ? `${courierCoords.latitude},${courierCoords.longitude}` : ''}~${order.address.latitude},${order.address.longitude}&rtt=auto`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-[10px] uppercase tracking-wider rounded-xl flex items-center justify-center space-x-1.5 transition-all shadow-sm cursor-pointer border-none"
                            >
                              <Navigation className="h-3.5 w-3.5 text-slate-950 shrink-0" />
                              <span>🟡 Yandex Navigatsiya (Marshrut)</span>
                            </a>
                          )}

                          <button
                            onClick={() => handleCompleteDelivery(order.id)}
                            className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 dark:bg-emerald-500 dark:hover:bg-emerald-600 text-slate-950 dark:text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl flex items-center justify-center space-x-1.5 transition-all shadow-md cursor-pointer border-none"
                          >
                            <CheckSquare className="h-4 w-4 shrink-0" />
                            <span>YETKAZILDI (QABUL QILDIM)</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-5 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-[10px] text-slate-400 bg-slate-50 dark:bg-slate-950/20">
                  Sizda hozircha faol qabul qilingan buyurtmalar yo'q. Bosh sahifa (Asosiy) bo'limidan buyurtmalarni qabul qiling!
                </div>
              )}
            </div>

            {/* Calendar & Date Range Filter for Courier Orders */}
            <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 rounded-2xl space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-1.5">
                  <Calendar className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                    Buyurtmalar kalendari
                  </span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <input
                    type="date"
                    value={ordersDateFilter}
                    onChange={(e) => {
                      setOrdersDateFilter(e.target.value);
                      setOrdersPresetFilter('all');
                    }}
                    className="bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-[10px] p-1 font-mono font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:border-emerald-500 cursor-pointer"
                  />
                  {ordersDateFilter && (
                    <button
                      onClick={() => setOrdersDateFilter('')}
                      className="text-[9px] bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300 font-bold px-1.5 py-0.5 rounded cursor-pointer"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-4 gap-1 text-[10px]">
                {[
                  { id: 'all', label: 'Barchasi' },
                  { id: 'today', label: 'Bugun' },
                  { id: 'week', label: 'Bu hafta' },
                  { id: 'month', label: 'Bu oy' },
                ].map(p => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      setOrdersPresetFilter(p.id as any);
                      setOrdersDateFilter('');
                    }}
                    className={`py-1 px-1.5 rounded-lg font-bold border text-center transition-all cursor-pointer ${
                      ordersPresetFilter === p.id && !ordersDateFilter
                        ? 'bg-emerald-500 text-white border-emerald-600 shadow-xs'
                        : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Requirement 3, 4, 7: Combined Archive List for Completed and Cancelled Orders */}
            {(() => {
              const filteredArchiveOrders = allArchiveOrders.filter(o => {
                if (ordersDateFilter) {
                  const dStr = o.deliveredAt || o.updatedAt || o.createdAt;
                  if (!dStr) return true;
                  try {
                    const orderIso = new Date(dStr).toISOString().split('T')[0];
                    return orderIso === ordersDateFilter;
                  } catch (e) { return true; }
                }
                if (ordersPresetFilter === 'today') {
                  const dStr = o.deliveredAt || o.updatedAt || o.createdAt;
                  if (!dStr) return true;
                  try {
                    return new Date(dStr).toISOString().split('T')[0] === new Date().toISOString().split('T')[0];
                  } catch (e) { return true; }
                }
                if (ordersPresetFilter === 'week') {
                  const dStr = o.deliveredAt || o.updatedAt || o.createdAt;
                  if (!dStr) return true;
                  try {
                    const orderTime = new Date(dStr).getTime();
                    return orderTime >= (Date.now() - 7 * 86400000);
                  } catch (e) { return true; }
                }
                if (ordersPresetFilter === 'month') {
                  const dStr = o.deliveredAt || o.updatedAt || o.createdAt;
                  if (!dStr) return true;
                  try {
                    const orderTime = new Date(dStr).getTime();
                    return orderTime >= (Date.now() - 30 * 86400000);
                  } catch (e) { return true; }
                }
                return true;
              });

              return (
                <div className="pt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                      YETKAZILGAN BUYURTMALAR ARXIVI ({filteredArchiveOrders.length})
                    </span>
                    {filteredArchiveOrders.length > 0 && (
                      <button
                        onClick={() => setShowArchive(prev => !prev)}
                        className="text-[10px] font-bold text-emerald-600 hover:underline flex items-center space-x-1 cursor-pointer"
                      >
                        <span>{showArchive ? 'Yashirish ▴' : "Ko'rsatish ▾"}</span>
                      </button>
                    )}
                  </div>

                  {showArchive && (
                    filteredArchiveOrders.length > 0 ? (
                      <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
                        {filteredArchiveOrders.map((order) => {
                          const isCancelled = order.status === 'Bekor qilindi';
                          const productPrice = getProductTotalOnly(order);

                          return (
                            <div 
                              key={order.id} 
                              className={`p-3.5 rounded-xl text-xs space-y-2 shadow-xs relative overflow-hidden border ${
                                isCancelled 
                                  ? 'bg-rose-50/60 border-rose-200/80' 
                                  : 'bg-orange-50/50 border-orange-200/60'
                              }`}
                            >
                              {/* Left accent color strip */}
                              <div className={`absolute left-0 top-0 bottom-0 w-1 ${isCancelled ? 'bg-rose-500' : 'bg-orange-500'}`} />

                              <div className="flex justify-between items-center pl-1">
                                <div className="flex items-center space-x-1.5">
                                  <span className={`font-mono font-bold ${isCancelled ? 'text-rose-900' : 'text-orange-900'}`}>#{order.id}</span>
                                  <span className={`text-[7.5px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider ${
                                    isCancelled 
                                      ? 'bg-rose-100 text-rose-800' 
                                      : 'bg-orange-100 text-orange-800'
                                  }`}>
                                    {isCancelled ? 'Bekor qilindi' : 'Yetkazildi'}
                                  </span>
                                </div>
                                <span className="text-[9px] text-slate-500 font-bold font-mono">⏱️ {order.time || '12:00'}</span>
                              </div>

                              <div className="pl-1 space-y-1 text-slate-700">
                                <div className="text-[11px]">
                                  <span className="font-extrabold text-slate-400 text-[8.5px] uppercase block">🏬 Do'kon:</span>
                                  <span className="font-bold text-slate-800">{order.storeName}</span>
                                </div>
                                <div className="text-[11px]">
                                  <span className="font-extrabold text-slate-400 text-[8.5px] uppercase block">🏡 Yetkazish Manzili:</span>
                                  <span className="font-bold text-slate-800">{order.address.mahalla}</span>
                                </div>
                                {!isCancelled && (
                                  <div className="pt-1 flex items-center justify-between text-[10.5px]">
                                    <span className="text-slate-500 font-bold">⏱️ Ketgan vaqt:</span>
                                    <span className="font-black text-orange-700 bg-orange-100/60 px-2 py-0.5 rounded-md">
                                      {order.deliveryDuration || "18 daqiqa"}
                                    </span>
                                  </div>
                                )}
                                {isCancelled && (order.adminComment || order.cancellationReason) && (
                                  <div className="text-[10px] text-rose-700 font-bold bg-white/80 p-1.5 rounded border border-rose-200 mt-1">
                                    Sabab: {order.adminComment || order.cancellationReason}
                                  </div>
                                )}
                              </div>

                              {/* Requirement 4: FAQAT mijoz mahsulot uchun to'lagan summa ko'rsatilsin (kuryer haqi qo'shilmasin) */}
                              <div className="pl-1 pt-1.5 border-t border-slate-200/60 flex justify-between items-center">
                                <span className="text-[9px] text-slate-400 font-bold">Mahsulot summasi:</span>
                                <span className={`font-mono font-black text-xs px-2 py-0.5 rounded-md ${
                                  isCancelled ? 'text-rose-600 bg-rose-100/60' : 'text-orange-600 bg-orange-100/60'
                                }`}>
                                  {formatPrice(productPrice)}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="p-4 text-center border border-dashed border-slate-200 rounded-2xl text-[10px] text-slate-400 bg-slate-50">
                        Yetkazilgan buyurtmalar arxivi bo'sh.
                      </div>
                    )
                  )}
                </div>
              );
            })()}

          </div>
        )}

        {/* Daromad (Earnings) Tab - Requirement B & E */}
        {activeTab === 'earnings' && !hasActiveClaimed && (
          <div className="space-y-4">
            
            {/* Requirement 1: SOF YETKAZISH DAROMADI - Tanlangan sana oralig'iga mos ravishda ko'rsatiladi */}
            <div className="bg-emerald-500 text-white p-4 rounded-2xl text-center shadow-md shadow-emerald-500/10 space-y-1">
              <span className="text-[10px] text-emerald-100 font-extrabold uppercase block tracking-widest">
                {datePreset === 'today' ? "BUGUNGI SOF YETKAZISH DAROMADI" : datePreset === 'week' ? "BU HAFTALIK SOF YETKAZISH DAROMADI" : datePreset === 'month' ? "BU OYLIK SOF YETKAZISH DAROMADI" : datePreset === 'all' ? "BARCHA DAVRDAGI SOF YETKAZISH DAROMADI" : "TANLANGAN DAVR SOF YETKAZISH DAROMADI"}
              </span>
              <span className="font-mono font-black text-2xl block">
                {formatPrice(periodDeliveryEarnings)}
              </span>
              <span className="text-[9.5px] text-emerald-100/90 block font-medium">
                {periodCompletedOrders.length} ta yetkazilgan buyurtma yetkazib berish haqi (+qo'shimcha nuqtalar)
              </span>
            </div>

            {/* Requirement B: SANA ORALIG'INI TANLASH UCHUN KALENDAR (DATE RANGE PICKER) */}
            <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-1.5">
                  <Calendar className="h-4 w-4 text-emerald-600" />
                  <span className="text-[10px] font-black uppercase text-slate-700 tracking-wider">
                    SANA ORALIG'INI TANLASH
                  </span>
                </div>
                <span className="text-[9px] font-bold text-slate-400">
                  {earningsSubTab === 'earnings_list' ? `${periodCompletedOrders.length} ta buyurtma` : `${realTransactionsList.length} ta yozuv`}
                </span>
              </div>

              {/* Preset Buttons */}
              <div className="grid grid-cols-5 gap-1 text-[10px]">
                {[
                  { id: 'today', label: 'Bugun' },
                  { id: 'week', label: 'Bu hafta' },
                  { id: 'month', label: 'Bu oy' },
                  { id: 'all', label: 'Barchasi' },
                  { id: 'custom', label: 'Maxsus' },
                ].map(p => (
                  <button
                    key={p.id}
                    onClick={() => setDatePreset(p.id as any)}
                    className={`py-1.5 px-1 rounded-xl font-bold transition-all text-center cursor-pointer border ${
                      datePreset === p.id
                        ? 'bg-emerald-500 text-white border-emerald-600 shadow-xs'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              {/* Custom Date Inputs */}
              {datePreset === 'custom' && (
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div>
                    <label className="text-[8.5px] font-bold text-slate-400 block mb-1 uppercase tracking-wider">Boshlanish sanasi:</label>
                    <input
                      type="date"
                      value={customStartDate}
                      onChange={e => setCustomStartDate(e.target.value)}
                      className="w-full text-xs font-mono bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-slate-700 font-bold focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="text-[8.5px] font-bold text-slate-400 block mb-1 uppercase tracking-wider">Tugash sanasi:</label>
                    <input
                      type="date"
                      value={customEndDate}
                      onChange={e => setCustomEndDate(e.target.value)}
                      className="w-full text-xs font-mono bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-slate-700 font-bold focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
              )}

              {/* Period Quick Summary Stats */}
              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200/80">
                <div className="bg-white p-2.5 rounded-xl border border-slate-100 text-center">
                  <span className="text-[8px] font-bold text-slate-400 block uppercase">TANLANGAN DAVR YETKAZISH HAQI:</span>
                  <span className="font-mono text-xs font-black text-emerald-600 mt-0.5 block">{formatPrice(periodDeliveryEarnings)}</span>
                </div>
                <div className="bg-white p-2.5 rounded-xl border border-slate-100 text-center">
                  <span className="text-[8px] font-bold text-slate-400 block uppercase">TIZIM KOMISSIYASI YECHILGAN:</span>
                  <span className="font-mono text-xs font-black text-rose-500 mt-0.5 block">-{formatPrice(periodCommissionDeducted)}</span>
                </div>
              </div>
            </div>

            {/* Requirement 3: Daromadlar ro'yxati va Balans harakatini alohida ajratish */}
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-2xl text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setEarningsSubTab('earnings_list')}
                  className={`py-2 px-3 rounded-xl transition-all cursor-pointer font-black text-[10px] uppercase tracking-wider flex items-center justify-center space-x-1.5 border-none ${
                    earningsSubTab === 'earnings_list'
                      ? 'bg-white text-emerald-700 shadow-xs'
                      : 'bg-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <span>📦 Daromadlar Ro'yxati</span>
                  <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded-md text-[9px] font-mono font-black">
                    {periodCompletedOrders.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setEarningsSubTab('balance_history')}
                  className={`py-2 px-3 rounded-xl transition-all cursor-pointer font-black text-[10px] uppercase tracking-wider flex items-center justify-center space-x-1.5 border-none ${
                    earningsSubTab === 'balance_history'
                      ? 'bg-white text-indigo-700 shadow-xs'
                      : 'bg-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <span>💳 Balans Harakatlari</span>
                  <span className="px-1.5 py-0.5 bg-indigo-100 text-indigo-700 rounded-md text-[9px] font-mono font-black">
                    {realTransactionsList.length}
                  </span>
                </button>
              </div>

              {/* Sub-tab 1: Daromadlar Ro'yxati (Completed Delivery Payouts) */}
              {earningsSubTab === 'earnings_list' && (
                <div className="space-y-2">
                  <div className="space-y-1.5 max-h-[360px] overflow-y-auto pr-1">
                    {periodCompletedOrders.length > 0 ? (
                      periodCompletedOrders.map((ord) => {
                        const deliveryFee = typeof ord.deliveryFee === 'number' && ord.deliveryFee > 0 ? ord.deliveryFee : 15000;
                        const extraFee = ord.extraStopsFee || ord.extraStopFee || 0;
                        const totalFee = deliveryFee + extraFee;

                        return (
                          <div key={ord.id} className="p-3 bg-white border border-slate-200/80 rounded-xl space-y-1 shadow-xs hover:border-emerald-300 transition-all">
                            <div className="flex justify-between items-center">
                              <span className="font-mono font-black text-xs text-emerald-600">{ord.id}</span>
                              <span className="font-mono font-black text-xs text-emerald-700">{formatPrice(totalFee)}</span>
                            </div>
                            <div className="flex justify-between items-center text-[10px] text-slate-500">
                              <span>Do'kon: <strong className="text-slate-700">{ord.storeName}</strong></span>
                              <span>Manzil: <strong className="text-slate-700">{ord.address?.mahalla || 'Kiritilmagan'}</strong></span>
                            </div>
                            <div className="flex justify-between items-center text-[9px] text-slate-400 pt-1 border-t border-slate-100">
                              <span>Sana: {ord.date || ord.completedAtDate || 'Bugun'} ({ord.time || '12:00'})</span>
                              {ord.pickupPointsCount && ord.pickupPointsCount > 1 ? (
                                <span className="text-purple-600 font-bold">📍 {ord.pickupPointsCount} ta nuqta (+{formatPrice(extraFee)})</span>
                              ) : (
                                <span className="text-emerald-600 font-bold">✓ Yetkazildi</span>
                              )}
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="p-5 text-center border border-dashed border-slate-200 rounded-2xl text-[10px] text-slate-400 bg-slate-50">
                        Tanlangan sana oralig'ida yetkazib berilgan daromadlar topilmadi.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Sub-tab 2: Balans Harakati va Real Tranzaksiyalar */}
              {earningsSubTab === 'balance_history' && (
                <div className="space-y-2">
                  <div className="space-y-1.5 max-h-[360px] overflow-y-auto pr-1">
                    {realTransactionsList.length > 0 ? (
                      realTransactionsList.map((tx) => (
                        <div key={tx.id} className="p-2.5 bg-slate-50 border border-slate-100 rounded-xl flex justify-between items-center text-[10px] shadow-xs hover:border-slate-200 transition-all">
                          <div className="flex items-start space-x-2.5 min-w-0 pr-2">
                            <span className={`p-1.5 rounded-lg text-xs font-bold leading-none shrink-0 ${
                              tx.type === 'refill' 
                                ? 'bg-blue-100 text-blue-600' 
                                : (tx.type === 'payout' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-500')
                            }`}>
                              {tx.type === 'refill' ? '💳' : (tx.type === 'payout' ? '↗️' : '↘️')}
                            </span>
                            <div className="min-w-0">
                              <span className="font-bold text-slate-800 block truncate">{tx.description}</span>
                              <span className="text-[8.5px] text-slate-400 font-medium block mt-0.5">{tx.dateStr}</span>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <span className={`font-mono font-black text-[11px] block ${
                              tx.type === 'refill' || tx.type === 'payout' ? 'text-emerald-600' : 'text-rose-500'
                            }`}>
                              {tx.type === 'refill' || tx.type === 'payout' ? '+' : '-'}{formatPrice(tx.amount)}
                            </span>
                            <span className="text-[8px] text-slate-400 block mt-0.5 font-mono">
                              {tx.type === 'refill' ? "Balans To'ldirish" : (tx.type === 'payout' ? "Yetkazish Haqi" : "Komissiya")}
                            </span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-5 text-center border border-dashed border-slate-200 rounded-2xl text-[10px] text-slate-400 bg-slate-50">
                        Tanlangan sana oralig'ida tranzaksiyalar mavjud emas.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

          </div>
        )}

        {/* Profil (Profile) Tab */}
        {activeTab === 'profile' && !hasActiveClaimed && (
          <div className="space-y-4">
            
            {/* Courier card display - Requirement 11 fulfilled (Sinf Premium removed) */}
            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-5 text-center space-y-2 shadow-xs">
              <div className="mx-auto h-16 w-16 rounded-full bg-emerald-100 border border-emerald-200 flex items-center justify-center text-3xl shadow-xs">
                🚴
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-800">{courierName}</h3>
                <span className="text-[9.5px] text-emerald-600 font-black bg-emerald-50 border border-emerald-100 px-2.5 py-0.5 rounded-full uppercase tracking-wider mt-0.5 inline-block">
                  {isOnline ? 'Smenada Onlayn' : 'Dam olmoqda'}
                </span>
              </div>
              <div className="flex justify-center space-x-2 text-xs font-bold text-slate-400 pt-1">
                <span>Reyting: <strong className="text-amber-500">⭐ {averageRating}</strong> <span className="text-[10px] text-slate-400 font-semibold">({ratedOrders.length} ta baho)</span></span>
              </div>
            </div>

            {/* Profile rows - Requirement 12: "bosh ofis aloqa o'rniga Adminga bog'lanish deb yoz" */}
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs text-xs">
              {[
                { label: 'Kuryer ID', val: '#KURYER-777' },
                { label: 'Telefon raqam', val: courierPhone, action: `tel:${courierPhone}` },
                { label: 'Adminga qarzim (naqd market)', val: formatPrice(myDebtAmount) },
                { label: 'Transport turi', val: (() => {
                  const activeObj = (courierList || []).find((c: any) => (c.phone || '').replace(/\D/g, '') === (courierPhone || '').replace(/\D/g, '')) || INITIAL_COURIERS.find((c: any) => (c.phone || '').replace(/\D/g, '') === (courierPhone || '').replace(/\D/g, ''));
                  return activeObj ? normalizeCourierTransport(activeObj.transport) : 'Yengil avtomobil';
                })() },
                { label: 'Kompanyasi', val: 'KasbiGo Express Co.' },
                { label: "Adminga bog'lanish", val: propAdminPhone || '+998 (71) 200-45-45', action: `tel:${propAdminPhone || '+998712004545'}` },
              ].map((item, idx) => (
                <div key={idx} className="flex justify-between items-center p-3.5 border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition-all">
                  <span className="text-slate-400 font-bold">{item.label}</span>
                  {item.action ? (
                    <a href={item.action} className="font-mono text-emerald-600 hover:underline font-black">
                      {item.val}
                    </a>
                  ) : (
                    <span className="font-bold text-slate-700">{item.val}</span>
                  )}
                </div>
              ))}
            </div>

            {/* Logout Button */}
            <button
              type="button"
              onClick={() => setShowLogoutModal(true)}
              className="w-full py-3.5 rounded-2xl bg-rose-500 hover:bg-rose-600 text-white dark:bg-rose-950/40 dark:hover:bg-rose-900/60 dark:text-rose-200 font-extrabold text-xs tracking-wider uppercase transition-all shadow-md cursor-pointer flex items-center justify-center space-x-2 border border-rose-600/10 dark:border-rose-950"
            >
              <LogOut className="h-4 w-4" />
              <span>Tizimdan chiqish</span>
            </button>
          </div>
        )}

      </div>

      {/* 5) Bottom bar tabs: Asosiy (home), Buyurtmalar (orders), Daromad (earnings) va Profil (profile) */}
      {/* Requirement 2 fulfilled: Hide bottom tab navigator when courier has an active claimed order to prevent navigating away! */}
      {!hasActiveClaimed ? (
        <div className="border-t border-slate-100 bg-white pt-3 pb-1 px-1 flex justify-around items-center shrink-0 z-10 mt-3">
          {[
            { id: 'home', label: 'Asosiy', icon: Bike },
            { id: 'orders', label: 'Buyurtmalar', icon: History },
            { id: 'earnings', label: 'Daromad', icon: Wallet },
            { id: 'profile', label: 'Profil', icon: User },
          ].map((tab) => {
            const Icon = tab.icon;
            const isTabActive = activeTab === tab.id;
            
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className="flex flex-col items-center flex-1 py-1 text-slate-400 hover:text-slate-600 transition-all cursor-pointer relative focus:outline-none"
              >
                {/* Badge count indicator for home tab if there are active unclaimed orders - strictly synchronized with filtered list (Requirement 1) */}
                {tab.id === 'home' && isOnline && filteredUnclaimedOrders.length > 0 && (
                  <span className="absolute top-0.5 right-[22%] bg-rose-500 text-white font-mono text-[8px] font-black h-3.5 min-w-3.5 px-1 rounded-full flex items-center justify-center animate-pulse border border-white">
                    {filteredUnclaimedOrders.length}
                  </span>
                )}
                {tab.id === 'orders' && claimedOrders.length > 0 && (
                  <span className="absolute top-0.5 right-[22%] bg-emerald-500 text-white font-mono text-[8px] font-black h-3.5 min-w-3.5 px-1 rounded-full flex items-center justify-center border border-white">
                    {claimedOrders.length}
                  </span>
                )}

                <Icon className={`h-5 w-5 transition-all duration-200 ${isTabActive ? 'text-emerald-500 scale-110' : 'text-slate-400'}`} />
                <span className={`text-[9.5px] font-bold mt-1 tracking-tight ${isTabActive ? 'text-slate-800 font-extrabold' : 'text-slate-400'}`}>
                  {tab.label}
                </span>
                {isTabActive && (
                  <motion.span 
                    layoutId="activeCourierTabIndicator"
                    className="absolute bottom-[-10px] h-1 w-6 bg-emerald-500 rounded-full" 
                  />
                )}
              </button>
            );
          })}
        </div>
      ) : (
        /* Disabled navigation block decorator while active order is locked */
        <div className="border-t border-slate-100 bg-slate-50 py-3.5 px-4 text-center shrink-0 z-10 mt-3 rounded-b-2xl">
          <span className="text-[9.5px] font-bold text-slate-400 uppercase tracking-widest flex items-center justify-center space-x-1">
            <Lock className="h-3 w-3 text-slate-400 mr-1" />
            <span>Navigatsiya cheklangan • Buyurtma faol</span>
          </span>
        </div>
      )}

      {/* Custom React Logout Confirmation Modal (No native confirm) */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-xs w-full text-center space-y-4 shadow-2xl">
            <div className="h-12 w-12 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto">
              <LogOut className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">Tizimdan chiqish</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-bold">Rostdan ham chiqmoqchimisiz?</p>
            </div>
            <div className="grid grid-cols-2 gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowLogoutModal(false)}
                className="py-3 px-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer border-none"
              >
                Bekor qilish
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowLogoutModal(false);
                  if (setIsCourierOnline) setIsCourierOnline(false);
                  localStorage.removeItem('kasbigo-active-courier-phone');
                  if (setCourierPhone) setCourierPhone('');
                  setLoggedInPhone(null);
                  setLoginPhone('');
                  setLoginPassword('');
                }}
                className="py-3 px-3 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer shadow-md shadow-rose-600/20 border-none"
              >
                Ha, chiqish
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Requirement 2: Custom React Claim Order Confirmation Modal */}
      {claimConfirmOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 max-w-xs w-full text-center space-y-4 shadow-2xl border border-slate-200">
            <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center mx-auto text-2xl">
              🚚
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-black text-slate-900">Buyurtmani qabul qilish</h3>
              <p className="text-xs text-slate-600 font-bold leading-relaxed">
                Haqiqatan ham bu buyurtmani qabul qilasizmi?
              </p>
              <div className="text-[11px] font-mono font-black text-emerald-600 pt-1">
                #{claimConfirmOrder.id} • {claimConfirmOrder.storeName}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => setClaimConfirmOrder(null)}
                className="py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-black uppercase transition-all cursor-pointer border-none"
              >
                Bekor qilish
              </button>
              <button
                type="button"
                onClick={() => {
                  const targetId = claimConfirmOrder.id;
                  setClaimConfirmOrder(null);
                  handleClaimOrder(targetId);
                }}
                className="py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase transition-all cursor-pointer shadow-md shadow-emerald-600/20 border-none"
              >
                Ha, qabul qilaman
              </button>
            </div>
          </div>
        </div>
      )}



    </div>
  );
};
