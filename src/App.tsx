/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { STORES, CATEGORIES as INITIAL_CATEGORIES, INITIAL_PROMOS, INITIAL_PARTNERS, INITIAL_COURIERS, INITIAL_DELIVERY_ZONES } from './data';
import { Store, Product, CartItem, Order, ScreenType, PromoBanner, PopularPartner, Category, DeliveryZone } from './types';
import { PhoneFrame, KasbiGoLogo } from './components/PhoneFrame';
import { playNotificationSound } from './utils/audio';
import { isCashPaymentAllowed } from './utils/paymentRules';
import { renumberOrders } from './utils/orderUtils';
import { safeSetItem, safeSetOrdersItem } from './utils/safeStorage';
import { CourierPanel } from './components/CourierPanel';
import { SuperAdminPanel } from './components/SuperAdminPanel';
import { Award } from 'lucide-react';
import { 
  getCouriers, 
  upsertCourier, 
  deleteCourierDb, 
  getOrdersDb, 
  upsertOrderDb, 
  subscribeToOrdersChange, 
  subscribeToCouriersChange, 
  broadcastUpdate 
} from './utils/supabase';

export default function App() {
  // Global viewMode state for responsive viewport switching - default to admin as requested
  const [viewMode, setViewMode] = useState<'exhibition' | 'customer' | 'courier' | 'admin'>('admin');

  // Three independent theme states for Kun/Tun mode for each app
  const [customerTheme, setCustomerTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('kasbigo-customer-theme') as 'light' | 'dark') || 'dark';
    }
    return 'dark';
  });

  const [courierTheme, setCourierTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('kasbigo-courier-theme') as 'light' | 'dark') || 'dark';
    }
    return 'dark';
  });

  const [adminTheme, setAdminTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('kasbigo-admin-theme') as 'light' | 'dark') || 'dark';
    }
    return 'dark';
  });

  // Keep html class and localStorage in sync with active view's theme state
  useEffect(() => {
    const root = document.documentElement;
    let activeTheme = 'dark';
    if (viewMode === 'admin') {
      activeTheme = adminTheme;
    } else if (viewMode === 'courier') {
      activeTheme = courierTheme;
    } else {
      activeTheme = customerTheme;
    }

    if (activeTheme === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.add('light');
      root.classList.remove('dark');
    }
  }, [viewMode, customerTheme, courierTheme, adminTheme]);

  useEffect(() => {
    safeSetItem('kasbigo-customer-theme', customerTheme);
  }, [customerTheme]);

  useEffect(() => {
    safeSetItem('kasbigo-courier-theme', courierTheme);
  }, [courierTheme]);

  useEffect(() => {
    safeSetItem('kasbigo-admin-theme', adminTheme);
  }, [adminTheme]);

  const [activeScreen, setActiveScreen] = useState<ScreenType>('home');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  
  // Real-time Database Integrated State managers
  const [orders, setOrders] = useState<Order[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('kasbigo-orders-list');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return renumberOrders(parsed);
          }
        } catch (e) {}
      }
    }
    return [];
  });
  const [courierList, setCourierList] = useState<any[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('kasbigo-couriers-list');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) return parsed;
        } catch (e) {
          console.error("Error reading kasbigo-couriers-list:", e);
        }
      }
    }
    return INITIAL_COURIERS;
  });
  const [deliveryCommissionRate, setDeliveryCommissionRate] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('kasbigo-delivery-commission-rate');
      if (saved) {
        const val = parseFloat(saved);
        if (!isNaN(val) && val >= 0) return val;
      }
    }
    return 20;
  });

  useEffect(() => {
    localStorage.setItem('kasbigo-delivery-commission-rate', deliveryCommissionRate.toString());
  }, [deliveryCommissionRate]);

  const prevOrdersRef = useRef<Order[]>([]);
  const prevCouriersRef = useRef<any[]>([]);

  // DB Sync and Broadcast Effects
  useEffect(() => {
    if (orders.length === 0 && prevOrdersRef.current.length === 0) return;
    const prevMap = new Map(prevOrdersRef.current.map(o => [o.id, o]));
    orders.forEach(o => {
      const oldO = prevMap.get(o.id);
      if (!oldO || JSON.stringify(oldO) !== JSON.stringify(o)) {
        upsertOrderDb(o);
        broadcastUpdate({ type: 'order_upsert', order: o });
      }
    });
    prevOrdersRef.current = orders;
    if (orders.length > 0) {
      safeSetOrdersItem(orders);
    }
  }, [orders]);

  // Real-time local storage & periodic polling sync for orders across views/tabs (every 2 seconds)
  useEffect(() => {
    const syncOrdersFromStorage = () => {
      const saved = localStorage.getItem('kasbigo-orders-list');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            setOrders(prev => {
              if (JSON.stringify(prev) !== JSON.stringify(parsed)) {
                prevOrdersRef.current = parsed;
                return parsed;
              }
              return prev;
            });
          }
        } catch (e) {}
      }
    };

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'kasbigo-orders-list' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed)) {
            setOrders(prev => {
              if (JSON.stringify(prev) !== JSON.stringify(parsed)) {
                prevOrdersRef.current = parsed;
                return parsed;
              }
              return prev;
            });
          }
        } catch (err) {}
      }
    };

    window.addEventListener('storage', handleStorageChange);
    const interval = setInterval(syncOrdersFromStorage, 2000);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (courierList.length === 0 && prevCouriersRef.current.length === 0) return;
    const prevMap = new Map(prevCouriersRef.current.map(c => [c.id || c.phone, c]));
    
    courierList.forEach(c => {
      const key = c.id || c.phone;
      const oldC = prevMap.get(key);
      if (!oldC || JSON.stringify(oldC) !== JSON.stringify(c)) {
        upsertCourier(c);
        broadcastUpdate({ type: 'courier_upsert', courier: c });
      }
    });

    const nextKeys = new Set(courierList.map(c => c.id || c.phone));
    prevCouriersRef.current.forEach(c => {
      const key = c.id || c.phone;
      if (!nextKeys.has(key)) {
        deleteCourierDb(c.id, c.phone);
      }
    });

    prevCouriersRef.current = courierList;
  }, [courierList]);

  // Sync courier list with local storage
  useEffect(() => {
    if (courierList) {
      safeSetItem('kasbigo-couriers-list', JSON.stringify(courierList));
      const blockedPhones = courierList.filter(c => c.isBlocked).map(c => c.phone);
      safeSetItem('kasbigo-blocked-couriers', JSON.stringify(blockedPhones));
    }
  }, [courierList]);

  // Real-time mount fetcher and listeners
  useEffect(() => {
    // 1. Initial Load from Supabase (fallback to localStorage if offline)
    getCouriers().then(list => {
      const activePhone = typeof window !== 'undefined' ? localStorage.getItem('kasbigo-active-courier-phone') : null;
      const isOnlineActive = typeof window !== 'undefined' ? localStorage.getItem('kasbigo-courier-is-online') === 'true' : false;

      setCourierList(prevList => {
        const localSavedStr = typeof window !== 'undefined' ? localStorage.getItem('kasbigo-couriers-list') : null;
        let localSaved: any[] = [];
        if (localSavedStr) {
          try { localSaved = JSON.parse(localSavedStr); } catch (e) {}
        }

        let baseList = (localSaved && localSaved.length > 0)
          ? localSaved
          : ((prevList && prevList.length > 0) ? prevList : ((list && list.length > 0) ? list : INITIAL_COURIERS));

        const cleanedList = baseList.map(c => {
          const isCurrentActiveOnline = isOnlineActive && activePhone && c.phone === activePhone;
          return {
            ...c,
            isOnline: !!isCurrentActiveOnline,
            rating: typeof c.rating === 'number' ? c.rating : 5.0,
            ratingCount: typeof c.ratingCount === 'number' ? c.ratingCount : 0,
          };
        });

        prevCouriersRef.current = cleanedList;
        safeSetItem('kasbigo-couriers-list', JSON.stringify(cleanedList));
        return cleanedList;
      });
    });

    getOrdersDb().then(ords => {
      if (ords && ords.length > 0) {
        const formatted = renumberOrders(ords);
        prevOrdersRef.current = formatted;
        setOrders(formatted);
      }
    });

    // 2. Real-time Subscription for Orders
    const unsubOrders = subscribeToOrdersChange(
      (updatedOrder) => {
        // Prevent echo loop
        prevOrdersRef.current = prevOrdersRef.current.map(o => o.id === updatedOrder.id ? updatedOrder : o);
        if (!prevOrdersRef.current.some(o => o.id === updatedOrder.id)) {
          prevOrdersRef.current = [updatedOrder, ...prevOrdersRef.current];
        }
        setOrders(prev => {
          const index = prev.findIndex(o => o.id === updatedOrder.id);
          if (index > -1) {
            if (JSON.stringify(prev[index]) === JSON.stringify(updatedOrder)) {
              return prev;
            }
            const updated = [...prev];
            updated[index] = updatedOrder;
            return updated;
          } else {
            return [updatedOrder, ...prev];
          }
        });
      },
      (deletedId) => {
        prevOrdersRef.current = renumberOrders(prevOrdersRef.current.filter(o => o.id !== deletedId));
        setOrders(prev => renumberOrders(prev.filter(o => o.id !== deletedId)));
      }
    );

    // 3. Real-time Subscription for Couriers
    const unsubCouriers = subscribeToCouriersChange((updatedCourier) => {
      // Prevent echo loop
      prevCouriersRef.current = prevCouriersRef.current.map(c => (c.id === updatedCourier.id || c.phone === updatedCourier.phone) ? { ...c, ...updatedCourier } : c);
      if (!prevCouriersRef.current.some(c => c.id === updatedCourier.id || c.phone === updatedCourier.phone)) {
        prevCouriersRef.current = [...prevCouriersRef.current, updatedCourier];
      }
      setCourierList(prev => {
        const index = prev.findIndex(c => c.id === updatedCourier.id || c.phone === updatedCourier.phone);
        if (index > -1) {
          if (JSON.stringify(prev[index]) === JSON.stringify(updatedCourier)) {
            return prev;
          }
          const updated = [...prev];
          updated[index] = { ...updated[index], ...updatedCourier };
          return updated;
        } else {
          return [...prev, updatedCourier];
        }
      });
    });

    return () => {
      unsubOrders();
      unsubCouriers();
    };
  }, []);

  // Dynamic stores state for real-time admin edits with localStorage persistence
  const [stores, setStores] = useState<Store[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('kasbigo-stores');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {}
      }
    }
    return STORES;
  });

  useEffect(() => {
    localStorage.setItem('kasbigo-stores', JSON.stringify(stores));
  }, [stores]);

  // Dynamic customization states with localStorage persistence
  const [promos, setPromos] = useState<PromoBanner[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('kasbigo-promos');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {}
      }
    }
    return INITIAL_PROMOS;
  });

  useEffect(() => {
    localStorage.setItem('kasbigo-promos', JSON.stringify(promos));
  }, [promos]);

  const [categories, setCategories] = useState<Category[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('kasbigo-categories');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            return parsed.map((cat: Category) => {
              if (cat.icon && (cat.icon.includes('p64BNF4B') || cat.icon.includes('a34c4781') || cat.icon.includes('kasbi_go_logo'))) {
                return { ...cat, icon: undefined };
              }
              return cat;
            });
          }
        } catch (e) {}
      }
    }
    return INITIAL_CATEGORIES;
  });

  useEffect(() => {
    localStorage.setItem('kasbigo-categories', JSON.stringify(categories));
  }, [categories]);

  const [partners, setPartners] = useState<PopularPartner[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('kasbigo-partners');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {}
      }
    }
    return INITIAL_PARTNERS;
  });

  useEffect(() => {
    localStorage.setItem('kasbigo-partners', JSON.stringify(partners));
  }, [partners]);

  // Track order count to play real-time sound for admin when a new order drops
  const prevOrdersCountRef = useRef<number>(0);
  useEffect(() => {
    if (orders.length > prevOrdersCountRef.current) {
      if (prevOrdersCountRef.current > 0 || orders.length === 1) {
        playNotificationSound('admin');
      }
    }
    prevOrdersCountRef.current = orders.length;
  }, [orders]);

  // Dynamic Courier States
  const [courierPhone, setCourierPhoneState] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('kasbigo-active-courier-phone') || '';
    }
    return '';
  });

  const setCourierPhone = (phone: string) => {
    setCourierPhoneState(phone);
    if (phone) {
      localStorage.setItem('kasbigo-active-courier-phone', phone);
    } else {
      localStorage.removeItem('kasbigo-active-courier-phone');
    }
  };

  const activeCourier = courierList.find(c => c.phone === courierPhone);

  const courierName = activeCourier ? activeCourier.name : '';
  const setCourierName = (name: string) => {
    setCourierList(prev => prev.map(c => c.phone === courierPhone ? { ...c, name } : c));
  };

  const isCourierOnline = activeCourier ? activeCourier.isOnline : false;
  const setIsCourierOnline = (isOnline: boolean) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('kasbigo-courier-is-online', isOnline ? 'true' : 'false');
    }
    setCourierList(prev => prev.map(c => c.phone === courierPhone ? { ...c, isOnline } : c));
  };

  const courierBalance = activeCourier ? activeCourier.balance : 0;
  const setCourierBalance: React.Dispatch<React.SetStateAction<number>> = (value) => {
    setCourierList(prev => prev.map(c => {
      if (c.phone === courierPhone) {
        const newBalance = typeof value === 'function' ? value(c.balance) : value;
        return { ...c, balance: newBalance };
      }
      return c;
    }));
  };
  const [courierTransactions, setCourierTransactions] = useState<any[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('kasbigo-courier-transactions');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) return parsed;
        } catch (e) {
          console.error("Error parsing kasbigo-courier-transactions:", e);
        }
      }
    }
    return [];
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('kasbigo-courier-transactions', JSON.stringify(courierTransactions));
    }
  }, [courierTransactions]);
  
  // Custom user address fields typed by hand
  const [userAddress, setUserAddress] = useState<{
    mahalla: string;
    comment: string;
    additionalComment?: string;
    latitude?: number;
    longitude?: number;
  }>({
    mahalla: "",
    comment: "",
    additionalComment: "",
    latitude: undefined,
    longitude: undefined,
  });

  const [paymentMethod, setPaymentMethod] = useState<'Naqd' | 'Online'>('Naqd');
  
  // Debounce refs for action protection
  const lastCartActionRef = useRef<number>(0);
  const lastOrderActionRef = useRef<number>(0);

  // Real Profile state
  const [userProfile, setUserProfile] = useState<{ name: string; phone: string }>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('kasbigo-user-profile');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed && typeof parsed === 'object') {
            return {
              name: (parsed.name && parsed.name !== "Farhod Nazarov") ? parsed.name : "",
              phone: parsed.phone || ""
            };
          }
        } catch (e) {}
      }
    }
    return { name: "", phone: "" };
  });

  useEffect(() => {
    localStorage.setItem('kasbigo-user-profile', JSON.stringify(userProfile));
  }, [userProfile]);

  // Admin-Dispatcher state values
  const [isBlacklisted, setIsBlacklisted] = useState<boolean>(false);
  const [blacklistedPhones, setBlacklistedPhones] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('kasbigo-blacklisted-phones');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {}
      }
    }
    return [];
  });

  useEffect(() => {
    localStorage.setItem('kasbigo-blacklisted-phones', JSON.stringify(blacklistedPhones));
  }, [blacklistedPhones]);

  // Automatically update isBlacklisted if userProfile.phone is in blacklistedPhones (Requirement 1)
  useEffect(() => {
    if (userProfile.phone && blacklistedPhones.includes(userProfile.phone)) {
      if (!isBlacklisted) {
        setIsBlacklisted(true);
      }
    } else if (userProfile.phone && !blacklistedPhones.includes(userProfile.phone)) {
      if (isBlacklisted) {
        setIsBlacklisted(false);
      }
    }
  }, [userProfile.phone, blacklistedPhones, isBlacklisted]);

  // Cancel voice/written orders that are not confirmed within 10 minutes of admin pricing (Requirement 5)
  useEffect(() => {
    const checkExpiredOrders = () => {
      const now = Date.now();
      setOrders(prevOrders => {
        let hasChanged = false;
        const updatedOrders = prevOrders.map(o => {
          if (o.priceSetAt && o.isConfirmedByCustomer !== true && o.status !== 'Bekor qilindi') {
            const minutesElapsed = (now - o.priceSetAt) / 60000;
            if (minutesElapsed >= 10) {
              console.log(`Order ${o.id} expired: marked as Bekor qilindi (10 mins without customer confirmation)`);
              hasChanged = true;
              return {
                ...o,
                status: 'Bekor qilindi' as const,
                adminComment: 'Mijoz 10 daqiqa ichida narxni tasdiqlamadi'
              };
            }
          }
          return o;
        });

        return hasChanged ? updatedOrders : prevOrders;
      });
    };

    const intervalId = setInterval(checkExpiredOrders, 5000); // Check every 5 seconds
    return () => clearInterval(intervalId);
  }, []);

  const [cashlessLimit, setCashlessLimit] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('kasbigo-cashless-limit');
      if (saved) return parseInt(saved, 10);
    }
    return 150000;
  });

  useEffect(() => {
    localStorage.setItem('kasbigo-cashless-limit', cashlessLimit.toString());
  }, [cashlessLimit]);

  const [adminCardNumber, setAdminCardNumber] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('kasbigo-admin-card-number');
      if (saved) return saved;
    }
    return "8600 4912 3456 7890";
  });

  useEffect(() => {
    localStorage.setItem('kasbigo-admin-card-number', adminCardNumber);
  }, [adminCardNumber]);

  const [cardHolderName, setCardHolderName] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('kasbigo_cardHolderName') || localStorage.getItem('kasbigo-card-holder-name');
      if (saved) return saved;
    }
    return "SHERZOD M.";
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('kasbigo_cardHolderName', cardHolderName);
      localStorage.setItem('kasbigo-card-holder-name', cardHolderName);
    }
  }, [cardHolderName]);

  const [adminPhone, setAdminPhone] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('kasbigo-admin-phone');
      if (saved) return saved;
    }
    return "+998712004545";
  });

  useEffect(() => {
    localStorage.setItem('kasbigo-admin-phone', adminPhone);
  }, [adminPhone]);

  const [adminTelegram, setAdminTelegram] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('kasbigo-admin-telegram');
      if (saved) return saved;
    }
    return "https://t.me/kasbigo_admin";
  });

  useEffect(() => {
    localStorage.setItem('kasbigo-admin-telegram', adminTelegram);
  }, [adminTelegram]);

  const [minOrderLimit, setMinOrderLimit] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('kasbigo-min-order-limit');
      if (saved) return parseInt(saved, 10);
    }
    return 0;
  });

  useEffect(() => {
    localStorage.setItem('kasbigo-min-order-limit', minOrderLimit.toString());
  }, [minOrderLimit]);

  const [mandatoryOnlineCategories, setMandatoryOnlineCategories] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('kasbigo-mandatory-online-categories');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {
          console.error(e);
        }
      }
    }
    return ['Fast Food', 'Oshxona', 'Gullar'];
  });

  // Auto-clean mandatoryOnlineCategories when categories state changes (Requirement C)
  useEffect(() => {
    if (!categories) return;
    const validNames = new Set(categories.map(c => c.name.trim().toLowerCase()));
    setMandatoryOnlineCategories(prev => {
      const filtered = prev.filter(catName => validNames.has(catName.trim().toLowerCase()));
      if (filtered.length !== prev.length) {
        return filtered;
      }
      return prev;
    });
  }, [categories]);

  const [deliveryZones, setDeliveryZones] = useState<DeliveryZone[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('kasbigo-delivery-zones');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {
          console.error(e);
        }
      }
    }
    return INITIAL_DELIVERY_ZONES;
  });
  const [extraStopFee, setExtraStopFee] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('kasbigo-extra-stop-fee');
      return saved ? parseInt(saved, 10) : 3000;
    }
    return 3000;
  });
  const [courierCoords, setCourierCoords] = useState<{ latitude: number; longitude: number } | null>({ latitude: 38.8351, longitude: 65.3621 }); // Default coordinate for Kasbi, Uzbekistan

  useEffect(() => {
    localStorage.setItem('kasbigo-delivery-zones', JSON.stringify(deliveryZones));
  }, [deliveryZones]);

  useEffect(() => {
    localStorage.setItem('kasbigo-extra-stop-fee', extraStopFee.toString());
  }, [extraStopFee]);

  useEffect(() => {
    localStorage.setItem('kasbigo-mandatory-online-categories', JSON.stringify(mandatoryOnlineCategories));
  }, [mandatoryOnlineCategories]);
  
  // Cart actions
  const addToCart = (product: Product, store: Store) => {
    const now = Date.now();
    if (now - lastCartActionRef.current < 300) return; // ignore quick clicks (Requirement 3)
    lastCartActionRef.current = now;

    setCart((prevCart) => {
      const existingIndex = prevCart.findIndex(item => item.product.id === product.id);
      if (existingIndex > -1) {
        const updated = [...prevCart];
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: updated[existingIndex].quantity + 1,
        };
        return updated;
      }
      return [...prevCart, { product, quantity: 1, storeId: store.id, storeName: store.name }];
    });
  };

  const removeFromCart = (product: Product) => {
    const now = Date.now();
    if (now - lastCartActionRef.current < 300) return; // ignore quick clicks (Requirement 3)
    lastCartActionRef.current = now;

    setCart((prevCart) => {
      const existingIndex = prevCart.findIndex(item => item.product.id === product.id);
      if (existingIndex > -1) {
        const currentQty = prevCart[existingIndex].quantity;
        if (currentQty > 1) {
          const updated = [...prevCart];
          updated[existingIndex] = {
            ...updated[existingIndex],
            quantity: currentQty - 1,
          };
          return updated;
        } else {
          return prevCart.filter(item => item.product.id !== product.id);
        }
      }
      return prevCart;
    });
  };

  const clearCart = () => {
    setCart([]);
  };

  const updateCartItemPrice = (productId: string, price: number) => {
    setCart((prevCart) =>
      prevCart.map((item) => {
        if (item.product.id === productId) {
          return {
            ...item,
            product: {
              ...item.product,
              price: price,
            },
          };
        }
        return item;
      })
    );
  };

  // Place order action (handles cheque file uploads as well)
  const placeOrder = (uploadedCheques?: string[]) => {
    if (cart.length === 0) return;
    if (!userProfile.phone || !userProfile.phone.trim()) {
      setActiveScreen('profile');
      alert("Buyurtma berish uchun avval telefon raqamingizni kiriting");
      return;
    }
    
    const now = Date.now();
    if (now - lastOrderActionRef.current < 1500) return; // strictly protect from double-submission within 1.5s
    lastOrderActionRef.current = now;
    
    const today = new Date();
    const formattedDate = today.toLocaleDateString('uz-UZ').split('.').reverse().join('-'); // YYYY-MM-DD
    
    const isCustomPending = cart.some(item => item.product.id.startsWith('custom-'));
    const cartStore = stores.find(s => s.id === cart[0]?.storeId);
    const derivedCategories = Array.from(new Set(
      cart.map(item => {
        const st = stores.find(s => s.id === item.storeId);
        return st?.category || item.product.category;
      }).filter(Boolean)
    ));
    const orderCategory = derivedCategories.length > 0 ? derivedCategories.join(', ') : (cartStore?.category || 'market');
    const itemsTotal = cart.reduce((acc, item) => acc + (item.product.price * item.quantity), 0);
    const uniqueStoresMap = new Map<string, string>();
    cart.forEach(item => {
      if (item.storeId && item.storeName) {
        uniqueStoresMap.set(item.storeId, item.storeName);
      }
    });
    const uniqueStoresList = Array.from(uniqueStoresMap.entries()).map(([storeId, storeName]) => ({ storeId, storeName }));
    const primaryStoreName = uniqueStoresList.map(s => s.storeName).join(', ') || cart[0]?.storeName || "KasbiGo Do'konlar";

    const extraStopsCount = uniqueStoresList.length > 1 ? uniqueStoresList.length - 1 : 0;
    const extraStopsFeeTotal = extraStopsCount * extraStopFee;
    
    // Find base delivery fee from matched zone for user mahalla
    const userMahallaTrim = (userAddress.mahalla || '').trim().toLowerCase();
    const matchedZone = deliveryZones.find(z => z.mahallas.some(m => m.trim().toLowerCase() === userMahallaTrim));
    const baseDeliveryFee = matchedZone ? matchedZone.price : (deliveryZones[0]?.price || 10000);

    const orderTotal = itemsTotal + baseDeliveryFee + extraStopsFeeTotal;

    const allowedPayment = isCashPaymentAllowed(orderCategory, orderTotal, cashlessLimit, mandatoryOnlineCategories) ? paymentMethod : 'Online';

    // Requirement B: Naqd pul topshirish is strictly ONLY items total cost (without deliveryFee or extraStopFee)
    const courierDebtAmount = allowedPayment === 'Naqd' ? itemsTotal : undefined;
    const courierDebtSettled = allowedPayment === 'Naqd' ? false : undefined;

    const newOrder: Order = {
      id: `KG000000`, // Temp ID, formatted by renumberOrders
      items: [...cart],
      total: orderTotal,
      deliveryFee: baseDeliveryFee,
      extraStopsFee: extraStopsFeeTotal,
      category: orderCategory,
      storeName: primaryStoreName,
      stores: uniqueStoresList,
      address: { ...userAddress },
      customerName: userProfile.name,
      customerPhone: userProfile.phone,
      paymentMethod: allowedPayment,
      status: isCustomPending ? 'Narx belgilashda' : 'Yangi',
      isCustomPendingPrice: isCustomPending ? true : undefined,
      isConfirmedByCustomer: isCustomPending ? false : true,
      date: formattedDate, // e.g. "2026-07-09"
      time: new Date().toTimeString().split(' ')[0].substring(0, 5),
      uploadedChequeUrl: uploadedCheques && uploadedCheques.length > 0 ? uploadedCheques[0] : undefined,
      uploadedChequeUrls: uploadedCheques,
      courierDebtAmount,
      courierDebtSettled
    };

    setOrders(prev => renumberOrders([newOrder, ...prev]));
    setCart([]); // Clear cart
    
    // Play initial customer stage sound
    playNotificationSound('customer');
  };

  const rateDriver = (orderId: string, rating: number, comment?: string) => {
    setOrders(prev => prev.map(o => {
      if (o.id === orderId) {
        return { ...o, driverRating: rating, driverRatingComment: comment };
      }
      return o;
    }));
  };

  // Quick action helper: Fill Cart with tasty items for fast review
  const handleQuickFillCart = () => {
    const store = stores[0]; // use dynamic stores state
    const p1 = store.products[0]; // Coca Cola
    const p2 = store.products[4]; // Lays Chips
    setCart([
      { product: p1, quantity: 2, storeId: store.id, storeName: store.name },
      { product: p2, quantity: 1, storeId: store.id, storeName: store.name }
    ]);
    setSelectedStore(store);
    setActiveScreen('cart');
  };

  // Quick action helper: Create a mock active order with a cheque
  const handleQuickCreateOrder = () => {
    const store = stores[0]; // use dynamic stores state
    const mockCart = [
      { product: store.products[0], quantity: 2, storeId: store.id, storeName: store.name },
      { product: store.products[4], quantity: 1, storeId: store.id, storeName: store.name }
    ];
    const today = new Date();
    const formattedDate = today.toLocaleDateString('uz-UZ').split('.').reverse().join('-'); // YYYY-MM-DD

    const mockOrder: Order = {
      id: `KG000000`,
      items: mockCart,
      total: 45000,
      storeName: store.name,
      address: { 
        mahalla: "G'alaba ko'chasi, 12-uy", 
        comment: "Maktab yonidagi mahalla",
        latitude: 38.8351,
        longitude: 65.4138,
      },
      customerName: "Farhod Nazarov",
      customerPhone: "+998 99 123 45 67",
      paymentMethod: 'Online',
      status: 'Kuryerda',
      dispatchedAt: Date.now(),
      date: formattedDate,
      time: '12:35',
      uploadedChequeUrl: 'https://images.unsplash.com/photo-1554415707-6e8cfc93fe23?auto=format&fit=crop&q=80&w=200',
      uploadedChequeUrls: ['https://images.unsplash.com/photo-1554415707-6e8cfc93fe23?auto=format&fit=crop&q=80&w=200']
    };
    setOrders(prev => renumberOrders([mockOrder, ...prev]));
    setActiveScreen('orders');
  };

  // Cycle order status to test step progress indicator
  const handleCycleOrderStatus = () => {
    if (orders.length === 0) {
      handleQuickCreateOrder();
      return;
    }
    setOrders(prev => {
      const updated = [...prev];
      const order = updated[0];
      if (order.status === 'Yangi') {
        order.status = 'Kuryerda';
        order.dispatchedAt = Date.now();
      }
      else if (order.status === 'Kuryerda') order.status = 'Yetkazildi';
      else if (order.status === 'Yetkazildi') order.status = 'Bekor qilindi';
      else order.status = 'Yangi';
      return updated;
    });
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col font-sans relative overflow-x-hidden selection:bg-emerald-500 selection:text-white">
      
      {/* Structural Dot Grid Backdrop (Light Slate for Premium Feel) */}
      <div className="absolute inset-0 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:24px_24px] opacity-70 pointer-events-none"></div>

      {/* Futuristic Header Bar with Responsive Swapping PERSPECTIVE Tabs - Hidden in full screen Admin Panel */}
      {viewMode !== 'admin' && (
        <header className="w-full border-b border-slate-200 bg-white/80 backdrop-blur-md px-4 md:px-8 py-3.5 flex flex-col md:flex-row items-center justify-between gap-4 z-40 select-none shadow-xs shrink-0">
          <div className="flex items-center space-x-3">
            <KasbiGoLogo className="h-11 w-11 drop-shadow-md shrink-0" />
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="text-xs font-black text-emerald-600 uppercase tracking-widest">Yetkazish Studio</span>
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
              </div>
              <h2 className="text-sm font-bold text-slate-800">KasbiGo Exhibition Hub</h2>
            </div>
          </div>

          {/* Dynamic perspective tabs: Hide Exhibition on mobile screens to ensure perfect responsiveness */}
          <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200 text-xs font-black tracking-wider uppercase select-none">
            <button
              onClick={() => setViewMode('exhibition')}
              className={`hidden md:block py-2 px-3.5 rounded-xl transition-all cursor-pointer ${
                viewMode === 'exhibition'
                  ? 'bg-emerald-500 text-white font-black shadow-md shadow-emerald-500/10'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              🖥️ Yonma-yon (Ko'rgazma)
            </button>
            <button
              onClick={() => setViewMode('customer')}
              className={`py-2 px-3.5 rounded-xl transition-all cursor-pointer ${
                viewMode === 'customer'
                  ? 'bg-emerald-500 text-white font-black shadow-md shadow-emerald-500/10'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              📱 Mijoz Ilovasi
            </button>
            <button
              onClick={() => setViewMode('courier')}
              className={`py-2 px-3.5 rounded-xl transition-all cursor-pointer ${
                viewMode === 'courier'
                  ? 'bg-emerald-500 text-white font-black shadow-md shadow-emerald-500/10'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              🚴 Kuryer Terminali
            </button>
            <button
              onClick={() => setViewMode('admin')}
              className={`py-2 px-3.5 rounded-xl transition-all cursor-pointer ${
                viewMode === 'admin'
                  ? 'bg-emerald-500 text-white font-black shadow-md shadow-emerald-500/10'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              ⚡ Super Admin
            </button>
          </div>

          <div className="hidden xl:flex items-center space-x-6 text-xs text-slate-500 font-medium">
            <span className="flex items-center text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full font-bold">
              <Award className="h-4 w-4 mr-1 text-emerald-500" /> Super Admin Dashboard
            </span>
          </div>
        </header>
      )}

      {/* Main Exhibition Workspace */}
      <main className={`flex-1 w-full mx-auto z-10 flex flex-col ${viewMode === 'admin' ? 'p-0' : 'p-4 md:p-8'}`}>
        
        {/* VIEW: EXHIBITION (Side-by-side Desktop View) */}
        {viewMode === 'exhibition' && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 items-stretch max-w-[1650px] w-full mx-auto">
            {/* Column 1: Super Admin Panel */}
            <div className="w-full h-[calc(100vh-160px)] min-h-[650px] max-h-[850px]">
              <SuperAdminPanel 
                stores={stores}
                setStores={setStores}
                ALL_PROMOS={promos}
                SET_PROMOS={setPromos}
                ALL_CATEGORIES={categories}
                SET_CATEGORIES={setCategories}
                ALL_PARTNERS={partners}
                SET_PARTNERS={setPartners}
                orders={orders}
                setOrders={setOrders}
                cart={cart}
                setCart={setCart}
                courierList={courierList}
                setCourierList={setCourierList}
                courierName={courierName}
                setCourierName={setCourierName}
                courierPhone={courierPhone}
                setCourierPhone={setCourierPhone}
                isCourierOnline={isCourierOnline}
                setIsCourierOnline={setIsCourierOnline}
                courierBalance={courierBalance}
                setCourierBalance={setCourierBalance}
                setCourierTransactions={setCourierTransactions}
                courierCoords={courierCoords}
                setCourierCoords={setCourierCoords}
                userProfile={userProfile}
                setUserProfile={setUserProfile}
                isBlacklisted={isBlacklisted}
                setIsBlacklisted={setIsBlacklisted}
                blacklistedPhones={blacklistedPhones}
                setBlacklistedPhones={setBlacklistedPhones}
                cashlessLimit={cashlessLimit}
                setCashlessLimit={setCashlessLimit}
                minOrderLimit={minOrderLimit}
                setMinOrderLimit={setMinOrderLimit}
                deliveryZones={deliveryZones}
                setDeliveryZones={setDeliveryZones}
                extraStopFee={extraStopFee}
                setExtraStopFee={setExtraStopFee}
                adminCardNumber={adminCardNumber}
                setAdminCardNumber={setAdminCardNumber}
                adminPhone={adminPhone}
                setAdminPhone={setAdminPhone}
                adminTelegram={adminTelegram}
                setAdminTelegram={setAdminTelegram}
                deliveryCommissionRate={deliveryCommissionRate}
                setDeliveryCommissionRate={setDeliveryCommissionRate}
                viewMode={viewMode}
                setViewMode={setViewMode}
                theme={adminTheme}
                setTheme={setAdminTheme}
              />
            </div>

            {/* Column 2: Realistic iPhone Mockup Frame */}
            <div className={`w-full h-[calc(100vh-160px)] min-h-[650px] max-h-[850px] flex justify-center items-center ${customerTheme === 'dark' ? 'dark' : ''}`}>
              <PhoneFrame
                stores={stores}
                promos={promos}
                categories={categories}
                partners={partners}
                activeScreen={activeScreen}
                setActiveScreen={setActiveScreen}
                selectedCategory={selectedCategory}
                setSelectedCategory={setSelectedCategory}
                selectedStore={selectedStore}
                setSelectedStore={setSelectedStore}
                cart={cart}
                addToCart={addToCart}
                removeFromCart={removeFromCart}
                clearCart={clearCart}
                userAddress={userAddress}
                setUserAddress={setUserAddress}
                paymentMethod={paymentMethod}
                setPaymentMethod={setPaymentMethod}
                orders={orders}
                setOrders={setOrders}
                placeOrder={placeOrder}
                rateDriver={rateDriver}
                courierList={courierList}
                isBlacklisted={isBlacklisted}
                cashlessLimit={cashlessLimit}
                adminCardNumber={adminCardNumber}
                adminPhone={adminPhone}
                adminTelegram={adminTelegram}
                userProfile={userProfile}
                setUserProfile={setUserProfile}
                minOrderLimit={minOrderLimit}
                deliveryZones={deliveryZones}
                extraStopFee={extraStopFee}
                updateCartItemPrice={updateCartItemPrice}
                mandatoryOnlineCategories={mandatoryOnlineCategories}
                theme={customerTheme}
                setTheme={setCustomerTheme}
              />
            </div>

            {/* Column 3: Active Courier Terminal Screen */}
            <div className={`w-full h-[calc(100vh-160px)] min-h-[650px] max-h-[850px] ${courierTheme === 'dark' ? 'dark' : ''}`}>
              <CourierPanel 
                orders={orders} 
                setOrders={setOrders}
                courierName={courierName}
                setCourierName={setCourierName}
                courierPhone={courierPhone}
                setCourierPhone={setCourierPhone}
                isCourierOnline={isCourierOnline}
                setIsCourierOnline={setIsCourierOnline}
                courierBalance={courierBalance}
                setCourierBalance={setCourierBalance}
                courierTransactions={courierTransactions}
                setCourierTransactions={setCourierTransactions}
                courierCoords={courierCoords}
                setCourierCoords={setCourierCoords}
                theme={courierTheme}
                setTheme={setCourierTheme}
                courierList={courierList}
                setCourierList={setCourierList}
                deliveryZones={deliveryZones}
                extraStopFee={extraStopFee}
                deliveryCommissionRate={deliveryCommissionRate}
                setDeliveryCommissionRate={setDeliveryCommissionRate}
              />
            </div>

            {/* Column 4: Interactive Control Center Panel */}
            <div className="w-full h-[calc(100vh-160px)] min-h-[650px] max-h-[850px] overflow-y-auto space-y-6 bg-slate-50 border border-slate-200 p-5 rounded-[32px] shadow-sm">
              <div className="bg-gradient-to-br from-amber-50 to-orange-50/40 border border-orange-500/10 rounded-2xl p-5 relative overflow-hidden">
                <div className="flex items-center space-x-1.5 mb-2">
                  <Award className="h-4 w-4 text-orange-600" />
                  <span className="text-[10px] font-extrabold tracking-widest text-orange-800 uppercase">REAL-VAQT NAZORATI</span>
                </div>
                <p className="text-[11px] text-slate-700 leading-relaxed font-semibold">
                  Exhibition boshqaruvi orqali mijozning har bir buyurtmasi kuryer terminaliga va admin paneliga bir vaqtda aks etadi. Bu tizim ideal integratsiyaning yorqin namunasidir.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* VIEW: CUSTOMER PHONE SCREEN */}
        {viewMode === 'customer' && (
          <div className="flex-1 flex justify-center items-center py-4">
            <PhoneFrame
              stores={stores}
              promos={promos}
              categories={categories}
              partners={partners}
              activeScreen={activeScreen}
              setActiveScreen={setActiveScreen}
              selectedCategory={selectedCategory}
              setSelectedCategory={setSelectedCategory}
              selectedStore={selectedStore}
              setSelectedStore={setSelectedStore}
              cart={cart}
              addToCart={addToCart}
              removeFromCart={removeFromCart}
              clearCart={clearCart}
              userAddress={userAddress}
              setUserAddress={setUserAddress}
              paymentMethod={paymentMethod}
              setPaymentMethod={setPaymentMethod}
              orders={orders}
              setOrders={setOrders}
              placeOrder={placeOrder}
              rateDriver={rateDriver}
              courierList={courierList}
              isBlacklisted={isBlacklisted}
              cashlessLimit={cashlessLimit}
              adminCardNumber={adminCardNumber}
              cardHolderName={cardHolderName}
              adminPhone={adminPhone}
              adminTelegram={adminTelegram}
              userProfile={userProfile}
              setUserProfile={setUserProfile}
              minOrderLimit={minOrderLimit}
              deliveryZones={deliveryZones}
              extraStopFee={extraStopFee}
              updateCartItemPrice={updateCartItemPrice}
              theme={customerTheme}
              setTheme={setCustomerTheme}
              mandatoryOnlineCategories={mandatoryOnlineCategories}
            />
          </div>
        )}

        {/* VIEW: COURIER SCREEN */}
        {viewMode === 'courier' && (
          <div className="flex justify-center max-w-4xl w-full mx-auto py-4 min-h-[780px]">
            <CourierPanel 
              orders={orders} 
              setOrders={setOrders}
              courierName={courierName}
              setCourierName={setCourierName}
              courierPhone={courierPhone}
              setCourierPhone={setCourierPhone}
              isCourierOnline={isCourierOnline}
              setIsCourierOnline={setIsCourierOnline}
              courierBalance={courierBalance}
              setCourierBalance={setCourierBalance}
              courierTransactions={courierTransactions}
              setCourierTransactions={setCourierTransactions}
              courierCoords={courierCoords}
              setCourierCoords={setCourierCoords}
              theme={courierTheme}
              setTheme={setCourierTheme}
              courierList={courierList}
              setCourierList={setCourierList}
              deliveryZones={deliveryZones}
              extraStopFee={extraStopFee}
              deliveryCommissionRate={deliveryCommissionRate}
              setDeliveryCommissionRate={setDeliveryCommissionRate}
              adminPhone={adminPhone}
              adminTelegram={adminTelegram}
            />
          </div>
        )}

        {/* VIEW: SUPER ADMIN PANEL (Full screen Glory) */}
        {viewMode === 'admin' && (
          <div className="w-full h-full min-h-screen flex flex-col">
            <SuperAdminPanel 
              stores={stores}
              setStores={setStores}
              ALL_PROMOS={promos}
              SET_PROMOS={setPromos}
              ALL_CATEGORIES={categories}
              SET_CATEGORIES={setCategories}
              ALL_PARTNERS={partners}
              SET_PARTNERS={setPartners}
              orders={orders}
              setOrders={setOrders}
              cart={cart}
              setCart={setCart}
              courierList={courierList}
              setCourierList={setCourierList}
              courierName={courierName}
              setCourierName={setCourierName}
              courierPhone={courierPhone}
              setCourierPhone={setCourierPhone}
              isCourierOnline={isCourierOnline}
              setIsCourierOnline={setIsCourierOnline}
              courierBalance={courierBalance}
              setCourierBalance={setCourierBalance}
              setCourierTransactions={setCourierTransactions}
              courierCoords={courierCoords}
              setCourierCoords={setCourierCoords}
              userProfile={userProfile}
              setUserProfile={setUserProfile}
              isBlacklisted={isBlacklisted}
              setIsBlacklisted={setIsBlacklisted}
              blacklistedPhones={blacklistedPhones}
              setBlacklistedPhones={setBlacklistedPhones}
              cashlessLimit={cashlessLimit}
              setCashlessLimit={setCashlessLimit}
              minOrderLimit={minOrderLimit}
              setMinOrderLimit={setMinOrderLimit}
              mandatoryOnlineCategories={mandatoryOnlineCategories}
              setMandatoryOnlineCategories={setMandatoryOnlineCategories}
              deliveryZones={deliveryZones}
              setDeliveryZones={setDeliveryZones}
              extraStopFee={extraStopFee}
              setExtraStopFee={setExtraStopFee}
              adminCardNumber={adminCardNumber}
              setAdminCardNumber={setAdminCardNumber}
              cardHolderName={cardHolderName}
              setCardHolderName={setCardHolderName}
              adminPhone={adminPhone}
              setAdminPhone={setAdminPhone}
              adminTelegram={adminTelegram}
              setAdminTelegram={setAdminTelegram}
              deliveryCommissionRate={deliveryCommissionRate}
              setDeliveryCommissionRate={setDeliveryCommissionRate}
              viewMode={viewMode}
              setViewMode={setViewMode}
              theme={adminTheme}
              setTheme={setAdminTheme}
            />
          </div>
        )}
      </main>

      {/* Decorative Outer Ambient Footer */}
      {viewMode !== 'admin' && (
        <footer className="w-full py-6 mt-12 border-t border-slate-200 bg-white text-center text-xs text-slate-400 font-medium select-none z-40 shadow-xs">
          <p>© 2026 KasbiGo Yetkazish Xizmati. Barcha huquqlar himoyalangan.</p>
          <p className="text-[10px] text-slate-500 mt-1">Dispetcherlik va Boshqaruv Exibit-Hub • Tashkent & Qashqadaryo</p>
        </footer>
      )}
    </div>
  );
}
