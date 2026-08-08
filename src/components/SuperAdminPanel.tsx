/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Settings, 
  Activity, 
  Trash2, 
  CheckCircle2, 
  Truck, 
  UserMinus, 
  UserPlus, 
  Sparkles, 
  ShoppingBag, 
  Plus, 
  Edit3, 
  Lock, 
  CheckCircle,
  Download,
  Phone, 
  X, 
  Star,
  Users,
  MapPin,
  ClipboardList,
  Sliders,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Search,
  Filter,
  Clock,
  Eye,
  Map as MapIcon,
  Calendar,
  Coins,
  ShieldAlert,
  AlertTriangle,
  XCircle
} from 'lucide-react';
import { Store, Product, CartItem, Order, Category, PromoBanner, PopularPartner, DeliveryZone, Courier, normalizeCourierTransport } from '../types';
import { INITIAL_COURIERS, INITIAL_DELIVERY_ZONES } from '../data';
import { compressImage } from '../utils/image';
import { exportOrdersToExcel } from '../utils/excelExport';
import { AdminMap } from './AdminMap';
import { isCashPaymentAllowed } from '../utils/paymentRules';
import { safeSetItem } from '../utils/safeStorage';
import { renumberOrders } from '../utils/orderUtils';
import { PhoneInput } from './PhoneInput';
import { useActionGuard } from '../hooks/useActionGuard';

const renderSafeProductImage = (img?: string, sizeClass: string = "h-7 w-7") => {
  if (!img) return <span className="text-base select-none">📦</span>;
  if (
    img.startsWith('http://') || 
    img.startsWith('https://') || 
    img.startsWith('data:') || 
    img.startsWith('/') ||
    /\.(jpg|jpeg|png|webp|svg|gif)($|\?)/i.test(img)
  ) {
    return (
      <img 
        src={img} 
        alt="Mahsulot" 
        className={`${sizeClass} object-cover rounded-lg shrink-0`} 
        onError={(e) => {
          (e.currentTarget as HTMLElement).style.display = 'none';
        }}
      />
    );
  }
  if (img.length <= 6) {
    return <span className="text-base select-none">{img}</span>;
  }
  return <span className="text-base select-none">📦</span>;
};

const DeliveryLocationPickerMap: React.FC<{
  coords: { latitude: number; longitude: number } | null;
  onChange: (coords: { latitude: number; longitude: number } | null) => void;
}> = ({ coords, onChange }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerInstanceRef = useRef<any>(null);

  useEffect(() => {
    const L = (window as any).L;
    if (!L || !mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const initialLat = coords?.latitude || 38.8351;
      const initialLng = coords?.longitude || 65.3621;

      const map = L.map(mapContainerRef.current, {
        center: [initialLat, initialLng],
        zoom: 14,
        zoomControl: true
      });

      // Esri Satellite HD Layer
      L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        maxZoom: 19,
        attribution: '&copy; Esri'
      }).addTo(map);

      // Labels layer
      L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}', {
        maxZoom: 19
      }).addTo(map);

      mapInstanceRef.current = map;

      // Click event to place or move marker
      map.on('click', (e: any) => {
        const { lat, lng } = e.latlng;
        onChange({ latitude: lat, longitude: lng });
      });
    }

    const map = mapInstanceRef.current;
    if (map) {
      setTimeout(() => map.invalidateSize(), 200);
      if (coords) {
        if (markerInstanceRef.current) {
          markerInstanceRef.current.setLatLng([coords.latitude, coords.longitude]);
        } else {
          const customIcon = L.divIcon({
            className: 'custom-location-pin',
            html: `
              <div class="flex items-center justify-center -translate-x-1/2 -translate-y-full cursor-pointer">
                <div class="bg-rose-600 text-white font-black text-[11px] px-3 py-1.5 rounded-full shadow-2xl border-2 border-white flex items-center space-x-1 animate-bounce">
                  <span>📍</span>
                  <span>Yetkazish Manzili</span>
                </div>
              </div>
            `,
            iconSize: [0, 0]
          });
          markerInstanceRef.current = L.marker([coords.latitude, coords.longitude], { icon: customIcon }).addTo(map);
        }
        map.panTo([coords.latitude, coords.longitude]);
      } else if (markerInstanceRef.current) {
        map.removeLayer(markerInstanceRef.current);
        markerInstanceRef.current = null;
      }
    }
  }, [coords, onChange]);

  return (
    <div className="space-y-2 pt-2 border-t border-slate-200">
      <div className="flex items-center justify-between">
        <label className="text-[10px] font-black uppercase tracking-wider text-slate-800 flex items-center space-x-1.5">
          <span className="p-1 bg-rose-100 text-rose-600 rounded-lg">🗺️</span>
          <span>Xaritada Aniq Lokatsiyani Belgilash</span>
        </label>
        {coords ? (
          <span className="text-emerald-700 font-mono text-[10px] font-black bg-emerald-100/80 px-2.5 py-0.5 rounded-full border border-emerald-300">
            ✓ {coords.latitude.toFixed(4)}, {coords.longitude.toFixed(4)}
          </span>
        ) : (
          <span className="text-slate-400 font-mono text-[9px] bg-slate-100 px-2 py-0.5 rounded-full">
            Lokatsiya tanlanmagan
          </span>
        )}
      </div>
      
      <div 
        ref={mapContainerRef} 
        className="w-full h-52 rounded-2xl border-2 border-emerald-400 shadow-md overflow-hidden relative z-0 cursor-crosshair"
      />
      
      <div className="flex justify-between items-center text-[9px] text-slate-500 font-bold italic">
        <span>💡 Xaritadagi istalgan nuqtaga bosing — kuryer uchun GPS belgilang.</span>
        {coords && (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="text-rose-600 hover:text-rose-800 font-black not-italic underline cursor-pointer"
          >
            ❌ Tozalash
          </button>
        )}
      </div>
    </div>
  );
};

interface SuperAdminPanelProps {
  stores: Store[];
  setStores: React.Dispatch<React.SetStateAction<Store[]>>;
  orders: Order[];
  setOrders: React.Dispatch<React.SetStateAction<Order[]>>;
  cart: CartItem[];
  setCart: React.Dispatch<React.SetStateAction<CartItem[]>>;
  
  // Dynamic App Content States
  ALL_PROMOS: PromoBanner[];
  SET_PROMOS: React.Dispatch<React.SetStateAction<PromoBanner[]>>;
  ALL_CATEGORIES: Category[];
  SET_CATEGORIES: React.Dispatch<React.SetStateAction<Category[]>>;
  ALL_PARTNERS: PopularPartner[];
  SET_PARTNERS: React.Dispatch<React.SetStateAction<PopularPartner[]>>;
  
  // Courier States
  courierName: string;
  setCourierName: (val: string) => void;
  courierPhone: string;
  setCourierPhone: (val: string) => void;
  isCourierOnline: boolean;
  setIsCourierOnline: (val: boolean) => void;
  courierBalance: number;
  setCourierBalance: React.Dispatch<React.SetStateAction<number>>;
  setCourierTransactions: React.Dispatch<React.SetStateAction<any[]>>;
  courierCoords?: { latitude: number; longitude: number } | null;
  setCourierCoords?: React.Dispatch<React.SetStateAction<{ latitude: number; longitude: number } | null>>;
  
  // Client States
  userProfile: { name: string; phone: string };
  setUserProfile: React.Dispatch<React.SetStateAction<{ name: string; phone: string }>>;
  isBlacklisted: boolean;
  setIsBlacklisted: (val: boolean) => void;
  blacklistedPhones: string[];
  setBlacklistedPhones: React.Dispatch<React.SetStateAction<string[]>>;

  // System States
  cashlessLimit: number;
  setCashlessLimit: (val: number) => void;
  minOrderLimit: number;
  setMinOrderLimit: (val: number) => void;
  mandatoryOnlineCategories?: string[];
  setMandatoryOnlineCategories?: React.Dispatch<React.SetStateAction<string[]>>;
  deliveryZones?: DeliveryZone[];
  setDeliveryZones?: React.Dispatch<React.SetStateAction<DeliveryZone[]>>;
  extraStopFee?: number;
  setExtraStopFee?: (val: number) => void;
  adminCardNumber: string;
  setAdminCardNumber: (val: string) => void;
  adminPhone: string;
  setAdminPhone: (val: string) => void;
  adminTelegram: string;
  setAdminTelegram: (val: string) => void;

  // Navigation Swapper Props
  viewMode?: 'exhibition' | 'customer' | 'courier' | 'admin';
  setViewMode?: (val: 'exhibition' | 'customer' | 'courier' | 'admin') => void;
  theme?: 'light' | 'dark';
  setTheme?: (theme: 'light' | 'dark') => void;

  // Real-time Courier list props
  courierList?: any[];
  setCourierList?: React.Dispatch<React.SetStateAction<any[]>>;
  deliveryCommissionRate?: number;
  setDeliveryCommissionRate?: (val: number) => void;
  cardHolderName?: string;
  setCardHolderName?: (val: string) => void;
}

export const SuperAdminPanel: React.FC<SuperAdminPanelProps> = ({
  stores,
  setStores,
  orders,
  setOrders,
  cart,
  setCart,
  ALL_PROMOS,
  SET_PROMOS,
  ALL_CATEGORIES,
  SET_CATEGORIES,
  ALL_PARTNERS,
  SET_PARTNERS,
  courierName,
  setCourierName,
  courierPhone,
  setCourierPhone,
  isCourierOnline,
  setIsCourierOnline,
  courierBalance,
  setCourierBalance,
  setCourierTransactions,
  courierCoords,
  setCourierCoords,
  userProfile,
  setUserProfile,
  isBlacklisted,
  setIsBlacklisted,
  blacklistedPhones,
  setBlacklistedPhones,
  cashlessLimit,
  setCashlessLimit,
  minOrderLimit,
  setMinOrderLimit,
  mandatoryOnlineCategories = ['Fast Food', 'Oshxona', 'Gullar'],
  setMandatoryOnlineCategories,
  deliveryZones,
  setDeliveryZones,
  extraStopFee = 3000,
  setExtraStopFee,
  adminCardNumber,
  setAdminCardNumber,
  adminPhone,
  setAdminPhone,
  adminTelegram,
  setAdminTelegram,
  deliveryCommissionRate = 20,
  setDeliveryCommissionRate,
  viewMode = 'admin',
  setViewMode,
  theme = 'dark',
  setTheme,
  courierList: propCourierList,
  setCourierList: propSetCourierList,
  cardHolderName: propCardHolderName,
  setCardHolderName: propSetCardHolderName
}) => {
  const [activeTab, setActiveTab] = useState<'stats' | 'orders' | 'stores' | 'couriers' | 'system' | 'content' | 'map' | 'blacklist'>('stats');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [blacklistPhoneInput, setBlacklistPhoneInput] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [paymentTypeFilter, setPaymentTypeFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [methodFilter, setMethodFilter] = useState<string>('all');
  const [orderStartDate, setOrderStartDate] = useState<string>('');
  const [orderEndDate, setOrderEndDate] = useState<string>('');
  const [editingCourierDebtId, setEditingCourierDebtId] = useState<string | null>(null);
  const [editingDebtInput, setEditingDebtInput] = useState<string>('');
  const [viewedChequeOrders, setViewedChequeOrders] = useState<Record<string, boolean>>({});
  const [newCustomCategoryInput, setNewCustomCategoryInput] = useState('');

  // Requirement G: Editable partner store commission percentages
  const [storeCommissions, setStoreCommissions] = useState<Record<string, number>>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('kasbigo-store-commissions');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {}
      }
    }
    return {};
  });

  const handleUpdateStoreCommission = (storeKey: string, rate: number) => {
    const validRate = Math.min(100, Math.max(0, rate));
    setStoreCommissions(prev => {
      const next = { ...prev, [storeKey]: validRate };
      safeSetItem('kasbigo-store-commissions', JSON.stringify(next));
      return next;
    });
  };

  const [localCardHolderName, setLocalCardHolderName] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('kasbigo_cardHolderName') || localStorage.getItem('kasbigo-card-holder-name') || "SHERZOD M.";
    }
    return "SHERZOD M.";
  });

  const cardHolderName = propCardHolderName !== undefined ? propCardHolderName : localCardHolderName;
  const setCardHolderName = (val: string) => {
    setLocalCardHolderName(val);
    if (propSetCardHolderName) propSetCardHolderName(val);
    if (typeof window !== 'undefined') {
      safeSetItem('kasbigo_cardHolderName', val);
      safeSetItem('kasbigo-card-holder-name', val);
    }
  };

  const availableCategories = useMemo(() => {
    const cats = new Set<string>();
    (ALL_CATEGORIES || []).forEach(c => {
      if (c.name && c.name.trim()) {
        cats.add(c.name.trim());
      }
    });
    return Array.from(cats);
  }, [ALL_CATEGORIES]);

  const allMahallasList = useMemo(() => {
    const list: string[] = [];
    (deliveryZones || INITIAL_DELIVERY_ZONES || []).forEach(z => {
      (z.mahallas || []).forEach(m => {
        if (m && !list.includes(m)) list.push(m);
      });
    });
    return list;
  }, [deliveryZones]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [hasViewedReceipt, setHasViewedReceipt] = useState(false);
  const [expandedAccordionSections, setExpandedAccordionSections] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setHasViewedReceipt(false);
    if (selectedOrder) {
      setExpandedAccordionSections({});
    }
  }, [selectedOrder?.id]);

  const toggleAccordionSection = (sectionKey: string) => {
    setExpandedAccordionSections(prev => ({
      ...prev,
      [sectionKey]: !prev[sectionKey]
    }));
  };

  const { executeGuarded: executeGuardedAdminAction } = useActionGuard(500);
  const [verifiedCheques, setVerifiedCheques] = useState<Record<string, boolean>>({});
  const [courierPage, setCourierPage] = useState(1);
  const [courierPageSize, setCourierPageSize] = useState(10);
  const [activeZoomChequeUrl, setActiveZoomChequeUrl] = useState<string | null>(null);
  const [customPriceInputs, setCustomPriceInputs] = useState<Record<string, string>>({});
  const [timeFilter, setTimeFilter] = useState<'bugun' | 'hafta' | 'oy'>('bugun');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);

  // Delivery Zones state and management helpers
  const zonesList = deliveryZones || INITIAL_DELIVERY_ZONES;
  const [newMahallaInputs, setNewMahallaInputs] = useState<Record<string, string>>({});

  const handleUpdateZonePrice = (zoneId: string, newPrice: number) => {
    if (!setDeliveryZones) return;
    setDeliveryZones(prev => (prev || INITIAL_DELIVERY_ZONES).map(z => z.id === zoneId ? { ...z, price: newPrice } : z));
  };

  const handleUpdateZoneName = (zoneId: string, newName: string) => {
    if (!setDeliveryZones) return;
    setDeliveryZones(prev => (prev || INITIAL_DELIVERY_ZONES).map(z => z.id === zoneId ? { ...z, zoneName: newName } : z));
  };

  const handleUpdateZoneDistance = (zoneId: string, newDist: string) => {
    if (!setDeliveryZones) return;
    setDeliveryZones(prev => (prev || INITIAL_DELIVERY_ZONES).map(z => z.id === zoneId ? { ...z, distanceLabel: newDist } : z));
  };

  const handleAddMahallaToZone = (zoneId: string) => {
    const inputVal = (newMahallaInputs[zoneId] || '').trim();
    if (!inputVal) return;
    if (!setDeliveryZones) return;

    setDeliveryZones(prev => (prev || INITIAL_DELIVERY_ZONES).map(z => {
      if (z.id === zoneId) {
        if (z.mahallas.some(m => m.toLowerCase() === inputVal.toLowerCase())) return z;
        return { ...z, mahallas: [...z.mahallas, inputVal] };
      }
      return z;
    }));

    setNewMahallaInputs(prev => ({ ...prev, [zoneId]: '' }));
    showToast(`Yangi mahalla qo'shildi: "${inputVal}" 📍`);
  };

  const handleDeleteMahallaFromZone = (zoneId: string, mahallaName: string) => {
    if (!setDeliveryZones) return;
    setDeliveryZones(prev => (prev || INITIAL_DELIVERY_ZONES).map(z => {
      if (z.id === zoneId) {
        return { ...z, mahallas: z.mahallas.filter(m => m !== mahallaName) };
      }
      return z;
    }));
    showToast(`Mahalla o'chirildi: "${mahallaName}" 🗑️`);
  };

  // Admin Dark / Light mode state for modals / details panels
  const isAdminDarkMode = theme === 'dark';
  const setIsAdminDarkMode = (val: boolean) => {
    if (setTheme) {
      setTheme(val ? 'dark' : 'light');
    }
  };

  // Theme styling configurations for small detail modal windows (day/night mode)
  // Day mode MUST NOT contain any absolute black or very dark colors (No #000, no slate-950, no slate-900, no slate-900 text/bg).
  const th = {
    // Backdrop overlay
    overlay: isAdminDarkMode ? "bg-slate-950/65 backdrop-blur-sm" : "bg-slate-300/40 backdrop-blur-sm",
    
    // Main background of the modal/drawer
    bg: isAdminDarkMode ? "bg-[#0F172A] border-slate-800" : "bg-slate-50 border-slate-200",
    
    // Header background
    headerBg: isAdminDarkMode ? "bg-slate-950/40 border-slate-800" : "bg-white border-slate-200",
    
    // Cards / Section containers (no pure black, using elegant slate text)
    sectionBg: isAdminDarkMode ? "bg-[#090D1A] border-slate-850" : "bg-white border-slate-200 shadow-sm",
    
    // Main titles/headings text
    textTitle: isAdminDarkMode ? "text-slate-200" : "text-slate-900 font-extrabold",
    textWhite: isAdminDarkMode ? "text-white" : "text-slate-900 font-bold",
    textMain: isAdminDarkMode ? "text-slate-300" : "text-slate-800 font-medium",
    textMuted: isAdminDarkMode ? "text-slate-500 font-bold" : "text-slate-600 font-bold",
    textPrice: isAdminDarkMode ? "text-slate-300" : "text-slate-900 font-bold",
    
    // Status text in general
    textMono: isAdminDarkMode ? "text-emerald-400" : "text-emerald-600",
    textAmber: isAdminDarkMode ? "text-amber-400" : "text-amber-600 font-semibold",
    textTeal: isAdminDarkMode ? "text-teal-400" : "text-teal-600 font-semibold",
    textIndigo: isAdminDarkMode ? "text-indigo-400" : "text-indigo-600 font-semibold",
    textRose: isAdminDarkMode ? "text-rose-400" : "text-rose-600 font-semibold",
    
    // Borders
    border: isAdminDarkMode ? "border-slate-850" : "border-slate-200",
    borderDashed: isAdminDarkMode ? "border-dashed border-slate-850" : "border-dashed border-slate-200",
    borderT: isAdminDarkMode ? "border-t border-slate-850/50" : "border-t border-slate-200",
    borderIndigo: isAdminDarkMode ? "border-indigo-950" : "border-indigo-200",
    borderEmerald: isAdminDarkMode ? "border-emerald-950" : "border-emerald-200",
    borderRose: isAdminDarkMode ? "border-rose-500/20" : "border-rose-200",
    borderSpecial: isAdminDarkMode ? "border-indigo-950/40 bg-indigo-500/5 border border-indigo-500/10" : "border-indigo-100 bg-indigo-500/5 border border-indigo-500/10",
    borderSpecialEmerald: isAdminDarkMode ? "border-emerald-950/40 bg-emerald-500/5 border border-emerald-500/10" : "border-emerald-100 bg-emerald-500/5 border border-emerald-500/10",
    
    // Input Fields
    inputBg: isAdminDarkMode ? "bg-slate-950 border-slate-800 text-white placeholder-slate-600" : "bg-white border-slate-200 text-slate-700 placeholder-slate-400 focus:bg-white",
    
    // Pill backgrounds
    pillBg: isAdminDarkMode ? "bg-slate-950/60" : "bg-slate-100",
    
    // Custom prices / draft backgrounds
    draftBg: isAdminDarkMode ? "bg-amber-500/5 border-amber-500/15" : "bg-amber-500/5 border-amber-200",
    pendingPriceBg: isAdminDarkMode ? "bg-amber-500/10 border-amber-500/20" : "bg-amber-500/5 border-amber-200",
    
    // Buttons (such as closing or back buttons)
    btnIcon: isAdminDarkMode ? "bg-slate-800 hover:bg-slate-700 text-slate-300" : "bg-slate-100 hover:bg-slate-200 text-slate-600",
    btnSecondary: isAdminDarkMode ? "bg-slate-850 hover:bg-slate-800 text-indigo-400 border border-slate-800" : "bg-indigo-50 hover:bg-indigo-100 text-indigo-600 border border-indigo-200",
    btnDanger: isAdminDarkMode ? "bg-rose-500/10 hover:bg-rose-500 hover:text-white border border-rose-500/20 text-rose-400" : "bg-rose-50 hover:bg-rose-500 hover:text-white border border-rose-200 text-rose-600",
    btnInfo: isAdminDarkMode ? "bg-slate-800 hover:bg-slate-700 text-white" : "bg-slate-100 hover:bg-slate-200 text-slate-600",
    btnVoiceClear: isAdminDarkMode ? "text-rose-500 hover:text-rose-400" : "text-rose-600 hover:text-rose-500 font-bold",
    
    // Cheque items
    chequeItemBg: isAdminDarkMode ? "bg-slate-905 border border-slate-800" : "bg-slate-50 border border-slate-200",
    chequeImageBg: isAdminDarkMode ? "bg-black hover:border-indigo-500/50" : "bg-slate-100 hover:border-indigo-300",
    chequeZoomHeader: isAdminDarkMode ? "bg-slate-950/40 border-slate-800" : "bg-white border-slate-200",
    chequeZoomBody: isAdminDarkMode ? "bg-black" : "bg-slate-50",
    chequeZoomFooter: isAdminDarkMode ? "bg-slate-950/40 border-slate-800" : "bg-white border-slate-200",
    
    // Audio Recorder area
    recorderBg: isAdminDarkMode ? "bg-slate-950 border-slate-850" : "bg-slate-50 border-slate-200",
    recorderMicrophone: isAdminDarkMode ? "bg-amber-500 hover:bg-amber-600 text-slate-950 shadow-amber-500/20" : "bg-amber-400 hover:bg-amber-500 text-slate-700 shadow-amber-400/15",
    recorderMicrophoneActive: isAdminDarkMode ? "bg-rose-500 hover:bg-rose-600 text-white shadow-rose-500/20" : "bg-rose-500 hover:bg-rose-600 text-white shadow-rose-500/15",
    recorderDuration: isAdminDarkMode ? "text-white" : "text-slate-700",
    recorderTextMuted: isAdminDarkMode ? "text-slate-500" : "text-slate-500 font-semibold",
  };

  // Admin comments and voice notes (Command 8)
  const [isAdminRecording, setIsAdminRecording] = useState(false);
  const [adminRecordingSeconds, setAdminRecordingSeconds] = useState(0);
  const [adminRecordedAudioUrl, setAdminRecordedAudioUrl] = useState<string | null>(null);
  const adminMediaRecorderRef = useRef<MediaRecorder | null>(null);
  const adminRecordingTimerRef = useRef<any>(null);
  
  // Screen width state for full-screen desktop responsiveness
  const [isDesktopSize, setIsDesktopSize] = useState(typeof window !== 'undefined' ? window.innerWidth >= 1024 : true);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleResize = () => {
      setIsDesktopSize(window.innerWidth >= 1024);
    };
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      if (adminRecordingTimerRef.current) {
        clearInterval(adminRecordingTimerRef.current);
      }
    };
  }, []);

  // Determine if we show the Desktop layout. 
  // IMPORTANT: If we are in 'exhibition' side-by-side mode, we force the compact layout so it fits nicely in its column!
  const isDesktop = isDesktopSize && viewMode !== 'exhibition';

  // Store management local states
  const [selectedStoreId, setSelectedStoreId] = useState<string>(stores[0]?.id || '');
  const [newProductName, setNewProductName] = useState('');
  const [newProductPrice, setNewProductPrice] = useState('');
  const [newProductDesc, setNewProductDesc] = useState('');
  const [newProductCategory, setNewProductCategory] = useState<Category>('boshqalar');
  const [newProductImage, setNewProductImage] = useState('');
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [editingProductPrice, setEditingProductPrice] = useState<string>('');

  // Courier Balance adjustments local states
  const [balanceAdjustAmount, setBalanceAdjustAmount] = useState('');

  // Multi-courier management
  const [localCourierList, setLocalCourierList] = useState<Array<{
    id: string;
    name: string;
    phone: string;
    balance: number;
    isOnline: boolean;
    isBlocked: boolean;
    transport: 'Velosiped' | 'Skuter' | 'Yengil avtomobil' | 'Yuk avtomobili (Labo)' | 'Yuk mototsikli';
    plate: string;
    rating: number;
    ratingCount: number;
    ordersCount: number;
    addedDate: string;
    verified: boolean;
    password?: string;
  }>>(() => {
    const saved = localStorage.getItem('kasbigo-couriers-list');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.length > 0) {
          // Add default fields if they don't exist for backward compatibility
          return parsed.map((c: any) => ({
            id: c.id || `KG-${Math.floor(1000 + Math.random() * 9000)}`,
            name: c.name || '',
            phone: c.phone || '',
            balance: typeof c.balance === 'number' ? c.balance : 100000,
            isOnline: !!c.isOnline,
            isBlocked: !!c.isBlocked,
            transport: normalizeCourierTransport(c.transport),
            plate: c.plate || '01 A 123 BC',
            rating: typeof c.rating === 'number' ? c.rating : 5.0,
            ratingCount: typeof c.ratingCount === 'number' ? c.ratingCount : 120,
            ordersCount: typeof c.ordersCount === 'number' ? c.ordersCount : 350,
            addedDate: c.addedDate || '2024-05-10 10:30',
            verified: c.verified !== undefined ? !!c.verified : true,
            password: c.password || '123456',
          }));
        }
      } catch (e) {}
    }
    return INITIAL_COURIERS.map((c: any) => ({ ...c, transport: normalizeCourierTransport(c.transport), rating: typeof c.rating === 'number' ? c.rating : 5.0 }));
  });

  const courierList = propCourierList !== undefined ? propCourierList : localCourierList;
  const setCourierList = propSetCourierList || setLocalCourierList;

  const [newCourierName, setNewCourierName] = useState('');
  const [newCourierPhone, setNewCourierPhone] = useState('');
  const [newCourierPassword, setNewCourierPassword] = useState('123456');
  const [newCourierBalance, setNewCourierBalance] = useState('100000');
  const [newCourierIsOnline, setNewCourierIsOnline] = useState(false);
  const [newCourierTransport, setNewCourierTransport] = useState<'Velosiped' | 'Skuter' | 'Yengil avtomobil' | 'Yuk avtomobili (Labo)' | 'Yuk mototsikli'>('Skuter');
  const [newCourierPlate, setNewCourierPlate] = useState('');
  const [courierFilter, setCourierFilter] = useState<string>('all');
  
  // Modal toggle for add courier
  const [isAddCourierOpen, setIsAddCourierOpen] = useState(false);
  const [editingCourier, setEditingCourier] = useState<any | null>(null);
  const [courierToDelete, setCourierToDelete] = useState<any | null>(null);
  const [replenishingCourier, setReplenishingCourier] = useState<any | null>(null);
  const [replenishAmount, setReplenishAmount] = useState('');

  // Search and filter states
  const [courierSearchQuery, setCourierSearchQuery] = useState('');
  const [courierStatusFilter, setCourierStatusFilter] = useState<string>('all');
  const [courierTransportFilter, setCourierTransportFilter] = useState<string>('all');

  // Calendar periods for courier sorting and tracking
  const [courierStartDate, setCourierStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30); // Default to last 30 days
    return d.toISOString().split('T')[0];
  });
  const [courierEndDate, setCourierEndDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });

  // Sync courier list with local storage
  useEffect(() => {
    safeSetItem('kasbigo-couriers-list', JSON.stringify(courierList));
    const blockedPhones = courierList.filter(c => c.isBlocked).map(c => c.phone);
    safeSetItem('kasbigo-blocked-couriers', JSON.stringify(blockedPhones));
  }, [courierList]);

  // Blacklist states
  const [blacklistedCouriers, setBlacklistedCouriers] = useState<string[]>([]);
  
  // Custom blacklist inputs
  const [newBlacklistPhone, setNewBlacklistPhone] = useState('');
  const [newBlacklistName, setNewBlacklistName] = useState('');
  const [newBlacklistReason, setNewBlacklistReason] = useState('');
  const [newBlacklistType, setNewBlacklistType] = useState<'mijoz' | 'kuryer'>('mijoz');

  // 4-turdagi buyurtma yaratish (Type 4: Operator manual order)
  const [isCreatingNewOrder, setIsCreatingNewOrder] = useState(false);
  const [newOrderCustName, setNewOrderCustName] = useState('');
  const [newOrderCustPhone, setNewOrderCustPhone] = useState('');
  const [newOrderCustMahalla, setNewOrderCustMahalla] = useState('');
  const [newOrderCustComment, setNewOrderCustComment] = useState('');
  const [newOrderDeliveryCoords, setNewOrderDeliveryCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [newOrderCategory, setNewOrderCategory] = useState('');
  const [newOrderPickupPointsCount, setNewOrderPickupPointsCount] = useState<number>(1);
  const [newOrderPayMethod, setNewOrderPayMethod] = useState<'Naqd' | 'Online'>('Naqd');
  const [newOrderSelectedStore, setNewOrderSelectedStore] = useState<string>('all');
  const [newOrderSearchQuery, setNewOrderSearchQuery] = useState('');
  const [newOrderCartItems, setNewOrderCartItems] = useState<CartItem[]>([]);
  const [newOrderCustomItemName, setNewOrderCustomItemName] = useState('');
  const [newOrderCustomItemPrice, setNewOrderCustomItemPrice] = useState('');
  const [newOrderCustomItemQty, setNewOrderCustomItemQty] = useState('1');

  // Custom order category state for pricing modal
  const [customOrderCategoryInput, setCustomOrderCategoryInput] = useState<string>('');

  // Order editing states
  const [isEditingOrder, setIsEditingOrder] = useState(false);
  const [editOrderName, setEditOrderName] = useState('');
  const [editOrderPhone, setEditOrderPhone] = useState('');
  const [editOrderMahalla, setEditOrderMahalla] = useState('');
  const [editOrderComment, setEditOrderComment] = useState('');
  const [editOrderLat, setEditOrderLat] = useState<string>('');
  const [editOrderLng, setEditOrderLng] = useState<string>('');
  const [editOrderTotal, setEditOrderTotal] = useState<number>(0);
  const [editOrderItems, setEditOrderItems] = useState<any[]>([]);
  const [editCourierComment, setEditCourierComment] = useState<string>('');
  const [editPriceBreakdownComment, setEditPriceBreakdownComment] = useState<string>('');


  useEffect(() => {
    if (selectedOrder) {
      setEditOrderName(selectedOrder.customerName);
      setEditOrderPhone(selectedOrder.customerPhone);
      setEditOrderMahalla(selectedOrder.address.mahalla);
      setEditOrderComment(selectedOrder.address.comment || '');
      setEditOrderLat(selectedOrder.address.latitude ? selectedOrder.address.latitude.toString() : '');
      setEditOrderLng(selectedOrder.address.longitude ? selectedOrder.address.longitude.toString() : '');
      setEditOrderTotal(selectedOrder.total);
      setEditOrderItems([...selectedOrder.items]);
      setEditCourierComment(selectedOrder.courierComment || '');
      setEditPriceBreakdownComment(selectedOrder.priceBreakdownComment || '');
      setCustomOrderCategoryInput(selectedOrder.category || stores.find(s => s.name === selectedOrder.storeName)?.category || '');
      setIsEditingOrder(false);
    }
  }, [selectedOrder, stores]);

  useEffect(() => {
    if (isEditingOrder && selectedOrder) {
      const itemsSubtotal = editOrderItems.reduce((sum, item) => sum + ((item.product?.price || 0) * (item.quantity || 1)), 0);
      const deliveryFee = selectedOrder.deliveryFee ?? 10000;
      const extraStopsFee = selectedOrder.extraStopsFee ?? 0;
      setEditOrderTotal(itemsSubtotal + deliveryFee + extraStopsFee);
    }
  }, [editOrderItems, isEditingOrder, selectedOrder]);

  const toggleCustomerBlacklist = (phone: string, isMainUser = false) => {
    const list = blacklistedPhones || [];
    if (list.includes(phone)) {
      setBlacklistedPhones(prev => (prev || []).filter(p => p !== phone));
      if (isMainUser || phone === userProfile.phone) {
        setIsBlacklisted(false);
      }
      showToast("Mijoz blokdan chiqarildi! ✅");
    } else {
      setBlacklistedPhones(prev => [...(prev || []), phone]);
      if (isMainUser || phone === userProfile.phone) {
        setIsBlacklisted(true);
      }
      showToast("Mijoz qora ro'yxatga qo'shildi! 🛑");
    }
  };

  const handleSaveOrderEdits = () => {
    if (!selectedOrder) return;

    const isVoice = editOrderItems.some(item => item.product.id.startsWith('custom-voice') || item.product.voiceUrl || item.product.name.includes('🎙️'));
    if (isVoice && (!editCourierComment || !editCourierComment.trim())) {
      showToast("⚠️ XATO: Ovozli buyurtmada kuryer izohi yozilishi majburiy!");
      alert("⚠️ Ovozli buyurtmada buyurtma mazmunini kuryer uchun izohda ifodalash majburiy!");
      return;
    }

    const latNum = editOrderLat ? parseFloat(editOrderLat) : undefined;
    const lngNum = editOrderLng ? parseFloat(editOrderLng) : undefined;

    setOrders(prev => prev.map(o => {
      if (o.id === selectedOrder.id) {
        return {
          ...o,
          customerName: editOrderName,
          customerPhone: editOrderPhone,
          total: editOrderTotal,
          items: editOrderItems,
          courierComment: editCourierComment,
          priceBreakdownComment: editPriceBreakdownComment,
          address: {
            ...o.address,
            mahalla: editOrderMahalla,
            comment: editOrderComment,
            latitude: latNum,
            longitude: lngNum
          }
        };
      }
      return o;
    }));

    setSelectedOrder(prev => {
      if (!prev) return null;
      return {
        ...prev,
        customerName: editOrderName,
        customerPhone: editOrderPhone,
        total: editOrderTotal,
        items: editOrderItems,
        courierComment: editCourierComment,
        priceBreakdownComment: editPriceBreakdownComment,
        address: {
          ...prev.address,
          mahalla: editOrderMahalla,
          comment: editOrderComment,
          latitude: latNum,
          longitude: lngNum
        }
      };
    });

    setIsEditingOrder(false);
    showToast("Buyurtma muvaffaqiyatli tahrirlandi! 📝");
  };


  // =========================================================
  // DYNAMIC APP CONTENT EDITOR STATES & UTILITIES
  // =========================================================
  const [contentSubTab, setContentSubTab] = useState<'banners' | 'categories' | 'partners' | 'markets' | 'products'>('banners');

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, setter: (val: string) => void, isBanner = false) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      showToast("Rasm yuklanmoqda va qayta ishlanmoqda...");
      const base64 = isBanner
        ? await compressImage(file, { maxWidth: 1200, maxHeight: 675, quality: 0.90, cropToSquare: false })
        : await compressImage(file, { maxWidth: 800, maxHeight: 800, quality: 0.90, cropToSquare: true });
      setter(base64);
      showToast("Rasm muvaffaqiyatli sifatli yuklandi! ✅");
    } catch (err) {
      showToast("Rasm yuklashda xatolik yuz berdi: " + String(err));
    }
  };

  // Promo Banner Form States
  const [editBannerId, setEditBannerId] = useState<string | null>(null);
  const [bannerTitle, setBannerTitle] = useState('');
  const [bannerTag, setBannerTag] = useState('');
  const [bannerDesc, setBannerDesc] = useState('');
  const [bannerBg, setBannerBg] = useState('');
  const [bannerActionText, setBannerActionText] = useState("O'tish");
  const [bannerTargetType, setBannerTargetType] = useState<'store' | 'category' | 'url'>('store');
  const [bannerTargetValue, setBannerTargetValue] = useState('');

  // Catalog Category Form States
  const [editCategoryId, setEditCategoryId] = useState<string | null>(null);
  const [categoryName, setCategoryName] = useState('');
  const [categoryIcon, setCategoryIcon] = useState('');
  const [categoryCount, setCategoryCount] = useState("12 ta do'kon");

  // Popular Partner Form States
  const [editPartnerId, setEditPartnerId] = useState<string | null>(null);
  const [partnerName, setPartnerName] = useState('');
  const [partnerImage, setPartnerImage] = useState('');
  const [partnerRating, setPartnerRating] = useState('5.0');
  const [partnerLocation, setPartnerLocation] = useState("Kasbi tumani");
  const [partnerDeliveryTime, setPartnerDeliveryTime] = useState("15-25 min");
  const [partnerMinOrder, setPartnerMinOrder] = useState(10000);
  const [partnerStoreId, setPartnerStoreId] = useState('');

  // Market/Store Form States
  const [editStoreId, setEditStoreId] = useState<string | null>(null);
  const [storeName, setStoreName] = useState('');
  const [storeCategory, setStoreCategory] = useState<Category>('boshqalar');
  const [storeImage, setStoreImage] = useState('');
  const [storeIcon, setStoreIcon] = useState('🏪');
  const [storeLocation, setStoreLocation] = useState("Kasbi");
  const [storeDeliveryTime, setStoreDeliveryTime] = useState("15-25 min");
  const [storeRating, setStoreRating] = useState(5.0);
  const [storeMinOrder, setStoreMinOrder] = useState(10000);
  const [storeStatus, setStoreStatus] = useState<'online' | 'busy' | 'offline'>('online');

  // Notifications
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Custom confirmation modal config
  const [confirmModalConfig, setConfirmModalConfig] = useState<{
    title: string;
    message: string;
    onConfirm?: () => void;
    inputPlaceholder?: string;
    isPrompt?: boolean;
    onConfirmWithInput?: (val: string) => void;
  } | null>(null);
  const [confirmInputValue, setConfirmInputValue] = useState("");
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // =========================================================
  // DYNAMIC APP CONTENT CRUD SUBMIT HANDLERS
  // =========================================================
  
  // Promo Banners
  const handleSaveBanner = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bannerTitle.trim() || !bannerTag.trim()) {
      showToast("Xato: Reklama nomi va matni majburiy!");
      return;
    }
    if (editBannerId) {
      SET_PROMOS(prev => prev.map(item => item.id === editBannerId ? {
        ...item,
        title: bannerTitle,
        tag: bannerTag,
        desc: bannerDesc,
        bg: bannerBg,
        actionText: bannerActionText,
        storeId: bannerTargetValue,
        targetType: bannerTargetType,
        targetValue: bannerTargetValue
      } : item));
      showToast("Reklama banneri o'zgartirildi! ✨");
    } else {
      const newAd: PromoBanner = {
        id: `promo-${Date.now()}`,
        title: bannerTitle,
        tag: bannerTag,
        desc: bannerDesc,
        bg: bannerBg || "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=800",
        actionText: bannerActionText,
        storeId: bannerTargetValue,
        targetType: bannerTargetType,
        targetValue: bannerTargetValue
      };
      SET_PROMOS(prev => [...prev, newAd]);
      showToast("Yangi reklama banneri qo'shildi! 🚀");
    }
    setEditBannerId(null);
    setBannerTitle('');
    setBannerTag('');
    setBannerDesc('');
    setBannerBg('');
    setBannerActionText("O'tish");
    setBannerTargetType('store');
    setBannerTargetValue('');
  };

  const handleDeleteBanner = (id: string) => {
    SET_PROMOS(prev => prev.filter(item => item.id !== id));
    showToast("Reklama banneri o'chirildi! 🧹");
  };

  // Categories
  const handleSaveCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryName.trim()) {
      showToast("Xato: Kategoriya nomi majburiy!");
      return;
    }
    const safeId = editCategoryId || categoryName.toLowerCase().replace(/[^a-z0-9]/g, '-');
    if (editCategoryId) {
      SET_CATEGORIES(prev => prev.map(item => item.id === editCategoryId ? {
        ...item,
        name: categoryName,
        icon: categoryIcon,
        count: categoryCount
      } : item));
      showToast("Katalog bo'limi tahrirlandi! ✨");
    } else {
      const newCat: any = {
        id: safeId,
        name: categoryName,
        icon: categoryIcon || "📦",
        count: categoryCount || "0 ta do'kon"
      };
      SET_CATEGORIES(prev => [...prev, newCat]);
      showToast("Yangi katalog bo'limi qo'shildi! 🚀");
    }
    setEditCategoryId(null);
    setCategoryName('');
    setCategoryIcon('');
    setCategoryCount("12 ta do'kon");
  };

  const handleDeleteCategory = (id: string) => {
    SET_CATEGORIES(prev => prev.filter(item => item.id !== id));
    showToast("Katalog bo'limi o'chirildi! 🧹");
  };

  // Popular Partners
  const handleSavePartner = (e: React.FormEvent) => {
    e.preventDefault();
    if (!partnerName.trim()) {
      showToast("Xato: Hamkor nomi majburiy!");
      return;
    }
    if (editPartnerId) {
      SET_PARTNERS(prev => prev.map(item => item.id === editPartnerId ? {
        ...item,
        name: partnerName,
        image: partnerImage,
        rating: parseFloat(partnerRating) || 5.0,
        location: partnerLocation,
        deliveryTime: partnerDeliveryTime,
        minOrder: partnerMinOrder,
        storeId: partnerStoreId
      } : item));
      showToast("Mashhur hamkor tahrirlandi! ✨");
    } else {
      const newPartner: PopularPartner = {
        id: `partner-${Date.now()}`,
        name: partnerName,
        image: partnerImage || "https://images.unsplash.com/photo-1542838132-92c53300491e?w=120",
        rating: parseFloat(partnerRating) || 5.0,
        location: partnerLocation,
        deliveryTime: partnerDeliveryTime,
        minOrder: partnerMinOrder,
        storeId: partnerStoreId
      };
      SET_PARTNERS(prev => [...prev, newPartner]);
      showToast("Yangi mashhur hamkor qo'shildi! 🚀");
    }
    setEditPartnerId(null);
    setPartnerName('');
    setPartnerImage('');
    setPartnerRating('5.0');
    setPartnerLocation("Kasbi tumani");
    setPartnerDeliveryTime("15-25 min");
    setPartnerMinOrder(10000);
    setPartnerStoreId('');
  };

  const handleDeletePartner = (id: string) => {
    SET_PARTNERS(prev => prev.filter(item => item.id !== id));
    showToast("Mashhur hamkor o'chirildi! 🧹");
  };

  // Markets/Stores (Full CRUD)
  const handleSaveStore = (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeName.trim()) {
      showToast("Xato: Market nomi majburiy!");
      return;
    }
    if (editStoreId) {
      setStores(prev => prev.map(item => item.id === editStoreId ? {
        ...item,
        name: storeName,
        category: storeCategory,
        image: storeImage || "https://images.unsplash.com/photo-1542838132-92c53300491e?w=300",
        icon: storeIcon,
        location: storeLocation,
        deliveryTime: storeDeliveryTime,
        rating: storeRating,
        minOrder: storeMinOrder,
        status: storeStatus
      } : item));
      showToast("Market tahrirlandi! ✨");
    } else {
      const newId = storeName.toLowerCase().replace(/[^a-z0-9]/g, '-');
      const newStore: Store = {
        id: newId,
        name: storeName,
        category: storeCategory,
        image: storeImage || "https://images.unsplash.com/photo-1542838132-92c53300491e?w=300",
        icon: storeIcon,
        location: storeLocation,
        deliveryTime: storeDeliveryTime,
        rating: storeRating,
        minOrder: storeMinOrder,
        status: storeStatus,
        products: []
      };
      setStores(prev => [...prev, newStore]);
      showToast("Yangi market qo'shildi! 🚀");
    }
    setEditStoreId(null);
    setStoreName('');
    setStoreCategory('boshqalar');
    setStoreImage('');
    setStoreIcon('🏪');
    setStoreLocation("Kasbi");
    setStoreDeliveryTime("15-25 min");
    setStoreRating(5.0);
    setStoreMinOrder(10000);
    setStoreStatus('online');
  };

  const handleDeleteStore = (id: string) => {
    setStores(prev => prev.filter(item => item.id !== id));
    showToast("Market tizimdan butunlay o'chirildi! 🧹");
  };

  const selectedStore = stores.find(s => s.id === selectedStoreId);

  // Statistics calculations
  const totalSales = orders
    .filter(o => o.status === 'Yetkazildi')
    .reduce((sum, o) => sum + o.total, 0);
  
  const pendingOrdersCount = orders.filter(o => o.status === 'Yangi').length;
  const deliveryOrdersCount = orders.filter(o => o.status === 'Kuryerda').length;
  const completedOrdersCount = orders.filter(o => o.status === 'Yetkazildi').length;

  // Save Product (Handles both Add and full Edit for Name, Price, Description, Image)
  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProductName.trim() || !newProductPrice) {
      showToast("Xato: Nomi va narxi majburiy!");
      return;
    }

    const priceNum = parseInt(newProductPrice);
    if (isNaN(priceNum) || priceNum <= 0) {
      showToast("Xato: Narxi musbat son bo'lishi kerak!");
      return;
    }

    if (editingProductId) {
      // Edit Mode
      setStores(prev => prev.map(store => {
        if (store.id === selectedStoreId) {
          return {
            ...store,
            products: store.products.map(p => {
              if (p.id === editingProductId) {
                return {
                  ...p,
                  name: newProductName.trim(),
                  price: priceNum,
                  description: newProductDesc.trim() || "Tahrirlangan mahsulot.",
                  image: newProductImage.trim() || 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=300'
                };
              }
              return p;
            })
          };
        }
        return store;
      }));
      showToast("Mahsulot muvaffaqiyatli tahrirlandi! ✨");
    } else {
      // Add Mode
      const newProduct: Product = {
        id: `p-admin-${Date.now()}`,
        name: newProductName.trim(),
        price: priceNum,
        description: newProductDesc.trim() || "Admin tomonidan qo'shilgan mahsulot.",
        image: newProductImage.trim() || 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=300'
      };

      setStores(prev => prev.map(store => {
        if (store.id === selectedStoreId) {
          return {
            ...store,
            products: [newProduct, ...store.products]
          };
        }
        return store;
      }));
      showToast("Yangi mahsulot do'konga qo'shildi! ✅");
    }

    // Reset Form
    setEditingProductId(null);
    setNewProductName('');
    setNewProductPrice('');
    setNewProductDesc('');
    setNewProductImage('');
  };

  // Delete Product Action
  const handleDeleteProduct = (productId: string) => {
    setStores(prev => prev.map(store => {
      if (store.id === selectedStoreId) {
        return {
          ...store,
          products: store.products.filter(p => p.id !== productId)
        };
      }
      return store;
    }));
    showToast("Mahsulot do'kondan olib tashlandi!");
  };

  // Courier Balance Adjustments
  const handleAdjustBalance = (type: 'add' | 'subtract', customAmount?: number) => {
    const amount = customAmount || parseInt(balanceAdjustAmount);
    if (isNaN(amount) || amount <= 0) {
      showToast("Xato: Miqdorni to'g'ri kiriting!");
      return;
    }

    setCourierBalance(prev => {
      const nextBalance = type === 'add' ? prev + amount : Math.max(0, prev - amount);
      
      // Add transaction to history
      setCourierTransactions(prevTx => [
        {
          id: `tx-admin-${Math.floor(1000 + Math.random() * 9000)}`,
          type: type === 'add' ? 'refill' : 'deduction',
          amount: amount,
          description: type === 'add' ? "Super Admin: Balans to'ldirildi" : "Super Admin: Komissiya / Jarima yechildi",
          time: new Date().toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' }),
          date: "Bugun"
        },
        ...prevTx
      ]);

      return nextBalance;
    });

    if (!customAmount) setBalanceAdjustAmount('');
    showToast(type === 'add' ? "Balans muvaffaqiyatli to'ldirildi! 🟢" : "Balansdan yechildi! 🔴");
  };

  // Dispatch orders status
  const handleUpdateOrderStatus = executeGuardedAdminAction((orderId: string, status: Order['status']): boolean => {
    const orderObj = orders.find(o => o.id === orderId);
    
    if (orderObj && (status === "Kuryerda" || status === "Kuryer qidirilmoqda")) {
      const isCatSelected = !!(orderObj.category && orderObj.category.trim());
      const isOnlinePay = orderObj.paymentMethod === 'Online';
      const hasCheque = orderObj.uploadedChequeUrl || (orderObj.uploadedChequeUrls && orderObj.uploadedChequeUrls.length > 0);
      const isChequeApproved = (!isOnlinePay && !hasCheque) || !!verifiedCheques[orderId] || !!orderObj.isChequeVerified;

      if (!isCatSelected) {
        showToast("⚠️ Buyurtma kategoriyasi tanlanmagan! Avval kategoriyani tanlang.");
        return false;
      }

      if (!isChequeApproved) {
        showToast("⚠️ Onlayn to'lov cheki tasdiqlanmagan! Avval chekni 'Chekni Tasdiqlash' tugmasi orqali tasdiqlang.");
        return false;
      }
    }

    setOrders(prev => prev.map(o => {
      if (o.id === orderId) {
        const extra = status === "Kuryerda" ? { dispatchedAt: Date.now() } : {};
        return { ...o, status, ...extra };
      }
      return o;
    }));
    showToast(`Buyurtma statusi "${status}" ga o'zgartirildi!`);
    return true;
  });

  // Admin voice message recording functions (Command 8)
  const startAdminRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      let mimeType = 'audio/webm';
      if (MediaRecorder.isTypeSupported('audio/mp4')) {
        mimeType = 'audio/mp4';
      } else if (MediaRecorder.isTypeSupported('audio/aac')) {
        mimeType = 'audio/aac';
      } else if (MediaRecorder.isTypeSupported('audio/wav')) {
        mimeType = 'audio/wav';
      }

      const mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      adminMediaRecorderRef.current = mediaRecorder;
      const chunks: Blob[] = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: mediaRecorder.mimeType || mimeType });
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64data = reader.result as string;
          setAdminRecordedAudioUrl(base64data);
          // Also update selectedOrder and orders immediately
          if (selectedOrder) {
            setOrders(prev => prev.map(o => o.id === selectedOrder.id ? { ...o, adminVoiceUrl: base64data } : o));
            setSelectedOrder(prev => prev ? { ...prev, adminVoiceUrl: base64data } : null);
          }
        };
        reader.readAsDataURL(blob);

        stream.getTracks().forEach(track => track.stop());
      };

      setAdminRecordingSeconds(0);
      setIsAdminRecording(true);
      setAdminRecordedAudioUrl(null);
      mediaRecorder.start();

      adminRecordingTimerRef.current = setInterval(() => {
        setAdminRecordingSeconds(prev => prev + 1);
      }, 1000);
    } catch (err) {
      console.warn("Recording fallback activated:", err);
      // Fallback simulated recording if microphone access is blocked
      setAdminRecordingSeconds(0);
      setIsAdminRecording(true);
      setAdminRecordedAudioUrl(null);
      adminRecordingTimerRef.current = setInterval(() => {
        setAdminRecordingSeconds(prev => prev + 1);
      }, 1000);
      
      // Simulate stop in 5 seconds
      setTimeout(() => {
        if (adminRecordingTimerRef.current) {
          clearInterval(adminRecordingTimerRef.current);
          adminRecordingTimerRef.current = null;
        }
        setIsAdminRecording(false);
        const simBase64 = "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAAA";
        setAdminRecordedAudioUrl(simBase64);
        if (selectedOrder) {
          setOrders(prev => prev.map(o => o.id === selectedOrder.id ? { ...o, adminVoiceUrl: simBase64 } : o));
          setSelectedOrder(prev => prev ? { ...prev, adminVoiceUrl: simBase64 } : null);
        }
      }, 4000);
    }
  };

  const stopAdminRecording = () => {
    if (adminMediaRecorderRef.current && adminMediaRecorderRef.current.state !== 'inactive') {
      adminMediaRecorderRef.current.stop();
    }
    setIsAdminRecording(false);
    if (adminRecordingTimerRef.current) {
      clearInterval(adminRecordingTimerRef.current);
      adminRecordingTimerRef.current = null;
    }
  };

  // Confirm hand-written cart item price from customer
  const handleConfirmCustomCartPrice = (productId: string, priceStr: string) => {
    const priceNum = parseInt(priceStr);
    if (isNaN(priceNum) || priceNum <= 0) {
      showToast("Xato: To'g'ri narx kiriting!");
      return;
    }

    setCart(prev => prev.map(item => {
      if (item.product.id === productId) {
        return {
          ...item,
          product: { ...item.product, price: priceNum }
        };
      }
      return item;
    }));

    // Clean up price inputs
    setCustomPriceInputs(prev => {
      const copy = { ...prev };
      delete copy[productId];
      return copy;
    });

    showToast("Narx hisoblandi va mijozga yuborildi! 🚀");
  };



  // Cancel single order (sets status to 'Bekor qilindi')
  const handleCancelOrder = (orderId: string) => {
    const targetOrd = orders.find(o => o.id === orderId);
    if (targetOrd?.status === 'Yetkazildi') {
      showToast("⚠️ 'Yetkazildi' statusidagi buyurtmani bekor qilib bo'lmaydi!");
      return;
    }
    setConfirmModalConfig({
      title: "Buyurtmani Bekor Qilish",
      message: "Bekor qilish sababini kiriting (mijoz va kuryerga ko'rsatiladi):",
      inputPlaceholder: "Masalan: Mahsulot omborda mavjud emas",
      isPrompt: true,
      onConfirmWithInput: (reasonVal) => {
        const finalReason = reasonVal && reasonVal.trim() ? reasonVal.trim() : "Admin tomonidan bekor qilindi";
        setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'Bekor qilindi', adminComment: finalReason, cancellationReason: finalReason } : o));
        if (selectedOrder?.id === orderId) {
          setSelectedOrder(prev => prev ? { ...prev, status: 'Bekor qilindi', adminComment: finalReason, cancellationReason: finalReason } : null);
        }
        showToast("Buyurtma bekor qilindi! ❌");
      }
    });
  };

  // Delete single order permanently
  const handleDeleteOrder = (orderId: string) => {
    setConfirmModalConfig({
      title: "Buyurtmani O'chirish",
      message: "Bu buyurtmani BUTUNLAY o'chirmoqchimisiz? Bu amalni qaytarib bo'lmaydi.",
      onConfirm: () => {
        setOrders(prev => renumberOrders(prev.filter(o => o.id !== orderId)));
        if (selectedOrder?.id === orderId) {
          setSelectedOrder(null);
        }
        showToast("Buyurtma butunlay o'chirildi! 🗑️");
      }
    });
  };

  // Clear all system orders
  const handleClearAllOrders = () => {
    setConfirmModalConfig({
      title: "Tarixni o'chirish",
      message: "Haqiqatan ham barcha buyurtmalar tarixini o'chirmoqchimisiz?",
      onConfirm: () => {
        setOrders(renumberOrders([]));
        showToast("Barcha buyurtmalar o'chirib tashlandi! 🧹");
      }
    });
  };

  // Helper to resolve courier info from claimedBy or phone or name or id
  const getCourierInfo = (claimedBy?: string) => {
    if (!claimedBy) return null;
    const cleanClaimed = claimedBy.replace(/\D/g, '');
    const found = courierList.find(c => {
      if (c.phone) {
        const cleanPhone = c.phone.replace(/\D/g, '');
        if (cleanPhone && cleanClaimed && (cleanPhone.endsWith(cleanClaimed) || cleanClaimed.endsWith(cleanPhone))) {
          return true;
        }
      }
      if (c.name && c.name.toLowerCase() === claimedBy.toLowerCase()) return true;
      if (c.id === claimedBy) return true;
      return false;
    });
    if (found) {
      return { name: found.name, phone: found.phone || claimedBy, id: found.id, vehicle: found.vehicle, carModel: found.carModel };
    }
    return { name: claimedBy, phone: claimedBy, id: claimedBy };
  };

  // Helper to determine order source method
  const getOrderSource = (o: Order): string => {
    if (o.orderMethod) {
      if ((o.orderMethod as string) === "Qo'ng'iroq qilingan" || (o.orderMethod as string) === "Telefon") return "Qo'ng'iroq qilingan";
      if (o.orderMethod === "Ovozli") return "Ovozli";
      if (o.orderMethod === "Yozma") return "Yozma";
      if (o.orderMethod === "Savatdan") return "Savatdan";
    }
    if (o.isManualDraft) return "Qo'ng'iroq qilingan";
    if (o.items?.some(i => i.product?.voiceUrl) || o.adminVoiceUrl) return "Ovozli";
    if (o.isCustomPendingPrice || o.category === "Yozma buyurtma" || o.items?.some(i => i.product?.id?.startsWith('custom-'))) return "Yozma";
    return "Savatdan";
  };

  // Helper to normalize date strings to YYYY-MM-DD
  const getNormalizedOrderDate = (orderDateStr?: string) => {
    if (!orderDateStr) return new Date().toISOString().split('T')[0];
    if (orderDateStr === "Bugun") return new Date().toISOString().split('T')[0];
    if (orderDateStr === "Kecha") {
      const y = new Date();
      y.setDate(y.getDate() - 1);
      return y.toISOString().split('T')[0];
    }
    if (orderDateStr.includes('.')) {
      const parts = orderDateStr.split('.');
      if (parts.length === 3) {
        return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      }
    }
    return orderDateStr;
  };

  // Filtered orders list based on Search, Status, Payment, Category, Method, and Date filters
  const filteredOrders = orders.filter(o => {
    const matchesSearch = o.id.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          o.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          o.storeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          o.address.mahalla.toLowerCase().includes(searchTerm.toLowerCase());
    
    let matchesStatus = true;
    if (statusFilter !== 'all') {
      matchesStatus = o.status === statusFilter;
    } else {
      // By default in 'all' status, exclude orders waiting for customer confirmation so admin list stays clean
      matchesStatus = o.status !== 'Mijoz tasdiqlashini kutmoqda';
    }
    
    const matchesPayment = paymentTypeFilter === 'all' ? true :
      (paymentTypeFilter === 'Naqd' ? o.paymentMethod === 'Naqd' : o.paymentMethod === 'Online');

    const matchesCategory = categoryFilter === 'all' ? true :
      (o.category && o.category.toLowerCase().trim() === categoryFilter.toLowerCase().trim());

    const matchesMethod = methodFilter === 'all' ? true :
      getOrderSource(o) === methodFilter;

    const matchesCourier = (() => {
      if (courierFilter === 'all') return true;
      if (courierFilter === 'unassigned') return !o.claimedBy;
      if (!o.claimedBy) return false;

      const filterLower = courierFilter.toLowerCase().trim();
      const claimedLower = o.claimedBy.toLowerCase().trim();

      if (claimedLower.includes(filterLower)) return true;

      const courierInfo = getCourierInfo(o.claimedBy);
      if (courierInfo) {
        if (courierInfo.name.toLowerCase().includes(filterLower)) return true;
        if (courierInfo.phone.toLowerCase().includes(filterLower)) return true;
        if (courierInfo.id.toLowerCase() === filterLower) return true;
      }

      const matchedFromList = courierList.find(c =>
        c.name.toLowerCase().includes(filterLower) ||
        (c.phone && c.phone.toLowerCase().includes(filterLower))
      );
      if (matchedFromList) {
        const cleanClaimed = o.claimedBy.replace(/\D/g, '');
        const cleanPhone = matchedFromList.phone ? matchedFromList.phone.replace(/\D/g, '') : '';
        if (cleanPhone && cleanClaimed && (cleanPhone.endsWith(cleanClaimed) || cleanClaimed.endsWith(cleanPhone))) {
          return true;
        }
        if (o.claimedBy.toLowerCase().includes(matchedFromList.name.toLowerCase())) {
          return true;
        }
      }

      return false;
    })();

    const matchesDate = (() => {
      if (!orderStartDate && !orderEndDate) return true;
      const oDateStr = getNormalizedOrderDate(o.date);
      if (orderStartDate && oDateStr < orderStartDate) return false;
      if (orderEndDate && oDateStr > orderEndDate) return false;
      return true;
    })();

    return matchesSearch && matchesStatus && matchesPayment && matchesCategory && matchesMethod && matchesCourier && matchesDate;
  });

  // Clock state for SaaS navbar feel
  const [currentTime, setCurrentTime] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className={`flex bg-gradient-to-br from-[#FFE4CC] via-[#FCFCF9] to-[#D5F5DC] text-slate-900 font-sans overflow-hidden w-full relative ${viewMode === 'exhibition' ? 'h-full rounded-[32px] border border-slate-200 shadow-2xl' : 'min-h-screen'}`}>
      
      {/* Toast Notification Banner */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 bg-emerald-500 text-slate-950 font-black text-xs px-5 py-3 rounded-2xl shadow-xl shadow-emerald-500/20 z-[99] flex items-center space-x-2 uppercase tracking-wider border border-emerald-400"
          >
            <CheckCircle2 className="h-4 w-4" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ========================================================= */}
      {/* 1. COLLAPSIBLE SIDEBAR (DESKTOP MODE ONLY)               */}
      {/* ========================================================= */}
      {isDesktop && (
        <aside 
          className={`bg-[#0F172A] border-r border-slate-800 flex flex-col h-screen shrink-0 transition-all duration-300 relative z-30 select-none ${
            isSidebarCollapsed ? 'w-20' : 'w-64'
          }`}
        >
          {/* Sidebar Brand Logo */}
          <div className="flex items-center space-x-3 p-6 border-b border-slate-800 justify-between">
            <div className="flex items-center space-x-3 overflow-hidden">
              <div className="h-10 w-10 flex items-center justify-center shrink-0">
                <img 
                  src="https://i.ibb.co/p64BNF4B/a34c4781-022c-440d-8f9e-4b75d867aea3.png" 
                  alt="KasbiGo" 
                  className="w-full h-full object-contain filter drop-shadow-sm"
                  referrerPolicy="no-referrer"
                />
              </div>
              {!isSidebarCollapsed && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="font-black tracking-tight"
                >
                  <span className="text-white block text-sm leading-none">KasbiGo</span>
                  <span className="text-emerald-400 text-[10px] tracking-widest font-bold">SUPER ADMIN</span>
                </motion.div>
              )}
            </div>
            
            {/* Collapse Icon */}
            <button 
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-all ml-1 cursor-pointer"
            >
              {isSidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 px-3 py-6 space-y-1.5 overflow-y-auto">
            {[
              { id: 'stats', label: 'Tahlillar', desc: 'Hisobot va Grafik', icon: TrendingUp },
              { id: 'orders', label: 'Buyurtmalar', desc: 'Real-vaqt monitoring', icon: ClipboardList, badge: orders.filter(o => o.status === 'Yangi' || o.status === 'Narx belgilashda').length },
              { id: 'map', label: 'Kuryer Xaritasi', desc: 'Kuryer & Yo\'nalishlar', icon: MapIcon },
              { id: 'content', label: 'Ilova Dizayni', desc: 'Reklama & Hamkor', icon: Sparkles },
              { id: 'couriers', label: 'Kuryer Sozlash', desc: 'Balans va Smena', icon: Truck },
              { id: 'blacklist', label: 'Qora Ro\'yxat', desc: 'Mijozlarni boshqarish', icon: UserMinus, badge: (blacklistedPhones || []).length },
              { id: 'system', label: 'Tizim & Mijoz', desc: 'Limitlar va Blok', icon: Sliders }
            ].map(tab => {
              const TabIcon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`w-full py-3 px-3.5 rounded-xl flex items-center space-x-3 transition-all relative group text-left cursor-pointer ${
                    isActive
                      ? 'bg-gradient-to-r from-emerald-500/10 to-teal-500/5 text-emerald-400 border-l-4 border-emerald-500'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                  }`}
                  title={isSidebarCollapsed ? tab.label : ''}
                >
                  <TabIcon className={`h-5 w-5 shrink-0 ${isActive ? 'text-emerald-400' : 'text-slate-400 group-hover:text-white'}`} />
                  {!isSidebarCollapsed && (
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-xs leading-none">{tab.label}</span>
                        {tab.badge !== undefined && tab.badge > 0 && (
                          <span className="bg-amber-500 text-slate-950 text-[9px] font-black px-1.5 py-0.5 rounded-full">
                            {tab.badge}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-500 font-medium block mt-0.5">{tab.desc}</span>
                    </div>
                  )}
                  {isSidebarCollapsed && tab.badge !== undefined && tab.badge > 0 && (
                    <span className="absolute top-2 right-2 bg-amber-500 text-slate-950 text-[8px] font-black px-1 rounded-full">
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Sidebar Footer */}
          <div className="p-4 border-t border-slate-800 text-[10px] text-slate-500">
            {!isSidebarCollapsed ? (
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-300 block">Farhod Dispetcher</span>
                  <span className="text-[9px]">SaaS Terminal v3.0</span>
                </div>
                <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              </div>
            ) : (
              <div className="flex justify-center">
                <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
              </div>
            )}
          </div>
        </aside>
      )}

      {/* ========================================================= */}
      {/* 2. MAIN LAYOUT CONTAINER                                 */}
      {/* ========================================================= */}
      <div className={`flex-1 flex flex-col overflow-hidden ${viewMode === 'exhibition' ? 'h-full' : 'h-screen'}`}>
        
        {/* ========================================================= */}
        {/* 2A. TOP NAVBAR (DESKTOP MODE ONLY)                       */}
        {/* ========================================================= */}
        {isDesktop && (
          <header className="bg-[#0F172A] border-b border-slate-800 h-16 flex items-center justify-between px-6 shrink-0 z-20 select-none">
            {/* Left: Breadcrumbs / Title Context */}
            <div className="flex items-center space-x-3">
              <h2 className="text-sm font-black uppercase tracking-wider text-slate-200">
                {activeTab === 'stats' && '📊 Tahlillar va Real-vaqt Monitor'}
                {activeTab === 'orders' && '📦 Buyurtmalar Dispetcherligi'}
                {activeTab === 'map' && '🗺️ Kuryer va Buyurtma Yo\'nalishlar Xaritasi'}
                {activeTab === 'stores' && '🏪 Do\'kon & Mahsulotlar'}
                {activeTab === 'content' && '✨ Ilova Kontenti & Dizayni (Reklama, Katalog, Hamkorlar)'}
                {activeTab === 'couriers' && '🚴 Kuryer Smenasi & Balansi'}
                {activeTab === 'blacklist' && '🚫 Tizim Qora Ro\'yxati (Blacklist)'}
                {activeTab === 'system' && '⚙️ Tizim Sozlamalari & Bloklar'}
              </h2>
              <span className="text-slate-600">•</span>
              <div className="flex items-center space-x-1 text-slate-400 text-xs">
                <Clock className="h-3.5 w-3.5 text-slate-500" />
                <span className="font-mono font-medium">{currentTime.toLocaleTimeString('uz-UZ')}</span>
              </div>
            </div>

            {/* Middle: PERSPECTIVE SWITCHER (High contrast SaaS Tabs) */}
            {setViewMode && (
              <div className="flex bg-slate-900 border border-slate-800 p-1 rounded-xl text-[10px] font-black tracking-wider uppercase select-none">
                <button
                  onClick={() => setViewMode('exhibition')}
                  className="py-1.5 px-3 rounded-lg text-slate-400 hover:text-white transition-all cursor-pointer flex items-center space-x-1"
                >
                  <span>🖥️ Ko'rgazma</span>
                </button>
                <button
                  onClick={() => setViewMode('customer')}
                  className="py-1.5 px-3 rounded-lg text-slate-400 hover:text-white transition-all cursor-pointer flex items-center space-x-1"
                >
                  <span>📱 Mijoz</span>
                </button>
                <button
                  onClick={() => setViewMode('courier')}
                  className="py-1.5 px-3 rounded-lg text-slate-400 hover:text-white transition-all cursor-pointer flex items-center space-x-1"
                >
                  <span>🚴 Kuryer</span>
                </button>
                <div className="bg-emerald-500 text-slate-950 font-black py-1.5 px-3 rounded-lg flex items-center space-x-1 shadow-md shadow-emerald-500/10">
                  <span>⚡ Admin</span>
                </div>
              </div>
            )}

            {/* Right: User Profile, Theme Toggle & Quick Wipe */}
            <div className="flex items-center space-x-4">
              {/* Day / Night Mode Toggle */}
              <button
                onClick={() => setIsAdminDarkMode(!isAdminDarkMode)}
                className={`px-3 py-1.5 rounded-lg border text-[10px] font-black uppercase tracking-wider flex items-center space-x-1.5 transition-all cursor-pointer ${
                  isAdminDarkMode 
                    ? 'bg-amber-500/10 hover:bg-amber-500 hover:text-slate-950 text-amber-400 border-amber-500/20' 
                    : 'bg-indigo-500/10 hover:bg-indigo-500 hover:text-white text-indigo-600 border-indigo-500/20'
                }`}
                title={isAdminDarkMode ? "Kunduzgi rejimga o'tish (Day Mode)" : "Tungi rejimga o'tish (Night Mode)"}
              >
                {isAdminDarkMode ? <span>☀️ Kunduzgi</span> : <span>🌙 Tungi</span>}
              </button>

              <div className="flex items-center space-x-2.5 pl-3 border-l border-slate-800">
                <div className="text-right">
                  <span className="font-bold text-xs text-white block">Super Admin</span>
                  <span className="text-[9px] text-emerald-400 block font-black uppercase tracking-widest">Guruh Sardori</span>
                </div>
                <div className="h-9 w-9 rounded-xl bg-emerald-500 text-slate-950 font-black flex items-center justify-center text-xs shadow-md shadow-emerald-500/20 relative">
                  SA
                  <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-400 border border-slate-950 animate-ping" />
                  <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 border border-slate-950" />
                </div>
              </div>
            </div>
          </header>
        )}

        {/* ========================================================= */}
        {/* 2B. MOBILE APPBAR (MOBILE MODE ONLY)                     */}
        {/* ========================================================= */}
        {!isDesktop && (
          <header className="bg-[#0F172A] border-b border-slate-850 h-14 px-4 flex items-center justify-between sticky top-0 z-40 select-none shrink-0">
            <div className="flex items-center space-x-2.5">
              <div className="p-1.5 rounded-lg bg-emerald-500 text-slate-950">
                <Settings className="h-4 w-4" />
              </div>
              <div>
                <span className="font-black text-xs block text-white">KasbiGo Admin</span>
                <span className="text-[9px] text-slate-400 font-bold block uppercase">
                  {activeTab === 'stats' && 'Tahlillar'}
                  {activeTab === 'orders' && 'Buyurtmalar'}
                  {activeTab === 'map' && 'Kuryer Xaritasi'}
                  {activeTab === 'stores' && 'Do\'konlar'}
                  {activeTab === 'couriers' && 'Kuryerlar'}
                  {activeTab === 'blacklist' && 'Qora Ro\'yxat'}
                  {activeTab === 'system' && 'Tizim'}
                </span>
              </div>
            </div>

            {/* Quick Perspective Switcher for Mobile */}
            <div className="flex items-center space-x-2">
              {setViewMode && (
                <select
                  value="admin"
                  onChange={(e) => setViewMode(e.target.value as any)}
                  className="bg-slate-900 border border-slate-800 text-[10px] font-black text-emerald-400 p-1.5 rounded-lg focus:outline-none"
                >
                  <option value="exhibition">🖥️ Ko'rgazma (Exhibition)</option>
                  <option value="customer">📱 Mijoz Ilovasi</option>
                  <option value="courier">🚴 Kuryer Terminali</option>
                  <option value="admin">⚡ Super Admin</option>
                </select>
              )}
              <button
                onClick={() => setIsAdminDarkMode(!isAdminDarkMode)}
                className={`p-1.5 rounded-lg border cursor-pointer transition-all ${
                  isAdminDarkMode 
                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/25' 
                    : 'bg-indigo-500/10 text-indigo-600 border-indigo-500/25'
                }`}
                title={isAdminDarkMode ? "Kunduzgi" : "Tungi"}
              >
                {isAdminDarkMode ? "☀️" : "🌙"}
              </button>
            </div>
          </header>
        )}

        {/* ========================================================= */}
        {/* 2C. SCROLLABLE WORKSPACE CONTENT                         */}
        {/* ========================================================= */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 scrollbar-thin pb-24 lg:pb-6 bg-transparent">
          
          {/* ================= TAB: STATS & DASHBOARD ================= */}
          {activeTab === 'stats' && (
            <div className="space-y-6">
              
              {(() => {
                // 1. Get current normalized dates
                const todayStr = new Date().toISOString().split('T')[0];
                const yesterday = new Date();
                yesterday.setDate(yesterday.getDate() - 1);
                const yesterdayStr = yesterday.toISOString().split('T')[0];

                const getNormalizedOrderDate = (orderDateStr: string) => {
                  if (orderDateStr === "Bugun") return todayStr;
                  if (orderDateStr === "Kecha") return yesterdayStr;
                  return orderDateStr;
                };

                // Filter orders by selected calendar date AND timeFilter period relative to that date
                const filteredOrders = orders.filter(order => {
                  const orderDate = getNormalizedOrderDate(order.date);
                  if (timeFilter === 'bugun') {
                    return orderDate === selectedDate || (selectedDate === todayStr && order.date === "Bugun") || (selectedDate === yesterdayStr && order.date === "Kecha");
                  } else if (timeFilter === 'hafta') {
                    const sel = new Date(selectedDate);
                    const ord = new Date(orderDate);
                    const diffTime = sel.getTime() - ord.getTime();
                    const diffDays = diffTime / (1000 * 60 * 60 * 24);
                    return diffDays >= 0 && diffDays <= 7;
                  } else { // 'oy'
                    const sel = new Date(selectedDate);
                    const ord = new Date(orderDate);
                    return sel.getFullYear() === ord.getFullYear() && sel.getMonth() === ord.getMonth();
                  }
                });

                // Completed orders in the filtered set
                const completedFiltered = filteredOrders.filter(o => o.status === 'Yetkazildi');

                // 1. Kuryer Daromadi: Total courier fees from completed orders
                const courierRevenue = completedFiltered.reduce((sum, o) => sum + (o.deliveryFee || 0) + (o.extraStopsFee || o.extraStopFee || 0), 0);

                // 2. Kuryer Xarajati: 3,000 UZS per completed order
                const courierExpenses = completedFiltered.length * 3000;

                // 3. Platform Revenue (Requirement F & Req 4: Historical non-retroactive commission)
                const deductedFromCourier = completedFiltered.reduce((sum, o) => {
                  if (typeof (o as any).courierCommissionAmount === 'number') {
                    return sum + (o as any).courierCommissionAmount;
                  }
                  const commRate = (o as any).deliveryCommissionRate ?? deliveryCommissionRate ?? 20;
                  const courierFee = (o.deliveryFee || 0) + (o.extraStopsFee || o.extraStopFee || 0);
                  return sum + Math.round(courierFee * (commRate / 100));
                }, 0);

                // Partner store commission (Requirement G & Req 4: Historical non-retroactive commission)
                const storeCommission = completedFiltered.reduce((sum, o) => {
                  if (typeof (o as any).storeCommissionAmount === 'number') {
                    return sum + (o as any).storeCommissionAmount;
                  }
                  const storeKey = o.storeName || 'default';
                  const rate = (o as any).storeCommissionRate ?? (storeCommissions[storeKey] !== undefined ? storeCommissions[storeKey] : 5);
                  const productCost = o.items && o.items.length > 0 
                    ? o.items.reduce((acc, item) => acc + ((item.product?.price || 0) * item.quantity), 0)
                    : Math.max(0, o.total - (o.deliveryFee || 0) - (o.extraStopsFee || 0));
                  return sum + Math.round(productCost * (rate / 100));
                }, 0);

                // Platforms Total Revenue & Net Profit (Sof foyda)
                const totalPlatformRevenue = deductedFromCourier + storeCommission;
                const netProfit = totalPlatformRevenue * 0.85;

                // 4. Order Statuses breakdown
                const statusCounts = {
                  'Yangi': filteredOrders.filter(o => o.status === 'Yangi').length,
                  'Narx belgilashda': filteredOrders.filter(o => o.status === 'Narx belgilashda').length,
                  'Kutishda': filteredOrders.filter(o => o.status === 'Kutishda').length,
                  'Kuryer qidirilmoqda': filteredOrders.filter(o => o.status === 'Kuryer qidirilmoqda').length,
                  'Kuryerda': filteredOrders.filter(o => o.status === 'Kuryerda').length,
                  'Yetkazildi': filteredOrders.filter(o => o.status === 'Yetkazildi').length,
                  'Bekor qilindi': filteredOrders.filter(o => o.status === 'Bekor qilindi').length,
                };

                // 5. Total Orders Count
                const totalOrdersCount = filteredOrders.length;

                // 6. Active and New clients in the filtered set
                const activeClientsList = Array.from(new Set(filteredOrders.map(o => o.customerName)));
                const activeClientsCount = activeClientsList.length;

                // New clients today (whose total historical orders is exactly 1)
                const newClientsCount = filteredOrders.filter(order => {
                  const custOrders = orders.filter(o => o.customerName === order.customerName);
                  return custOrders.length === 1;
                }).reduce((acc, order) => {
                  acc.add(order.customerName);
                  return acc;
                }, new Set<string>()).size || Math.max(1, Math.round(activeClientsCount * 0.3));

                // Historical Monthly values for percentages
                const selDateObj = new Date(selectedDate);
                const selYear = selDateObj.getFullYear();
                const selMonth = selDateObj.getMonth();

                const monthOrders = orders.filter(o => {
                  const d = new Date(getNormalizedOrderDate(o.date));
                  return d.getFullYear() === selYear && d.getMonth() === selMonth;
                });

                // Calculate days elapsed in the selected month
                const today = new Date();
                let daysInMonth = 30; // fallback
                if (today.getFullYear() === selYear && today.getMonth() === selMonth) {
                  daysInMonth = today.getDate(); // days elapsed up to today
                } else {
                  daysInMonth = new Date(selYear, selMonth + 1, 0).getDate();
                }
                daysInMonth = Math.max(1, daysInMonth);

                const monthlyTotalCount = monthOrders.length;
                const monthlyDailyAverageOrders = monthlyTotalCount / daysInMonth;

                const monthlyRevenue = monthOrders.filter(o => o.status === 'Yetkazildi').reduce((sum, o) => {
                  const deducted = 3000;
                  const commission = o.total * 0.05;
                  return sum + deducted + commission;
                }, 0);
                const monthlyDailyAverageRevenue = monthlyRevenue / daysInMonth;

                // Daily average active clients: count total user-day interactions divided by daysInMonth
                const uniqueCustomerDays = new Set(monthOrders.map(o => `${getNormalizedOrderDate(o.date)}_${o.customerName}`));
                const monthlyDailyAverageClients = uniqueCustomerDays.size / daysInMonth;

                // Compare selected period's values to the monthly daily average:
                // Normalize according to selected filter
                let normalizedSelectedOrders = totalOrdersCount;
                let normalizedSelectedRevenue = totalPlatformRevenue;
                let normalizedSelectedClients = activeClientsCount;

                if (timeFilter === 'hafta') {
                  normalizedSelectedOrders = totalOrdersCount / 7;
                  normalizedSelectedRevenue = totalPlatformRevenue / 7;
                  normalizedSelectedClients = activeClientsCount / 7;
                } else if (timeFilter === 'oy') {
                  normalizedSelectedOrders = totalOrdersCount / daysInMonth;
                  normalizedSelectedRevenue = totalPlatformRevenue / daysInMonth;
                  normalizedSelectedClients = activeClientsCount / daysInMonth;
                }

                const ordersAvgRatio = monthlyDailyAverageOrders > 0 
                  ? Math.round((normalizedSelectedOrders / monthlyDailyAverageOrders) * 100) 
                  : 100;

                const revenueAvgRatio = monthlyDailyAverageRevenue > 0 
                  ? Math.round((normalizedSelectedRevenue / monthlyDailyAverageRevenue) * 100) 
                  : 100;

                const clientsAvgRatio = monthlyDailyAverageClients > 0 
                  ? Math.round((normalizedSelectedClients / monthlyDailyAverageClients) * 100) 
                  : 100;

                // 7. Order channels
                let phoneOrders = 0;
                let manualOrders = 0;
                let voiceOrders = 0;
                let appOrders = 0;

                filteredOrders.forEach(o => {
                  const src = getOrderSource(o);
                  if (src === 'Ovozli') voiceOrders++;
                  else if (src === 'Yozma') manualOrders++;
                  else if (src === "Qo'ng'iroq qilingan") phoneOrders++;
                  else appOrders++;
                });

                const totalChannelsCount = phoneOrders + manualOrders + voiceOrders + appOrders;

                // 8. Order Types breakdown: fully dynamic
                const categoryStatsMap: Record<string, number> = {};
                filteredOrders.forEach(order => {
                  const store = stores.find(s => s.name === order.storeName);
                  const cat = store ? store.category : "Boshqa";
                  categoryStatsMap[cat] = (categoryStatsMap[cat] || 0) + 1;
                });

                const allCategoriesList = Array.from(new Set([
                  ...stores.map(s => s.category),
                  ...Object.keys(categoryStatsMap)
                ])).filter(Boolean);

                const dynamicTypeStats = allCategoriesList.map(cat => ({
                  name: cat,
                  count: categoryStatsMap[cat] || 0,
                  percent: filteredOrders.length > 0 ? Math.round(((categoryStatsMap[cat] || 0) / filteredOrders.length) * 100) : 0
                })).sort((a, b) => b.count - a.count);

                const totalTypes = filteredOrders.length;

                // 9. Regions/Mahallas breakdown: fully dynamic
                const mahallaStatsMap: Record<string, number> = {};
                filteredOrders.forEach(order => {
                  const m = order.address.mahalla || "Muglon mahallasi";
                  mahallaStatsMap[m] = (mahallaStatsMap[m] || 0) + 1;
                });

                const allMahallasList = Array.from(new Set([
                  ...orders.map(o => o.address.mahalla),
                  ...Object.keys(mahallaStatsMap)
                ])).filter(Boolean);

                const dynamicMahallaStats = allMahallasList.map(mah => ({
                  name: mah,
                  count: mahallaStatsMap[mah] || 0,
                  percent: filteredOrders.length > 0 ? Math.round(((mahallaStatsMap[mah] || 0) / filteredOrders.length) * 100) : 0
                })).sort((a, b) => b.count - a.count);

                const totalRegionsCount = filteredOrders.length;

                // 10. Top 5 Customers: calculated dynamically
                const customerStats: Record<string, { count: number; total: number; phone: string }> = {};
                orders.forEach(o => {
                  const name = o.customerName || "Noma'lum Mijoz";
                  if (!customerStats[name]) {
                    customerStats[name] = { count: 0, total: 0, phone: o.customerPhone || "" };
                  }
                  customerStats[name].count++;
                  customerStats[name].total += o.total;
                });

                const topCustomers = Object.entries(customerStats)
                  .map(([name, val]) => ({ name, ...val }))
                  .sort((a, b) => b.count - a.count)
                  .slice(0, 5);

                // 11. Hamkor do'konlar moliyaviy tahlili (ALL dynamic stores + KasbiGo Market)
                const allDynamicStores = [...stores];
                if (!allDynamicStores.some(s => s.name.toLowerCase().includes('kasbigo market') || s.id === 'kasbigo-market')) {
                  allDynamicStores.unshift({
                    id: 'kasbigo-market',
                    name: 'KasbiGo Market',
                    category: 'Supermarket',
                    products: [],
                    isPartner: true
                  } as any);
                }

                const partnerStoreFinancials = allDynamicStores.map(store => {
                  const isKasbiGoMarket = store.id === 'kasbigo-market' || store.name === 'KasbiGo Market';
                  const storeDeliveredOrders = orders.filter(o => {
                    if (o.status !== 'Yetkazildi') return false;
                    const matchesName = o.storeName === store.name || o.storeName === store.id;
                    const matchesStoresArr = o.stores && (o.stores.includes(store.name) || o.stores.includes(store.id));
                    const matchesItems = o.items && o.items.some(item => item.storeName === store.name || item.product?.storeId === store.id);
                    const isUnassigned = isKasbiGoMarket && (!o.storeName || o.storeName === 'KasbiGo Maxsus Xizmati' || !stores.some(s => s.name === o.storeName || s.id === o.storeName));
                    return matchesName || matchesStoresArr || matchesItems || isUnassigned;
                  });

                  const totalVolume = storeDeliveredOrders.reduce((sum, o) => {
                    let productCost = 0;
                    if (o.items && o.items.length > 0) {
                      const storeItems = o.items.filter(item => 
                        item.storeName === store.name || 
                        item.product?.storeId === store.id || 
                        (!item.storeName && (o.storeName === store.name || o.storeName === store.id))
                      );
                      if (storeItems.length > 0) {
                        productCost = storeItems.reduce((acc, item) => acc + ((item.product?.price || 0) * item.quantity), 0);
                      } else {
                        productCost = o.items.reduce((acc, item) => acc + ((item.product?.price || 0) * item.quantity), 0);
                      }
                    } else {
                      productCost = Math.max(0, o.total - (o.deliveryFee || 0) - (o.extraStopsFee || 0));
                    }
                    return sum + productCost;
                  }, 0);
                  
                  const commRate = storeCommissions[store.id] !== undefined 
                    ? storeCommissions[store.id] 
                    : (storeCommissions[store.name] !== undefined ? storeCommissions[store.name] : 5);
                  
                  const storePayoutRate = 100 - commRate;
                  const platformCommission = Math.round(totalVolume * (commRate / 100));
                  const storePayout = totalVolume - platformCommission;

                  return {
                    id: store.id,
                    name: store.name,
                    category: store.category,
                    ordersCount: storeDeliveredOrders.length,
                    totalVolume,
                    commRate,
                    storePayoutRate,
                    storePayout,
                    platformCommission,
                    productsCount: store.products ? store.products.length : 0
                  };
                }).sort((a, b) => b.totalVolume - a.totalVolume);

                return (
                  <div className="space-y-6">
                    
                    {/* Time & Calendar Selector Header */}
                    <div className={`flex flex-col lg:flex-row lg:items-center lg:justify-between p-5 rounded-2xl gap-4 shadow-md border ${isAdminDarkMode ? 'bg-[#0F172A] border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-800'}`}>
                      <div>
                        <h3 className={`text-sm font-extrabold flex items-center gap-2 ${isAdminDarkMode ? 'text-white' : 'text-slate-900'}`}>
                          <Activity className="h-4 w-4 text-blue-500" />
                          Kasbi Analytics Dashboard
                        </h3>
                        <p className={`text-[10px] mt-1 ${isAdminDarkMode ? 'text-slate-400' : 'text-slate-500 font-medium'}`}>Real-vaqt rejimida barcha panellardan integratsiyalashgan haqiqiy ma'lumotlar tahlili</p>
                      </div>

                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                        {/* Interactive Calendar Select */}
                        <div className={`flex items-center space-x-2 p-2 rounded-xl border px-3 ${isAdminDarkMode ? 'bg-slate-950 border-slate-850' : 'bg-slate-50 border-slate-200'}`}>
                          <Calendar className="h-3.5 w-3.5 text-blue-500" />
                          <span className={`text-[10px] font-bold uppercase ${isAdminDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>Kun:</span>
                          <input 
                            type="date"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            className={`${isAdminDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900 font-bold'} border rounded-lg text-[10px] px-2 py-1 focus:outline-none focus:border-blue-500 font-mono`}
                          />
                          <button 
                            onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
                            className="text-[9px] font-black uppercase text-blue-500 hover:text-blue-600 ml-1.5 cursor-pointer"
                          >
                            Bugun
                          </button>
                        </div>

                        {/* Period Filter Buttons */}
                        <div className={`flex p-1 rounded-xl border text-[10px] font-black uppercase tracking-wider ${isAdminDarkMode ? 'bg-slate-950 border-slate-850' : 'bg-slate-100 border-slate-200'}`}>
                          <button
                            onClick={() => setTimeFilter('bugun')}
                            className={`py-1.5 px-3 rounded-lg transition-all cursor-pointer ${timeFilter === 'bugun' ? 'bg-blue-500 text-white font-black shadow-lg shadow-blue-500/10' : isAdminDarkMode ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'}`}
                          >
                            Tanlangan kun
                          </button>
                          <button
                            onClick={() => setTimeFilter('hafta')}
                            className={`py-1.5 px-3 rounded-lg transition-all cursor-pointer ${timeFilter === 'hafta' ? 'bg-blue-500 text-white font-black shadow-lg shadow-blue-500/10' : isAdminDarkMode ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'}`}
                          >
                            Shu hafta
                          </button>
                          <button
                            onClick={() => setTimeFilter('oy')}
                            className={`py-1.5 px-3 rounded-lg transition-all cursor-pointer ${timeFilter === 'oy' ? 'bg-blue-500 text-white font-black shadow-lg shadow-blue-500/10' : isAdminDarkMode ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'}`}
                          >
                            Shu oy
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Integrated Key Metrics Rows */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      
                      {/* Metric 1: Total Orders */}
                      <div className={`p-5 rounded-2xl border flex flex-col justify-between shadow-lg relative overflow-hidden group hover:border-blue-500/30 transition-all ${isAdminDarkMode ? 'bg-[#0F172A] border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-800 shadow-sm'}`}>
                        <div className="absolute top-0 right-0 h-24 w-24 bg-blue-500/5 blur-[40px] pointer-events-none rounded-full" />
                        <div className="flex justify-between items-start">
                          <span className={`text-[9px] font-extrabold uppercase tracking-wider block ${isAdminDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Umumiy Buyurtmalar</span>
                          <span className="bg-blue-500/10 text-blue-500 text-[9px] font-black px-2 py-0.5 rounded border border-blue-500/20">
                            oylik o'rtachaga nisbatan: {ordersAvgRatio}%
                          </span>
                        </div>
                        <span className={`text-2xl md:text-3xl font-black font-mono mt-3 block ${isAdminDarkMode ? 'text-white' : 'text-slate-900'}`}>
                          {totalOrdersCount} ta
                        </span>
                        <span className={`text-[9px] mt-2 font-bold block ${isAdminDarkMode ? 'text-slate-500' : 'text-slate-500'}`}>Tanlangan davr bo'yicha integrallashgan buyurtmalar jami</span>
                      </div>

                      {/* Metric 2: Daromad (Tushum) */}
                      <div className={`p-5 rounded-2xl border flex flex-col justify-between shadow-lg relative overflow-hidden group hover:border-emerald-500/30 transition-all ${isAdminDarkMode ? 'bg-[#0F172A] border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-800 shadow-sm'}`}>
                        <div className="absolute top-0 right-0 h-24 w-24 bg-emerald-500/5 blur-[40px] pointer-events-none rounded-full" />
                        <div className="flex justify-between items-start">
                          <span className={`text-[9px] font-extrabold uppercase tracking-wider block ${isAdminDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Daromad (Tushum)</span>
                          <span className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[9px] font-black px-2 py-0.5 rounded border border-emerald-500/20">
                            oylik o'rtachaga nisbatan: {revenueAvgRatio}%
                          </span>
                        </div>
                        <span className="text-2xl md:text-3xl font-black text-emerald-600 dark:text-emerald-400 font-mono mt-3 block">
                          {totalPlatformRevenue.toLocaleString('uz-UZ')} so'm
                        </span>
                        <span className={`text-[9px] mt-2 font-bold block ${isAdminDarkMode ? 'text-slate-500' : 'text-slate-500'}`}>Kuryerdan yechilgan: {deductedFromCourier.toLocaleString('uz-UZ')} so'm + Do'kondan komissiya: {storeCommission.toLocaleString('uz-UZ')} so'm = Jami: {totalPlatformRevenue.toLocaleString('uz-UZ')} so'm</span>
                      </div>

                      {/* Metric 3: Active Clients */}
                      <div className={`p-5 rounded-2xl border flex flex-col justify-between shadow-lg relative overflow-hidden group hover:border-indigo-500/30 transition-all ${isAdminDarkMode ? 'bg-[#0F172A] border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-800 shadow-sm'}`}>
                        <div className="absolute top-0 right-0 h-24 w-24 bg-indigo-500/5 blur-[40px] pointer-events-none rounded-full" />
                        <div className="flex justify-between items-start">
                          <span className={`text-[9px] font-extrabold uppercase tracking-wider block ${isAdminDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Bugun ilovadan foydalangan Mijozlar</span>
                          <span className="bg-blue-500/10 text-blue-500 text-[9px] font-black px-2 py-0.5 rounded border border-blue-500/20">
                            oylik o'rtachaga nisbatan: {clientsAvgRatio}%
                          </span>
                        </div>
                        <span className="text-2xl md:text-3xl font-black text-white font-mono mt-3 block">
                          {activeClientsCount} / {newClientsCount} ta
                        </span>
                        <span className="text-[9px] text-slate-500 mt-2 font-bold block">Faol foydalanuvchilar (chapda) / Birinchi marta buyurtma bergan yangi mijozlar (o'ngda)</span>
                      </div>

                    </div>

                    {/* Integrated Breakdown Dashboard Row */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                      {/* Section 1: Order Statuses Breakdown */}
                      <div className={`p-5 rounded-3xl border shadow-xl ${isAdminDarkMode ? 'bg-[#0F172A] border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-800 shadow-sm'}`}>
                        <div className={`flex items-center justify-between border-b pb-3 mb-4 ${isAdminDarkMode ? 'border-slate-800' : 'border-slate-200'}`}>
                          <div className="flex items-center space-x-2">
                            <ClipboardList className="h-4 w-4 text-indigo-500" />
                            <h3 className={`text-xs font-black uppercase tracking-wider ${isAdminDarkMode ? 'text-white' : 'text-slate-900'}`}>Buyurtma Statuslari</h3>
                          </div>
                          <span className={`text-[9px] font-bold uppercase ${isAdminDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Tanlangan kun</span>
                        </div>

                        <div className="space-y-2.5">
                          {[
                            { name: "Yangi", count: statusCounts.Yangi, color: "bg-blue-500", barColor: "from-blue-500 to-sky-500" },
                            { name: "Narx belgilashda", count: statusCounts['Narx belgilashda'], color: "bg-purple-500", barColor: "from-purple-500 to-pink-500" },
                            { name: "Kutishda (Mijoz tasdig'i)", count: statusCounts.Kutishda, color: "bg-amber-500", barColor: "from-amber-500 to-yellow-500" },
                            { name: "Kuryer qidirilmoqda", count: statusCounts['Kuryer qidirilmoqda'], color: "bg-sky-500", barColor: "from-sky-500 to-cyan-500" },
                            { name: "Kuryerda", count: statusCounts.Kuryerda, color: "bg-indigo-500", barColor: "from-indigo-500 to-violet-500" },
                            { name: "Yetkazildi", count: statusCounts.Yetkazildi, color: "bg-emerald-500", barColor: "from-emerald-500 to-teal-500" },
                            { name: "Bekor qilindi", count: statusCounts['Bekor qilindi'], color: "bg-rose-500", barColor: "from-rose-500 to-red-500" }
                          ].map(status => {
                            const percent = totalOrdersCount > 0 ? Math.round((status.count / totalOrdersCount) * 100) : 0;
                            return (
                              <div key={status.name} className="space-y-1">
                                <div className="flex justify-between items-center text-[10px]">
                                  <span className={`font-bold flex items-center gap-1.5 ${isAdminDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                                    <span className={`h-2 w-2 rounded-full ${status.color}`} />
                                    {status.name}
                                  </span>
                                  <span className={`font-mono font-black ${isAdminDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>{status.count} ta ({percent}%)</span>
                                </div>
                                <div className={`w-full rounded-full h-2 overflow-hidden border ${isAdminDarkMode ? 'bg-slate-950 border-slate-850' : 'bg-slate-100 border-slate-200'}`}>
                                  <motion.div 
                                    initial={{ width: 0 }}
                                    animate={{ width: `${percent}%` }}
                                    transition={{ duration: 0.8, ease: "easeOut" }}
                                    className={`bg-gradient-to-r ${status.barColor} h-full rounded-full`} 
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Section 2: Order Channels Breakdown (Phone, Custom, Voice, Standard) */}
                      <div className={`p-5 rounded-3xl border shadow-xl flex flex-col justify-between ${isAdminDarkMode ? 'bg-[#0F172A] border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-800 shadow-sm'}`}>
                        <div>
                          <div className={`flex items-center justify-between border-b pb-3 mb-4 ${isAdminDarkMode ? 'border-slate-800' : 'border-slate-200'}`}>
                            <div className="flex items-center space-x-2">
                              <Sliders className="h-4 w-4 text-blue-500" />
                              <h3 className={`text-xs font-black uppercase tracking-wider ${isAdminDarkMode ? 'text-white' : 'text-slate-900'}`}>Buyurtma Kanallari</h3>
                            </div>
                            <span className={`text-[9px] font-bold font-mono ${isAdminDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Barcha kanallar</span>
                          </div>

                          <div className="space-y-2">
                            {[
                              { name: "📞 Telefon orqali", count: phoneOrders, color: "bg-emerald-500", desc: "Operator kiritgan buyurtmalar" },
                              { name: "✍️ Qo'lda yozilgan", count: manualOrders, color: "bg-blue-500", desc: "Erkin matnli maxsus buyurtmalar" },
                              { name: "🎙️ Ovozli buyurtmalar", count: voiceOrders, color: "bg-amber-500", desc: "Telegram audio integratsiyasi" },
                              { name: "📱 Ilova orqali oddiy", count: appOrders, color: "bg-indigo-500", desc: "Katalogdan standart buyurtmalar" }
                            ].map((channel) => {
                              const pct = totalChannelsCount > 0 ? Math.round((channel.count / totalChannelsCount) * 100) : 0;
                              return (
                                <div key={channel.name} className={`p-2.5 rounded-xl border flex items-center justify-between ${isAdminDarkMode ? 'bg-slate-950/50 border-slate-850' : 'bg-slate-50 border-slate-200'}`}>
                                  <div>
                                    <span className={`text-[10px] font-bold block ${isAdminDarkMode ? 'text-slate-200' : 'text-slate-900'}`}>{channel.name}</span>
                                    <span className={`text-[8px] block ${isAdminDarkMode ? 'text-slate-500' : 'text-slate-500'}`}>{channel.desc}</span>
                                  </div>
                                  <div className="text-right">
                                    <span className={`text-[11px] font-mono font-black block ${isAdminDarkMode ? 'text-white' : 'text-slate-900'}`}>{channel.count} ta</span>
                                    <span className={`text-[8px] font-bold block ${isAdminDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{pct}%</span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        <div className={`mt-4 pt-3 border-t flex justify-between items-center text-[10px] ${isAdminDarkMode ? 'border-slate-850 text-slate-400' : 'border-slate-200 text-slate-600'}`}>
                          <span>Jami faol kanallar:</span>
                          <span className={`font-mono font-black ${isAdminDarkMode ? 'text-white' : 'text-slate-900'}`}>{totalChannelsCount} ta buyurtma</span>
                        </div>
                      </div>

                    </div>

                    {/* Chart & Diagram Layout */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      
                      {/* Chart 1: Order Types Breakdown (Fully Dynamic Categories) */}
                      <div className="bg-[#0F172A] border border-slate-800 rounded-3xl p-5 shadow-xl relative">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
                          <div className="flex items-center space-x-2">
                            <Activity className="h-4 w-4 text-blue-400" />
                            <h3 className="text-xs font-black text-white uppercase tracking-wider">Do'kon turlari bo'yicha tahlil</h3>
                          </div>
                          <span className="text-[9px] text-slate-400 font-bold font-mono">Barcha do'konlar</span>
                        </div>

                        <div className="space-y-4 max-h-56 overflow-y-auto scrollbar-thin pr-1">
                          {dynamicTypeStats.length === 0 ? (
                            <div className="text-center py-10 text-[10px] text-slate-500">Ushbu davrda buyurtmalar mavjud emas.</div>
                          ) : (
                            dynamicTypeStats.map((category, idx) => {
                              const barColors = [
                                'from-emerald-500 to-teal-500',
                                'from-blue-500 to-indigo-500',
                                'from-amber-500 to-orange-500',
                                'from-indigo-500 to-purple-500',
                                'from-rose-500 to-red-500'
                              ];
                              const colorIndex = idx % barColors.length;
                              return (
                                <div key={category.name} className="space-y-1">
                                  <div className="flex justify-between items-center text-[11px]">
                                    <span className="font-bold text-slate-300">📦 {category.name}</span>
                                    <span className="font-mono text-slate-400 font-bold">{category.count} ta ({category.percent}%)</span>
                                  </div>
                                  <div className="w-full bg-slate-950 rounded-full h-3 overflow-hidden border border-slate-850">
                                    <motion.div 
                                      initial={{ width: 0 }}
                                      animate={{ width: `${category.percent}%` }}
                                      transition={{ duration: 0.8, ease: "easeOut" }}
                                      className={`bg-gradient-to-r ${barColors[colorIndex]} h-full rounded-full`} 
                                    />
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>

                        <div className="mt-4 pt-3 border-t border-slate-850 flex justify-between items-center text-[10px] text-slate-400">
                          <span>Katalog bo'yicha jami turlar:</span>
                          <span className="font-mono text-white font-black">{totalTypes} ta buyurtma</span>
                        </div>
                      </div>

                      {/* Chart 2: Regional Order Analysis (Mahallalar kesimida rivojlangan) */}
                      <div className="bg-[#0F172A] border border-slate-800 rounded-3xl p-5 shadow-xl relative">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
                          <div className="flex items-center space-x-2">
                            <MapPin className="h-4 w-4 text-emerald-400" />
                            <h3 className="text-xs font-black text-white uppercase tracking-wider">Hududlar tahlili (Mahallalar kesimida)</h3>
                          </div>
                          <span className="text-[9px] text-slate-400 font-bold font-mono">Kasbi mahallalari</span>
                        </div>

                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 h-56">
                          
                          <div className="w-full sm:w-1/2 flex items-center justify-center relative h-36">
                            <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 42 42">
                              <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="#090D1A" strokeWidth="3" />
                              
                              {(() => {
                                let offset = 0;
                                return dynamicMahallaStats.map((mahalla, idx) => {
                                  const percentage = totalRegionsCount > 0 ? (mahalla.count / totalRegionsCount) * 100 : 0;
                                  const strokeColors = ['#10b981', '#3b82f6', '#f59e0b', '#6366f1', '#a855f7', '#ec4899', '#14b8a6'];
                                  const strokeColor = strokeColors[idx % strokeColors.length];
                                  const dashArray = `${percentage} ${100 - percentage}`;
                                  const dashOffset = 100 - offset;
                                  offset += percentage;

                                  return (
                                    <circle
                                      key={mahalla.name}
                                      cx="21"
                                      cy="21"
                                      r="15.915"
                                      fill="transparent"
                                      stroke={strokeColor}
                                      strokeWidth="4"
                                      strokeDasharray={dashArray}
                                      strokeDashoffset={dashOffset}
                                      className="transition-all duration-1000"
                                    />
                                  );
                                });
                              })()}
                            </svg>
                            <div className="absolute flex flex-col items-center">
                              <span className="text-[9px] text-slate-500 font-bold uppercase">Jami</span>
                              <span className="text-xs font-black text-white font-mono">{totalRegionsCount} ta</span>
                            </div>
                          </div>

                          <div className="w-full sm:w-1/2 space-y-2 overflow-y-auto max-h-48 scrollbar-thin pr-1">
                            {dynamicMahallaStats.map((mahalla, idx) => {
                              const dotColors = ['bg-emerald-500', 'bg-blue-500', 'bg-amber-500', 'bg-indigo-500', 'bg-purple-500', 'bg-pink-500', 'bg-teal-500'];
                              const dotColor = dotColors[idx % dotColors.length];
                              return (
                                <div key={mahalla.name} className="flex items-center justify-between text-[9.5px]">
                                  <div className="flex items-center space-x-1.5 truncate max-w-[110px]">
                                    <span className={`h-2 w-2 rounded-full flex-shrink-0 ${dotColor}`} />
                                    <span className="font-bold text-slate-300 truncate" title={mahalla.name}>{mahalla.name}</span>
                                  </div>
                                  <span className="font-mono text-white font-bold flex-shrink-0">{mahalla.count} ta ({mahalla.percent}%)</span>
                                </div>
                              );
                            })}
                          </div>

                        </div>
                      </div>

                    </div>

                    {/* Detailed Grids */}
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                      
                      {/* Panel 1: Top Customers (Dynamically Computed top 5) */}
                      <div className="bg-[#0F172A] border border-slate-800 rounded-3xl p-5 shadow-xl">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
                          <div className="flex items-center space-x-2">
                            <Users className="h-4 w-4 text-blue-400" />
                            <h3 className="text-xs font-black text-white uppercase tracking-wider">Eng ko'p buyurtma beruvchilar</h3>
                          </div>
                          <span className="text-[8px] font-black bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded uppercase">TOP 5 (Real)</span>
                        </div>

                        <div className="space-y-3">
                          {topCustomers.length === 0 ? (
                            <div className="text-center py-10 text-[10px] text-slate-500">Mijozlar buyurtmalari mavjud emas.</div>
                          ) : (
                            topCustomers.map((cust, idx) => (
                              <div key={cust.name} className="flex items-center justify-between bg-slate-950/40 p-2.5 rounded-xl border border-slate-850">
                                <div className="flex items-center space-x-2">
                                  <span className="text-xs font-mono font-black text-blue-400 bg-blue-500/10 h-6 w-6 rounded-lg flex items-center justify-center">
                                    #{idx + 1}
                                  </span>
                                  <div>
                                    <span className="text-xs font-bold text-slate-200 block leading-tight">{cust.name}</span>
                                    <span className="text-[9px] text-slate-500 block font-mono">{cust.phone}</span>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <span className="text-[10px] text-white block font-mono font-black">{cust.count} marta</span>
                                  <span className="text-[9px] text-emerald-400 block font-mono font-bold">{cust.total.toLocaleString('uz-UZ')} so'm</span>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>

                      {/* Panel 2: Hamkor Do'konlar Moliyaviy Statistikasi */}
                      <div className="bg-[#0F172A] border border-slate-800 rounded-3xl p-5 shadow-xl">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
                          <div className="flex items-center space-x-2">
                            <ShoppingBag className="h-4 w-4 text-blue-400" />
                            <h3 className="text-xs font-black text-white uppercase tracking-wider">Hamkor do'konlar moliyaviy tahlili</h3>
                          </div>
                          <span className="text-[8px] font-black bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded uppercase">Komissiyalar</span>
                        </div>

                        <div className="space-y-3 overflow-y-auto max-h-64 scrollbar-thin">
                          {partnerStoreFinancials.map((store) => (
                            <div key={store.name} className="flex flex-col bg-slate-950/40 p-3 rounded-xl border border-slate-850 space-y-2">
                              <div className="flex justify-between items-start">
                                <div>
                                  <span className="text-xs font-bold text-slate-200 block leading-tight">{store.name}</span>
                                  <div className="flex items-center space-x-2 text-[8px] text-slate-500 mt-0.5">
                                    <span className="font-bold text-slate-400 uppercase">{store.category}</span>
                                    <span>•</span>
                                    <span>{store.productsCount} mahsulot</span>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <span className="text-[10px] text-white block font-mono font-black">{store.ordersCount} buyurtma</span>
                                  <span className="text-[10px] text-emerald-400 block font-mono font-bold">+{store.totalVolume.toLocaleString('uz-UZ')} so'm</span>
                                </div>
                              </div>
                              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-900 text-[8.5px] font-mono">
                                <div className="bg-slate-950 p-2 rounded-xl border border-slate-900 flex flex-col justify-between">
                                  <span className="text-slate-500 block">Do'kon ulushi ({store.storePayoutRate}%):</span>
                                  <span className="text-white font-bold block mt-0.5 text-[10px]">{store.storePayout.toLocaleString('uz-UZ')} so'm</span>
                                </div>
                                <div className="bg-slate-950 p-2 rounded-xl border border-slate-900 flex flex-col justify-between">
                                  <div className="flex items-center justify-between">
                                    <span className="text-slate-400 block font-bold">Komissiya (%):</span>
                                    <div className="flex items-center space-x-1">
                                      <input
                                        type="number"
                                        min="0"
                                        max="100"
                                        value={store.commRate}
                                        onChange={(e) => {
                                          const val = parseFloat(e.target.value) || 0;
                                          handleUpdateStoreCommission(store.id || store.name, val);
                                        }}
                                        className="w-12 bg-slate-900 border border-slate-800 text-blue-400 font-black text-center text-[10px] rounded px-1 py-0.5 focus:outline-none focus:border-blue-500"
                                      />
                                      <span className="text-blue-400 font-bold">%</span>
                                    </div>
                                  </div>
                                  <span className="text-blue-400 font-black block mt-1 text-[10px]">{store.platformCommission.toLocaleString('uz-UZ')} so'm</span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                    </div>

                  </div>
                );
              })()}
            </div>
          )}

          {activeTab === 'map' && (
            <AdminMap
              orders={orders}
              stores={stores}
              courierName={courierName}
              isCourierOnline={isCourierOnline}
              courierPhone={courierPhone}
              courierCoords={courierCoords}
            />
          )}

          {/* ================= TAB: LIVE ORDER DISPATCHER ================= */}
          {activeTab === 'orders' && (
            <div className="space-y-4">
              
              {!isCreatingNewOrder && (
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-[#0F172A] border border-slate-800 rounded-2xl p-4 gap-3">
                  <div className="flex items-center space-x-2.5">
                    <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl">
                      <Phone className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-xs font-black text-white uppercase tracking-wider">Telefon orqali buyurtmalar</h3>
                      <p className="text-[10px] text-slate-500 font-bold">Admin/Operator tomonidan qo'lda buyurtma yozish va kiritish</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setIsCreatingNewOrder(true);
                      setNewOrderCustName('');
                      setNewOrderCustPhone('');
                      setNewOrderCustMahalla('');
                      setNewOrderCustComment('');
                      setNewOrderDeliveryCoords(null);
                      setNewOrderPayMethod('Naqd');
                      setNewOrderCartItems([]);
                      setNewOrderSearchQuery('');
                      setNewOrderCustomItemName('');
                      setNewOrderCustomItemPrice('');
                      setNewOrderCustomItemQty('1');
                    }}
                    className="bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black text-xs uppercase tracking-wider py-3 px-6 rounded-2xl transition-all shadow-lg hover:shadow-emerald-500/20 active:scale-95 flex items-center space-x-2 cursor-pointer border-none w-full md:w-auto justify-center"
                  >
                    <Plus className="h-5 w-5 shrink-0" />
                    <span>Yangi Buyurtma Yaratish</span>
                  </button>
                </div>
              )}

              {isCreatingNewOrder ? (
                <div className="bg-white border-2 border-emerald-400/80 rounded-3xl p-6 shadow-2xl space-y-6 text-slate-900 relative overflow-hidden">
                  {/* Neon Top Bar Accent */}
                  <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-emerald-500 via-teal-400 to-indigo-600" />

                  {/* ================= YANGI BUYURTMA YARATISH OYNCHASI ================= */}
                  {/* Header */}
                  <div className="flex items-center justify-between border-b border-slate-200 pb-4 pt-1">
                    <div className="flex items-center space-x-3">
                      <span className="p-3 bg-gradient-to-tr from-emerald-500 to-teal-400 text-white rounded-2xl shadow-md shadow-emerald-500/30">
                        <Phone className="h-6 w-6" />
                      </span>
                      <div>
                        <h3 className="text-base font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                          <span>📞 TELEFON ORQALI YANGI BUYURTMA YARATISH</span>
                          <span className="bg-emerald-100 text-emerald-800 text-[10px] px-2.5 py-0.5 rounded-full border border-emerald-300 font-extrabold">LIVE DISPATCH</span>
                        </h3>
                        <p className="text-xs text-slate-500 font-extrabold mt-0.5">Operator/Admin boshqaruvi orqali savat yig'ish, manzil va lokatsiya belgilash</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsCreatingNewOrder(false)}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer shadow-xs active:scale-95"
                    >
                      ◀ Ortga qaytish
                    </button>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Left Column: Customer details & Order Info */}
                    <div className="bg-slate-50 border-2 border-slate-200 p-5 rounded-2xl space-y-4 shadow-xs">
                      <span className="text-xs font-black text-indigo-900 uppercase tracking-widest block border-b border-slate-200 pb-2 flex items-center justify-between">
                        <span>👤 Mijoz va To'lov Ma'lumotlari</span>
                        <span className="text-[10px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">1-bosqich</span>
                      </span>
                      
                      <div className="space-y-3.5 text-xs">
                        {/* Customer Name */}
                        <div>
                          <label className="text-[10px] text-slate-700 font-extrabold uppercase tracking-wider block mb-1">Mijoz Ismi <span className="text-slate-400 font-normal">(Ixtiyoriy)</span></label>
                          <input
                            type="text"
                            value={newOrderCustName}
                            onChange={(e) => setNewOrderCustName(e.target.value)}
                            placeholder="Masalan: Elyorbek Nazarov (kiritish shart emas)"
                            className="w-full bg-white border border-slate-300 rounded-xl py-2.5 px-3.5 text-slate-900 font-bold placeholder-slate-400 focus:outline-none focus:border-emerald-500 text-xs font-sans"
                          />
                        </div>

                        {/* Customer Phone */}
                        <div>
                          <label className="text-[10px] text-slate-700 font-extrabold uppercase tracking-wider block mb-1">Mijoz Telefoni <span className="text-rose-500">*</span></label>
                          <PhoneInput
                            value={newOrderCustPhone}
                            onChange={(val) => setNewOrderCustPhone(val)}
                            className="w-full bg-white border border-slate-300 rounded-xl py-2.5 px-3.5 text-slate-900 font-mono font-bold placeholder-slate-400 focus:outline-none focus:border-emerald-500 text-xs"
                          />
                        </div>

                        {/* Customer Mahalla */}
                        <div>
                          <label className="text-[10px] text-slate-700 font-extrabold uppercase tracking-wider block mb-1">
                            Yetkazish Manzili (Mahalla, Ko'cha, Uy) <span className="text-rose-600">* (Majburiy mahalla)</span>
                          </label>
                          <input
                            type="text"
                            list="admin-mahallas-datalist"
                            value={newOrderCustMahalla}
                            onChange={(e) => setNewOrderCustMahalla(e.target.value)}
                            placeholder="Mahallani tanlang yoki kiritishni boshlang..."
                            className="w-full bg-white border border-slate-300 rounded-xl py-2.5 px-3.5 text-slate-900 font-bold placeholder-slate-400 focus:outline-none focus:border-emerald-500 text-xs"
                          />
                          <datalist id="admin-mahallas-datalist">
                            {(Array.from(new Set(zonesList.flatMap(z => z.mahallas))) as string[]).map((m, idx) => (
                              <option key={`admin-m-${m}-${idx}`} value={m} />
                            ))}
                          </datalist>
                        </div>

                        {/* Customer Comment */}
                        <div>
                          <label className="text-[10px] text-slate-700 font-extrabold uppercase tracking-wider block mb-1">Qo'shimcha izoh yoki Mo'ljal</label>
                          <input
                            type="text"
                            value={newOrderCustComment}
                            onChange={(e) => setNewOrderCustComment(e.target.value)}
                            placeholder="Masalan: Maktab yonidagi 2-darvoza"
                            className="w-full bg-white border border-slate-300 rounded-xl py-2.5 px-3.5 text-slate-900 font-bold placeholder-slate-400 focus:outline-none focus:border-emerald-500 text-xs"
                          />
                        </div>

                        {/* Map Location Picker */}
                        <DeliveryLocationPickerMap
                          coords={newOrderDeliveryCoords}
                          onChange={setNewOrderDeliveryCoords}
                        />

                        {/* Order Category Selection */}
                        <div>
                          <label className="text-[10px] text-slate-700 font-extrabold uppercase tracking-wider block mb-1">
                            Buyurtma Toifasi (Kategoriya) <span className="text-rose-600">* (MAJBURIY)</span>
                          </label>
                          <select
                            value={newOrderCategory}
                            onChange={(e) => {
                              const cat = e.target.value;
                              setNewOrderCategory(cat);
                              const totalSum = newOrderCartItems.reduce((sum, ci) => sum + (ci.product.price * ci.quantity), 0);
                              if (!isCashPaymentAllowed(cat, totalSum, cashlessLimit)) {
                                setNewOrderPayMethod('Online');
                              }
                            }}
                            className="w-full bg-white border border-slate-300 rounded-xl py-2 px-3 text-slate-900 font-bold focus:outline-none focus:border-emerald-500 text-xs"
                          >
                            <option value="">-- Buyurtma toifasini tanlang (Majburiy) --</option>
                            <option value="Market">Market</option>
                            <option value="Dorixona">Dorixona</option>
                            <option value="Fast Food">Fast Food</option>
                            <option value="Oshxona">Oshxona</option>
                            <option value="Restoran">Restoran</option>
                            <option value="Ichimliklar">Ichimliklar</option>
                            <option value="Gullar">Gullar</option>
                            <option value="Boshqalar">Boshqalar</option>
                          </select>
                        </div>

                        {/* Pickup Points Count Input - Requirement 6 */}
                        <div className="p-2.5 bg-amber-50/60 border border-amber-200/80 rounded-xl space-y-1">
                          <div className="flex justify-between items-center text-xs">
                            <label className="text-[10px] text-amber-900 font-extrabold uppercase tracking-wider block">
                              📍 Olish nuqtalari soni (Do'konlar)
                            </label>
                            <span className="text-[10px] text-purple-700 font-extrabold">
                              +{(Math.max(0, newOrderPickupPointsCount - 1) * extraStopFee).toLocaleString('uz-UZ')} so'm
                            </span>
                          </div>
                          <div className="flex items-center space-x-2 pt-1">
                            <span className="text-[10px] text-slate-600 font-bold">Nuqtalar soni:</span>
                            <input
                              type="number"
                              min={1}
                              value={newOrderPickupPointsCount}
                              onChange={(e) => setNewOrderPickupPointsCount(Math.max(1, parseInt(e.target.value) || 1))}
                              className="w-24 bg-white border border-amber-300 rounded-lg p-1.5 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-amber-500"
                            />
                            <span className="text-[9px] text-slate-500 italic font-medium">
                              (1-nuqtadan boshqalariga +{extraStopFee.toLocaleString('uz-UZ')} so'm/nuqta)
                            </span>
                          </div>
                        </div>

                        {/* Payment Method */}
                        {(() => {
                          const manualOrderTotal = newOrderCartItems.reduce((sum, ci) => sum + (ci.product.price * ci.quantity), 0);
                          const isCashAllowedForManual = isCashPaymentAllowed(newOrderCategory, manualOrderTotal, cashlessLimit);

                          return (
                            <div>
                              <label className="text-[10px] text-slate-700 font-extrabold uppercase tracking-wider block mb-1.5">To'lov Turi</label>
                              {!isCashAllowedForManual ? (
                                <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-center space-y-1">
                                  <span className="text-[10px] font-black text-rose-700 uppercase block">
                                    🚨 Fast Food / Oshxona yoki {cashlessLimit.toLocaleString()} UZS dan yuqori summa uchun faqat Onlayn to'lov
                                  </span>
                                  <span className="text-[9px] text-slate-600 font-bold block">To'lov usuli: 💳 Onlayn (Karta)</span>
                                </div>
                              ) : (
                                <div className="grid grid-cols-2 gap-2.5">
                                  {[
                                    { id: 'Naqd', label: '💵 Naqd Pul' },
                                    { id: 'Online', label: '💳 Onlayn (Karta)' }
                                  ].map(method => (
                                    <button
                                      key={method.id}
                                      type="button"
                                      onClick={() => setNewOrderPayMethod(method.id as any)}
                                      className={`py-2 px-3.5 rounded-xl border font-black text-[10px] uppercase tracking-wider transition-all cursor-pointer ${
                                        newOrderPayMethod === method.id
                                          ? 'bg-emerald-600 border-emerald-600 text-white font-black shadow-xs'
                                          : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                                      }`}
                                    >
                                      {method.label}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                    </div>

                    {/* Right Column: Search & Add Products */}
                    <div className="bg-white border border-slate-200 p-5 rounded-2xl flex flex-col space-y-4 shadow-xs">
                      <span className="text-[10px] font-black text-indigo-800 uppercase tracking-widest block border-b border-slate-100 pb-2">🛍️ Savatga mahsulot yig'ish</span>
                      
                      <div className="grid grid-cols-2 gap-2.5">
                        {/* Store filter */}
                        <div>
                          <label className="text-[9px] text-slate-600 font-extrabold uppercase tracking-wider block mb-1">Do'kon bo'yicha filter:</label>
                          <select
                            value={newOrderSelectedStore}
                            onChange={(e) => setNewOrderSelectedStore(e.target.value)}
                            className="w-full bg-white border border-slate-300 rounded-lg p-1.5 text-[10px] font-black text-slate-900 focus:outline-none focus:border-emerald-500"
                          >
                            <option value="all">🏪 Barcha hamkorlar</option>
                            {stores.map(st => (
                              <option key={st.id} value={st.id}>{st.name}</option>
                            ))}
                          </select>
                        </div>

                        {/* Search input */}
                        <div>
                          <label className="text-[9px] text-slate-600 font-extrabold uppercase tracking-wider block mb-1">Qidiruv kalit so'zi:</label>
                          <input
                            type="text"
                            value={newOrderSearchQuery}
                            onChange={(e) => setNewOrderSearchQuery(e.target.value)}
                            placeholder="Coca cola, Non..."
                            className="w-full bg-white border border-slate-300 rounded-lg p-1.5 text-[10px] font-bold text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-500"
                          />
                        </div>
                      </div>

                      {/* Display searched products */}
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 max-h-40 overflow-y-auto space-y-2">
                        {(() => {
                          const queried = stores.flatMap(store => 
                            store.products.map(product => ({
                              product,
                              storeId: store.id,
                              storeName: store.name
                            }))
                          ).filter(item => {
                            const storeMatches = newOrderSelectedStore === 'all' || item.storeId === newOrderSelectedStore;
                            const searchMatches = !newOrderSearchQuery || item.product.name.toLowerCase().includes(newOrderSearchQuery.toLowerCase());
                            return storeMatches && searchMatches;
                          });

                          if (queried.length === 0) {
                            return <div className="text-center py-6 text-[10px] text-slate-500 font-bold">Qidiruv bo'yicha mahsulot topilmadi.</div>;
                          }

                          return queried.map((item) => (
                            <div key={`${item.storeId}-${item.product.id}`} className="flex items-center justify-between bg-white p-2 rounded-lg border border-slate-200 text-xs shadow-2xs">
                              <div className="flex items-center space-x-2">
                                {renderSafeProductImage(item.product.image)}
                                <div>
                                  <span className="font-extrabold text-slate-900 block text-[11px] leading-tight">{item.product.name}</span>
                                  <span className="text-[9px] text-slate-500 font-mono font-bold">{item.storeName} • {item.product.price.toLocaleString('uz-UZ')} UZS</span>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  setNewOrderCartItems(prev => {
                                    const existingIndex = prev.findIndex(ci => ci.product.id === item.product.id);
                                    if (existingIndex > -1) {
                                      const updated = [...prev];
                                      updated[existingIndex] = {
                                        ...updated[existingIndex],
                                        quantity: updated[existingIndex].quantity + 1
                                      };
                                      return updated;
                                    }
                                    return [...prev, {
                                      product: item.product,
                                      quantity: 1,
                                      storeId: item.storeId,
                                      storeName: item.storeName
                                    }];
                                  });
                                  showToast(`${item.product.name} qo'shildi! ➕`);
                                }}
                                className="bg-emerald-50 hover:bg-emerald-600 hover:text-white text-emerald-700 border border-emerald-300 py-1 px-2.5 rounded font-black text-[9px] uppercase tracking-wider transition-all cursor-pointer"
                              >
                                ➕ Qo'shish
                              </button>
                            </div>
                          ));
                        })()}
                      </div>

                      {/* Manual / Hand-written custom item entry */}
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2 text-xs">
                        <span className="text-[9px] font-black text-amber-700 uppercase tracking-widest block">✍️ Qo'lda yozib mahsulot qo'shish:</span>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                          <input
                            type="text"
                            value={newOrderCustomItemName}
                            onChange={(e) => setNewOrderCustomItemName(e.target.value)}
                            placeholder="Mahsulot nomi"
                            className="bg-white border border-slate-300 rounded px-2.5 py-1.5 text-[10px] font-bold text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-500"
                          />
                          <input
                            type="number"
                            value={newOrderCustomItemPrice}
                            onChange={(e) => setNewOrderCustomItemPrice(e.target.value)}
                            placeholder="Narxi (so'm)"
                            className="bg-white border border-slate-300 rounded px-2.5 py-1.5 text-[10px] font-bold text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-500"
                          />
                          <input
                            type="number"
                            value={newOrderCustomItemQty}
                            onChange={(e) => setNewOrderCustomItemQty(e.target.value)}
                            placeholder="Soni"
                            className="bg-white border border-slate-300 rounded px-2.5 py-1.5 text-[10px] font-bold text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-500"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            if (!newOrderCustomItemName.trim()) {
                              showToast("Xato: Mahsulot nomi bo'sh bo'lmasligi kerak!");
                              return;
                            }
                            const priceNum = parseInt(newOrderCustomItemPrice);
                            if (isNaN(priceNum) || priceNum < 0) {
                              showToast("Xato: Narxni to'g'ri kiriting!");
                              return;
                            }
                            const qtyNum = parseInt(newOrderCustomItemQty);
                            if (isNaN(qtyNum) || qtyNum <= 0) {
                              showToast("Xato: Miqdorni to'g'ri kiriting!");
                              return;
                            }

                            const customProduct: Product = {
                              id: `custom-admin-${Date.now()}`,
                              name: newOrderCustomItemName.trim(),
                              price: priceNum,
                              image: '✍️',
                              description: "Admin tomonidan qo'lda yozib kiritilgan mahsulot"
                            };

                            setNewOrderCartItems(prev => [...prev, {
                              product: customProduct,
                              quantity: qtyNum,
                              storeId: 'custom-store',
                              storeName: 'KasbiGo Maxsus Xizmati'
                            }]);

                            setNewOrderCustomItemName('');
                            setNewOrderCustomItemPrice('');
                            setNewOrderCustomItemQty('1');
                            showToast(`${customProduct.name} qo'shildi! ✍️`);
                          }}
                          className="w-full bg-amber-500 hover:bg-amber-600 text-white border-none py-2 rounded font-black text-[10px] uppercase tracking-wider transition-all cursor-pointer shadow-xs"
                        >
                          ➕ Qo'lda qo'shish
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Savat / Chosen Basket Summary */}
                  <div className="bg-white border border-slate-200 p-5 rounded-2xl space-y-3.5 shadow-xs">
                    <span className="text-[10px] font-black text-emerald-800 uppercase tracking-widest block border-b border-slate-100 pb-2">🛒 Buyurtmadagi mahsulotlar ro'yxati ({newOrderCartItems.reduce((acc, ci) => acc + ci.quantity, 0)} ta)</span>
                    
                    {newOrderCartItems.length === 0 ? (
                      <div className="text-center py-6 text-[10px] text-slate-500 font-bold">Savatga mahsulot yig'ilmagan. Iltimos, yuqoridagi qidiruv yoki qo'lda yozish oynasidan foydalaning.</div>
                    ) : (
                      <div className="space-y-2">
                        <div className="divide-y divide-slate-100 overflow-y-auto max-h-48">
                          {newOrderCartItems.map((item, idx) => (
                            <div key={`${item.product.id}-${idx}`} className="flex items-center justify-between py-2 text-xs">
                              <div className="flex items-center space-x-2">
                                {renderSafeProductImage(item.product.image)}
                                <div>
                                  <span className="font-extrabold text-slate-900 block">{item.product.name}</span>
                                  <span className="text-[9px] text-slate-500 font-mono font-bold">{item.storeName} • {item.product.price.toLocaleString('uz-UZ')} UZS</span>
                                </div>
                              </div>
                              <div className="flex items-center space-x-3.5">
                                {/* Quantity Adjusters */}
                                <div className="flex items-center bg-slate-100 border border-slate-300 rounded-lg p-0.5 font-mono font-bold text-slate-900 text-[10px]">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setNewOrderCartItems(prev => prev.map((ci, i) => {
                                        if (i === idx) {
                                          return { ...ci, quantity: Math.max(1, ci.quantity - 1) };
                                        }
                                        return ci;
                                      }));
                                    }}
                                    className="px-1.5 py-0.5 hover:bg-slate-200 text-slate-700 hover:text-slate-900 rounded transition-all cursor-pointer border-none bg-transparent font-black"
                                  >
                                    -
                                  </button>
                                  <span className="px-2">{item.quantity}</span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setNewOrderCartItems(prev => prev.map((ci, i) => {
                                        if (i === idx) {
                                          return { ...ci, quantity: ci.quantity + 1 };
                                        }
                                        return ci;
                                      }));
                                    }}
                                    className="px-1.5 py-0.5 hover:bg-slate-200 text-slate-700 hover:text-slate-900 rounded transition-all cursor-pointer border-none bg-transparent font-black"
                                  >
                                    +
                                  </button>
                                </div>

                                <span className="font-mono font-black text-emerald-700 text-xs w-24 text-right">{(item.product.price * item.quantity).toLocaleString('uz-UZ')} so'm</span>
                                
                                <button
                                  type="button"
                                  onClick={() => {
                                    setNewOrderCartItems(prev => prev.filter((_, i) => i !== idx));
                                    showToast(`${item.product.name} savatdan olib tashlandi!`);
                                  }}
                                  className="text-slate-400 hover:text-rose-600 p-1 rounded-lg hover:bg-rose-50 transition-all cursor-pointer border-none bg-transparent"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Grand Total Row */}
                        <div className="flex justify-between items-center pt-3.5 border-t border-slate-200 text-xs font-bold text-slate-700">
                          <span>UMUMIY BUYURTMA SUMMASI:</span>
                          <span className="text-lg font-black font-mono text-emerald-700">
                            {newOrderCartItems.reduce((sum, ci) => sum + (ci.product.price * ci.quantity), 0).toLocaleString('uz-UZ')} so'm
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Create Button Actions */}
                  <div className="flex justify-end space-x-3.5 border-t border-slate-200 pt-4">
                    <button
                      type="button"
                      onClick={() => setIsCreatingNewOrder(false)}
                      className="px-5 py-2.5 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 font-black text-[10px] uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-xs"
                    >
                      Bekor qilish
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const finalCustomerName = newOrderCustName.trim() || "Mijoz";
                        if (!newOrderCustPhone.trim()) {
                          showToast("Xato: Mijoz telefoni majburiy!");
                          return;
                        }
                        if (!newOrderCustMahalla.trim()) {
                          showToast("Xato: Yetkazish manzili majburiy!");
                          return;
                        }
                        if (!newOrderCategory.trim()) {
                          showToast("⚠️ XATO: Buyurtma toifasi (kategoriya) tanlanmagan!");
                          alert("⚠️ Buyurtma toifasini tanlash majburiy! Iltimos, kategoriyani tanlang.");
                          return;
                        }
                        if (newOrderCartItems.length === 0) {
                          showToast("Xato: Savat bo'sh bo'lmasligi kerak!");
                          return;
                        }

                        const itemsSubtotal = newOrderCartItems.reduce((sum, ci) => sum + (ci.product.price * ci.quantity), 0);
                        
                        // Delivery Zone fee calculation
                        const inputMahalla = newOrderCustMahalla.trim().toLowerCase();
                        const matchedZone = zonesList.find(z => (z.mahallas || []).some(m => m.trim().toLowerCase() === inputMahalla));
                        const baseDeliveryFee = matchedZone ? matchedZone.price : (zonesList[0]?.price || 10000);

                        // Requirement 6: Extra stops calculation based on pickup points count input
                        const extraStopsCount = Math.max(0, newOrderPickupPointsCount - 1);
                        const extraStopsFee = extraStopsCount * extraStopFee;
                        const totalDeliveryFee = baseDeliveryFee + extraStopsFee;

                        const manualTotal = itemsSubtotal + totalDeliveryFee;
                        const isCashAllowed = isCashPaymentAllowed(newOrderCategory, manualTotal, cashlessLimit);
                        const finalPayMethod = isCashAllowed ? newOrderPayMethod : 'Online';

                        const today = new Date();
                        const formattedDate = today.toLocaleDateString('uz-UZ').split('.').reverse().join('-');
                        const id = `#KG-2026-${Math.floor(10000 + Math.random() * 90000)}`;
                        
                        // Requirement B: Naqd pul topshirish is strictly ONLY items subtotal (without delivery fees)
                        const courierDebtAmount = finalPayMethod === 'Naqd' ? itemsSubtotal : undefined;
                        const courierDebtSettled = finalPayMethod === 'Naqd' ? false : undefined;

                        // Requirement 5: Cash orders skip Kutishda stage and auto-transition to Kuryer qidirilmoqda.
                        // Online orders remain in Kutishda stage until receipt/cheque verification by admin.
                        const initialStatus = finalPayMethod === 'Naqd' ? 'Kuryer qidirilmoqda' : 'Kutishda';

                        const newOrderObj: Order = {
                          id,
                          items: [...newOrderCartItems],
                          total: manualTotal,
                          deliveryFee: baseDeliveryFee,
                          extraStopsFee: extraStopsFee,
                          pickupPointsCount: newOrderPickupPointsCount,
                          category: newOrderCategory,
                          storeName: newOrderCartItems[0]?.storeName || "KasbiGo Maxsus Xizmati",
                          address: {
                            mahalla: newOrderCustMahalla.trim(),
                            comment: newOrderCustComment.trim(),
                            latitude: newOrderDeliveryCoords?.latitude,
                            longitude: newOrderDeliveryCoords?.longitude,
                          },
                          customerName: finalCustomerName,
                          customerPhone: newOrderCustPhone.trim(),
                          paymentMethod: finalPayMethod,
                          status: initialStatus,
                          dispatchedAt: finalPayMethod === 'Naqd' ? Date.now() : undefined,
                          isManualDraft: true,
                          isConfirmedByCustomer: finalPayMethod === 'Naqd',
                          date: formattedDate,
                          time: today.toTimeString().split(' ')[0].substring(0, 5),
                          courierDebtAmount,
                          courierDebtSettled,
                        };

                        setOrders(prev => renumberOrders([newOrderObj, ...prev]));
                        setIsCreatingNewOrder(false);
                        setNewOrderPickupPointsCount(1);
                        showToast("Yangi buyurtma muvaffaqiyatli yaratildi! 🚀");
                      }}
                      className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[10px] uppercase tracking-wider rounded-xl transition-all shadow-md active:scale-95 cursor-pointer border-none"
                    >
                      💾 Buyurtmani Saqlash va Chiqish
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {/* Filter controls and Search bar */}
                  <div className={`${th.sectionBg} border ${th.border} rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm`}>
                    
                    {/* Search Bar */}
                    <div className="relative flex-1 max-w-md">
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                        <Search className="h-4 w-4" />
                      </span>
                      <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="ID, Mijoz ismi, do'kon yoki mahalla bo'yicha izlash..."
                        className={`w-full ${th.inputBg} border rounded-xl py-2 pl-9 pr-4 text-xs font-bold focus:outline-none focus:border-emerald-500 font-sans`}
                      />
                    </div>

                    {/* Dropdown Filters: Status, Usul, To'lov turi va Kategoriya */}
                    <div className="flex flex-wrap items-center gap-2">
                      {/* Status Dropdown */}
                      <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className={`${th.inputBg} border rounded-xl py-2 px-3 text-xs font-bold focus:outline-none focus:border-emerald-500 cursor-pointer`}
                      >
                        <option value="all">📌 Status: Barchasi</option>
                        <option value="Yangi">⏳ Yangi</option>
                        <option value="Narx belgilashda">💰 Narx belgilashda</option>
                        <option value="Mijoz tasdiqlashini kutmoqda">📩 Mijoz tasdiqlashini kutmoqda</option>
                        <option value="Kutishda">🕒 Kutishda</option>
                        <option value="Kuryer qidirilmoqda">🔍 Kuryer qidirilmoqda</option>
                        <option value="Kuryerda">🚴 Kuryerda</option>
                        <option value="Yetkazildi">🎉 Yetkazildi</option>
                        <option value="Bekor qilindi">❌ Bekor qilindi</option>
                      </select>

                      {/* Buyurtma Berish Usuli Dropdown */}
                      <select
                        value={methodFilter}
                        onChange={(e) => setMethodFilter(e.target.value)}
                        className={`${th.inputBg} border rounded-xl py-2 px-3 text-xs font-bold focus:outline-none focus:border-emerald-500 cursor-pointer`}
                      >
                        <option value="all">📱 Usul: Barchasi</option>
                        <option value="Savatdan">🛒 Savatdan</option>
                        <option value="Yozma">✍️ Yozma</option>
                        <option value="Ovozli">🎙️ Ovozli</option>
                        <option value="Qo'ng'iroq qilingan">☎️ Qo'ng'iroq qilingan</option>
                      </select>

                      {/* To'lov Turi Dropdown */}
                      <select
                        value={paymentTypeFilter}
                        onChange={(e) => setPaymentTypeFilter(e.target.value)}
                        className={`${th.inputBg} border rounded-xl py-2 px-3 text-xs font-bold focus:outline-none focus:border-emerald-500 cursor-pointer`}
                      >
                        <option value="all">💳 To'lov: Barchasi</option>
                        <option value="Naqd">💵 Naqd</option>
                        <option value="Online">🌐 Onlayn</option>
                      </select>

                      {/* Kategoriya Dropdown */}
                      <select
                        value={categoryFilter}
                        onChange={(e) => setCategoryFilter(e.target.value)}
                        className={`${th.inputBg} border rounded-xl py-2 px-3 text-xs font-bold focus:outline-none focus:border-emerald-500 cursor-pointer`}
                      >
                        <option value="all">🏷️ Kategoriya: Barchasi</option>
                        {(Array.from(new Set(availableCategories)) as string[]).map((cat, idx) => (
                          <option key={`cat-${cat}-${idx}`} value={cat}>{cat}</option>
                        ))}
                      </select>

                      {/* Kuryer Dropdown */}
                      <select
                        value={courierFilter}
                        onChange={(e) => setCourierFilter(e.target.value)}
                        className={`${th.inputBg} border rounded-xl py-2 px-3 text-xs font-bold focus:outline-none focus:border-emerald-500 cursor-pointer`}
                      >
                        <option value="all">🚴 Kuryer: Barchasi</option>
                        <option value="unassigned">⚪ Biriktirilmagan</option>
                        {courierList.map(c => (
                          <option key={`c-flt-${c.id}`} value={c.name}>
                            🚴 {c.name} ({c.phone})
                          </option>
                        ))}
                      </select>

                      {/* Kalendar / Davr tanlash filteri (Requirement 4) */}
                      <div className={`flex items-center space-x-1.5 ${th.inputBg} border rounded-xl py-1.5 px-3 text-xs`}>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider shrink-0 flex items-center space-x-1">
                          <span>📅</span>
                          <span>Davr:</span>
                        </span>
                        <input
                          type="date"
                          value={orderStartDate}
                          onChange={(e) => setOrderStartDate(e.target.value)}
                          className="bg-transparent text-slate-200 text-xs font-bold focus:outline-none cursor-pointer"
                          title="Boshlanish sanasi"
                        />
                        <span className="text-slate-500 font-bold">—</span>
                        <input
                          type="date"
                          value={orderEndDate}
                          onChange={(e) => setOrderEndDate(e.target.value)}
                          className="bg-transparent text-slate-200 text-xs font-bold focus:outline-none cursor-pointer"
                          title="Tugash sanasi"
                        />
                        {(orderStartDate || orderEndDate) && (
                          <button
                            type="button"
                            onClick={() => {
                              setOrderStartDate('');
                              setOrderEndDate('');
                            }}
                            className="text-[10px] font-black text-rose-400 hover:text-rose-300 bg-rose-500/10 px-1.5 py-0.5 rounded cursor-pointer border-none ml-1"
                            title="Sanani tozalash"
                          >
                            ✕
                          </button>
                        )}
                      </div>

                      {/* Excel Export Button */}
                      <button
                        type="button"
                        onClick={() => exportOrdersToExcel(filteredOrders, 'KasbiGo_Buyurtmalar')}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black px-3.5 py-2 rounded-xl flex items-center space-x-1.5 shadow-md shadow-emerald-600/20 transition-all cursor-pointer border-none"
                        title="Jadvaldagi buyurtmalarni Excel formatida yuklab olish"
                      >
                        <Download className="h-4 w-4" />
                        <span>Excel Yuklab Olish</span>
                      </button>
                    </div>

                  </div>

              {/* Orders Data Container */}
              {filteredOrders.length > 0 ? (
                <>
                  {/* Desktop Layout: HTML Table representation (Requirement: Buyurtmalar jadvali) */}
                  {isDesktop ? (
                    <div className={`${isAdminDarkMode ? 'bg-[#0F172A] border-slate-800' : 'bg-white border-slate-200 shadow-md'} border rounded-3xl overflow-hidden`}>
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className={`${isAdminDarkMode ? 'bg-slate-950/80 border-slate-800/80 text-slate-400' : 'bg-slate-100 border-slate-200 text-slate-700'} border-b text-[10px] font-black uppercase tracking-wider`}>
                            <th className="p-4">Buyurtma ID</th>
                            <th className="p-4">Usul</th>
                            <th className="p-4">Mijoz Ismi & Tel</th>
                            <th className="p-4">Hamkor Do'kon</th>
                            <th className="p-4">Biriktirilgan Kuryer</th>
                            <th className="p-4">Yetkazish Manzili</th>
                            <th className="p-4">To'lov Turi</th>
                            <th className="p-4">Mahsulot Qiymati</th>
                            <th className="p-4">Kuryer Haqi</th>
                            <th className="p-4">Vaqt</th>
                            <th className="p-4">Hozirgi Status</th>
                            <th className="p-4 text-center">Amallar</th>
                          </tr>
                        </thead>
                        <tbody className={`divide-y ${isAdminDarkMode ? 'divide-slate-800/65' : 'divide-slate-200'} font-medium`}>
                          {filteredOrders.map((order) => {
                            const srcMethod = getOrderSource(order);
                            const productFee = order.items && order.items.length > 0 
                              ? order.items.reduce((acc, item) => acc + ((item.product?.price || 0) * item.quantity), 0)
                              : Math.max(0, order.total - (order.deliveryFee || 0) - (order.extraStopsFee || 0));
                            const courierFee = (order.deliveryFee || 0) + (order.extraStopsFee || 0);

                            return (
                            <tr
                              key={order.id}
                              onClick={() => setSelectedOrder(order)}
                              className={`transition-all cursor-pointer border-l-2 hover:border-emerald-500 ${
                                order.status === 'Yangi' || order.status === 'Narx belgilashda' || order.status === 'Kutishda'
                                  ? order.isCustomPendingPrice
                                    ? 'bg-orange-500/10 hover:bg-orange-500/15 text-orange-950 dark:text-orange-200 border-l-orange-500'
                                    : 'bg-yellow-500/10 hover:bg-yellow-500/15 text-yellow-950 dark:text-yellow-100 border-l-yellow-500'
                                  : (isAdminDarkMode ? 'hover:bg-slate-900/45 text-slate-300 border-l-transparent' : 'hover:bg-slate-50 text-slate-800 border-l-transparent')
                              }`}
                            >
                              <td className="p-4 font-mono font-black">
                                <div className={isAdminDarkMode ? "text-emerald-400" : "text-emerald-700 font-extrabold"}>{order.id}</div>
                                {order.isCustomPendingPrice && (
                                  <span className="inline-flex items-center mt-1 text-[8px] px-1.5 py-0.5 rounded-full font-black uppercase tracking-wider bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20 animate-pulse">
                                    🔔 Narx belgilang
                                  </span>
                                )}
                              </td>
                              <td className="p-4">
                                <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase border ${
                                  srcMethod === 'Yozma' ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20' :
                                  srcMethod === 'Ovozli' ? 'bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20' :
                                  srcMethod === "Qo'ng'iroq qilingan" ? 'bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/20' :
                                  'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20'
                                }`}>
                                  {srcMethod === 'Yozma' ? '✍️ Yozma' :
                                   srcMethod === 'Ovozli' ? '🎙️ Ovozli' :
                                   srcMethod === "Qo'ng'iroq qilingan" ? '📞 Qo\'ng\'iroq' :
                                   '🛒 Savatdan'}
                                </span>
                              </td>
                              <td className="p-4">
                                <span className={`${isAdminDarkMode ? 'text-white' : 'text-slate-900'} font-bold block`}>{order.customerName}</span>
                                <span className={`text-[10px] ${isAdminDarkMode ? 'text-slate-400' : 'text-slate-500'} font-mono mt-0.5 block`}>{order.customerPhone}</span>
                              </td>
                              <td className={`p-4 font-bold ${isAdminDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                                <span className="inline-flex items-center space-x-1">
                                  <span>🏪</span>
                                  <span>{order.storeName}</span>
                                </span>
                              </td>
                              <td className="p-4 font-bold">
                                {order.claimedBy ? (
                                  (() => {
                                    const info = getCourierInfo(order.claimedBy);
                                    const displayName = info?.name || order.claimedBy;
                                    const displayPhone = info?.phone && info.phone !== displayName ? info.phone : (order.claimedBy !== displayName ? order.claimedBy : '');

                                    return (
                                      <div className="flex flex-col space-y-0.5">
                                        <span className="inline-flex items-center space-x-1 bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded-lg border border-indigo-500/20 text-[10px] font-bold">
                                          <span>🚴</span>
                                          <span className="truncate max-w-[130px] font-black">{displayName}</span>
                                        </span>
                                        {displayPhone && (
                                          <span className="text-[9px] text-slate-400 font-mono pl-1">
                                            📞 {displayPhone}
                                          </span>
                                        )}
                                      </div>
                                    );
                                  })()
                                ) : (
                                  <span className="text-slate-500 italic text-[10px]">Biriktirilmagan</span>
                                )}
                              </td>
                              <td className="p-4 max-w-xs truncate" title={order.address.mahalla}>
                                <span className={`${isAdminDarkMode ? 'text-slate-300' : 'text-slate-800'} font-semibold block`}>{order.address.mahalla}</span>
                                <span className={`text-[9px] ${isAdminDarkMode ? 'text-slate-500' : 'text-slate-400'} block mt-0.5 truncate`}>{order.address.comment}</span>
                              </td>
                              <td className="p-4">
                                <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                                  order.paymentMethod === 'Online'
                                    ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/25'
                                    : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/25'
                                }`}>
                                  {order.paymentMethod}
                                </span>
                              </td>
                              <td className="p-4 font-mono font-black text-emerald-400">
                                {order.isCustomPendingPrice ? (
                                  <span className="inline-flex items-center text-[8.5px] px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/25 animate-pulse">
                                    🚨 Narx belgilang
                                  </span>
                                ) : (
                                  `${productFee.toLocaleString('uz-UZ')} so'm`
                                )}
                              </td>
                              <td className="p-4 font-mono font-bold text-sky-400">
                                {`${courierFee.toLocaleString('uz-UZ')} so'm`}
                              </td>
                              <td className="p-4 font-mono text-slate-400">{order.time}</td>
                              <td className="p-4" onClick={(e) => e.stopPropagation()}>
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider shadow-sm ${
                                  order.status === 'Yangi' ? 'bg-blue-100 text-blue-800 border border-blue-200' :
                                  order.status === 'Narx belgilashda' ? 'bg-purple-100 text-purple-800 border border-purple-200' :
                                  order.status === 'Kutishda' ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                                  order.status === 'Kuryer qidirilmoqda' ? 'bg-sky-100 text-sky-800 border border-sky-200' :
                                  order.status === 'Kuryerda' ? 'bg-indigo-100 text-indigo-800 border border-indigo-200' :
                                  order.status === 'Yetkazildi' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                                  'bg-rose-100 text-rose-800 border border-rose-200'
                                }`}>
                                  {order.status === 'Yangi' ? '⏳ Yangi' :
                                   order.status === 'Narx belgilashda' ? '💰 Narx belgilashda' :
                                   order.status === 'Kutishda' ? '🕒 Kutishda' :
                                   order.status === 'Kuryer qidirilmoqda' ? '🔍 Kuryer qidirilmoqda' :
                                   order.status === 'Kuryerda' ? '🚴 Kuryerda' :
                                   order.status === 'Yetkazildi' ? '✅ Yetkazildi' :
                                   '❌ Bekor qilindi'}
                                </span>
                              </td>
                              <td className="p-4" onClick={(e) => e.stopPropagation()}>
                                <div className="flex items-center justify-center space-x-1.5">
                                  {order.status === 'Yangi' && !order.isCustomPendingPrice && (
                                    <button
                                      onClick={() => {
                                        setSelectedOrder(order);
                                      }}
                                      className="py-1 px-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-lg text-[9px] font-black uppercase tracking-wider flex items-center space-x-1 transition-all cursor-pointer shadow-sm active:scale-95"
                                      title="Buyurtmani ochish va tasdiqlash"
                                    >
                                      <Eye className="h-3.5 w-3.5" />
                                      <span>Tasdiqlash</span>
                                    </button>
                                  )}
                                  {order.status !== 'Bekor qilindi' && (
                                    <button
                                      onClick={() => handleCancelOrder(order.id)}
                                      className="p-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 border border-amber-500/30 rounded-lg transition-all cursor-pointer"
                                      title="Buyurtmani bekor qilish (status 'Bekor qilindi' ga o'tadi)"
                                    >
                                      <XCircle className="h-3.5 w-3.5" />
                                    </button>
                                  )}
                                  <button
                                    onClick={() => handleDeleteOrder(order.id)}
                                    className="p-1.5 bg-slate-950 hover:bg-rose-950/30 text-slate-400 hover:text-rose-400 border border-slate-800 rounded-lg transition-all cursor-pointer"
                                    title="Tizimdan butunlay o'chirish"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    /* Mobile Layout: Responsive stacked cards */
                    <div className="space-y-3">
                      {filteredOrders.map((order) => (
                        <div
                          key={order.id}
                          onClick={() => setSelectedOrder(order)}
                          className={`border rounded-2xl p-4 text-xs space-y-3 cursor-pointer transition-all active:scale-98 ${
                            order.status === 'Yangi' || order.status === 'Narx belgilashda' || order.status === 'Kutishda'
                              ? order.isCustomPendingPrice
                                ? 'bg-orange-600/10 border-orange-500/30 text-orange-200'
                                : 'bg-yellow-500/10 border-yellow-500/30 text-yellow-100'
                              : 'bg-slate-950/60 border-slate-850 hover:border-emerald-500/30 text-slate-300'
                          }`}
                        >
                          <div className="flex justify-between items-start pb-2 border-b border-slate-850" onClick={(e) => e.stopPropagation()}>
                            <div>
                              <div className="flex items-center space-x-1.5 flex-wrap gap-1">
                                <span className="font-mono text-xs font-black text-white">{order.id}</span>
                                <span className="text-[8px] font-bold text-slate-500 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">{order.time}</span>
                                {order.isCustomPendingPrice && (
                                  <span className="text-[7.5px] px-1.5 py-0.5 rounded-full font-black uppercase bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse">
                                    🔔 Narx belgilang
                                  </span>
                                )}
                              </div>
                              <span className="text-[9px] text-slate-400 font-bold block mt-1 uppercase">DO'KON: {order.storeName}</span>
                            </div>

                            <div className="flex items-center space-x-1.5">
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider shadow-sm ${
                                order.status === 'Yangi' ? 'bg-blue-100 text-blue-800 border border-blue-200' :
                                order.status === 'Narx belgilashda' ? 'bg-purple-100 text-purple-800 border border-purple-200' :
                                order.status === 'Kutishda' ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                                order.status === 'Kuryer qidirilmoqda' ? 'bg-sky-100 text-sky-800 border border-sky-200' :
                                order.status === 'Kuryerda' ? 'bg-indigo-100 text-indigo-800 border border-indigo-200' :
                                order.status === 'Yetkazildi' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                                'bg-rose-100 text-rose-800 border border-rose-200'
                              }`}>
                                {order.status === 'Yangi' ? '⏳ Yangi' :
                                 order.status === 'Narx belgilashda' ? '💰 Narx' :
                                 order.status === 'Kutishda' ? '🕒 Kutish' :
                                 order.status === 'Kuryer qidirilmoqda' ? '🔍 Qidiruv' :
                                 order.status === 'Kuryerda' ? '🚴 Kuryerda' :
                                 order.status === 'Yetkazildi' ? '✅ Yetkazildi' :
                                 '❌ Bekor'}
                              </span>
                              {order.status !== 'Bekor qilindi' && (
                                <button
                                  onClick={() => handleCancelOrder(order.id)}
                                  className="p-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 border border-amber-500/30 rounded-lg cursor-pointer"
                                  title="Bekor qilish"
                                >
                                  <XCircle className="h-3.5 w-3.5" />
                                </button>
                              )}
                              <button
                                onClick={() => handleDeleteOrder(order.id)}
                                className="p-1.5 bg-slate-900 text-slate-400 hover:text-rose-400 border border-slate-800 rounded-lg cursor-pointer"
                                title="Butunlay o'chirish"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>

                          <div className="space-y-1.5 text-[11px]">
                            {order.items.map((item, idx) => (
                              <div key={`${item.product.id}-${idx}`} className="flex justify-between text-slate-300 font-bold">
                                <span>📦 {item.product.name} ({item.quantity} ta)</span>
                                <span className="font-mono text-emerald-400">{(item.product.price * item.quantity).toLocaleString('uz-UZ')} so'm</span>
                              </div>
                            ))}
                          </div>

                          <div className="bg-[#090D1A] p-2.5 rounded-xl border border-slate-850 space-y-1.5 text-[10px]">
                            <div className="flex justify-between">
                              <span className="text-slate-500">Mijoz:</span>
                              <span className="text-slate-300 font-black">{order.customerName} ({order.customerPhone})</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-500">Manzil:</span>
                              <span className="text-slate-300 font-black text-right max-w-[70%] truncate">{order.address.mahalla}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-500">To'lov:</span>
                              <span className="text-slate-300 font-black uppercase">{order.paymentMethod}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-slate-500">Biriktirilgan kuryer:</span>
                              <span className="text-indigo-400 font-black text-right truncate max-w-[65%]">
                                {order.claimedBy ? (getCourierInfo(order.claimedBy)?.name || order.claimedBy) : <span className="text-slate-500 italic font-normal">Biriktirilmagan</span>}
                              </span>
                            </div>
                            <div className="flex justify-between pt-1 border-t border-slate-850/50 font-black text-xs">
                              <span className="text-slate-400">Jami summasi:</span>
                              <span className="text-emerald-400 font-mono">
                                {order.isCustomPendingPrice ? (
                                  <span className="text-rose-400 animate-pulse text-[10px] uppercase font-black">🚨 Narx belgilang</span>
                                ) : (
                                  `${order.total.toLocaleString('uz-UZ')} so'm`
                                )}
                              </span>
                            </div>
                          </div>
                          {order.status === 'Yangi' && !order.isCustomPendingPrice && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedOrder(order);
                              }}
                              className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 font-black text-[10px] uppercase tracking-wider rounded-xl transition-all flex items-center justify-center space-x-1 cursor-pointer"
                            >
                              <Eye className="h-3.5 w-3.5" />
                              <span>Tasdiqlash</span>
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div className="flex flex-col items-center justify-center p-16 text-center border border-dashed border-slate-800 rounded-3xl bg-slate-950/20">
                  <span className="text-4xl">📥</span>
                  <p className="text-xs text-slate-500 mt-2.5">Hech qanday buyurtma topilmadi yoki mavjud emas.</p>
                </div>
              )}

                </>
              )}

            </div>
          )}



          {/* ================= TAB: COURIER MANAGER & BALANCING ================= */}
          {activeTab === 'couriers' && (
            <div className="space-y-6">
              
              {/* Header section with page path and action buttons */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-2">
                <div>
                  <h1 className={`text-2xl sm:text-3xl font-black tracking-tight ${isAdminDarkMode ? 'text-white' : 'text-slate-900'}`}>
                    Kuryerlar
                  </h1>
                  <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-1">
                    Bosh sahifa <span className="mx-1 text-slate-400 dark:text-slate-600">&gt;</span> <span className="text-indigo-500 font-bold">Kuryerlar</span>
                  </p>
                </div>
                
                <div className="flex items-center gap-2.5">
                  <button
                    onClick={() => {
                      // CSV/Excel export helper
                      const getCourierDebtExport = (courierPhone: string) => {
                        const cleanC = courierPhone.replace(/\D/g, '');
                        return orders.reduce((sum, o) => {
                          if (!o.claimedBy) return sum;
                          const cleanO = o.claimedBy.replace(/\D/g, '');
                          if (cleanO !== cleanC) return sum;
                          if (o.status !== 'Yetkazildi') return sum;
                          if (o.courierDebtSettled) return sum;
                          if (typeof o.courierDebtAmount === 'number' && o.courierDebtAmount > 0) return sum + o.courierDebtAmount;
                          if ((o.category?.toLowerCase().includes('market') || o.storeName?.toLowerCase().includes('market')) && o.paymentMethod === 'Naqd') {
                            const itemsSum = o.items && o.items.length > 0 ? o.items.reduce((acc, item) => acc + (item.product.price * item.quantity), 0) : o.total;
                            return sum + itemsSum;
                          }
                          return sum;
                        }, 0);
                      };

                      const headers = ["ID", "Kuryer", "Telefon raqami", "Transport", "Raqami", "Reyting", "Soni", "Buyurtmalar", "Balans", "Joriy qarz", "Holati", "Qo'shilgan sana"];
                      const rows = courierList.map(c => [
                        c.id,
                        c.name,
                        c.phone,
                        c.transport,
                        c.plate,
                        c.rating,
                        c.ratingCount,
                        c.ordersCount,
                        `${c.balance} so'm`,
                        `${getCourierDebtExport(c.phone)} so'm`,
                        c.isBlocked ? "Bloklangan" : (c.isOnline ? "Faol" : "Kutish holatida"),
                        c.addedDate
                      ]);
                      
                      const csvContent = "data:text/csv;charset=utf-8,\uFEFF" 
                        + [headers.join(","), ...rows.map(e => e.map(v => `"${v}"`).join(","))].join("\n");
                        
                      const encodedUri = encodeURI(csvContent);
                      const link = document.createElement("a");
                      link.setAttribute("href", encodedUri);
                      link.setAttribute("download", `kuryerlar_ro'yxati_${new Date().toISOString().slice(0,10)}.csv`);
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                      showToast("✅ Kuryerlar ro'yxati Excel (CSV) formatida eksport qilindi!");
                    }}
                    className={`px-4 py-2.5 rounded-xl border font-bold text-xs inline-flex items-center space-x-2 transition-all cursor-pointer ${
                      isAdminDarkMode
                        ? 'bg-[#0F172A] border-slate-800 text-slate-300 hover:bg-slate-850'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 shadow-sm'
                    }`}
                  >
                    <Download className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                    <span>Export (Excel)</span>
                  </button>
                  
                  <button
                    onClick={() => setIsAddCourierOpen(true)}
                    className="px-4 py-2.5 rounded-xl bg-[#6366F1] hover:bg-[#4F46E5] text-white font-black text-xs inline-flex items-center space-x-2 transition-all shadow-md cursor-pointer"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Yangi kuryer qo'shish</span>
                  </button>
                </div>
              </div>

              {/* Statistics Cards Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Card 1: Jami kuryerlar */}
                <div className={`p-4 rounded-2xl border flex items-center justify-between transition-all ${
                  isAdminDarkMode ? 'bg-[#0F172A] border-slate-800' : 'bg-white border-slate-100 shadow-sm'
                }`}>
                  <div className="flex items-center space-x-3.5">
                    <div className="h-11 w-11 rounded-xl bg-indigo-50 dark:bg-indigo-950/30 text-indigo-500 dark:text-[#6366F1] flex items-center justify-center text-lg shadow-sm font-semibold">
                      👥
                    </div>
                    <div>
                      <span className="text-[10px] font-black tracking-wider text-slate-400 dark:text-slate-500 uppercase block mb-0.5">JAMI KURYERLAR</span>
                      <span className={`text-xl font-black ${isAdminDarkMode ? 'text-white' : 'text-slate-850'}`}>
                        {courierList.length}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card 2: Onlayn kuryerlar */}
                <div className={`p-4 rounded-2xl border flex items-center justify-between transition-all ${
                  isAdminDarkMode ? 'bg-[#0F172A] border-slate-800' : 'bg-white border-slate-100 shadow-sm'
                }`}>
                  <div className="flex items-center space-x-3.5">
                    <div className="h-11 w-11 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 text-emerald-500 dark:text-emerald-400 flex items-center justify-center text-lg shadow-sm font-semibold">
                      🟢
                    </div>
                    <div>
                      <span className="text-[10px] font-black tracking-wider text-slate-400 dark:text-slate-500 uppercase block mb-0.5">ONLAYN KURYERLAR</span>
                      <span className={`text-xl font-black ${isAdminDarkMode ? 'text-white' : 'text-slate-850'}`}>
                        {courierList.filter(c => c.isOnline && !c.isBlocked).length}
                      </span>
                    </div>
                  </div>
                  <span className="text-[9px] font-black text-emerald-500">
                    {courierList.length > 0 
                      ? `${Math.round((courierList.filter(c => c.isOnline && !c.isBlocked).length / courierList.length) * 100)}%` 
                      : '0%'}
                  </span>
                </div>

                {/* Card 3: Oflayn kuryerlar */}
                <div className={`p-4 rounded-2xl border flex items-center justify-between transition-all ${
                  isAdminDarkMode ? 'bg-[#0F172A] border-slate-800' : 'bg-white border-slate-100 shadow-sm'
                }`}>
                  <div className="flex items-center space-x-3.5">
                    <div className="h-11 w-11 rounded-xl bg-amber-50 dark:bg-amber-950/30 text-amber-500 dark:text-amber-400 flex items-center justify-center text-lg shadow-sm font-semibold">
                      🕒
                    </div>
                    <div>
                      <span className="text-[10px] font-black tracking-wider text-slate-400 dark:text-slate-500 uppercase block mb-0.5">OFLAYN KURYERLAR</span>
                      <span className={`text-xl font-black ${isAdminDarkMode ? 'text-white' : 'text-slate-850'}`}>
                        {courierList.filter(c => !c.isOnline && !c.isBlocked).length}
                      </span>
                    </div>
                  </div>
                  <span className="text-[9px] font-black text-amber-500">
                    {courierList.length > 0 
                      ? `${Math.round((courierList.filter(c => !c.isOnline && !c.isBlocked).length / courierList.length) * 100)}%` 
                      : '0%'}
                  </span>
                </div>

                {/* Card 4: Bloklangan */}
                <div className={`p-4 rounded-2xl border flex items-center justify-between transition-all ${
                  isAdminDarkMode ? 'bg-[#0F172A] border-slate-800' : 'bg-white border-slate-100 shadow-sm'
                }`}>
                  <div className="flex items-center space-x-3.5">
                    <div className="h-11 w-11 rounded-xl bg-rose-50 dark:bg-rose-950/30 text-rose-500 dark:text-rose-400 flex items-center justify-center text-lg shadow-sm font-semibold">
                      🛑
                    </div>
                    <div>
                      <span className="text-[10px] font-black tracking-wider text-slate-400 dark:text-slate-500 uppercase block mb-0.5">BLOKLANGAN</span>
                      <span className={`text-xl font-black ${isAdminDarkMode ? 'text-white' : 'text-slate-850'}`}>
                        {courierList.filter(c => c.isBlocked).length}
                      </span>
                    </div>
                  </div>
                  <span className="text-[9px] font-black text-rose-500">
                    {courierList.length > 0 
                      ? `${Math.round((courierList.filter(c => c.isBlocked).length / courierList.length) * 100)}%` 
                      : '0%'}
                  </span>
                </div>
              </div>

              {/* Filters & Control bar */}
              <div className={`p-4 rounded-2xl border flex flex-col xl:flex-row justify-between items-stretch gap-3.5 ${
                isAdminDarkMode ? 'bg-[#0F172A] border-slate-800' : 'bg-white border-slate-100 shadow-sm'
              }`}>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 flex-1 gap-3">
                  {/* Search field */}
                  <div className="relative md:col-span-1 w-full sm:min-w-[180px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
                    <input
                      type="text"
                      placeholder="Ism, tel yoki ID bilan qidirish..."
                      value={courierSearchQuery}
                      onChange={(e) => setCourierSearchQuery(e.target.value)}
                      className={`w-full pl-8 pr-3 py-2 text-xs font-semibold rounded-xl border focus:outline-none focus:ring-1 focus:ring-indigo-500 ${
                        isAdminDarkMode
                          ? 'bg-slate-950 border-slate-800 text-white placeholder-slate-600'
                          : 'bg-white border-slate-200 text-slate-800 placeholder-slate-400'
                      }`}
                    />
                  </div>

                  {/* Holat Filter */}
                  <div>
                    <select
                      value={courierStatusFilter}
                      onChange={(e) => setCourierStatusFilter(e.target.value)}
                      className={`w-full p-2 text-xs font-bold rounded-xl border focus:outline-none focus:ring-1 focus:ring-indigo-500 ${
                        isAdminDarkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-700'
                      }`}
                    >
                      <option value="all">Barcha Holat 🟢⚪🛑</option>
                      <option value="online">Onlayn 🟢</option>
                      <option value="offline">Oflayn ⚪</option>
                      <option value="blocked">Bloklangan 🛑</option>
                    </select>
                  </div>

                  {/* Transport Filter */}
                  <div>
                    <select
                      value={courierTransportFilter}
                      onChange={(e) => setCourierTransportFilter(e.target.value)}
                      className={`w-full p-2 text-xs font-bold rounded-xl border focus:outline-none focus:ring-1 focus:ring-indigo-500 ${
                        isAdminDarkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-700'
                      }`}
                    >
                      <option value="all">Barcha Transportlar 🛵🚲🚗</option>
                      <option value="velosiped">Velosiped 🚲</option>
                      <option value="skuter">Skuter 🛴</option>
                      <option value="yengil avtomobil">Yengil avtomobil 🚗</option>
                      <option value="yuk avtomobili (labo)">Yuk avtomobili (Labo) 🚚</option>
                      <option value="yuk mototsikli">Yuk mototsikli 🛵</option>
                    </select>
                  </div>

                  {/* Kalendar / Davr tanlash */}
                  <div className="flex items-center space-x-1 border rounded-xl p-1 px-2 focus-within:ring-1 focus-within:ring-indigo-500 overflow-hidden w-full sm:min-w-[200px] sm:col-span-1 md:col-span-1 shadow-sm bg-opacity-10 bg-slate-100 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800">
                    <div className="flex flex-col w-1/2">
                      <span className="text-[8px] uppercase tracking-wider text-slate-400 font-extrabold px-1">Dan (Sana)</span>
                      <input
                        type="date"
                        value={courierStartDate}
                        onChange={(e) => setCourierStartDate(e.target.value)}
                        className={`w-full p-1 text-[10px] font-bold bg-transparent border-none focus:outline-none focus:ring-0 ${
                          isAdminDarkMode ? 'text-white' : 'text-slate-700'
                        }`}
                        title="Boshlanish sanasi"
                      />
                    </div>
                    <div className="w-[1px] h-6 bg-slate-200 dark:bg-slate-800 self-center mx-1" />
                    <div className="flex flex-col w-1/2">
                      <span className="text-[8px] uppercase tracking-wider text-slate-400 font-extrabold px-1">Gacha</span>
                      <input
                        type="date"
                        value={courierEndDate}
                        onChange={(e) => setCourierEndDate(e.target.value)}
                        className={`w-full p-1 text-[10px] font-bold bg-transparent border-none focus:outline-none focus:ring-0 ${
                          isAdminDarkMode ? 'text-white' : 'text-slate-700'
                        }`}
                        title="Tugash sanasi"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end xl:self-center">
                  <button
                    onClick={() => {
                      setCourierSearchQuery('');
                      setCourierStatusFilter('all');
                      setCourierTransportFilter('all');
                      // Reset to last 30 days
                      const d = new Date();
                      d.setDate(d.getDate() - 30);
                      setCourierStartDate(d.toISOString().split('T')[0]);
                      setCourierEndDate(new Date().toISOString().split('T')[0]);
                      showToast("🔄 Filtrlar va kalendar tozalandi!");
                    }}
                    className={`px-3 py-2 text-xs font-bold rounded-xl border inline-flex items-center gap-1.5 transition-all cursor-pointer ${
                      isAdminDarkMode
                        ? 'bg-slate-950 border-slate-850 hover:bg-slate-900 text-slate-400'
                        : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-600 shadow-sm'
                    }`}
                  >
                    <span>Tozalash</span>
                  </button>
                </div>
              </div>

              {/* Main Table Card */}
              <div className={`rounded-[24px] border overflow-hidden ${
                isAdminDarkMode ? 'bg-[#0F172A] border-slate-800' : 'bg-white border-slate-100 shadow-md'
              }`}>
                <div className="overflow-x-auto w-full">
                  <table className="w-full text-left text-xs border-collapse whitespace-nowrap">
                    <thead>
                      <tr className={`border-b font-extrabold ${
                        isAdminDarkMode ? 'bg-slate-950/30 border-slate-800 text-slate-400' : 'bg-slate-50/65 border-slate-100 text-slate-500'
                      }`}>
                        <th className="py-3.5 px-4 w-10 text-center">
                          <input
                            type="checkbox"
                            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5 cursor-pointer"
                            onChange={(e) => {
                              if (e.target.checked) {
                                setCourierList(prev => prev); // keep selection logic simple
                              }
                            }}
                          />
                        </th>
                        <th className="py-3.5 px-3 uppercase text-[9px] tracking-wider font-extrabold">Kuryer</th>
                        <th className="py-3.5 px-3 uppercase text-[9px] tracking-wider font-extrabold">Telefon raqami</th>
                        <th className="py-3.5 px-3 uppercase text-[9px] tracking-wider font-extrabold">Transport</th>
                        <th className="py-3.5 px-3 uppercase text-[9px] tracking-wider font-extrabold">Reyting (haqiqiy)</th>
                        <th className="py-3.5 px-3 uppercase text-[9px] tracking-wider font-extrabold" title="Tanlangan davrdagi buyurtmalar soni">Buyurtmalar (davrda)</th>
                        <th className="py-3.5 px-3 uppercase text-[9px] tracking-wider font-extrabold">Balans</th>
                        <th className="py-3.5 px-3 uppercase text-[9px] tracking-wider font-extrabold">Naqd pul topshirish</th>
                        <th className="py-3.5 px-3 uppercase text-[9px] tracking-wider font-extrabold">Holat</th>
                        <th className="py-3.5 px-3 uppercase text-[9px] tracking-wider font-extrabold">Qo'shilgan sana</th>
                        <th className="py-3.5 px-4 uppercase text-[9px] tracking-wider font-extrabold text-right">Amallar</th>
                      </tr>
                    </thead>
                    <tbody className={`divide-y ${isAdminDarkMode ? 'divide-slate-850' : 'divide-slate-100'}`}>
                      {(() => {
                        const getOrderDateISO = (dateStr: string) => {
                          if (dateStr === 'Bugun') return new Date().toISOString().split('T')[0];
                          if (dateStr === 'Kecha') {
                            const d = new Date();
                            d.setDate(d.getDate() - 1);
                            return d.toISOString().split('T')[0];
                          }
                          return dateStr;
                        };

                        const getCourierOrdersInPeriodCount = (courierPhone: string) => {
                          const cleanC = courierPhone.replace(/\D/g, '');
                          return orders.filter(o => {
                            if (!o.claimedBy) return false;
                            const cleanO = o.claimedBy.replace(/\D/g, '');
                            if (cleanO !== cleanC) return false;
                            const oDate = getOrderDateISO(o.date);
                            return oDate >= courierStartDate && oDate <= courierEndDate;
                          }).length;
                        };

                        const getCourierRatingInfo = (courierPhone: string) => {
                          const cleanPhone = courierPhone.replace(/\D/g, '');
                          const cObj = courierList.find(c => c.phone.replace(/\D/g, '') === cleanPhone);

                          const rated = orders.filter(o => {
                            const rVal = o.driverRating || o.rating;
                            if (!rVal || rVal <= 0) return false;
                            const cleanClaimed = (o.claimedBy || '').replace(/\D/g, '');
                            if (cleanPhone && cleanClaimed && cleanClaimed === cleanPhone) return true;
                            if (cObj && cObj.name && (o.courierName === cObj.name || o.claimedBy === cObj.name)) return true;
                            return false;
                          });
                          const realCount = rated.length;
                          if (realCount > 0) {
                            const totalSum = rated.reduce((sum, o) => sum + (o.driverRating || o.rating || 0), 0);
                            const rating = Number((totalSum / realCount).toFixed(1));
                            return { rating, ratingCount: realCount };
                          }
                          const baseRating = typeof cObj?.rating === 'number' ? cObj.rating : 5.0;
                          return { rating: baseRating, ratingCount: 0 };
                        };

                        const getCourierDebt = (courier: Courier) => {
                          if (typeof courier.manualCashDebt === 'number') {
                            return courier.manualCashDebt;
                          }
                          const cleanC = courier.phone.replace(/\D/g, '');
                          return orders.reduce((sum, o) => {
                            if (!o.claimedBy) return sum;
                            const cleanO = o.claimedBy.replace(/\D/g, '');
                            if (cleanO !== cleanC) return sum;
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
                        };

                        // Filter the courier list
                        const filtered = courierList.filter(c => {
                          const matchesSearch = 
                            c.name.toLowerCase().includes(courierSearchQuery.toLowerCase()) ||
                            c.phone.includes(courierSearchQuery) ||
                            c.id.toLowerCase().includes(courierSearchQuery.toLowerCase());
                          
                          // 1. Status Filter: Onlayn, Oflayn, Bloklangan
                          let matchesStatus = true;
                          if (courierStatusFilter !== 'all') {
                            if (courierStatusFilter === 'online') {
                              matchesStatus = c.isOnline && !c.isBlocked;
                            } else if (courierStatusFilter === 'offline') {
                              matchesStatus = !c.isOnline && !c.isBlocked;
                            } else if (courierStatusFilter === 'blocked') {
                              matchesStatus = c.isBlocked;
                            }
                          }

                          // 2. Transport Filter: Mototsikl, Velosiped, Avtomobil
                          let matchesTransport = true;
                          if (courierTransportFilter !== 'all') {
                            matchesTransport = c.transport.toLowerCase() === courierTransportFilter.toLowerCase();
                          }

                          return matchesSearch && matchesStatus && matchesTransport;
                        });

                        // Automatically sort descending by most orders in selected period
                        const sorted = [...filtered].sort((a, b) => {
                          const countA = getCourierOrdersInPeriodCount(a.phone);
                          const countB = getCourierOrdersInPeriodCount(b.phone);
                          return countB - countA;
                        });

                        if (sorted.length === 0) {
                          return (
                            <tr>
                              <td colSpan={12} className="py-12 text-center">
                                <div className="text-3xl mb-2">🔍</div>
                                <p className="text-xs font-semibold text-slate-400 dark:text-slate-500">Hech qanday mos keluvchi kuryer topilmadi.</p>
                              </td>
                            </tr>
                          );
                        }

                        const totalPages = Math.max(1, Math.ceil(sorted.length / courierPageSize));
                        const currentPage = Math.min(courierPage, totalPages);
                        const startIndex = (currentPage - 1) * courierPageSize;
                        const paginatedCouriers = sorted.slice(startIndex, startIndex + courierPageSize);

                        return paginatedCouriers.map((c) => {
                          const isActive = c.phone === courierPhone;
                          const { rating, ratingCount } = getCourierRatingInfo(c.phone);
                          const periodOrdersCount = getCourierOrdersInPeriodCount(c.phone);
                          const currentDebt = getCourierDebt(c);
                          
                          // Determine transport icon
                          let transportIcon = "🏍️";
                          if (c.transport === 'Velosiped') transportIcon = "🚲";
                          if (c.transport === 'Avtomobil') transportIcon = "🚗";

                          return (
                            <tr 
                              key={c.id} 
                              className={`transition-colors hover:bg-slate-50/40 dark:hover:bg-slate-900/20 ${
                                isActive ? 'bg-indigo-500/5 dark:bg-indigo-500/10' : ''
                              }`}
                            >
                              <td className="py-3 px-4 text-center">
                                <input
                                  type="checkbox"
                                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5 cursor-pointer"
                                />
                              </td>
                              
                              {/* Kuryer Name & ID */}
                              <td className="py-3 px-3">
                                <div className="flex items-center space-x-3">
                                  {/* Avatar with dynamic colorful background based on name initial */}
                                  <div className={`h-9 w-9 rounded-full flex items-center justify-center font-bold text-xs shadow-sm text-slate-700 dark:text-slate-200 border ${
                                    isActive
                                      ? 'bg-indigo-100 border-indigo-200 dark:bg-indigo-950/40 dark:border-indigo-850'
                                      : 'bg-slate-100 border-slate-200 dark:bg-slate-800 dark:border-slate-700'
                                  }`}>
                                    {c.name.charAt(0)}
                                  </div>
                                  <div>
                                    <div className="flex items-center gap-1">
                                      <span className={`font-extrabold ${isAdminDarkMode ? 'text-white' : 'text-slate-800'}`}>
                                        {c.name}
                                      </span>
                                      {isActive && (
                                        <span className="inline-block h-1.5 w-1.5 rounded-full bg-indigo-500 animate-pulse" />
                                      )}
                                    </div>
                                    <div className="flex items-center gap-1.5 mt-0.5">
                                      <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-tight">
                                        ID: {c.id}
                                      </span>
                                      {c.isBlocked ? (
                                        <span className="inline-flex items-center gap-0.5 text-[8px] font-black text-rose-500 bg-rose-50 dark:bg-rose-950/20 px-1 py-0.2 rounded-md animate-pulse">
                                          🚫 Bloklangan
                                        </span>
                                      ) : c.isOnline ? (
                                        <span className="inline-flex items-center gap-0.5 text-[8px] font-black text-emerald-500 bg-emerald-50 dark:bg-emerald-950/20 px-1 py-0.2 rounded-md">
                                          🟢 Onlayn
                                        </span>
                                      ) : (
                                        <span className="inline-flex items-center gap-0.5 text-[8px] font-black text-slate-400 bg-slate-100 dark:bg-slate-850 px-1 py-0.2 rounded-md">
                                          ⚪ Oflayn
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </td>

                              {/* Phone number */}
                              <td className="py-3 px-3 font-mono text-xs font-bold text-slate-600 dark:text-slate-300">
                                <div className="flex items-center space-x-1">
                                  <span>{c.phone}</span>
                                  <Phone className="h-2.5 w-2.5 text-slate-400 dark:text-slate-500" />
                                </div>
                              </td>

                              {/* Transport type */}
                              <td className="py-3 px-3">
                                <div className="flex items-center space-x-1.5">
                                  <span className="text-base" title={c.transport}>{transportIcon}</span>
                                  <div>
                                    <span className="text-[11px] font-extrabold block text-slate-700 dark:text-slate-300">
                                      {c.transport}
                                    </span>
                                    <span className="text-[9px] font-semibold text-slate-400 dark:text-slate-500 block">
                                      {c.plate}
                                    </span>
                                  </div>
                                </div>
                              </td>

                              {/* Rating (Haqiqiy - Kuryer profilidagi bilan 100% bir xil) */}
                              <td className="py-3 px-3">
                                <div className="flex items-center space-x-1">
                                  <Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400 shrink-0" />
                                  <input
                                    type="number"
                                    step="0.1"
                                    min="1.0"
                                    max="5.0"
                                    value={rating}
                                    onChange={(e) => {
                                      const val = parseFloat(e.target.value);
                                      const newRating = isNaN(val) ? 5.0 : Math.min(5.0, Math.max(1.0, val));
                                      const nextList = courierList.map(item => item.id === c.id ? { ...item, rating: newRating } : item);
                                      if (propSetCourierList) propSetCourierList(nextList);
                                      setLocalCourierList(nextList);
                                      safeSetItem('kasbigo-couriers-list', JSON.stringify(nextList));
                                    }}
                                    className={`w-14 border text-amber-500 font-extrabold text-xs rounded px-1.5 py-0.5 text-center focus:outline-none focus:border-amber-500 font-mono ${
                                      isAdminDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-amber-50/50 border-amber-200/80'
                                    }`}
                                  />
                                  <span className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold">({ratingCount} ta)</span>
                                </div>
                              </td>

                              {/* Orders Count */}
                              <td className="py-3 px-3">
                                <div>
                                  <span className="font-extrabold text-xs text-slate-750 dark:text-slate-300 block">{periodOrdersCount}</span>
                                  <span className="text-[9px] text-slate-400 dark:text-slate-500 font-semibold block">buyurtma</span>
                                </div>
                              </td>

                              {/* Balance */}
                              <td className="py-3 px-3 font-mono text-xs font-black">
                                <span className={c.balance > 15000 ? 'text-emerald-500 dark:text-emerald-400' : 'text-rose-500 dark:text-rose-450'}>
                                  {c.balance.toLocaleString('uz-UZ')} so'm
                                </span>
                              </td>

                              {/* Naqd pul topshirish */}
                              <td className="py-3 px-3">
                                {editingCourierDebtId === c.id ? (
                                  <div className="flex items-center space-x-1">
                                    <input
                                      type="number"
                                      value={editingDebtInput}
                                      onChange={(e) => setEditingDebtInput(e.target.value)}
                                      className="w-20 p-1 text-xs font-mono font-bold bg-slate-900 border border-slate-700 rounded text-white focus:outline-none"
                                      placeholder="0"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const newDebtVal = parseFloat(editingDebtInput);
                                        const valToSave = isNaN(newDebtVal) ? 0 : newDebtVal;
                                        const nextList = courierList.map(item => {
                                          if (item.id === c.id) {
                                            return { ...item, manualCashDebt: valToSave };
                                          }
                                          return item;
                                        });
                                        if (propSetCourierList) {
                                          propSetCourierList(nextList);
                                        }
                                        setLocalCourierList(nextList);
                                        safeSetItem('kasbigo-couriers-list', JSON.stringify(nextList));
                                        setEditingCourierDebtId(null);
                                        showToast(`✅ ${c.name} uchun Naqd pul topshirish summasi ${valToSave.toLocaleString('uz-UZ')} so'm qilindi!`);
                                      }}
                                      className="px-2 py-1 bg-emerald-600 text-white rounded text-[10px] font-bold border-none cursor-pointer"
                                    >
                                      Saqlash
                                    </button>
                                  </div>
                                ) : (
                                  <div className="flex flex-col items-start gap-1">
                                    <div className="flex items-center space-x-1.5">
                                      <span className={`font-mono text-xs ${
                                        currentDebt > 50000 
                                          ? 'text-rose-600 dark:text-rose-400 font-black' 
                                          : currentDebt > 0 
                                            ? 'text-amber-600 dark:text-amber-400 font-extrabold' 
                                            : 'text-slate-500 dark:text-slate-400 font-semibold'
                                      }`}>
                                        {currentDebt.toLocaleString('uz-UZ')} so'm
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setEditingCourierDebtId(c.id);
                                          setEditingDebtInput(currentDebt.toString());
                                        }}
                                        className="text-[10px] text-indigo-400 hover:text-indigo-300 font-bold underline cursor-pointer border-none bg-transparent"
                                        title="Summani tahrirlash"
                                      >
                                        ✏️
                                      </button>
                                    </div>
                                    {currentDebt > 0 && (
                                      <button
                                        onClick={() => {
                                          setConfirmModalConfig({
                                            title: "Naqd pul topshirildi deb belgilash",
                                            message: `${c.name} sizga ${currentDebt.toLocaleString('uz-UZ')} so'm topshirdimi?`,
                                            onConfirm: () => {
                                              const cleanC = c.phone.replace(/\D/g, '');
                                              setOrders(prev => prev.map(o => {
                                                if (!o.claimedBy) return o;
                                                const cleanO = o.claimedBy.replace(/\D/g, '');
                                                if (cleanO === cleanC && o.status === 'Yetkazildi' && !o.courierDebtSettled) {
                                                  if (o.paymentMethod === 'Naqd' || typeof o.courierDebtAmount === 'number') {
                                                    return { ...o, courierDebtSettled: true };
                                                  }
                                                }
                                                return o;
                                              }));
                                              const nextList = courierList.map(item => {
                                                if (item.id === c.id) {
                                                  return { ...item, manualCashDebt: 0 };
                                                }
                                                return item;
                                              });
                                              if (propSetCourierList) {
                                                propSetCourierList(nextList);
                                              }
                                              setLocalCourierList(nextList);
                                              safeSetItem('kasbigo-couriers-list', JSON.stringify(nextList));
                                              showToast(`✅ ${c.name}ning ${currentDebt.toLocaleString('uz-UZ')} so'm naqd pul topshirig'i yopildi!`);
                                            }
                                          });
                                        }}
                                        className="px-2 py-0.5 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/60 text-[10px] text-emerald-600 dark:text-emerald-400 font-black rounded border border-emerald-200 dark:border-emerald-800/80 cursor-pointer transition-all active:scale-95 shadow-xs"
                                        title="Kuryer naqd pul topshirganini tasdiqlash"
                                      >
                                        To'landi
                                      </button>
                                    )}
                                  </div>
                                )}
                              </td>

                              {/* Status Badge */}
                              <td className="py-3 px-3">
                                {c.isBlocked ? (
                                  <span className="px-2.5 py-1 text-[9px] font-black uppercase tracking-wider rounded-full bg-rose-50 text-rose-600 dark:bg-rose-950/20 dark:text-rose-400">
                                    Bloklangan
                                  </span>
                                ) : c.isOnline ? (
                                  <span className="px-2.5 py-1 text-[9px] font-black uppercase tracking-wider rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400">
                                    Onlayn
                                  </span>
                                ) : (
                                  <span className="px-2.5 py-1 text-[9px] font-black uppercase tracking-wider rounded-full bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                                    Oflayn
                                  </span>
                                )}
                              </td>

                              {/* Date added */}
                              <td className="py-3 px-3 text-[11px] text-slate-500 dark:text-slate-400 font-semibold">
                                <div className="block">{c.addedDate.split(' ')[0]}</div>
                                <div className="text-[9px] text-slate-400 dark:text-slate-600 font-bold block mt-0.5">{c.addedDate.split(' ')[1] || '09:00'}</div>
                              </td>

                              {/* Actions */}
                              <td className="py-3 px-4 text-right whitespace-nowrap">
                                <div className="flex items-center justify-end space-x-1.5">
                                  {/* Balance replenishment (Balans to'ldirish) */}
                                  <button
                                    onClick={() => {
                                      setReplenishingCourier(c);
                                      setReplenishAmount('');
                                    }}
                                    title="Balans to'ldirish"
                                    className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                                      isAdminDarkMode
                                        ? 'bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border-emerald-500/20'
                                        : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-600 border-emerald-200'
                                    }`}
                                  >
                                    <Coins className="h-3.5 w-3.5" />
                                  </button>

                                  {/* Edit button */}
                                  <button
                                    onClick={() => setEditingCourier(c)}
                                    title="Tahrirlash"
                                    className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                                      isAdminDarkMode
                                        ? 'bg-slate-800 border-slate-700 hover:bg-slate-750 text-slate-300'
                                        : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-600'
                                    }`}
                                  >
                                    <Sliders className="h-3.5 w-3.5" />
                                  </button>

                                  {/* Block Toggle */}
                                  <button
                                    onClick={() => {
                                      const nextList = courierList.map(item => {
                                        if (item.id === c.id) {
                                          const nextBlocked = !item.isBlocked;
                                          const nextOnline = nextBlocked ? false : item.isOnline;
                                          if (nextBlocked && isActive) {
                                            showToast(`🚫 Joriy faol kuryer (${c.name}) bloklandi!`);
                                            if (setIsCourierOnline) {
                                              setIsCourierOnline(false);
                                            }
                                          } else {
                                            showToast(nextBlocked ? `🚫 Kuryer ${c.name} bloklandi!` : `✅ Kuryer ${c.name} blokdan ochildi!`);
                                          }
                                          return { ...item, isBlocked: nextBlocked, isOnline: nextOnline };
                                        }
                                        return item;
                                      });
                                      
                                      if (propSetCourierList) {
                                        propSetCourierList(nextList);
                                      }
                                      setLocalCourierList(nextList);
                                      
                                      safeSetItem('kasbigo-couriers-list', JSON.stringify(nextList));
                                      const blockedPhones = nextList.filter(item => item.isBlocked).map(item => item.phone);
                                      safeSetItem('kasbigo-blocked-couriers', JSON.stringify(blockedPhones));
                                    }}
                                    title={c.isBlocked ? "Blokdan chiqarish" : "Bloklash"}
                                    className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                                      c.isBlocked
                                        ? 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 border-emerald-500/20'
                                        : 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border-rose-500/20'
                                    }`}
                                  >
                                    {c.isBlocked ? (
                                      <CheckCircle className="h-3.5 w-3.5" />
                                    ) : (
                                      <X className="h-3.5 w-3.5" />
                                    )}
                                  </button>

                                  {/* Delete Button */}
                                  <button
                                    onClick={() => setCourierToDelete(c)}
                                    title="O'chirish"
                                    className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                                      isAdminDarkMode
                                        ? 'bg-slate-850 hover:bg-rose-950/40 hover:text-rose-400 border-slate-800 hover:border-rose-900/40 text-slate-500'
                                        : 'bg-slate-50 hover:bg-rose-50 hover:text-rose-600 border-slate-200 hover:border-rose-200 text-slate-400'
                                    }`}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        });
                      })()}
                    </tbody>
                  </table>
                </div>

                {/* Table Footer / Pagination */}
                {(() => {
                  const filteredCouriersList = (courierList || []).filter(c => {
                    let matchesSearch = true;
                    if (courierSearchQuery.trim()) {
                      const q = courierSearchQuery.toLowerCase().trim();
                      matchesSearch = c.name.toLowerCase().includes(q) || c.phone.toLowerCase().includes(q) || c.id.toLowerCase().includes(q);
                    }
                    let matchesStatus = true;
                    if (courierStatusFilter === 'online') matchesStatus = c.isOnline && !c.isBlocked;
                    if (courierStatusFilter === 'offline') matchesStatus = !c.isOnline && !c.isBlocked;
                    if (courierStatusFilter === 'blocked') matchesStatus = c.isBlocked;

                    let matchesTransport = true;
                    if (courierTransportFilter !== 'all') matchesTransport = c.transport.toLowerCase() === courierTransportFilter.toLowerCase();

                    return matchesSearch && matchesStatus && matchesTransport;
                  });

                  const filteredCouriersCount = filteredCouriersList.length;
                  const totalPages = Math.max(1, Math.ceil(filteredCouriersCount / courierPageSize));
                  const currentPage = Math.min(courierPage, totalPages);
                  const startIndex = filteredCouriersCount === 0 ? 0 : (currentPage - 1) * courierPageSize;
                  const endIndex = Math.min(startIndex + courierPageSize, filteredCouriersCount);

                  return (
                    <div className={`p-4 border-t flex flex-col sm:flex-row justify-between items-center gap-3.5 text-[11px] font-bold ${
                      isAdminDarkMode ? 'bg-slate-950/20 border-slate-800 text-slate-400' : 'bg-slate-50/40 border-slate-100 text-slate-500'
                    }`}>
                      <div>
                        Jami {filteredCouriersCount} ta kuryerdan {filteredCouriersCount === 0 ? 0 : startIndex + 1}-{endIndex} tasi ko'rsatilmoqda
                      </div>

                      {/* Styled Pagination Controls */}
                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => setCourierPage(prev => Math.max(1, prev - 1))}
                          disabled={currentPage === 1}
                          className={`p-1.5 rounded-lg border text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed ${isAdminDarkMode ? 'border-slate-850' : 'border-slate-200 shadow-sm'}`}
                        >
                          <ChevronLeft className="h-3 w-3" />
                        </button>
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map(pNum => (
                          <button
                            key={pNum}
                            onClick={() => setCourierPage(pNum)}
                            className={`h-6 w-6 rounded-md flex items-center justify-center text-[10px] font-black cursor-pointer ${
                              pNum === currentPage
                                ? 'bg-[#6366F1] text-white'
                                : `hover:bg-slate-100 dark:hover:bg-slate-800 ${isAdminDarkMode ? 'text-slate-400' : 'text-slate-600'}`
                            }`}
                          >
                            {pNum}
                          </button>
                        ))}
                        <button
                          onClick={() => setCourierPage(prev => Math.min(totalPages, prev + 1))}
                          disabled={currentPage === totalPages}
                          className={`p-1.5 rounded-lg border text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed ${isAdminDarkMode ? 'border-slate-850' : 'border-slate-200 shadow-sm'}`}
                        >
                          <ChevronRight className="h-3 w-3" />
                        </button>
                      </div>

                      <div className="flex items-center space-x-1.5">
                        <select
                          value={courierPageSize}
                          onChange={(e) => {
                            setCourierPageSize(Number(e.target.value));
                            setCourierPage(1);
                          }}
                          className={`p-1.5 rounded-lg border text-[10px] font-bold cursor-pointer ${isAdminDarkMode ? 'bg-slate-950 border-slate-850 text-slate-400' : 'bg-white border-slate-200 text-slate-600 shadow-sm'}`}
                        >
                          <option value={10}>10 / sahifa</option>
                          <option value={20}>20 / sahifa</option>
                          <option value={50}>50 / sahifa</option>
                        </select>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* MODAL: YANGI KURYER QO'SHISH */}
              <AnimatePresence>
                {isAddCourierOpen && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      onClick={() => setIsAddCourierOpen(false)}
                      className="absolute inset-0 bg-slate-950/60 backdrop-blur-xs"
                    />

                    {/* Content */}
                    <motion.div
                      initial={{ scale: 0.95, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.95, opacity: 0 }}
                      className={`relative w-full max-w-md rounded-3xl border shadow-2xl overflow-hidden z-10 ${
                        isAdminDarkMode ? 'bg-[#0F172A] border-slate-800 text-white' : 'bg-white border-slate-150 text-slate-800'
                      }`}
                    >
                      <div className={`p-5 border-b font-extrabold flex justify-between items-center ${isAdminDarkMode ? 'border-slate-850 bg-slate-950/30' : 'border-slate-100 bg-slate-50/50'}`}>
                        <div className="flex items-center space-x-2">
                          <span className="text-lg">➕</span>
                          <span className="text-xs font-black uppercase tracking-wider">Yangi kuryer qo'shish</span>
                        </div>
                        <button
                          onClick={() => setIsAddCourierOpen(false)}
                          className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 cursor-pointer"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>

                      <div className="p-5 space-y-4 text-xs">
                        <div>
                          <label className="block text-[9px] font-black uppercase mb-1 tracking-wider text-slate-400">Ismi va Familiyasi</label>
                          <input
                            type="text"
                            placeholder="Masalan: Dilshod Umarov"
                            value={newCourierName}
                            onChange={(e) => setNewCourierName(e.target.value)}
                            className={`w-full p-2.5 rounded-xl border font-bold text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 ${
                              isAdminDarkMode ? 'bg-slate-950 border-slate-800 text-white placeholder-slate-600' : 'bg-white border-slate-200 text-slate-800 placeholder-slate-400'
                            }`}
                          />
                        </div>

                        <div>
                          <label className="block text-[9px] font-black uppercase mb-1 tracking-wider text-slate-400">Telefon Raqami</label>
                          <PhoneInput
                            value={newCourierPhone}
                            onChange={(val) => setNewCourierPhone(val)}
                            className={`w-full p-2.5 rounded-xl border font-bold text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono ${
                              isAdminDarkMode ? 'bg-slate-950 border-slate-800 text-white placeholder-slate-600' : 'bg-white border-slate-200 text-slate-800 placeholder-slate-400'
                            }`}
                          />
                        </div>

                        <div>
                          <label className="block text-[9px] font-black uppercase mb-1 tracking-wider text-slate-400">Kirish Paroli</label>
                          <input
                            type="text"
                            placeholder="Masalan: 123456"
                            value={newCourierPassword}
                            onChange={(e) => setNewCourierPassword(e.target.value)}
                            className={`w-full p-2.5 rounded-xl border font-bold text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono ${
                              isAdminDarkMode ? 'bg-slate-950 border-slate-800 text-white placeholder-slate-600' : 'bg-white border-slate-200 text-slate-800 placeholder-slate-400'
                            }`}
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-3.5">
                          <div>
                            <label className="block text-[9px] font-black uppercase mb-1 tracking-wider text-slate-400">Boshlang'ich Balans</label>
                            <input
                              type="number"
                              placeholder="100000"
                              value={newCourierBalance}
                              onChange={(e) => setNewCourierBalance(e.target.value)}
                              className={`w-full p-2.5 rounded-xl border font-bold text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono ${
                                isAdminDarkMode ? 'bg-slate-950 border-slate-800 text-white placeholder-slate-600' : 'bg-white border-slate-200 text-slate-800 placeholder-slate-400'
                              }`}
                            />
                          </div>

                          <div>
                            <label className="block text-[9px] font-black uppercase mb-1 tracking-wider text-slate-400">Smena Holati</label>
                            <select
                              value={newCourierIsOnline ? "true" : "false"}
                              onChange={(e) => setNewCourierIsOnline(e.target.value === "true")}
                              className={`w-full p-2.5 rounded-xl border font-bold text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 ${
                                isAdminDarkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-700'
                              }`}
                            >
                              <option value="true">Onlayn 🟢</option>
                              <option value="false">Oflayn ⚪</option>
                            </select>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3.5">
                          <div>
                            <label className="block text-[9px] font-black uppercase mb-1 tracking-wider text-slate-400">Transport Turi</label>
                            <select
                              value={newCourierTransport}
                              onChange={(e) => setNewCourierTransport(e.target.value as any)}
                              className={`w-full p-2.5 rounded-xl border font-bold text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 ${
                                isAdminDarkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-700'
                              }`}
                            >
                              <option value="Velosiped">Velosiped 🚲</option>
                              <option value="Skuter">Skuter 🛴</option>
                              <option value="Yengil avtomobil">Yengil avtomobil 🚗</option>
                              <option value="Yuk avtomobili (Labo)">Yuk avtomobili (Labo) 🚚</option>
                              <option value="Yuk mototsikli">Yuk mototsikli 🛵</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-[9px] font-black uppercase mb-1 tracking-wider text-slate-400">Transport Davlat Raqami</label>
                            <input
                              type="text"
                              placeholder="Masalan: 01 A 123 BC"
                              value={newCourierPlate}
                              onChange={(e) => setNewCourierPlate(e.target.value)}
                              disabled={newCourierTransport === 'Velosiped' || newCourierTransport === 'Skuter'}
                              className={`w-full p-2.5 rounded-xl border font-bold text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 ${
                                (newCourierTransport === 'Velosiped' || newCourierTransport === 'Skuter') ? 'opacity-40 cursor-not-allowed' : ''
                              } ${
                                isAdminDarkMode ? 'bg-slate-950 border-slate-800 text-white placeholder-slate-600' : 'bg-white border-slate-200 text-slate-800 placeholder-slate-400'
                              }`}
                            />
                          </div>
                        </div>

                        <div className="pt-2">
                          <button
                            onClick={() => {
                              if (!newCourierName.trim() || !newCourierPhone.trim()) {
                                showToast("⚠️ Iltimos ism va telefon raqamini to'ldiring!");
                                return;
                              }
                              const phoneExists = courierList.some(c => c.phone === newCourierPhone);
                              if (phoneExists) {
                                showToast("⚠️ Bu telefon raqamli kuryer allaqachon mavjud!");
                                return;
                              }
                              const newId = `KG-${Math.floor(1007 + Math.random() * 8990)}`;
                              const newItem = {
                                id: newId,
                                name: newCourierName,
                                phone: newCourierPhone,
                                password: newCourierPassword.trim() || '123456',
                                balance: parseFloat(newCourierBalance) || 0,
                                isOnline: newCourierIsOnline,
                                isBlocked: false,
                                transport: newCourierTransport,
                                plate: (newCourierTransport === 'Velosiped' || newCourierTransport === 'Skuter') ? '-' : (newCourierPlate || '01 X 777 XX'),
                                rating: 5.0,
                                ratingCount: 1,
                                ordersCount: 0,
                                addedDate: new Date().toISOString().replace('T', ' ').slice(0, 16),
                                verified: true
                              };
                              setCourierList(prev => [...prev, newItem]);
                              showToast(`✅ Yangi kuryer ${newCourierName} muvaffaqiyatli ro'yxatdan o'tkazildi!`);
                              
                              // Reset
                              setNewCourierName('');
                              setNewCourierPhone('');
                              setNewCourierPassword('123456');
                              setNewCourierBalance('100000');
                              setNewCourierIsOnline(false);
                              setNewCourierTransport('Mototsikl');
                              setNewCourierPlate('');
                              setIsAddCourierOpen(false);
                            }}
                            className="w-full py-2.5 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white font-black uppercase text-[10px] tracking-wider transition-all shadow-md cursor-pointer"
                          >
                            Kuryerni Qo'shish
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  </div>
                )}
              </AnimatePresence>

              {/* MODAL: KURYERNI TAHRIRLASH */}
              <AnimatePresence>
                {editingCourier && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      onClick={() => setEditingCourier(null)}
                      className="absolute inset-0 bg-slate-950/60 backdrop-blur-xs"
                    />

                    {/* Content */}
                    <motion.div
                      initial={{ scale: 0.95, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.95, opacity: 0 }}
                      className={`relative w-full max-w-md rounded-3xl border shadow-2xl overflow-hidden z-10 ${
                        isAdminDarkMode ? 'bg-[#0F172A] border-slate-800 text-white' : 'bg-white border-slate-150 text-slate-800'
                      }`}
                    >
                      <div className={`p-5 border-b font-extrabold flex justify-between items-center ${isAdminDarkMode ? 'border-slate-850 bg-slate-950/30' : 'border-slate-100 bg-slate-50/50'}`}>
                        <div className="flex items-center space-x-2">
                          <span className="text-lg">⚙️</span>
                          <span className="text-xs font-black uppercase tracking-wider">Kuryerni tahrirlash ({editingCourier.id})</span>
                        </div>
                        <button
                          onClick={() => setEditingCourier(null)}
                          className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 cursor-pointer"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>

                      <div className="p-5 space-y-4 text-xs">
                        <div>
                          <label className="block text-[9px] font-black uppercase mb-1 tracking-wider text-slate-400">Ismi va Familiyasi</label>
                          <input
                            type="text"
                            value={editingCourier.name}
                            onChange={(e) => setEditingCourier({ ...editingCourier, name: e.target.value })}
                            className={`w-full p-2.5 rounded-xl border font-bold text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 ${
                              isAdminDarkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-800'
                            }`}
                          />
                        </div>

                        <div>
                          <label className="block text-[9px] font-black uppercase mb-1 tracking-wider text-slate-400">Telefon Raqami</label>
                          <PhoneInput
                            value={editingCourier.phone}
                            onChange={(val) => setEditingCourier({ ...editingCourier, phone: val })}
                            className={`w-full p-2.5 rounded-xl border font-bold text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono ${
                              isAdminDarkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-800'
                            }`}
                          />
                        </div>

                        <div>
                          <label className="block text-[9px] font-black uppercase mb-1 tracking-wider text-slate-400">Kirish Paroli</label>
                          <input
                            type="text"
                            value={editingCourier.password || ''}
                            onChange={(e) => setEditingCourier({ ...editingCourier, password: e.target.value })}
                            className={`w-full p-2.5 rounded-xl border font-bold text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono ${
                              isAdminDarkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-800'
                            }`}
                            placeholder="Masalan: 123456"
                          />
                        </div>

                        <div>
                          <label className="block text-[9px] font-black uppercase mb-1 tracking-wider text-slate-400">Balans (so'm)</label>
                          <input
                            type="number"
                            value={editingCourier.balance}
                            onChange={(e) => setEditingCourier({ ...editingCourier, balance: parseFloat(e.target.value) || 0 })}
                            className={`w-full p-2.5 rounded-xl border font-bold text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono ${
                              isAdminDarkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-800'
                            }`}
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-3.5">
                          <div>
                            <label className="block text-[9px] font-black uppercase mb-1 tracking-wider text-slate-400">Transport Turi</label>
                            <select
                              value={normalizeCourierTransport(editingCourier.transport)}
                              onChange={(e) => {
                                const tr = e.target.value as any;
                                setEditingCourier({ 
                                  ...editingCourier, 
                                  transport: tr,
                                  plate: (tr === 'Velosiped' || tr === 'Skuter') ? '-' : (editingCourier.plate === '-' ? '01 A 123 BC' : editingCourier.plate)
                                });
                              }}
                              className={`w-full p-2.5 rounded-xl border font-bold text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 ${
                                isAdminDarkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-700'
                              }`}
                            >
                              <option value="Velosiped">Velosiped 🚲</option>
                              <option value="Skuter">Skuter 🛴</option>
                              <option value="Yengil avtomobil">Yengil avtomobil 🚗</option>
                              <option value="Yuk avtomobili (Labo)">Yuk avtomobili (Labo) 🚚</option>
                              <option value="Yuk mototsikli">Yuk mototsikli 🛵</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-[9px] font-black uppercase mb-1 tracking-wider text-slate-400">Davlat Raqami</label>
                            <input
                              type="text"
                              value={editingCourier.plate}
                              disabled={normalizeCourierTransport(editingCourier.transport) === 'Velosiped' || normalizeCourierTransport(editingCourier.transport) === 'Skuter'}
                              onChange={(e) => setEditingCourier({ ...editingCourier, plate: e.target.value })}
                              className={`w-full p-2.5 rounded-xl border font-bold text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 ${
                                (normalizeCourierTransport(editingCourier.transport) === 'Velosiped' || normalizeCourierTransport(editingCourier.transport) === 'Skuter') ? 'opacity-40 cursor-not-allowed' : ''
                              }  ${
                                isAdminDarkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-800'
                              }`}
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[9px] font-black uppercase mb-1 tracking-wider text-slate-400">Reyting (O'rtacha)</label>
                          <input
                            type="number"
                            step="0.1"
                            min="1"
                            max="5"
                            value={editingCourier.rating}
                            onChange={(e) => setEditingCourier({ ...editingCourier, rating: parseFloat(e.target.value) || 5.0 })}
                            className={`w-full p-2.5 rounded-xl border font-bold text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono ${
                              isAdminDarkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-800'
                            }`}
                          />
                        </div>

                        <div className="pt-2">
                          <button
                            onClick={() => {
                              if (!editingCourier.name.trim() || !editingCourier.phone.trim()) {
                                showToast("⚠️ Ism va telefon raqami bo'sh bo'lmasligi kerak!");
                                return;
                              }
                              
                              setCourierList(prev => prev.map(item => {
                                if (item.id === editingCourier.id) {
                                  const diff = editingCourier.balance - item.balance;
                                  if (diff !== 0 && setCourierTransactions) {
                                    const now = new Date();
                                    const timeStr = now.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' });
                                    const dateStr = `${now.getDate().toString().padStart(2, '0')}.${(now.getMonth() + 1).toString().padStart(2, '0')}.${now.getFullYear()}`;

                                    const newTx = {
                                      id: `tx-admin-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
                                      type: diff > 0 ? 'refill' : 'deduction',
                                      amount: Math.abs(diff),
                                      description: diff > 0 
                                        ? `Admin tomonidan balans to'ldirildi (${editingCourier.name})`
                                        : `Admin tomonidan balansdan yechildi (${editingCourier.name})`,
                                      time: timeStr,
                                      date: dateStr,
                                      createdAt: now.toISOString()
                                    };
                                    setCourierTransactions((prevTx: any[]) => [newTx, ...(prevTx || [])]);
                                  }

                                  // If this is the currently active courier prop, sync back to App states!
                                  if (item.phone === courierPhone) {
                                    setCourierName(editingCourier.name);
                                    setCourierPhone(editingCourier.phone);
                                    
                                    setIsCourierOnline(editingCourier.isOnline);
                                  }
                                  return { ...editingCourier };
                                }
                                return item;
                              }));
                              
                              showToast(`✅ Kuryer ${editingCourier.name} ma'lumotlari yangilandi!`);
                              setEditingCourier(null);
                            }}
                            className="w-full py-2.5 rounded-xl bg-[#6366F1] hover:bg-[#4F46E5] text-white font-black uppercase text-[10px] tracking-wider transition-all shadow-md cursor-pointer"
                          >
                            O'zgarishlarni Saqlash
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  </div>
                )}

                {courierToDelete && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <motion.div
                      initial={{ scale: 0.95, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.95, opacity: 0 }}
                      className={`relative w-full max-w-sm rounded-3xl border shadow-2xl p-6 ${
                        isAdminDarkMode ? 'bg-[#0F172A] border-slate-800 text-white' : 'bg-white border-slate-150 text-slate-800'
                      }`}
                    >
                      <div className="text-center space-y-4">
                        <div className="h-12 w-12 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto text-2xl">
                          ⚠️
                        </div>
                        <div className="space-y-2">
                          <h3 className="text-sm font-black uppercase tracking-wider">Kuryerni o'chirish</h3>
                          <p className="text-xs text-slate-400">
                            Haqiqatdan ham ushbu kuryerni (<span className="font-bold text-slate-200">{courierToDelete.name}</span>) butunlayga o'chirmoqchimisiz?
                          </p>
                        </div>
                        <div className="grid grid-cols-2 gap-3 pt-2">
                          <button
                            onClick={() => setCourierToDelete(null)}
                            className={`py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider border cursor-pointer ${
                              isAdminDarkMode 
                                ? 'bg-slate-900 border-slate-800 hover:bg-slate-800 text-slate-300' 
                                : 'bg-slate-100 border-slate-200 hover:bg-slate-200 text-slate-700'
                            }`}
                          >
                            Yo'q
                          </button>
                          <button
                            onClick={() => {
                              setCourierList(prev => prev.filter(item => item.id !== courierToDelete.id));
                              showToast(`🗑️ Kuryer ${courierToDelete.name} butunlay o'chirildi.`);
                              setCourierToDelete(null);
                            }}
                            className="py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black uppercase text-[10px] tracking-wider cursor-pointer border-none"
                          >
                            Ha
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  </div>
                )}

                {replenishingCourier && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <motion.div
                      initial={{ scale: 0.95, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.95, opacity: 0 }}
                      className={`relative w-full max-w-sm rounded-3xl border shadow-2xl p-6 ${
                        isAdminDarkMode ? 'bg-[#0F172A] border-slate-800 text-white' : 'bg-white border-slate-150 text-slate-800'
                      }`}
                    >
                      <button
                        onClick={() => setReplenishingCourier(null)}
                        className="absolute top-4 right-4 p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 cursor-pointer"
                      >
                        <X className="h-4 w-4" />
                      </button>

                      <div className="space-y-4">
                        <div className="text-center">
                          <div className="h-12 w-12 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto text-2xl mb-2">
                            💵
                          </div>
                          <h3 className="text-sm font-black uppercase tracking-wider">Balansni to'ldirish</h3>
                          <p className="text-xs text-slate-400 mt-1">
                            Kuryer: <span className="font-bold text-indigo-500">{replenishingCourier.name}</span>
                          </p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                            Joriy balans: <span className="font-bold font-mono text-emerald-400">{replenishingCourier.balance.toLocaleString('uz-UZ')} so'm</span>
                          </p>
                        </div>

                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">To'ldirish summasi (so'm)</label>
                          <input
                            type="number"
                            placeholder="Masalan: 50000"
                            value={replenishAmount}
                            onChange={(e) => setReplenishAmount(e.target.value)}
                            className={`w-full p-3 text-xs font-bold rounded-xl border focus:outline-none focus:ring-1 focus:ring-indigo-500 ${
                              isAdminDarkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-700'
                            }`}
                          />
                        </div>

                        {/* Quick amount presets */}
                        <div className="grid grid-cols-3 gap-2">
                          {[20000, 50000, 100000].map((preset) => (
                            <button
                              key={preset}
                              type="button"
                              onClick={() => setReplenishAmount(preset.toString())}
                              className={`py-1.5 px-2 rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${
                                isAdminDarkMode
                                  ? 'bg-slate-900 border-slate-800 hover:bg-slate-850 text-slate-300'
                                  : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-600 shadow-sm'
                              }`}
                            >
                              +{preset.toLocaleString('uz-UZ')}
                            </button>
                          ))}
                        </div>

                        <div className="grid grid-cols-2 gap-3 pt-2">
                          <button
                            onClick={() => setReplenishingCourier(null)}
                            className={`py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider border cursor-pointer ${
                              isAdminDarkMode 
                                ? 'bg-slate-900 border-slate-800 hover:bg-slate-800 text-slate-300' 
                                : 'bg-slate-100 border-slate-200 hover:bg-slate-200 text-slate-700'
                            }`}
                          >
                            Bekor qilish
                          </button>
                          <button
                            onClick={() => {
                              const amount = parseFloat(replenishAmount);
                              if (isNaN(amount) || amount <= 0) {
                                showToast("❌ Iltimos, to'g'ri musbat summa kiriting!");
                                return;
                              }
                              setCourierList(prev => prev.map(item => {
                                if (item.id === replenishingCourier.id) {
                                  const newBal = item.balance + amount;
                                  return { ...item, balance: newBal };
                                }
                                return item;
                              }));

                              // Push transaction into courier transactions history
                              const now = new Date();
                              const timeStr = now.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' });
                              const dateStr = `${now.getDate().toString().padStart(2, '0')}.${(now.getMonth() + 1).toString().padStart(2, '0')}.${now.getFullYear()}`;
                              const fullTimestamp = `${dateStr}, ${timeStr}`;

                              const newTx = {
                                id: `tx-admin-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
                                type: 'refill',
                                amount: amount,
                                description: `Admin tomonidan balans to'ldirildi (${replenishingCourier.name})`,
                                time: timeStr,
                                date: dateStr,
                                createdAt: now.toISOString()
                              };

                              if (setCourierTransactions) {
                                setCourierTransactions((prevTx: any[]) => [newTx, ...(prevTx || [])]);
                              }

                              showToast(`✅ ${replenishingCourier.name} balansi ${amount.toLocaleString('uz-UZ')} so'mga to'ldirildi!`);
                              setReplenishingCourier(null);
                            }}
                            className="py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase text-[10px] tracking-wider cursor-pointer border-none shadow-md"
                          >
                            To'ldirish
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  </div>
                )}
              </AnimatePresence>

            </div>
          )}

          {/* ================= TAB: SYSTEM & CUSTOMER SETTINGS ================= */}
          {activeTab === 'system' && (
            <div className="max-w-3xl mx-auto space-y-6">
              
              {/* General System Config */}
              <div className="bg-[#0F172A] border border-slate-800 p-5 rounded-3xl space-y-4 text-xs">
                <div className="flex items-center space-x-1.5 border-b border-slate-800 pb-3">
                  <Sliders className="h-4.5 w-4.5 text-emerald-400" />
                  <h3 className="text-xs font-black text-white uppercase tracking-wider">ILOVA TIZIMI PARAMETRLARI</h3>
                </div>

                <div className="space-y-3.5">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[9px] font-black text-slate-400 uppercase mb-1 tracking-wider">Eng kam buyurtma (so'm):</label>
                      <input
                        type="number"
                        value={minOrderLimit}
                        onChange={(e) => setMinOrderLimit(parseInt(e.target.value) || 0)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 font-bold text-white focus:outline-none focus:border-emerald-500 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-black text-slate-400 uppercase mb-1 tracking-wider">Ko'p nuqta to'xtash haqi (so'm):</label>
                      <input
                        type="number"
                        value={extraStopFee}
                        onChange={(e) => setExtraStopFee && setExtraStopFee(parseInt(e.target.value) || 0)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 font-bold text-white focus:outline-none focus:border-emerald-500 font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[9px] font-black text-slate-400 uppercase mb-1 tracking-wider">Chek Talab Qilinadigan Limit:</label>
                      <input
                        type="number"
                        value={cashlessLimit}
                        onChange={(e) => setCashlessLimit(parseInt(e.target.value) || 0)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 font-bold text-white focus:outline-none focus:border-emerald-500 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-black text-emerald-400 uppercase mb-1 tracking-wider">Kuryer Komissiyasi (%):</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={deliveryCommissionRate}
                        onChange={(e) => setDeliveryCommissionRate && setDeliveryCommissionRate(Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)))}
                        className="w-full bg-slate-900 border border-emerald-500/40 rounded-xl p-2.5 font-bold text-emerald-400 focus:outline-none focus:border-emerald-400 font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[9px] font-black text-slate-400 uppercase mb-1 tracking-wider">Admin Plastik Karta Raqami:</label>
                      <input
                        type="text"
                        value={adminCardNumber}
                        onChange={(e) => setAdminCardNumber(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 font-bold text-white focus:outline-none focus:border-emerald-500 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-black text-slate-400 uppercase mb-1 tracking-wider">Karta Egasi (Card Holder):</label>
                      <input
                        type="text"
                        value={cardHolderName}
                        onChange={(e) => {
                          const val = e.target.value;
                          setCardHolderName(val);
                          safeSetItem('kasbigo_cardHolderName', val);
                          safeSetItem('kasbigo-card-holder-name', val);
                        }}
                        placeholder="Masalan: SHERZOD M."
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 font-bold text-white focus:outline-none focus:border-emerald-500 uppercase"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[9px] font-black text-slate-400 uppercase mb-1 tracking-wider">Admin Telefon:</label>
                      <PhoneInput
                        value={adminPhone}
                        onChange={(val) => setAdminPhone(val)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 font-bold text-white focus:outline-none focus:border-emerald-500 font-mono text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-black text-slate-400 uppercase mb-1 tracking-wider">Telegram Link (Username):</label>
                      <input
                        type="text"
                        value={adminTelegram}
                        onChange={(e) => setAdminTelegram(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 font-bold text-white focus:outline-none focus:border-emerald-500 font-mono"
                      />
                    </div>
                  </div>

                  {/* Saqlash tugmasi - Ilova Tizimi Parametrlari */}
                  <div className="pt-2 flex justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        const data = { minOrderLimit, extraStopFee, cashlessLimit, deliveryCommissionRate, adminCardNumber, adminPhone, adminTelegram };
                        safeSetItem('kasbigo-system-params', JSON.stringify(data));
                        safeSetItem('kasbigo_cardHolderName', cardHolderName);
                        safeSetItem('kasbigo-card-holder-name', cardHolderName);
                        showToast("✅ Ilova tizimi parametrlari saqlandi!");
                      }}
                      className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-xl shadow-md transition-all flex items-center space-x-1.5 cursor-pointer border-none"
                    >
                      <span>💾</span>
                      <span>Saqlash</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* DELIVERY ZONES MANAGEMENT SECTION (STEP 4) */}
              <div className="bg-[#0F172A] border border-slate-800 p-5 rounded-3xl space-y-4 text-xs">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center space-x-2">
                    <MapPin className="h-4.5 w-4.5 text-emerald-400" />
                    <div>
                      <h3 className="text-xs font-black text-white uppercase tracking-wider">YETKAZISH ZONALARI VA MAHALLALAR BOSHQARUVI (5 TA HUDUD)</h3>
                      <p className="text-[10px] text-slate-500">Mijozlar mahalla tanlaganda yetkazib berish narxi avtomatik ravishda belgilangan zona bo'yicha hisoblanadi.</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  {zonesList.map((zone, idx) => (
                    <div key={zone.id || idx} className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-[9px] font-black text-slate-400 uppercase mb-1">Zona Nomi (Admin uchun):</label>
                          <input
                            type="text"
                            value={zone.zoneName}
                            onChange={(e) => handleUpdateZoneName(zone.id, e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs font-bold text-white focus:outline-none focus:border-emerald-500"
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] font-black text-slate-400 uppercase mb-1">Masofa Nomi / Chegarasi:</label>
                          <input
                            type="text"
                            value={zone.distanceLabel}
                            onChange={(e) => handleUpdateZoneDistance(zone.id, e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs font-bold text-white focus:outline-none focus:border-emerald-500"
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] font-black text-slate-400 uppercase mb-1">Yetkazish Narxi (so'm):</label>
                          <input
                            type="number"
                            value={zone.price}
                            onChange={(e) => handleUpdateZonePrice(zone.id, parseInt(e.target.value) || 0)}
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs font-bold text-emerald-400 focus:outline-none focus:border-emerald-500 font-mono"
                          />
                        </div>
                      </div>

                      {/* Mahallas list tags */}
                      <div className="space-y-2">
                        <label className="block text-[9px] font-black text-slate-400 uppercase">
                          Ushbu zonaga tegishli mahalla va qishloqlar ({zone.mahallas.length} ta):
                        </label>
                        <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-1">
                          {zone.mahallas.map((m, mIdx) => (
                            <span
                              key={`${zone.id}-${m}-${mIdx}`}
                              className="inline-flex items-center space-x-1 px-2.5 py-1 bg-slate-800 text-slate-200 border border-slate-700 rounded-lg text-[10px] font-semibold"
                            >
                              <span>{m}</span>
                              <button
                                type="button"
                                onClick={() => handleDeleteMahallaFromZone(zone.id, m)}
                                className="text-slate-400 hover:text-rose-400 p-0.5 rounded transition-all border-none cursor-pointer"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </span>
                          ))}
                        </div>

                        {/* Add mahalla input */}
                        <div className="flex items-center space-x-2 pt-1">
                          <input
                            type="text"
                            placeholder="Yangi mahalla yoki qishloq nomi..."
                            value={newMahallaInputs[zone.id] || ''}
                            onChange={(e) => setNewMahallaInputs(prev => ({ ...prev, [zone.id]: e.target.value }))}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleAddMahallaToZone(zone.id);
                              }
                            }}
                            className="flex-1 bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                          />
                          <button
                            type="button"
                            onClick={() => handleAddMahallaToZone(zone.id)}
                            className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all border-none cursor-pointer flex items-center space-x-1"
                          >
                            <Plus className="h-3.5 w-3.5" />
                            <span>Qo'shish</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Saqlash tugmasi - Yetkazish Zonalari */}
                  <div className="pt-2 flex justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        safeSetItem('kasbigo-delivery-zones', JSON.stringify(zonesList));
                        showToast("✅ Yetkazish zonalari va mahallalar saqlandi!");
                      }}
                      className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-xl shadow-md transition-all flex items-center space-x-1.5 cursor-pointer border-none"
                    >
                      <span>💾</span>
                      <span>Saqlash</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* MANDATORY ONLINE PAYMENT CATEGORIES MANAGEMENT SECTION */}
              <div className={`${th.sectionBg} border ${th.border} p-5 rounded-3xl space-y-4 text-xs md:col-span-2 shadow-sm`}>
                <div className={`flex items-center justify-between border-b ${th.border} pb-3`}>
                  <div className="flex items-center space-x-2">
                    <ShieldAlert className="h-4.5 w-4.5 text-amber-500" />
                    <div>
                      <h3 className={`text-xs font-black uppercase tracking-wider ${th.textTitle}`}>💳 MAJBURIY ONLAYN TO'LOV KATEGORIYALARI (NAQD CHEKLANGAN KATEGORIYALAR)</h3>
                      <p className={`text-[10px] ${th.textMuted} mt-0.5`}>
                        Mavjud tumandagi kategoriyalardan birontasi tanlanganda, ushbu ro'yxat bo'yicha Naqd to'lov avtomatik o'chiriladi. Yangi kategoriya Kataloqda yaratilganda bu yerda avtomatik paydo bo'ladi.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {(Array.from(new Set(availableCategories)) as string[]).map((cat, catIdx) => {
                      const isMandatory = (mandatoryOnlineCategories || []).some(
                        c => c.trim().toLowerCase() === cat.trim().toLowerCase()
                      );
                      return (
                        <label
                          key={`avail-cat-${cat}-${catIdx}`}
                          onClick={(e) => {
                            e.preventDefault();
                            if (!setMandatoryOnlineCategories) return;
                            if (isMandatory) {
                              setMandatoryOnlineCategories(
                                (mandatoryOnlineCategories || []).filter(
                                  c => c.trim().toLowerCase() !== cat.trim().toLowerCase()
                                )
                              );
                              showToast(`"${cat}" kategoriyasi uchun Naqd to'lovga ruxsat berildi`);
                            } else {
                              setMandatoryOnlineCategories([...(mandatoryOnlineCategories || []), cat]);
                              showToast(`"${cat}" kategoriyasi uchun Majburiy Onlayn to'lov yoqildi 💳`);
                            }
                          }}
                          className={`p-3 rounded-2xl border flex items-center justify-between cursor-pointer transition-all select-none ${
                            isMandatory
                              ? 'bg-amber-500/15 border-amber-500/40 text-amber-500 shadow-sm font-black'
                              : `${th.inputBg} ${th.border} ${th.textMuted} hover:border-amber-400`
                          }`}
                        >
                          <div className="flex items-center space-x-2 min-w-0">
                            <input
                              type="checkbox"
                              checked={isMandatory}
                              readOnly
                              className="accent-amber-500 h-4 w-4 rounded cursor-pointer shrink-0"
                            />
                            <span className="font-extrabold text-xs truncate">{cat}</span>
                          </div>
                          <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full shrink-0 ${
                            isMandatory
                              ? 'bg-amber-500 text-slate-950'
                              : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                          }`}>
                            {isMandatory ? 'Onlayn Majburiy' : 'Naqd Boshqa'}
                          </span>
                        </label>
                      );
                    })}
                  </div>

                  {/* Saqlash tugmasi - Majburiy Onlayn To'lov Kategoriyalari */}
                  <div className="pt-2 flex justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        safeSetItem('kasbigo-cashless-categories', JSON.stringify(mandatoryOnlineCategories));
                        showToast("✅ Majburiy onlayn to'lov kategoriyalari saqlandi!");
                      }}
                      className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-xl shadow-md transition-all flex items-center space-x-1.5 cursor-pointer border-none"
                    >
                      <span>💾</span>
                      <span>Saqlash</span>
                    </button>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* ================= TAB: BLACKLIST (QORA RO'YXAT) ================= */}
          {activeTab === 'blacklist' && (
            <div className="space-y-6 animate-fade-in">
              <div className="bg-[#0F172A] border border-slate-800 p-6 rounded-3xl space-y-6 text-xs text-slate-300">
                <div className="flex items-center space-x-2 border-b border-slate-800 pb-4">
                  <UserMinus className="h-5 w-5 text-rose-500 animate-pulse" />
                  <div>
                    <h3 className="text-sm font-black text-white uppercase tracking-wider">🚫 Qora Ro'yxat (Blacklist)</h3>
                    <p className="text-[10px] text-slate-500 font-medium block mt-1 leading-normal">
                      Soxta buyurtma yoki asossiz cheklar yuboruvchi xaridorlarni ushbu ro'yxat orqali nazorat qiling. Bloklangan mijoz ilovani ishlata olmaydi.
                    </p>
                  </div>
                </div>

                {/* Form to add to blacklist */}
                <div className="bg-[#090D1A] border border-slate-850 p-4 rounded-2xl space-y-3.5">
                  <span className="text-[10px] font-black text-rose-400 uppercase tracking-widest block">➕ Qora Ro'yxatga Yangi Mijoz Qo'shish:</span>
                  <div className="flex flex-col sm:flex-row space-y-2.5 sm:space-y-0 sm:space-x-3.5 items-end">
                    <div className="flex-1 w-full">
                      <label className="block text-[8px] font-black text-slate-400 uppercase mb-1.5 tracking-wider">Mijoz Telefon Raqami (Masalan: +998901234567):</label>
                      <PhoneInput
                        value={blacklistPhoneInput}
                        onChange={(val) => setBlacklistPhoneInput(val)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 font-bold text-white focus:outline-none focus:border-rose-500 font-mono text-xs"
                      />
                    </div>
                    <button
                      onClick={() => {
                        const trimmed = blacklistPhoneInput.trim();
                        if (!trimmed) {
                          showToast("⚠️ Iltimos, telefon raqamini kiriting!");
                          return;
                        }
                        if ((blacklistedPhones || []).includes(trimmed)) {
                          showToast("⚠️ Bu mijoz allaqachon qora ro'yxatda bor!");
                          return;
                        }
                        setBlacklistedPhones(prev => [...(prev || []), trimmed]);
                        if (trimmed === userProfile.phone) {
                          setIsBlacklisted(true);
                        }
                        setBlacklistPhoneInput('');
                        showToast("Mijoz qora ro'yxatga muvaffaqiyatli qo'shildi! 🛑");
                      }}
                      className="bg-rose-500 hover:bg-rose-400 active:scale-95 text-slate-950 font-black text-[10px] uppercase tracking-wider px-5 py-3 rounded-xl transition-all h-11 cursor-pointer border-none flex items-center justify-center space-x-1"
                    >
                      <span>Bloklash (LOCK) 🛑</span>
                    </button>
                  </div>
                </div>

                {/* Blacklisted list table */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center px-1">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                      Joriy bloklangan qurilmalar ({ (blacklistedPhones || []).length })
                    </span>
                  </div>

                  {(blacklistedPhones || []).length > 0 ? (
                    <div className="bg-[#090D1A] border border-slate-850 rounded-2xl overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="border-b border-slate-850 bg-slate-950/25 text-[8.5px] font-black text-slate-500 uppercase tracking-wider">
                              <th className="py-3 px-4">Mijoz Ismi</th>
                              <th className="py-3 px-4">Telefon Raqami</th>
                              <th className="py-3 px-4">Oxirgi Buyurtmasi</th>
                              <th className="py-3 px-4 text-center">Holati</th>
                              <th className="py-3 px-4 text-right">Amal</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-850/50">
                            {(Array.from(new Set(blacklistedPhones || [])) as string[]).map((phone, pIdx) => {
                              const relatedOrder = [...orders].reverse().find(o => o.customerPhone === phone);
                              const clientName = relatedOrder ? relatedOrder.customerName : "Yangi / Noma'lum Mijoz";
                              const lastOrderTime = relatedOrder ? `${relatedOrder.date} soat: ${relatedOrder.time}` : "Mavjud emas";
                              return (
                                <tr key={`black-${phone}-${pIdx}`} className="hover:bg-slate-950/20 transition-all font-semibold text-slate-300">
                                  <td className="py-3.5 px-4 font-bold text-white text-[11px] max-w-[150px] truncate">{clientName}</td>
                                  <td className="py-3.5 px-4 font-mono font-bold text-slate-400 text-[11px]">{phone}</td>
                                  <td className="py-3.5 px-4 text-slate-400 text-[10px]">{lastOrderTime}</td>
                                  <td className="py-3.5 px-4 text-center">
                                    <span className="bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-md text-[8px] font-black uppercase px-2 py-0.5 tracking-wider inline-block">
                                      ❌ BLOKLANGAN
                                    </span>
                                  </td>
                                  <td className="py-3.5 px-4 text-right">
                                    <button
                                      onClick={() => {
                                        setBlacklistedPhones(prev => (prev || []).filter(p => p !== phone));
                                        if (phone === userProfile.phone) {
                                          setIsBlacklisted(false);
                                        }
                                        showToast("Mijoz muvaffaqiyatli qulfdan chiqarildi! ✅");
                                      }}
                                      className="py-1.5 px-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-[9px] font-black uppercase tracking-wider rounded-lg cursor-pointer transition-all active:scale-95 border-none inline-flex items-center space-x-1"
                                    >
                                      <span>🔓 Blokdan yechish</span>
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : (
                    <div className="p-8 text-center border border-dashed border-slate-800 rounded-2xl text-slate-500 bg-[#090D1A]/50 font-semibold text-[10px] uppercase tracking-wider">
                      📭 Hozircha qora ro'yxat bo'sh. Hech qanday foydalanuvchi bloklanmagan.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ================= TAB: CONTENT & DESIGN EDITOR ================= */}
          {activeTab === 'content' && (
            <div className="space-y-6">
              {/* Content Sub-tab selector */}
              <div className="flex bg-slate-900 border border-slate-800 p-1.5 rounded-2xl text-xs font-black uppercase tracking-wider select-none overflow-x-auto whitespace-nowrap">
                <button
                  onClick={() => setContentSubTab('banners')}
                  className={`py-2.5 px-4 rounded-xl transition-all cursor-pointer flex items-center space-x-2 ${
                    contentSubTab === 'banners' ? 'bg-emerald-500 text-slate-950 font-black shadow-md' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <span>📢 Reklama Bannerlari ({ALL_PROMOS.length})</span>
                </button>
                <button
                  onClick={() => setContentSubTab('categories')}
                  className={`py-2.5 px-4 rounded-xl transition-all cursor-pointer flex items-center space-x-2 ${
                    contentSubTab === 'categories' ? 'bg-emerald-500 text-slate-950 font-black shadow-md' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <span>📂 Katalog Bo'limlari ({ALL_CATEGORIES.length})</span>
                </button>
                <button
                  onClick={() => setContentSubTab('partners')}
                  className={`py-2.5 px-4 rounded-xl transition-all cursor-pointer flex items-center space-x-2 ${
                    contentSubTab === 'partners' ? 'bg-emerald-500 text-slate-950 font-black shadow-md' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <span>⭐ Mashhur Hamkorlar ({ALL_PARTNERS.length})</span>
                </button>
                <button
                  onClick={() => setContentSubTab('markets')}
                  className={`py-2.5 px-4 rounded-xl transition-all cursor-pointer flex items-center space-x-2 ${
                    contentSubTab === 'markets' ? 'bg-emerald-500 text-slate-950 font-black shadow-md' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <span>🏪 Marketlarni boshqarish ({stores.length})</span>
                </button>
                <button
                  onClick={() => setContentSubTab('products')}
                  className={`py-2.5 px-4 rounded-xl transition-all cursor-pointer flex items-center space-x-2 ${
                    contentSubTab === 'products' ? 'bg-emerald-500 text-slate-950 font-black shadow-md' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <span>🍔 Mahsulotlar ({stores.reduce((sum, s) => sum + s.products.length, 0)})</span>
                </button>
              </div>

              {/* Sub-view: Banners */}
              {contentSubTab === 'banners' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                  {/* Banners List */}
                  <div className="lg:col-span-2 bg-[#0F172A] border border-slate-800 rounded-3xl p-5 space-y-4">
                    <h3 className="text-xs font-black text-white uppercase tracking-widest border-b border-slate-800 pb-3">📢 Reklama Bannerlari Ro'yxati</h3>
                    <div className="space-y-3">
                      {ALL_PROMOS.map(ad => {
                        const isBgUploaded = ad.bg && (ad.bg.startsWith('data:image') || ad.bg.startsWith('http'));
                        return (
                          <div key={ad.id} className="bg-slate-950/40 border border-slate-850 p-4 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="flex items-start space-x-3.5">
                              <div 
                                style={isBgUploaded ? { backgroundImage: `url(${ad.bg})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}
                                className={`w-32 aspect-[16/9] shrink-0 rounded-xl flex items-center justify-center border border-slate-800/50 relative overflow-hidden ${isBgUploaded ? '' : `bg-gradient-to-br ${ad.bg || 'from-emerald-700 to-emerald-950'}`}`}
                              >
                                <div className="absolute inset-0 bg-slate-950/30" />
                                <span className="relative text-[9px] font-black text-white bg-slate-900/80 px-2 py-0.5 rounded uppercase tracking-wider">
                                  {ad.actionText || "O'tish"}
                                </span>
                              </div>
                              <div>
                                <h4 className="font-bold text-slate-100 text-sm leading-tight">{ad.title}</h4>
                                <p className="text-[10px] text-emerald-400 font-extrabold uppercase mt-1">🏷️ {ad.tag}</p>
                                <p className="text-[10px] text-slate-400 leading-tight mt-1 line-clamp-1">{ad.desc}</p>
                                <p className="text-[9px] text-slate-400 font-mono mt-1">
                                  🔗 Yo'nalish: <span className="text-emerald-400 font-bold">{ad.targetType === 'url' ? 'Tashqi URL' : ad.targetType === 'category' ? 'Kategoriya' : 'Do\'kon'}</span> ({ad.targetValue || ad.storeId || 'Yo\'q'})
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2 shrink-0 md:self-center">
                              <button
                                onClick={() => {
                                  setEditBannerId(ad.id);
                                  setBannerTitle(ad.title);
                                  setBannerTag(ad.tag);
                                  setBannerDesc(ad.desc || '');
                                  setBannerBg(ad.bg);
                                  setBannerActionText(ad.actionText || "O'tish");
                                  setBannerTargetType(ad.targetType || (ad.storeId ? 'store' : 'store'));
                                  setBannerTargetValue(ad.targetValue || ad.storeId || '');
                                }}
                                className="p-2 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 rounded-xl transition-all cursor-pointer"
                                title="Tahrirlash"
                              >
                                <Edit3 className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteBanner(ad.id)}
                                className="p-2 bg-slate-950 hover:bg-rose-950/20 text-slate-400 hover:text-rose-400 border border-slate-850 rounded-xl transition-all cursor-pointer"
                                title="O'chirish"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Banner Form */}
                  <div className="bg-[#0F172A] border border-slate-800 p-5 rounded-3xl space-y-4">
                    <h3 className="text-xs font-black text-white uppercase tracking-wider border-b border-slate-800 pb-3 flex items-center space-x-2">
                      <Sparkles className="h-4 w-4 text-emerald-400" />
                      <span>{editBannerId ? "BANNERNI TAHRIRLASH" : "YANGI REKLAMA BANNERI"}</span>
                    </h3>
                    <form onSubmit={handleSaveBanner} className="space-y-3.5 text-xs">
                      <div>
                        <label className="block text-[9px] font-black text-slate-400 uppercase mb-1 tracking-wider">Reklama Nomi (Sarlavha):</label>
                        <input
                          type="text"
                          required
                          value={bannerTitle}
                          onChange={(e) => setBannerTitle(e.target.value)}
                          placeholder="Masalan: Kasbi Market..."
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 font-bold text-white focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-black text-slate-400 uppercase mb-1 tracking-wider">Teg / Qisqa matn (Tag):</label>
                        <input
                          type="text"
                          required
                          value={bannerTag}
                          onChange={(e) => setBannerTag(e.target.value)}
                          placeholder="Masalan: ISSIQ NON VA ISSIQ CHOY..."
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 font-bold text-white focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-black text-slate-400 uppercase mb-1 tracking-wider">Tafsilot (Description):</label>
                        <textarea
                          value={bannerDesc}
                          onChange={(e) => setBannerDesc(e.target.value)}
                          placeholder="Foydalanuvchilar jalb qiluvchi matn..."
                          rows={2}
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 font-bold text-white focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-black text-slate-400 uppercase mb-1 tracking-wider">Amal tugmasi yozuvi:</label>
                        <input
                          type="text"
                          value={bannerActionText}
                          onChange={(e) => setBannerActionText(e.target.value)}
                          placeholder="O'tish >"
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 font-bold text-white focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-black text-slate-400 uppercase mb-1 tracking-wider">Yo'naltirish turi (Target Type):</label>
                        <select
                          value={bannerTargetType}
                          onChange={(e) => {
                            const newType = e.target.value as 'store' | 'category' | 'url';
                            setBannerTargetType(newType);
                            setBannerTargetValue('');
                          }}
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 font-bold text-slate-200 focus:outline-none focus:border-emerald-500"
                        >
                          <option value="store">🏬 Ilova ichidagi Do'kon</option>
                          <option value="category">📁 Ilova ichidagi Kategoriya</option>
                          <option value="url">🌐 Tashqi URL / Telegram Link</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[9px] font-black text-slate-400 uppercase mb-1 tracking-wider">
                          {bannerTargetType === 'store' ? "Bog'liq do'konni tanlang:" : bannerTargetType === 'category' ? "Kategoriyani tanlang:" : "Tashqi URL / Havolani kiriting:"}
                        </label>
                        {bannerTargetType === 'store' ? (
                          <select
                            value={bannerTargetValue}
                            onChange={(e) => setBannerTargetValue(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 font-bold text-slate-300 focus:outline-none focus:border-emerald-500"
                          >
                            <option value="">-- Tanlang --</option>
                            {stores.map(s => (
                              <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                          </select>
                        ) : bannerTargetType === 'category' ? (
                          <select
                            value={bannerTargetValue}
                            onChange={(e) => setBannerTargetValue(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 font-bold text-slate-300 focus:outline-none focus:border-emerald-500"
                          >
                            <option value="">-- Tanlang --</option>
                            {ALL_CATEGORIES.map(c => (
                              <option key={c.id} value={c.name}>{c.name}</option>
                            ))}
                          </select>
                        ) : (
                          <input
                            type="url"
                            value={bannerTargetValue}
                            onChange={(e) => setBannerTargetValue(e.target.value)}
                            placeholder="https://t.me/kasbigo yoki https://..."
                            className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 font-bold text-white focus:outline-none focus:border-emerald-500"
                          />
                        )}
                      </div>

                      <div>
                        <label className="block text-[9px] font-black text-slate-400 uppercase mb-1 tracking-wider">To'liq orqa fon rasmi (16:9 formatda, Full Background Image):</label>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleImageUpload(e, setBannerBg, true)}
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2 text-[10px] text-slate-400 cursor-pointer focus:outline-none"
                        />
                        <div className="flex items-center space-x-2 mt-1.5">
                          <span className="text-[8px] text-slate-500">Yoki Rasm URL kiriting:</span>
                          <input
                            type="text"
                            value={bannerBg}
                            onChange={(e) => setBannerBg(e.target.value)}
                            placeholder="https://images.unsplash.com/..."
                            className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-[10px] font-mono text-white focus:outline-none"
                          />
                        </div>
                      </div>

                      <div className="flex space-x-2 pt-2">
                        <button
                          type="submit"
                          className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black uppercase text-[10px] tracking-wider rounded-xl transition-all cursor-pointer"
                        >
                          {editBannerId ? "Saqlash" : "Qo'shish"}
                        </button>
                        {editBannerId && (
                          <button
                            type="button"
                            onClick={() => {
                              setEditBannerId(null);
                              setBannerTitle('');
                              setBannerTag('');
                              setBannerDesc('');
                              setBannerBg('');
                              setBannerActionText("O'tish");
                              setBannerTargetType('store');
                              setBannerTargetValue('');
                            }}
                            className="py-3 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold uppercase text-[10px] rounded-xl transition-all"
                          >
                            Bekor
                          </button>
                        )}
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {/* Sub-view: Categories */}
              {contentSubTab === 'categories' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                  {/* List of Categories */}
                  <div className="lg:col-span-2 bg-[#0F172A] border border-slate-800 rounded-3xl p-5 space-y-4">
                    <h3 className="text-xs font-black text-white uppercase tracking-widest border-b border-slate-800 pb-3">📂 Katalog Kategoriyalari Ro'yxati</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {ALL_CATEGORIES.map(cat => {
                        const isLogo = cat.icon && (
                          cat.icon.includes('p64BNF4B') || 
                          cat.icon.includes('a34c4781') || 
                          cat.icon.includes('kasbi_go_logo') || 
                          cat.icon.includes('kasbigo-logo')
                        );
                        const cleanIcon = isLogo ? undefined : cat.icon;
                        const isIconUploaded = cleanIcon && (cleanIcon.startsWith('data:image') || cleanIcon.startsWith('http')) && !cleanIcon.includes('p64BNF4B');
                        const emojiMap: Record<string, string> = {
                          market: "🛒",
                          dorixona: "💊",
                          fastfood: "🍔",
                          oshxona: "🍛",
                          restoran: "🍽️",
                          ichimliklar: "🥤",
                          gullar: "💐",
                          qurilish: "🏗️",
                          xojalik: "🧹",
                          boshqalar: "🎁"
                        };
                        const catIdLower = (cat.id || '').toLowerCase();
                        const catNameLower = (cat.name || '').toLowerCase();
                        let displayEmoji = cleanIcon && cleanIcon.length <= 4 && !cleanIcon.includes('Flower') && !cleanIcon.includes('Pill') ? cleanIcon : (emojiMap[catIdLower] || "📦");
                        if (displayEmoji === "📦") {
                          if (catNameLower.includes('gullar') || catNameLower.includes('gul')) displayEmoji = "💐";
                          else if (catNameLower.includes('dorixona') || catNameLower.includes('dori')) displayEmoji = "💊";
                          else if (catNameLower.includes('qurilish')) displayEmoji = "🏗️";
                          else if (catNameLower.includes('xojalik') || catNameLower.includes('xo\'jalik')) displayEmoji = "🧹";
                        }
                        return (
                          <div key={cat.id} className="bg-slate-950/40 border border-slate-850 p-3 rounded-2xl flex items-center justify-between">
                            <div className="flex items-center space-x-3 min-w-0">
                              <div className="h-10 w-10 shrink-0 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-center text-xl select-none">
                                {isIconUploaded && cleanIcon ? (
                                  <img src={cleanIcon} className="h-6 w-6 object-contain rounded" />
                                ) : (
                                  displayEmoji
                                )}
                              </div>
                              <div className="min-w-0">
                                <h4 className="font-bold text-slate-100 truncate text-xs">{cat.name}</h4>
                                <span className="text-[10px] text-slate-500 font-semibold">{cat.count || "12 ta do'kon"}</span>
                              </div>
                            </div>
                            <div className="flex items-center space-x-1 shrink-0">
                              <button
                                onClick={() => {
                                  setEditCategoryId(cat.id);
                                  setCategoryName(cat.name);
                                  setCategoryIcon(cat.icon);
                                  setCategoryCount(cat.count || "12 ta do'kon");
                                }}
                                className="p-1.5 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 rounded-lg transition-all cursor-pointer"
                              >
                                <Edit3 className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteCategory(cat.id)}
                                className="p-1.5 bg-slate-950 hover:bg-rose-950/20 text-slate-400 hover:text-rose-400 border border-slate-850 rounded-lg transition-all cursor-pointer"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Category Form */}
                  <div className="bg-[#0F172A] border border-slate-800 p-5 rounded-3xl space-y-4">
                    <h3 className="text-xs font-black text-white uppercase tracking-wider border-b border-slate-800 pb-3">
                      {editCategoryId ? "KATEGORIYANI TAHRIRLASH" : "YANGI BO'LIM (KATEGORIYA)"}
                    </h3>
                    <form onSubmit={handleSaveCategory} className="space-y-3.5 text-xs">
                      <div>
                        <label className="block text-[9px] font-black text-slate-400 uppercase mb-1 tracking-wider">Katalog Bo'limi Nomi:</label>
                        <input
                          type="text"
                          required
                          value={categoryName}
                          onChange={(e) => setCategoryName(e.target.value)}
                          placeholder="Masalan: Uy Ro'zg'or buyumlari..."
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 font-bold text-white focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-black text-slate-400 uppercase mb-1 tracking-wider">Ikonka rasmini yuklash (Galereyadan):</label>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleImageUpload(e, setCategoryIcon)}
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2 text-[10px] text-slate-400 cursor-pointer focus:outline-none"
                        />
                        <div className="flex items-center space-x-2 mt-1.5">
                          <span className="text-[8px] text-slate-500">Yoki emoji yozing:</span>
                          <input
                            type="text"
                            value={categoryIcon.startsWith('data:') ? '' : categoryIcon}
                            onChange={(e) => setCategoryIcon(e.target.value)}
                            placeholder="🛋️"
                            className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-[10px] text-white focus:outline-none"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-[9px] font-black text-slate-400 uppercase mb-1 tracking-wider">Ilovadagi ta'rif (Count matni):</label>
                        <input
                          type="text"
                          value={categoryCount}
                          onChange={(e) => setCategoryCount(e.target.value)}
                          placeholder="Masalan: 12 ta do'kon..."
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 font-bold text-white focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                      <div className="flex space-x-2 pt-2">
                        <button
                          type="submit"
                          className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black uppercase text-[10px] tracking-wider rounded-xl transition-all cursor-pointer"
                        >
                          {editCategoryId ? "Saqlash" : "Qo'shish"}
                        </button>
                        {editCategoryId && (
                          <button
                            type="button"
                            onClick={() => {
                              setEditCategoryId(null);
                              setCategoryName('');
                              setCategoryIcon('');
                              setCategoryCount("12 ta do'kon");
                            }}
                            className="py-3 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold uppercase text-[10px] rounded-xl transition-all"
                          >
                            Bekor
                          </button>
                        )}
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {/* Sub-view: Partners */}
              {contentSubTab === 'partners' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                  {/* List of Partners */}
                  <div className="lg:col-span-2 bg-[#0F172A] border border-slate-800 rounded-3xl p-5 space-y-4">
                    <h3 className="text-xs font-black text-white uppercase tracking-widest border-b border-slate-800 pb-3">⭐ Mashhur Hamkorlar Ro'yxati</h3>
                    <div className="space-y-2.5">
                      {ALL_PARTNERS.map(partner => (
                        <div key={partner.id} className="bg-slate-950/40 border border-slate-850 p-3 rounded-2xl flex items-center justify-between text-xs">
                          <div className="flex items-center space-x-3 min-w-0">
                            <img src={partner.image} alt="" className="h-12 w-12 rounded-xl object-cover border border-slate-800 bg-slate-900 shrink-0" />
                            <div className="min-w-0">
                              <h4 className="font-bold text-slate-100 truncate">{partner.name}</h4>
                              <p className="text-[10px] text-slate-500 truncate">{partner.location} • ⭐ {partner.rating}</p>
                              <p className="text-[9px] text-emerald-500 font-mono">Min buyurtma: {partner.minOrder.toLocaleString()} so'm</p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-1 shrink-0">
                            <button
                              onClick={() => {
                                setEditPartnerId(partner.id);
                                setPartnerName(partner.name);
                                setPartnerImage(partner.image);
                                setPartnerRating(partner.rating.toString());
                                setPartnerLocation(partner.location);
                                setPartnerDeliveryTime(partner.deliveryTime);
                                setPartnerMinOrder(partner.minOrder);
                                setPartnerStoreId(partner.storeId || '');
                              }}
                              className="p-1.5 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 rounded-lg transition-all cursor-pointer"
                            >
                              <Edit3 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeletePartner(partner.id)}
                              className="p-1.5 bg-slate-950 hover:bg-rose-950/20 text-slate-400 hover:text-rose-400 border border-slate-850 rounded-lg transition-all cursor-pointer"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Partner Form */}
                  <div className="bg-[#0F172A] border border-slate-800 p-5 rounded-3xl space-y-4">
                    <h3 className="text-xs font-black text-white uppercase tracking-wider border-b border-slate-800 pb-3">
                      {editPartnerId ? "HAMKORNI TAHRIRLASH" : "YANGI MASHHUR HAMKOR"}
                    </h3>
                    <form onSubmit={handleSavePartner} className="space-y-3.5 text-xs">
                      <div>
                        <label className="block text-[9px] font-black text-slate-400 uppercase mb-1 tracking-wider">Hamkor (Do'kon) Nomi:</label>
                        <input
                          type="text"
                          required
                          value={partnerName}
                          onChange={(e) => setPartnerName(e.target.value)}
                          placeholder="Masalan: Kasbi Milliy Taomlari..."
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 font-bold text-white focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-black text-slate-400 uppercase mb-1 tracking-wider">Rasm / Logo yuklash (Galereyadan):</label>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleImageUpload(e, setPartnerImage)}
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2 text-[10px] text-slate-400 cursor-pointer focus:outline-none"
                        />
                        {partnerImage && (
                          <div className="mt-1.5 flex items-center space-x-2">
                            <span className="text-[8px] text-slate-500">Yuklangan rasm:</span>
                            <img src={partnerImage} alt="" className="h-7 w-7 rounded border border-slate-800 object-cover" />
                          </div>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[9px] font-black text-slate-400 uppercase mb-1 tracking-wider">Reyting:</label>
                          <input
                            type="text"
                            value={partnerRating}
                            onChange={(e) => setPartnerRating(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 font-bold text-white focus:outline-none focus:border-emerald-500"
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] font-black text-slate-400 uppercase mb-1 tracking-wider">Minimal buyurtma (so'm):</label>
                          <input
                            type="number"
                            value={partnerMinOrder}
                            onChange={(e) => setPartnerMinOrder(parseInt(e.target.value) || 0)}
                            className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 font-bold text-white focus:outline-none focus:border-emerald-500 font-mono"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-[9px] font-black text-slate-400 uppercase mb-1 tracking-wider">Manzil (Matn):</label>
                        <input
                          type="text"
                          value={partnerLocation}
                          onChange={(e) => setPartnerLocation(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 font-bold text-white focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-black text-slate-400 uppercase mb-1 tracking-wider">Yetkazish vaqti:</label>
                        <input
                          type="text"
                          value={partnerDeliveryTime}
                          onChange={(e) => setPartnerDeliveryTime(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 font-bold text-white focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-black text-slate-400 uppercase mb-1 tracking-wider">Bog'liq do'kon (Link):</label>
                        <select
                          value={partnerStoreId}
                          onChange={(e) => setPartnerStoreId(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 font-bold text-slate-300 focus:outline-none focus:border-emerald-500"
                        >
                          <option value="">-- Tanlang (Hech qaysi) --</option>
                          {stores.map(s => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                          ))}
                        </select>
                      </div>
                      <div className="flex space-x-2 pt-2">
                        <button
                          type="submit"
                          className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black uppercase text-[10px] tracking-wider rounded-xl transition-all cursor-pointer"
                        >
                          {editPartnerId ? "Saqlash" : "Qo'shish"}
                        </button>
                        {editPartnerId && (
                          <button
                            type="button"
                            onClick={() => {
                              setEditPartnerId(null);
                              setPartnerName('');
                              setPartnerImage('');
                              setPartnerRating('5.0');
                              setPartnerLocation("Kasbi tumani");
                              setPartnerDeliveryTime("15-25 min");
                              setPartnerMinOrder(10000);
                              setPartnerStoreId('');
                            }}
                            className="py-3 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold uppercase text-[10px] rounded-xl transition-all"
                          >
                            Bekor
                          </button>
                        )}
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {/* Sub-view: Markets */}
              {contentSubTab === 'markets' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                  {/* List of Markets (Stores) */}
                  <div className="lg:col-span-2 bg-[#0F172A] border border-slate-800 rounded-3xl p-5 space-y-4">
                    <h3 className="text-xs font-black text-white uppercase tracking-widest border-b border-slate-800 pb-3">🏪 Ro'yxatdan o'tgan Marketlar</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      {stores.map(store => (
                        <div key={store.id} className="bg-slate-950/40 border border-slate-850 p-3.5 rounded-2xl flex flex-col justify-between space-y-3">
                          <div className="flex items-start space-x-3">
                            <img src={store.image} alt="" className="h-12 w-12 rounded-xl object-cover border border-slate-800 shrink-0 bg-slate-900" />
                            <div className="min-w-0">
                              <h4 className="font-bold text-slate-100 text-xs truncate">{store.icon} {store.name}</h4>
                              <p className="text-[10px] text-slate-500 mt-0.5 font-bold uppercase">{store.category}</p>
                              <p className="text-[9px] text-slate-400 mt-1">{store.location} • {store.deliveryTime}</p>
                            </div>
                          </div>
                          <div className="flex items-center justify-between pt-2 border-t border-slate-900 text-[10px]">
                            <span className="font-mono text-emerald-400 font-bold">Min: {store.minOrder.toLocaleString()} so'm</span>
                            <div className="flex items-center space-x-1.5 shrink-0">
                              <button
                                onClick={() => {
                                  setEditStoreId(store.id);
                                  setStoreName(store.name);
                                  setStoreCategory(store.category);
                                  setStoreImage(store.image);
                                  setStoreIcon(store.icon);
                                  setStoreLocation(store.location);
                                  setStoreDeliveryTime(store.deliveryTime);
                                  setStoreRating(store.rating);
                                  setStoreMinOrder(store.minOrder);
                                  setStoreStatus(store.status || 'online');
                                }}
                                className="p-1.5 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 rounded-lg transition-all cursor-pointer"
                                title="Tahrirlash"
                              >
                                <Edit3 className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteStore(store.id)}
                                className="p-1.5 bg-slate-950 hover:bg-rose-950/20 text-slate-400 hover:text-rose-400 border border-slate-850 rounded-lg transition-all cursor-pointer"
                                title="Butunlay o'chirish"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Market (Store) Form */}
                  <div className="bg-[#0F172A] border border-slate-800 p-5 rounded-3xl space-y-4">
                    <h3 className="text-xs font-black text-white uppercase tracking-wider border-b border-slate-800 pb-3">
                      {editStoreId ? "MARKET MA'LUMOTLARINI TAHRIRLASH" : "YANGI MARKET (DO'KON) QO'SHISH"}
                    </h3>
                    <form onSubmit={handleSaveStore} className="space-y-3.5 text-xs">
                      <div>
                        <label className="block text-[9px] font-black text-slate-400 uppercase mb-1 tracking-wider">Market Sarlavhasi (Nomi):</label>
                        <input
                          type="text"
                          required
                          value={storeName}
                          onChange={(e) => setStoreName(e.target.value)}
                          placeholder="Masalan: Dorixona 24/7..."
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 font-bold text-white focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-black text-slate-400 uppercase mb-1 tracking-wider">Katalog Bo'limi (Kategoriya):</label>
                        <select
                          value={storeCategory}
                          onChange={(e) => setStoreCategory(e.target.value as Category)}
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 font-bold text-slate-300 focus:outline-none focus:border-emerald-500"
                        >
                          {ALL_CATEGORIES.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[9px] font-black text-slate-400 uppercase mb-1 tracking-wider">Foni Rasmini yuklash (Galereyadan):</label>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleImageUpload(e, setStoreImage)}
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2 text-[10px] text-slate-400 cursor-pointer focus:outline-none"
                        />
                        {storeImage && (
                          <div className="mt-1.5 flex items-center space-x-2">
                            <span className="text-[8px] text-slate-500">Yuklangan rasm:</span>
                            <img src={storeImage} alt="" className="h-7 w-7 rounded border border-slate-800 object-cover" />
                          </div>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[9px] font-black text-slate-400 uppercase mb-1 tracking-wider">Ikonka (Emoji/Simvol):</label>
                          <input
                            type="text"
                            value={storeIcon}
                            onChange={(e) => setStoreIcon(e.target.value)}
                            placeholder="🏪"
                            className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 font-bold text-white focus:outline-none focus:border-emerald-500"
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] font-black text-slate-400 uppercase mb-1 tracking-wider">Yetkazish vaqti:</label>
                          <input
                            type="text"
                            value={storeDeliveryTime}
                            onChange={(e) => setStoreDeliveryTime(e.target.value)}
                            placeholder="15-25 min"
                            className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 font-bold text-white focus:outline-none focus:border-emerald-500"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[9px] font-black text-slate-400 uppercase mb-1 tracking-wider">Minimal buyurtma (so'm):</label>
                          <input
                            type="number"
                            value={storeMinOrder}
                            onChange={(e) => setStoreMinOrder(parseInt(e.target.value) || 0)}
                            className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 font-bold text-white focus:outline-none focus:border-emerald-500 font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] font-black text-slate-400 uppercase mb-1 tracking-wider">Yetkazish Manzili (Matn):</label>
                          <input
                            type="text"
                            value={storeLocation}
                            onChange={(e) => setStoreLocation(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 font-bold text-white focus:outline-none focus:border-emerald-500"
                          />
                        </div>
                      </div>
                      <div className="flex space-x-2 pt-2">
                        <button
                          type="submit"
                          className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black uppercase text-[10px] tracking-wider rounded-xl transition-all cursor-pointer"
                        >
                          {editStoreId ? "Saqlash" : "Qo'shish"}
                        </button>
                        {editStoreId && (
                          <button
                            type="button"
                            onClick={() => {
                              setEditStoreId(null);
                              setStoreName('');
                              setStoreCategory('boshqalar');
                              setStoreImage('');
                              setStoreIcon('🏪');
                              setStoreLocation("Kasbi");
                              setStoreDeliveryTime("15-25 min");
                              setStoreRating(5.0);
                              setStoreMinOrder(10000);
                              setStoreStatus('online');
                            }}
                            className="py-3 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold uppercase text-[10px] rounded-xl transition-all"
                          >
                            Bekor
                          </button>
                        )}
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {/* Sub-view: Products */}
              {contentSubTab === 'products' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                  
                  {/* List of Products for the selected store */}
                  <div className="lg:col-span-2 bg-[#0F172A] border border-slate-800 rounded-3xl p-5 space-y-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                      <div>
                        <h3 className="text-xs font-black text-white uppercase tracking-widest">
                          🛍️ "{selectedStore?.name || 'Do\'kon'}" MAHSULOTLARI ({selectedStore?.products.length || 0})
                        </h3>
                        <p className="text-[10px] text-slate-400 mt-0.5">Ushbu marketdagi sotuvda mavjud barcha mahsulotlar</p>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <span className="text-[10px] text-slate-500 font-bold uppercase whitespace-nowrap">Marketni tanlang:</span>
                        <select
                          value={selectedStoreId}
                          onChange={(e) => {
                            setSelectedStoreId(e.target.value);
                            setEditingProductId(null);
                            setNewProductName('');
                            setNewProductPrice('');
                            setNewProductDesc('');
                            setNewProductImage('');
                          }}
                          className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 font-bold text-white text-xs focus:outline-none focus:border-emerald-500 cursor-pointer"
                        >
                          {stores.map(s => (
                            <option key={s.id} value={s.id}>{s.icon || '🏪'} {s.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1 scrollbar-thin">
                      {selectedStore && selectedStore.products.length > 0 ? (
                        selectedStore.products.map(product => {
                          const isImgUploaded = product.image && (product.image.startsWith('data:image') || product.image.startsWith('http'));
                          return (
                            <div key={product.id} className="bg-slate-950/40 border border-slate-850 p-3 rounded-2xl flex items-center justify-between text-xs transition-all hover:border-slate-850">
                              <div className="flex items-center space-x-3 min-w-0">
                                <div className="h-12 w-12 shrink-0 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-center text-2xl select-none overflow-hidden">
                                  {renderSafeProductImage(product.image, "h-full w-full")}
                                </div>
                                <div className="min-w-0">
                                  <h4 className="font-bold text-slate-100 truncate">{product.name}</h4>
                                  <p className="text-[10px] text-slate-500 truncate leading-tight mt-0.5">{product.description || 'Tafsilot kiritilmagan'}</p>
                                </div>
                              </div>

                              <div className="flex items-center space-x-2 shrink-0">
                                <span className="font-mono text-emerald-400 font-black bg-emerald-500/5 border border-emerald-500/10 px-2.5 py-1 rounded-lg">
                                  {product.price.toLocaleString('uz-UZ')} so'm
                                </span>
                                <button
                                  onClick={() => {
                                    setEditingProductId(product.id);
                                    setNewProductName(product.name);
                                    setNewProductPrice(product.price.toString());
                                    setNewProductDesc(product.description || '');
                                    setNewProductImage(product.image || '');
                                  }}
                                  className="p-1.5 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 rounded-lg transition-all cursor-pointer"
                                  title="Tahrirlash"
                                >
                                  <Edit3 className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDeleteProduct(product.id)}
                                  className="p-1.5 bg-slate-950 hover:bg-rose-950/20 text-slate-400 hover:text-rose-400 border border-slate-850 rounded-lg transition-all cursor-pointer"
                                  title="O'chirish"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div className="py-12 text-center border border-dashed border-slate-850 rounded-2xl text-slate-500">
                          <p className="text-xs">Ushbu marketda hali mahsulotlar yo'q.</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Product Form */}
                  <div className="bg-[#0F172A] border border-slate-800 p-5 rounded-3xl space-y-4">
                    <h3 className="text-xs font-black text-white uppercase tracking-wider border-b border-slate-800 pb-3 flex items-center space-x-2">
                      <Plus className="h-4 w-4 text-emerald-400" />
                      <span>{editingProductId ? "MAHSULOTNI TAHRIRLASH" : "YANGI MAHSULOT QO'SHISH"}</span>
                    </h3>
                    
                    <form onSubmit={handleSaveProduct} className="space-y-3.5 text-xs">
                      <div>
                        <label className="block text-[9px] font-black text-slate-400 uppercase mb-1 tracking-wider">Mahsulot Nomi:</label>
                        <input
                          type="text"
                          required
                          value={newProductName}
                          onChange={(e) => setNewProductName(e.target.value)}
                          placeholder="Masalan: Issiq non, Dorilar, Shaurma..."
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 font-bold text-white focus:outline-none focus:border-emerald-500"
                        />
                      </div>

                      <div>
                        <label className="block text-[9px] font-black text-slate-400 uppercase mb-1 tracking-wider">Narxi (so'mda):</label>
                        <input
                          type="number"
                          required
                          value={newProductPrice}
                          onChange={(e) => setNewProductPrice(e.target.value)}
                          placeholder="Masalan: 5000, 15000..."
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 font-bold text-white focus:outline-none focus:border-emerald-500 font-mono"
                        />
                      </div>

                      <div>
                        <label className="block text-[9px] font-black text-slate-400 uppercase mb-1 tracking-wider">Izoh / Tafsilot:</label>
                        <textarea
                          value={newProductDesc}
                          onChange={(e) => setNewProductDesc(e.target.value)}
                          placeholder="Mahsulot haqida qo'shimcha ma'lumotlar..."
                          rows={2}
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 font-bold text-white focus:outline-none focus:border-emerald-500"
                        />
                      </div>

                      <div>
                        <label className="block text-[9px] font-black text-slate-400 uppercase mb-1 tracking-wider">Mahsulot rasmi yuklash (Galereyadan):</label>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleImageUpload(e, setNewProductImage)}
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2 text-[10px] text-slate-400 cursor-pointer focus:outline-none"
                        />
                        {newProductImage && (
                          <div className="mt-1.5 flex items-center space-x-2">
                            <span className="text-[8px] text-slate-500">Rasm o'lchami moslashtirildi:</span>
                            {newProductImage.startsWith('data:') || newProductImage.startsWith('http') ? (
                              <img src={newProductImage} alt="" className="h-7 w-7 rounded border border-slate-800 object-cover" />
                            ) : (
                              <span className="text-xl">{newProductImage}</span>
                            )}
                          </div>
                        )}
                        <div className="flex items-center space-x-2 mt-1.5">
                          <span className="text-[8px] text-slate-500">Yoki emoji yozing:</span>
                          <input
                            type="text"
                            value={newProductImage.startsWith('data:') || newProductImage.startsWith('http') ? '' : newProductImage}
                            onChange={(e) => setNewProductImage(e.target.value)}
                            placeholder="🍎"
                            className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-[10px] text-white focus:outline-none"
                          />
                        </div>
                      </div>

                      <div className="flex space-x-2 pt-2">
                        <button
                          type="submit"
                          className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black uppercase text-[10px] tracking-wider rounded-xl transition-all cursor-pointer"
                        >
                          {editingProductId ? "Saqlash" : "Do'konga Joylashtirish"}
                        </button>
                        {editingProductId && (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingProductId(null);
                              setNewProductName('');
                              setNewProductPrice('');
                              setNewProductDesc('');
                              setNewProductImage('');
                            }}
                            className="py-3 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold uppercase text-[10px] rounded-xl transition-all"
                          >
                            Bekor
                          </button>
                        )}
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>

        {/* ========================================================= */}
        {/* 3. MOBILE STICKY BOTTOM NAVIGATION BAR                   */}
        {/* ========================================================= */}
        {!isDesktop && (
          <nav className="fixed bottom-0 left-0 right-0 h-16 bg-[#0F172A] border-t border-slate-850 flex items-center justify-around z-40 px-2 select-none shadow-lg">
            {[
              { id: 'stats', label: 'Tahlillar', icon: TrendingUp },
              { id: 'orders', label: 'Buyurtmalar', icon: ClipboardList },
              { id: 'map', label: 'Xarita', icon: MapIcon },
              { id: 'content', label: 'Dizayn', icon: Sparkles },
              { id: 'couriers', label: 'Kuryer', icon: Truck },
              { id: 'system', label: 'Tizim', icon: Sliders }
            ].map(tab => {
              const TabIcon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex flex-col items-center justify-center flex-1 h-full py-1 text-center transition-all cursor-pointer ${
                    isActive ? 'text-emerald-400' : 'text-slate-400'
                  }`}
                >
                  <TabIcon className="h-5 w-5" />
                  <span className="text-[9px] font-black mt-1 leading-none tracking-tight">{tab.label}</span>
                </button>
              );
            })}
          </nav>
        )}

        {/* ========================================================= */}
        {/* ORDER DETAIL SIDE DRAWER / OVERLAY MODAL                 */}
        {/* ========================================================= */}
        <AnimatePresence>
          {selectedOrder && (
            <div className="fixed inset-0 z-50 flex justify-end" onClick={() => setSelectedOrder(null)}>
              
              {/* Backdrop Blur overlay */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className={`absolute inset-0 ${th.overlay}`}
              />

              {/* Sliding Drawer Body */}
              <motion.div
                initial={{ x: "100%" }}
                animate={{ x: 0 }}
                exit={{ x: "100%" }}
                transition={{ type: "spring", damping: 30, stiffness: 260 }}
                onClick={(e) => e.stopPropagation()}
                className={`relative w-full max-w-md h-full ${th.bg} border-l shadow-2xl flex flex-col z-10`}
              >
                
                {/* Drawer Header */}
                <div className={`p-5 border-b ${th.headerBg} flex items-center justify-between select-none`}>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className={`font-mono text-sm font-black ${th.textMono}`}>{selectedOrder.id}</span>
                      <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full ${
                        selectedOrder.status === 'Yangi' ? 'bg-blue-500/15 text-blue-500 border border-blue-500/25' :
                        selectedOrder.status === 'Narx belgilashda' ? 'bg-purple-500/15 text-purple-500 border border-purple-500/25' :
                        selectedOrder.status === 'Kutishda' ? 'bg-amber-500/15 text-amber-500 border border-amber-500/25' :
                        selectedOrder.status === 'Kuryerda' ? 'bg-indigo-500/15 text-indigo-500 border border-indigo-500/25' :
                        selectedOrder.status === 'Yetkazildi' ? 'bg-emerald-500/15 text-emerald-500 border border-emerald-500/25' :
                        'bg-rose-500/15 text-rose-500 border border-rose-500/25'
                      }`}>
                        {selectedOrder.status}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-bold block mt-1 uppercase">Sana: {selectedOrder.date} • Soat: {selectedOrder.time}</span>
                  </div>
                  
                  <button
                    onClick={() => setSelectedOrder(null)}
                    className={`h-8 w-8 rounded-full ${th.btnIcon} flex items-center justify-center transition-all cursor-pointer border-none`}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {/* Drawer Scrollable Content */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin pb-24">
                  
                  {/* 1. YUQORI QISM — HAR DOIM OCHIQ, KATTA VA ANIQ (FAQAT ENG MUHIMLARI) */}
                  <div className={`${isAdminDarkMode ? 'bg-slate-900 border-emerald-500/30 text-white' : 'bg-white border-emerald-500/30 text-slate-900 shadow-sm'} border-2 p-4.5 rounded-2xl space-y-3.5 relative overflow-hidden`}>
                    <div className="absolute -right-6 -top-6 h-24 w-24 bg-emerald-500/10 rounded-full blur-xl pointer-events-none" />

                    {/* Status & Date */}
                    <div className={`flex justify-between items-center pb-2 border-b ${isAdminDarkMode ? 'border-slate-800' : 'border-slate-200'}`}>
                      <div>
                        <span className={`text-[10px] ${isAdminDarkMode ? 'text-slate-400' : 'text-slate-500'} font-bold block uppercase`}>Buyurtma Statusi:</span>
                        <span className={`inline-block text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full mt-0.5 ${
                          selectedOrder.status === 'Yangi' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                          selectedOrder.status === 'Narx belgilashda' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' :
                          selectedOrder.status === 'Kutishda' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                          selectedOrder.status === 'Kuryerda' ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30' :
                          selectedOrder.status === 'Yetkazildi' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                          'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                        }`}>
                          {selectedOrder.status}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className={`text-[10px] ${isAdminDarkMode ? 'text-slate-400' : 'text-slate-500'} font-bold block uppercase`}>Vaqti:</span>
                        <span className={`text-xs font-mono font-bold ${isAdminDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>{selectedOrder.date} • {selectedOrder.time}</span>
                      </div>
                    </div>

                    {/* Customer Info & Direct Call Button */}
                    <div className="flex items-center justify-between gap-2 pt-1">
                      <div className="min-w-0 flex-1">
                        <span className={`text-[9px] font-extrabold ${isAdminDarkMode ? 'text-slate-400' : 'text-slate-500'} uppercase tracking-wider block`}>👤 Mijoz:</span>
                        <h4 className={`text-base font-black ${isAdminDarkMode ? 'text-white' : 'text-slate-900'} truncate`}>{selectedOrder.customerName}</h4>
                        <p className="text-xs font-mono text-emerald-600 dark:text-emerald-400 font-bold">{selectedOrder.customerPhone || 'Telefon kiritilmagan'}</p>
                      </div>

                      {selectedOrder.customerPhone && (
                        <a
                          href={`tel:${selectedOrder.customerPhone}`}
                          className="bg-rose-600 hover:bg-rose-500 text-white py-2.5 px-3.5 rounded-xl text-xs font-black flex items-center space-x-1.5 transition-all shadow-lg shadow-rose-600/20 shrink-0 border-none cursor-pointer"
                        >
                          <Phone className="h-4 w-4 shrink-0 text-white fill-white" />
                          <span>Qo'ng'iroq qilish</span>
                        </a>
                      )}
                    </div>

                    {/* Mahalla / Qishloq Nomi */}
                    <div className={`${isAdminDarkMode ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-100 border-slate-200'} p-3 rounded-xl border space-y-0.5`}>
                      <span className={`text-[9px] font-black ${isAdminDarkMode ? 'text-slate-400' : 'text-slate-500'} uppercase tracking-widest block`}>📍 Mahalla / Qishloq Nomi:</span>
                      <p className="text-sm font-black text-emerald-600 dark:text-emerald-400">{selectedOrder.address.mahalla || 'Manzil ko\'rsatilmagan'}</p>
                    </div>

                    {/* Total Price & Payment Status */}
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <div className={`${isAdminDarkMode ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-100 border-slate-200'} p-2.5 rounded-xl border`}>
                        <span className={`text-[9px] font-bold ${isAdminDarkMode ? 'text-slate-400' : 'text-slate-500'} uppercase block`}>💰 Yakuniy Jami Summa:</span>
                        <span className="text-sm font-mono font-black text-amber-600 dark:text-amber-400 block mt-0.5">
                          {selectedOrder.total.toLocaleString('uz-UZ')} so'm
                        </span>
                      </div>

                      <div className={`${isAdminDarkMode ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-100 border-slate-200'} p-2.5 rounded-xl border`}>
                        <span className={`text-[9px] font-bold ${isAdminDarkMode ? 'text-slate-400' : 'text-slate-500'} uppercase block`}>💳 To'lov Holati:</span>
                        <div className="mt-1">
                          {(verifiedCheques[selectedOrder.id] || selectedOrder.isChequeVerified) ? (
                            <span className="inline-block bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded text-[9px] font-black uppercase">
                              ✅ To'langan
                            </span>
                          ) : selectedOrder.paymentMethod === 'Online' ? (
                            <span className="inline-block bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded text-[9px] font-black uppercase animate-pulse">
                              ⏳ Kutilmoqda
                            </span>
                          ) : (
                            <span className="inline-block bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/30 px-2 py-0.5 rounded text-[9px] font-black uppercase">
                              💵 Naqd pul
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Main Action Buttons: HIDDEN inside price setting mode and Kutishda status */}
                    {selectedOrder.status !== 'Bekor qilindi' && !selectedOrder.isCustomPendingPrice && selectedOrder.status !== 'Narx belgilashda' && selectedOrder.status !== 'Kutishda' && (() => {
                      const isCatSelected = !!(selectedOrder.category && selectedOrder.category.trim());
                      const isOnlinePayment = selectedOrder.paymentMethod === 'Online';
                      const hasCheque = selectedOrder.uploadedChequeUrl || (selectedOrder.uploadedChequeUrls && selectedOrder.uploadedChequeUrls.length > 0);
                      const isChequeApproved = (!isOnlinePayment && !hasCheque) || !!verifiedCheques[selectedOrder.id] || !!selectedOrder.isChequeVerified;
                      const canTransferToCourier = isCatSelected && isChequeApproved;
                      const isAlreadyInCourier = selectedOrder.status === "Kuryer qidirilmoqda" || selectedOrder.status === "Kuryerda" || selectedOrder.status === "Yetkazildi";

                      const isVoiceOrder = selectedOrder.type === 'voice' || selectedOrder.orderChannel === 'voice' || selectedOrder.items?.some(i => i.product?.voiceUrl);

                      return (
                        <div className={`pt-2 grid grid-cols-2 gap-2 border-t ${isAdminDarkMode ? 'border-slate-800' : 'border-slate-200'}`}>
                          <button
                            type="button"
                            onClick={() => {
                              if (!canTransferToCourier) {
                                showToast("⚠️ Avval kategoriya va to'lov holatini tasdiqlang");
                                return;
                              }

                              if (isVoiceOrder) {
                                const currentComment = selectedOrder.courierComment || selectedOrder.adminComment;
                                if (!currentComment || !currentComment.trim()) {
                                  setConfirmModalConfig({
                                    title: "Kuryer uchun izoh (MAJBURIY)",
                                    message: "Ovozli buyurtmalarda kuryer uchun izoh yozilishi MAJBURIY! Iltimos, izohni kiriting:",
                                    inputPlaceholder: "Masalan: 2 kg olma, non va sut olinadi",
                                    isPrompt: true,
                                    onConfirmWithInput: (commentVal) => {
                                      if (!commentVal || !commentVal.trim()) {
                                        showToast("⚠️ Ovozli buyurtma uchun kuryer izohi kiritilmadi!");
                                        return;
                                      }
                                      const targetStatus = "Kuryer qidirilmoqda";
                                      setOrders(prev => prev.map(o => o.id === selectedOrder.id ? { ...o, status: targetStatus, adminComment: commentVal.trim(), courierComment: commentVal.trim() } : o));
                                      setSelectedOrder(prev => prev ? { ...prev, status: targetStatus, adminComment: commentVal.trim(), courierComment: commentVal.trim() } : null);
                                      showToast("Kuryer izohi saqlandi va kuryer qidirilmoqda! 🚀");
                                    }
                                  });
                                  return;
                                }
                              }

                              const targetStatus = "Kuryer qidirilmoqda";
                              if (handleUpdateOrderStatus(selectedOrder.id, targetStatus)) {
                                setSelectedOrder(prev => prev ? { ...prev, status: targetStatus } : null);
                              }
                            }}
                            disabled={!canTransferToCourier || isAlreadyInCourier}
                            className={`py-2.5 px-3 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center justify-center space-x-1.5 transition-all shadow-md ${
                              !canTransferToCourier || isAlreadyInCourier
                                ? 'bg-slate-300 dark:bg-slate-800 text-slate-500 cursor-not-allowed border-none'
                                : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20 active:scale-95 cursor-pointer border-none'
                            }`}
                          >
                            <Truck className="h-4 w-4 shrink-0" />
                            <span className="truncate">
                              {selectedOrder.status === "Kuryer qidirilmoqda"
                                ? "Kuryer qidirilmoqda"
                                : selectedOrder.status === "Kuryerda"
                                  ? "Kuryerda"
                                  : "Tasdiqlash & Kuryerga"}
                            </span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setConfirmModalConfig({
                                title: "Buyurtmani bekor qilish",
                                message: "Bekor qilish sababini va mijoz uchun izohni kiriting:",
                                inputPlaceholder: "Masalan: Mahsulot omborda qolmagan",
                                isPrompt: true,
                                onConfirmWithInput: (reasonVal) => {
                                  const finalReason = reasonVal && reasonVal.trim() ? reasonVal.trim() : "Admin tomonidan bekor qilindi";
                                  setOrders(prev => prev.map(o => o.id === selectedOrder.id ? { ...o, status: 'Bekor qilindi', adminComment: finalReason, cancellationReason: finalReason } : o));
                                  setSelectedOrder(prev => prev ? { ...prev, status: 'Bekor qilindi', adminComment: finalReason, cancellationReason: finalReason } : null);
                                  showToast("Buyurtma bekor qilindi va izoh saqlandi!");
                                }
                              });
                            }}
                            className="py-2.5 px-3 bg-rose-500/10 hover:bg-rose-600 text-rose-600 hover:text-white dark:text-rose-300 border border-rose-500/30 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center justify-center space-x-1.5 transition-all cursor-pointer"
                          >
                            <Trash2 className="h-4 w-4 shrink-0" />
                            <span>Bekor qilish</span>
                          </button>
                        </div>
                      );
                    })()}
                  </div>

                  {/* PROMINENT PRICE ASSIGNMENT CARD FOR VOICE/WRITTEN ORDERS */}
                  {(selectedOrder.isCustomPendingPrice || selectedOrder.status === 'Narx belgilashda') && (
                    <div className={`${isAdminDarkMode ? 'bg-purple-950/40 border-purple-500/50 text-white' : 'bg-purple-50 border-purple-300 text-slate-900 shadow-sm'} border-2 p-4 rounded-2xl space-y-3.5 relative overflow-hidden`}>
                      <div className={`flex items-center space-x-2 border-b ${isAdminDarkMode ? 'border-purple-500/30' : 'border-purple-200'} pb-2`}>
                        <span className="text-lg">💰</span>
                        <div>
                          <h3 className={`text-xs font-black uppercase ${isAdminDarkMode ? 'text-purple-300' : 'text-purple-950'}`}>Buyurtma Narxi va Kategoriyasini Belgilash</h3>
                          <p className={`text-[9px] ${isAdminDarkMode ? 'text-purple-200' : 'text-purple-800'}`}>Har bir mahsulot narxini va buyurtma kategoriyasini kiriting</p>
                        </div>
                      </div>

                      {/* TASK 10A: Voice Audio Player at the VERY TOP of the modal */}
                      {selectedOrder.items.some(i => i.product.voiceUrl) && (
                        <div className="bg-indigo-950/80 border-2 border-indigo-500/60 p-3.5 rounded-2xl space-y-2 shadow-lg">
                          <span className="text-[10px] font-black uppercase text-indigo-300 tracking-wider flex items-center space-x-1.5">
                            <span>🎙️ OVOZLI BUYURTMA XABARI:</span>
                          </span>
                          {selectedOrder.items.filter(i => i.product.voiceUrl).map((vItem, vIdx) => (
                            <div key={`v-audio-${vIdx}`} className="space-y-1.5">
                              <audio src={vItem.product.voiceUrl} controls className="w-full h-9 accent-indigo-500" />
                              {vItem.product.name && (
                                <p className="text-xs font-extrabold text-amber-300 leading-relaxed break-words whitespace-pre-wrap bg-slate-900/80 p-2.5 rounded-xl border border-indigo-500/30">
                                  {vItem.product.name}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Items Price Inputs - TASK 2: Large text, fully visible without truncation */}
                      <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1 overflow-x-visible">
                        {selectedOrder.items.map((item, idx) => (
                          <div key={`${item.product.id}-${idx}`} className={`p-3 ${isAdminDarkMode ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-purple-200'} rounded-xl border space-y-2`}>
                            <div className="space-y-1">
                              <div className="flex justify-between items-start">
                                <span className={`text-sm font-extrabold ${isAdminDarkMode ? 'text-amber-300' : 'text-slate-900'} leading-relaxed whitespace-pre-wrap break-words block flex-1`}>
                                  {item.product.voiceUrl ? `🎙️ Ovozli: ${item.product.name}` : item.product.name}
                                </span>
                                <span className={`text-[10px] font-bold ${isAdminDarkMode ? 'text-slate-400' : 'text-slate-500'} shrink-0 ml-2 bg-slate-800/50 px-2 py-0.5 rounded-md`}>
                                  {item.quantity} ta
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2 pt-1 border-t border-slate-800/40">
                              <span className={`text-[10px] ${isAdminDarkMode ? 'text-slate-400' : 'text-slate-600'} font-bold`}>Narxi (so'm):</span>
                              <input
                                type="number"
                                value={item.product.price || ''}
                                onChange={(e) => {
                                  const val = parseInt(e.target.value) || 0;
                                  setOrders(prev => prev.map(o => {
                                    if (o.id === selectedOrder.id) {
                                      const newItems = o.items.map((it, i) => i === idx ? { ...it, product: { ...it.product, price: val } } : it);
                                      const sub = newItems.reduce((s, it) => s + ((it.product?.price || 0) * (it.quantity || 1)), 0);
                                      return { ...o, items: newItems, total: sub };
                                    }
                                    return o;
                                  }));
                                  setSelectedOrder(prev => {
                                    if (!prev) return null;
                                    const newItems = prev.items.map((it, i) => i === idx ? { ...it, product: { ...it.product, price: val } } : it);
                                    const sub = newItems.reduce((s, it) => s + ((it.product?.price || 0) * (it.quantity || 1)), 0);
                                    return { ...prev, items: newItems, total: sub };
                                  });
                                }}
                                placeholder="Masalan: 15000"
                                className={`flex-1 ${isAdminDarkMode ? 'bg-slate-950 border-slate-800 text-amber-400' : 'bg-slate-50 border-purple-200 text-slate-900 font-extrabold'} border rounded-lg p-2 text-xs font-mono font-bold focus:outline-none focus:border-amber-500`}
                              />
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Minimum & Maximum Price Warning Alerts */}
                      {(() => {
                        const itemsSubtotal = selectedOrder.items.reduce((s, it) => s + ((it.product?.price || 0) * (it.quantity || 1)), 0);
                        const isBelowMin = itemsSubtotal > 0 && itemsSubtotal < (minOrderLimit || 10000);
                        const isAboveMax = itemsSubtotal > 5000000;
                        const hasItemBelowMin = selectedOrder.items.some(it => (it.product?.price || 0) > 0 && (it.product?.price || 0) < (minOrderLimit || 10000));
                        const hasItemAboveMax = selectedOrder.items.some(it => (it.product?.price || 0) > 5000000);

                        if (isBelowMin || hasItemBelowMin) {
                          return (
                            <div className="p-3 bg-red-500/20 border border-red-500/60 rounded-xl text-red-200 text-xs font-black flex items-center space-x-2 animate-pulse">
                              <AlertTriangle className="h-4 w-4 shrink-0 text-red-400" />
                              <span>⚠️ OGOHLANTIRISH: Kiritilgan narx minimum cheklovdan ({(minOrderLimit || 10000).toLocaleString('uz-UZ')} so'm) past!</span>
                            </div>
                          );
                        }
                        if (isAboveMax || hasItemAboveMax) {
                          return (
                            <div className="p-3 bg-amber-500/20 border border-amber-500/60 rounded-xl text-amber-200 text-xs font-black flex items-center space-x-2">
                              <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400" />
                              <span>⚠️ OGOHLANTIRISH: Kiritilgan narx maksimal cheklovdan (5 000 000 so'm) yuqori!</span>
                            </div>
                          );
                        }
                        return null;
                      })()}

                      {/* Pickup Points Count Input */}
                      <div className={`p-2.5 ${isAdminDarkMode ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-purple-200'} rounded-xl border space-y-1`}>
                        <div className="flex justify-between items-center text-xs">
                          <span className={`font-bold ${isAdminDarkMode ? 'text-slate-200' : 'text-slate-900'}`}>
                            📍 Olish nuqtalari soni (Do'konlar)
                          </span>
                          <span className={`text-[10px] ${isAdminDarkMode ? 'text-amber-400' : 'text-purple-700'} font-bold`}>
                            +{(Math.max(0, (selectedOrder.pickupPointsCount || 1) - 1) * extraStopFee).toLocaleString('uz-UZ')} so'm
                          </span>
                        </div>
                        <div className="flex items-center space-x-2 pt-1">
                          <span className={`text-[10px] ${isAdminDarkMode ? 'text-slate-400' : 'text-slate-600'} font-bold`}>Nuqtalar soni:</span>
                          <input
                            type="number"
                            min={1}
                            value={selectedOrder.pickupPointsCount || 1}
                            onChange={(e) => {
                              const pts = Math.max(1, parseInt(e.target.value) || 1);
                              const extraFee = (pts - 1) * extraStopFee;
                              setOrders(prev => prev.map(o => o.id === selectedOrder.id ? { ...o, pickupPointsCount: pts, extraStopsFee: extraFee } : o));
                              setSelectedOrder(prev => prev ? { ...prev, pickupPointsCount: pts, extraStopsFee: extraFee } : null);
                            }}
                            className={`w-28 ${isAdminDarkMode ? 'bg-slate-950 border-slate-800 text-amber-400' : 'bg-slate-50 border-purple-200 text-slate-900 font-extrabold'} border rounded-lg p-1.5 text-xs font-mono font-bold focus:outline-none focus:border-amber-500`}
                          />
                        </div>
                      </div>

                      {/* Category Selector */}
                      <div className="space-y-1">
                        <select
                          disabled={selectedOrder.status === 'Yetkazildi' || selectedOrder.status === 'Bekor qilindi'}
                          value={selectedOrder.category || ''}
                          onChange={(e) => {
                            if (selectedOrder.status === 'Yetkazildi' || selectedOrder.status === 'Bekor qilindi') return;
                            const val = e.target.value;
                            setOrders(prev => prev.map(o => o.id === selectedOrder.id ? { ...o, category: val } : o));
                            setSelectedOrder(prev => prev ? { ...prev, category: val } : null);
                          }}
                          className={`w-full ${isAdminDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-purple-200 text-slate-900'} border rounded-xl p-2 text-xs font-bold focus:outline-none focus:border-amber-500 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                          <option value="">-- Kategoriyani tanlang * (MAJBURIY) --</option>
                          {(Array.from(new Set(availableCategories)) as string[]).map((cat, catIdx) => (
                            <option key={`edit-cat-${cat}-${catIdx}`} value={cat}>{cat}</option>
                          ))}
                        </select>
                      </div>

                      {/* Validation and Action Button */}
                      {(() => {
                        const allPricesEntered = selectedOrder.items.length > 0 && selectedOrder.items.every(it => (it.product?.price || 0) > 0);
                        const isCategorySelected = !!(selectedOrder.category && selectedOrder.category.trim());
                        const canConfirm = allPricesEntered && isCategorySelected;

                        let tooltipMsg = "";
                        if (!allPricesEntered) tooltipMsg = "Barcha mahsulotlarga narx kiriting";
                        else if (!isCategorySelected) tooltipMsg = "Kategoriyani tanlang";

                        return (
                          <div className="space-y-1 pt-1">
                            <button
                              type="button"
                              disabled={!canConfirm}
                              title={tooltipMsg}
                              onClick={() => {
                                if (!canConfirm) return;
                                
                                const subtotal = selectedOrder.items.reduce((s, it) => s + ((it.product?.price || 0) * (it.quantity || 1)), 0);
                                const pts = selectedOrder.pickupPointsCount || 1;
                                const calculatedExtraFee = (pts - 1) * extraStopFee;
                                
                                const currentMahalla = selectedOrder.address?.mahalla || '';
                                const matchedZone = (deliveryZones || []).find(z => (z.mahallas || []).some(m => m.trim().toLowerCase() === currentMahalla.trim().toLowerCase()));
                                const baseDeliveryFee = matchedZone ? matchedZone.price : ((deliveryZones && deliveryZones[0]?.price) || 10000);
                                const calculatedDeliveryFee = baseDeliveryFee + calculatedExtraFee;
                                const totalAmount = subtotal + calculatedDeliveryFee;
                                
                                const isCashAllowed = isCashPaymentAllowed(selectedOrder.category, totalAmount, cashlessLimit, mandatoryOnlineCategories);
                                const forcedPaymentMethod = isCashAllowed ? (selectedOrder.paymentMethod || 'Naqd') : 'Online';

                                setOrders(prev => prev.map(o => {
                                  if (o.id === selectedOrder.id) {
                                    return {
                                      ...o,
                                      isCustomPendingPrice: false,
                                      status: 'Kutishda',
                                      total: totalAmount,
                                      deliveryFee: calculatedDeliveryFee,
                                      pickupPointsCount: pts,
                                      extraStopsFee: calculatedExtraFee,
                                      paymentMethod: forcedPaymentMethod,
                                      category: selectedOrder.category
                                    };
                                  }
                                  return o;
                                }));

                                setSelectedOrder(prev => prev ? {
                                  ...prev,
                                  isCustomPendingPrice: false,
                                  status: 'Kutishda',
                                  total: totalAmount,
                                  deliveryFee: calculatedDeliveryFee,
                                  pickupPointsCount: pts,
                                  extraStopsFee: calculatedExtraFee,
                                  paymentMethod: forcedPaymentMethod,
                                  category: selectedOrder.category
                                } : null);

                                showToast("Buyurtma narxi, nuqtalari va kategoriyasi tasdiqlandi va mijozga yuborildi! 🚀");
                              }}
                              className={`w-full py-3 px-4 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center space-x-2 border-none shadow-lg ${
                                canConfirm 
                                  ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 cursor-pointer active:scale-95' 
                                  : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                              }`}
                            >
                              <span>Tasdiqlash va yuborish 🚀</span>
                            </button>
                            {!canConfirm && (
                              <p className="text-[9.5px] text-amber-300 font-bold text-center italic mt-1">
                                ⚠️ {tooltipMsg}
                              </p>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  )}

                  {/* 2. PASTKI QISM — YOPIQ AKKORDION BO'LIMLARI (STANDART HOLATDA BARCHASI YOPIQ) */}
                  <div className="space-y-3 pt-1">
                    
                    {/* ACCORDION 1: Mijoz ma'lumotini tahrirlash */}
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden transition-all">
                      <button
                        type="button"
                        onClick={() => toggleAccordionSection('customer_edit')}
                        className="w-full p-3.5 bg-slate-900 hover:bg-slate-850 flex items-center justify-between text-left cursor-pointer border-none transition-colors"
                      >
                        <div className="flex items-center space-x-2">
                          <span className="text-base">✏️</span>
                          <span className="text-xs font-black text-slate-200 uppercase tracking-wider">Mijoz ma'lumotini tahrirlash</span>
                        </div>
                        {expandedAccordionSections['customer_edit'] ? (
                          <ChevronUp className="h-4 w-4 text-emerald-400 shrink-0" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" />
                        )}
                      </button>

                      {expandedAccordionSections['customer_edit'] && (
                        <div className="p-4 bg-slate-950/60 border-t border-slate-800 space-y-3.5">
                          {isEditingOrder ? (
                            <div className="space-y-3">
                              <div className="space-y-1">
                                <label className="text-[8px] text-slate-400 font-bold uppercase">Mijoz Ismi:</label>
                                <input
                                  value={editOrderName}
                                  onChange={(e) => setEditOrderName(e.target.value)}
                                  className={`w-full ${th.inputBg} border rounded-lg p-2 text-xs font-bold text-white`}
                                  placeholder="Mijoz ismi"
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[8px] text-slate-400 font-bold uppercase">Telefon Raqami:</label>
                                <PhoneInput
                                  value={editOrderPhone}
                                  onChange={(val) => setEditOrderPhone(val)}
                                  className={`w-full ${th.inputBg} border rounded-lg p-2 text-xs font-mono font-bold text-white`}
                                />
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-1">
                              <p className="text-xs font-bold text-white">Ism: <span className="text-slate-300">{selectedOrder.customerName}</span></p>
                              <p className="text-xs font-mono text-white">Telefon: <span className="text-slate-300">{selectedOrder.customerPhone}</span></p>
                            </div>
                          )}

                          <div className="flex space-x-2 pt-1">
                            {selectedOrder.status === 'Yetkazildi' || selectedOrder.status === 'Bekor qilindi' ? (
                              <div className="flex-1 py-2 px-3 bg-slate-800/80 border border-slate-700/60 rounded-xl text-[10px] font-black uppercase text-amber-400 text-center tracking-wider">
                                🔒 Yakunlangan / Bekor qilingan (Tahrirlab bo'lmaydi)
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  if (isEditingOrder) {
                                    handleSaveOrderEdits();
                                  } else {
                                    setIsEditingOrder(true);
                                  }
                                }}
                                className={`flex-1 py-2 px-3 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center justify-center space-x-1 border-none cursor-pointer transition-all ${
                                  isEditingOrder
                                    ? 'bg-emerald-600 text-white hover:bg-emerald-500'
                                    : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                                }`}
                              >
                                <span>{isEditingOrder ? "💾 Saqlash" : "✏️ Tahrirlash"}</span>
                              </button>
                            )}

                            {isEditingOrder && selectedOrder.status !== 'Yetkazildi' && selectedOrder.status !== 'Bekor qilindi' && (
                              <button
                                type="button"
                                onClick={() => setIsEditingOrder(false)}
                                className="py-2 px-3 bg-slate-800 text-slate-300 rounded-xl text-[10px] font-black uppercase border-none cursor-pointer"
                              >
                                Bekor
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => toggleCustomerBlacklist(selectedOrder.customerPhone, selectedOrder.customerPhone === userProfile.phone)}
                              className={`py-2 px-3 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center justify-center space-x-1 border cursor-pointer transition-all ${
                                (blacklistedPhones || []).includes(selectedOrder.customerPhone)
                                  ? 'bg-emerald-500/10 hover:bg-emerald-500 hover:text-white text-emerald-400 border-emerald-500/20'
                                  : 'bg-rose-500/10 hover:bg-rose-500 hover:text-white text-rose-400 border-rose-500/20'
                              }`}
                            >
                              <span>{(blacklistedPhones || []).includes(selectedOrder.customerPhone) ? "🔓 Blokdan yechish" : "🛑 Qora ro'yxat"}</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* ACCORDION 2: Manzil tafsiloti */}
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden transition-all">
                      <button
                        type="button"
                        onClick={() => toggleAccordionSection('address_details')}
                        className="w-full p-3.5 bg-slate-900 hover:bg-slate-850 flex items-center justify-between text-left cursor-pointer border-none transition-colors"
                      >
                        <div className="flex items-center space-x-2">
                          <span className="text-base">📍</span>
                          <span className="text-xs font-black text-slate-200 uppercase tracking-wider">Manzil tafsiloti</span>
                        </div>
                        {expandedAccordionSections['address_details'] ? (
                          <ChevronUp className="h-4 w-4 text-emerald-400 shrink-0" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" />
                        )}
                      </button>

                      {expandedAccordionSections['address_details'] && (
                        <div className="p-4 bg-slate-950/60 border-t border-slate-800 space-y-3.5">
                          {isEditingOrder ? (
                            <div className="space-y-3">
                              <div className="space-y-1">
                                <label className="text-[8px] text-slate-400 font-bold uppercase">Mahalla / Qishloq:</label>
                                <select
                                  value={editOrderMahalla}
                                  onChange={(e) => setEditOrderMahalla(e.target.value)}
                                  className={`w-full ${th.inputBg} border rounded-lg p-2 text-xs font-bold focus:outline-none cursor-pointer`}
                                >
                                  <option value="">-- Mahallani tanlang --</option>
                                  {(Array.from(new Set(allMahallasList)) as string[]).map((m, mIdx) => (
                                    <option key={`edit-m-${m}-${mIdx}`} value={m}>{m}</option>
                                  ))}
                                </select>
                              </div>
                              <div className="space-y-1">
                                <label className="text-[8px] text-slate-400 font-bold uppercase">Mo'ljal / Taniqli joy:</label>
                                <input
                                  value={editOrderComment}
                                  onChange={(e) => setEditOrderComment(e.target.value)}
                                  className={`w-full ${th.inputBg} border rounded-lg p-2 text-xs font-bold text-white`}
                                  placeholder="Mo'ljal"
                                />
                              </div>
                              <div className="space-y-1 bg-rose-500/10 p-3 rounded-xl border border-rose-500/30">
                                <label className="text-[10px] text-rose-400 font-black uppercase block mb-1">🚨 Kuryer uchun izoh:</label>
                                <textarea
                                  value={editCourierComment}
                                  onChange={(e) => setEditCourierComment(e.target.value)}
                                  className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs text-white h-24 focus:outline-none"
                                  placeholder="Kuryer buyurtmani qabul qilishidan avval o'qiydi..."
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[8px] text-slate-400 font-bold uppercase">Narxlar yoymasi (Mijoz uchun izoh):</label>
                                <textarea
                                  value={editPriceBreakdownComment}
                                  onChange={(e) => setEditPriceBreakdownComment(e.target.value)}
                                  className={`w-full ${th.inputBg} border rounded-lg p-2 text-xs text-white h-14`}
                                  placeholder="Mijozga narxni tushuntirish uchun..."
                                />
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                <div className="space-y-1">
                                  <label className="text-[8px] text-slate-400 font-bold uppercase">Lat:</label>
                                  <input
                                    value={editOrderLat}
                                    onChange={(e) => setEditOrderLat(e.target.value)}
                                    className={`w-full ${th.inputBg} border rounded-lg p-2 text-xs font-bold text-white`}
                                  />
                                </div>
                                <div className="space-y-1">
                                  <label className="text-[8px] text-slate-400 font-bold uppercase">Lng:</label>
                                  <input
                                    value={editOrderLng}
                                    onChange={(e) => setEditOrderLng(e.target.value)}
                                    className={`w-full ${th.inputBg} border rounded-lg p-2 text-xs font-bold text-white`}
                                  />
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-2 text-xs text-slate-300">
                              <div>
                                <span className="text-[9px] font-black text-slate-400 uppercase block">Mahalla / Qishloq:</span>
                                <p className="font-bold text-white">{selectedOrder.address.mahalla}</p>
                              </div>
                              {selectedOrder.address.comment && (
                                <div className="pt-1.5 border-t border-slate-800">
                                  <span className="text-[9px] font-black text-slate-400 uppercase block">Mo'ljal / Taniqli joy:</span>
                                  <p className="font-bold text-white">{selectedOrder.address.comment}</p>
                                </div>
                              )}
                              {selectedOrder.address.additionalComment && (
                                <div className="pt-1.5 border-t border-slate-800">
                                  <span className="text-[9px] font-black text-slate-400 uppercase block">Qo'shimcha Izoh:</span>
                                  <p className="italic text-slate-300">"{selectedOrder.address.additionalComment}"</p>
                                </div>
                              )}
                              {selectedOrder.courierComment && (
                                <div className="pt-1.5 border-t border-indigo-500/30 bg-indigo-500/10 p-2 rounded-lg">
                                  <span className="text-[9px] font-black text-indigo-400 uppercase block">Kuryer uchun izoh:</span>
                                  <p className="font-bold text-indigo-300">{selectedOrder.courierComment}</p>
                                </div>
                              )}
                              {selectedOrder.priceBreakdownComment && (
                                <div className="pt-1.5 border-t border-emerald-500/30 bg-emerald-500/10 p-2 rounded-lg">
                                  <span className="text-[9px] font-black text-emerald-400 uppercase block">Narxlar Yoymasi (Mijoz uchun):</span>
                                  <p className="font-bold font-mono text-emerald-300">{selectedOrder.priceBreakdownComment}</p>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Map iframe preview */}
                          {((isEditingOrder ? editOrderLat && editOrderLng : selectedOrder.address.latitude && selectedOrder.address.longitude)) ? (
                            <div className="pt-2">
                              <span className="text-[9px] font-black text-slate-400 uppercase block mb-1.5">GPS Sun'iy yo'ldosh xaritasi:</span>
                              <div className="overflow-hidden rounded-xl border border-slate-800 relative h-36 w-full bg-slate-900">
                                <iframe
                                  title="Live Location Yandex Map Tracker"
                                  width="100%"
                                  height="100%"
                                  style={{ border: 0 }}
                                  src={`https://yandex.ru/map-widget/v1/?ll=${isEditingOrder ? editOrderLng : selectedOrder.address.longitude}%2C${isEditingOrder ? editOrderLat : selectedOrder.address.latitude}&z=16&pt=${isEditingOrder ? editOrderLng : selectedOrder.address.longitude}%2C${isEditingOrder ? editOrderLat : selectedOrder.address.latitude}%2Cpm2rdm&l=sat%2Cskl`}
                                  allowFullScreen
                                  loading="lazy"
                                  referrerPolicy="no-referrer"
                                  className="w-full h-full"
                                />
                              </div>
                            </div>
                          ) : (
                            <div className="p-2.5 bg-slate-900 rounded-xl text-center border border-slate-800 text-[10px] text-slate-400">
                              🗺️ GPS koordinatalar ulashilmagan.
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* ACCORDION 3: Kuryer ma'lumoti */}
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden transition-all">
                      <button
                        type="button"
                        onClick={() => toggleAccordionSection('courier_info')}
                        className="w-full p-3.5 bg-slate-900 hover:bg-slate-850 flex items-center justify-between text-left cursor-pointer border-none transition-colors"
                      >
                        <div className="flex items-center space-x-2">
                          <span className="text-base">🚴</span>
                          <span className="text-xs font-black text-slate-200 uppercase tracking-wider">Kuryer ma'lumoti</span>
                        </div>
                        {expandedAccordionSections['courier_info'] ? (
                          <ChevronUp className="h-4 w-4 text-emerald-400 shrink-0" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" />
                        )}
                      </button>

                      {expandedAccordionSections['courier_info'] && (
                        <div className="p-4 bg-slate-950/60 border-t border-slate-800 space-y-3.5">
                          {(selectedOrder.claimedBy || selectedOrder.courierClaimed) ? (
                            (() => {
                              const info = getCourierInfo(selectedOrder.claimedBy);
                              const displayName = info?.name || selectedOrder.claimedBy || courierName;
                              const displayPhone = info?.phone || courierPhone;

                              return (
                                <div className="flex items-center justify-between p-3 bg-slate-900 rounded-xl border border-slate-800">
                                  <div>
                                    <h4 className="text-xs font-black text-white">{displayName}</h4>
                                    {displayPhone && <p className="text-[11px] font-mono text-emerald-400">{displayPhone}</p>}
                                    <span className="inline-block mt-1 text-[8px] bg-emerald-500/10 text-emerald-400 font-bold px-2 py-0.5 rounded-full border border-emerald-500/20">
                                      ✓ Buyurtmani qabul qilgan
                                    </span>
                                  </div>

                                  {displayPhone && (
                                    <a
                                      href={`tel:${displayPhone.replace(/\s+/g, '')}`}
                                      className="bg-emerald-600 hover:bg-emerald-500 text-white py-2 px-3 rounded-xl text-[10px] font-black flex items-center space-x-1 border-none shrink-0"
                                    >
                                      <Phone className="h-3.5 w-3.5 shrink-0" />
                                      <span>Kuryerga Telefon 📞</span>
                                    </a>
                                  )}
                                </div>
                              );
                            })()
                          ) : (
                            <div className="text-xs text-slate-400">
                              <p className="font-semibold">Hali kuryer biriktirilmagan (umumiy kutishda).</p>
                            </div>
                          )}

                          {/* Admin Special Voice / Text Message to Courier */}
                          <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 space-y-3">
                            <span className="text-[9px] font-black text-amber-400 uppercase tracking-widest block">
                              🎙️ Kuryer uchun yozma va ovozli xabar (Admin):
                            </span>

                            <textarea
                              value={selectedOrder.adminComment || ''}
                              onChange={(e) => {
                                const val = e.target.value;
                                setOrders(prev => prev.map(o => o.id === selectedOrder.id ? { ...o, adminComment: val } : o));
                                setSelectedOrder(prev => prev ? { ...prev, adminComment: val } : null);
                              }}
                              placeholder="Kuryerga maxsus ko'rsatma yozing..."
                              className="w-full h-16 bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs text-white focus:outline-none focus:border-amber-500/50 resize-none font-bold"
                            />

                            <div className="flex items-center space-x-3 bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                              <button
                                type="button"
                                onClick={isAdminRecording ? stopAdminRecording : startAdminRecording}
                                className={`h-9 w-9 rounded-full flex items-center justify-center transition-all cursor-pointer shrink-0 ${
                                  isAdminRecording 
                                    ? 'bg-rose-500 animate-pulse text-white' 
                                    : 'bg-amber-500 text-slate-950'
                                }`}
                              >
                                {isAdminRecording ? <div className="h-3 w-3 bg-white rounded-xs" /> : <span className="text-sm">🎙️</span>}
                              </button>

                              <div className="flex-1 min-w-0">
                                {isAdminRecording ? (
                                  <span className="text-[10px] font-black text-rose-400 uppercase tracking-wider block animate-pulse">
                                    Ovoz yozilmoqda... {adminRecordingSeconds}s
                                  </span>
                                ) : selectedOrder.adminVoiceUrl ? (
                                  <div className="space-y-1">
                                    <span className="text-[8px] font-black text-emerald-400 uppercase block">✅ Ovoz yozib olindi</span>
                                    <audio src={selectedOrder.adminVoiceUrl} controls className="w-full h-6" />
                                  </div>
                                ) : (
                                  <span className="text-[10px] text-slate-500 block">Kuryer uchun ovozli xabar qoldiring</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* ACCORDION 4: Mahsulotlar ro'yxati */}
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden transition-all">
                      <button
                        type="button"
                        onClick={() => toggleAccordionSection('product_list')}
                        className="w-full p-3.5 bg-slate-900 hover:bg-slate-850 flex items-center justify-between text-left cursor-pointer border-none transition-colors"
                      >
                        <div className="flex items-center space-x-2">
                          <span className="text-base">🛒</span>
                          <span className="text-xs font-black text-slate-200 uppercase tracking-wider">
                            Mahsulotlar ro'yxati ({selectedOrder.items.length} ta)
                          </span>
                        </div>
                        {expandedAccordionSections['product_list'] ? (
                          <ChevronUp className="h-4 w-4 text-emerald-400 shrink-0" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" />
                        )}
                      </button>

                      {expandedAccordionSections['product_list'] && (
                        <div className="p-4 bg-slate-950/60 border-t border-slate-800 space-y-3.5">
                          {isEditingOrder ? (
                            <div className="space-y-3">
                              {editOrderItems.map((item, idx) => (
                                <div key={`${item.product.id}-${idx}`} className="p-3 bg-slate-900 rounded-xl space-y-2 border border-slate-800">
                                  <div className="flex justify-between items-center">
                                    <span className="text-[8px] font-black text-slate-400 uppercase">Mahsulot {idx + 1}</span>
                                    <button
                                      type="button"
                                      onClick={() => setEditOrderItems(prev => prev.filter((_, i) => i !== idx))}
                                      className="text-[10px] text-rose-400 font-bold bg-transparent border-none cursor-pointer"
                                    >
                                      O'chirish 🗑️
                                    </button>
                                  </div>
                                  <input
                                    value={item.product.name}
                                    onChange={(e) => {
                                      const newName = e.target.value;
                                      setEditOrderItems(prev => prev.map((it, i) => i === idx ? { ...it, product: { ...it.product, name: newName } } : it));
                                    }}
                                    className={`w-full ${th.inputBg} border rounded-lg p-2 text-xs font-bold text-white`}
                                  />
                                  <div className="grid grid-cols-2 gap-2">
                                    <input
                                      type="number"
                                      value={item.quantity}
                                      onChange={(e) => {
                                        const newQty = parseInt(e.target.value) || 1;
                                        setEditOrderItems(prev => prev.map((it, i) => i === idx ? { ...it, quantity: newQty } : it));
                                      }}
                                      className={`w-full ${th.inputBg} border rounded-lg p-2 text-xs font-bold text-white`}
                                    />
                                    <input
                                      type="number"
                                      value={item.product.price}
                                      onChange={(e) => {
                                        const newPrice = parseInt(e.target.value) || 0;
                                        setEditOrderItems(prev => prev.map((it, i) => i === idx ? { ...it, product: { ...it.product, price: newPrice } } : it));
                                      }}
                                      className={`w-full ${th.inputBg} border rounded-lg p-2 text-xs font-bold text-white`}
                                    />
                                  </div>
                                </div>
                              ))}
                              <button
                                type="button"
                                onClick={() => setEditOrderItems(prev => [...prev, { product: { id: `custom-edit-${Date.now()}`, name: 'Yangi mahsulot', price: 10000, image: '📦' }, quantity: 1 }])}
                                className="w-full py-2 bg-slate-800 text-slate-200 rounded-xl text-[10px] font-black uppercase"
                              >
                                ➕ Yangi mahsulot qo'shish
                              </button>
                            </div>
                          ) : (
                            <div className="space-y-2.5">
                              {selectedOrder.items.map((item, idx) => (
                                <div key={`${item.product.id}-${idx}`} className="flex justify-between items-start text-xs border-b border-slate-800/80 pb-2">
                                  <div>
                                    <span className="font-bold text-white block">
                                      {item.product.voiceUrl ? (
                                        <div className="space-y-1">
                                          <span className="flex items-center space-x-1 text-indigo-400">
                                            <span>🎙️ Ovozli xabar:</span>
                                            <span className="text-[9px] italic">"{item.product.name}"</span>
                                          </span>
                                          <audio src={item.product.voiceUrl} controls className="h-7 w-48 max-w-full" />
                                        </div>
                                      ) : (
                                        item.product.name
                                      )}
                                    </span>
                                    <span className="text-[10px] text-slate-400 font-semibold block mt-0.5">
                                      {item.quantity} ta × {item.product.price.toLocaleString('uz-UZ')} so'm
                                    </span>
                                  </div>
                                  <span className="font-mono font-black text-amber-400">
                                    {(item.product.price * item.quantity).toLocaleString('uz-UZ')} so'm
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Category Selector (Only for non-Savatdan orders: Yozma, Ovozli, Qo'ng'iroq qilingan) */}
                          {getOrderSource(selectedOrder) !== 'Savatdan' && (
                            <div className="pt-2 border-t border-slate-800 space-y-1">
                              <label className="text-[9px] text-amber-400 font-extrabold uppercase block tracking-wider">
                                Buyurtma Toifasi (Kategoriya) <span className="text-rose-500">* (MAJBURIY)</span>:
                              </label>
                              <select
                                disabled={selectedOrder.status === 'Yetkazildi' || selectedOrder.status === 'Bekor qilindi'}
                                value={selectedOrder.category || ''}
                                onChange={(e) => {
                                  if (selectedOrder.status === 'Yetkazildi' || selectedOrder.status === 'Bekor qilindi') return;
                                  const newCat = e.target.value;
                                  setOrders(prev => prev.map(o => o.id === selectedOrder.id ? { ...o, category: newCat } : o));
                                  setSelectedOrder(prev => prev ? { ...prev, category: newCat } : null);
                                  if (newCat) showToast(`Kategoriya "${newCat}" deb belgilandi!`);
                                }}
                                className={`w-full ${isAdminDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-purple-200 text-slate-900'} border rounded-xl p-2 text-xs font-bold focus:outline-none focus:border-amber-500 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed`}
                              >
                                <option value="">-- Kategoriyani tanlang --</option>
                                <option value="Market">Market</option>
                                <option value="Dorixona">Dorixona</option>
                                <option value="Fast Food">Fast Food</option>
                                <option value="Oshxona">Oshxona</option>
                                <option value="Restoran">Restoran</option>
                                <option value="Ichimliklar">Ichimliklar</option>
                                <option value="Gullar">Gullar</option>
                                <option value="Boshqalar">Boshqalar</option>
                              </select>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* ACCORDION 5: To'lov cheki (FAQAT ONLAYN BUYURTMALAR UCHUN) */}
                    {(selectedOrder.paymentMethod === 'Online' || selectedOrder.paymentMethod === 'Onlayn') && (
                      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden transition-all">
                        <button
                          type="button"
                          onClick={() => toggleAccordionSection('payment_cheque')}
                          className="w-full p-3.5 bg-slate-900 hover:bg-slate-850 flex items-center justify-between text-left cursor-pointer border-none transition-colors"
                        >
                          <div className="flex items-center space-x-2">
                            <span className="text-base">💳</span>
                            <span className="text-xs font-black text-slate-200 uppercase tracking-wider">To'lov cheki / kvitansiya</span>
                          </div>
                          {expandedAccordionSections['payment_cheque'] ? (
                            <ChevronUp className="h-4 w-4 text-emerald-400 shrink-0" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" />
                          )}
                        </button>

                        {expandedAccordionSections['payment_cheque'] && (
                          <div className="p-4 bg-slate-950/60 border-t border-slate-800 space-y-3.5">
                            <div className="flex justify-between items-center">
                              <span className="text-[10px] text-slate-400 font-bold uppercase">To'lov usuli:</span>
                              <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                                {selectedOrder.paymentMethod}
                              </span>
                            </div>

                            {selectedOrder.uploadedChequeUrl || (selectedOrder.uploadedChequeUrls && selectedOrder.uploadedChequeUrls.length > 0) ? (
                              <div className="space-y-2">
                                <div className="grid grid-cols-3 gap-2">
                                  {(selectedOrder.uploadedChequeUrls || [selectedOrder.uploadedChequeUrl]).map((url, idx) => url && (
                                    <div 
                                      key={`${url}-${idx}`} 
                                      onClick={() => {
                                        setActiveZoomChequeUrl(url);
                                        setHasViewedReceipt(true);
                                        setViewedChequeOrders(prev => ({ ...prev, [selectedOrder.id]: true }));
                                      }}
                                      className="relative group overflow-hidden rounded-xl border border-slate-800 bg-slate-900 h-16 flex items-center justify-center cursor-pointer hover:border-indigo-500/50 transition-all"
                                    >
                                      <img
                                        src={url}
                                        alt="Cheque thumbnail"
                                        referrerPolicy="no-referrer"
                                        className="h-full w-full object-cover group-hover:scale-105 transition-transform"
                                      />
                                    </div>
                                  ))}
                                </div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const firstUrl = selectedOrder.uploadedChequeUrls?.[0] || selectedOrder.uploadedChequeUrl;
                                    if (firstUrl) {
                                      setActiveZoomChequeUrl(firstUrl);
                                      setHasViewedReceipt(true);
                                      setViewedChequeOrders(prev => ({ ...prev, [selectedOrder.id]: true }));
                                    }
                                  }}
                                  className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 py-2 rounded-xl text-[10px] font-black uppercase flex items-center justify-center space-x-1 border border-slate-700 cursor-pointer"
                                >
                                  <Eye className="h-3.5 w-3.5" />
                                  <span>Chekni Kattalashtirish</span>
                                </button>
                              </div>
                            ) : (
                              <div className="p-3 bg-slate-900 rounded-xl text-center border border-slate-800 text-[10px] text-amber-400 font-bold">
                                🧾 To'lov cheki yuklanmagan.
                              </div>
                            )}

                            {/* Verify Cheque Button */}
                            <div className="pt-1">
                              {(verifiedCheques[selectedOrder.id] || selectedOrder.isChequeVerified) ? (
                                <div className="flex items-center justify-between p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                                  <span className="text-[10px] font-black text-emerald-400 uppercase">
                                    🟢 To'lov Tasdiqlangan
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setVerifiedCheques(prev => ({ ...prev, [selectedOrder.id]: false }));
                                      setOrders(prev => prev.map(o => o.id === selectedOrder.id ? { ...o, isChequeVerified: false } : o));
                                      setSelectedOrder(prev => prev ? { ...prev, isChequeVerified: false } : null);
                                      showToast("Chek tasdig'i bekor qilindi");
                                    }}
                                    className="text-[9px] font-bold text-slate-400 hover:text-rose-400 underline cursor-pointer bg-transparent border-none"
                                  >
                                    Bekor qilish
                                  </button>
                                </div>
                              ) : (
                                <div className="space-y-1">
                                  {(() => {
                                    const hasCheque = !!(selectedOrder.uploadedChequeUrl || (selectedOrder.uploadedChequeUrls && selectedOrder.uploadedChequeUrls.length > 0));
                                    const isPhoneOnlineWaiting = !!selectedOrder.isManualDraft && selectedOrder.paymentMethod === 'Online' && selectedOrder.status === 'Kutishda';
                                    const isWaitingConfirmation = !isPhoneOnlineWaiting && (selectedOrder.status === 'Kutishda' || selectedOrder.status === 'Mijoz tasdiqlashini kutmoqda' || selectedOrder.status === 'Narx belgilashda');
                                    const canVerify = !isWaitingConfirmation && (hasCheque ? hasViewedReceipt : true);

                                    return (
                                      <>
                                        <button
                                          type="button"
                                          disabled={!canVerify}
                                          title={!canVerify ? (isWaitingConfirmation ? "Buyurtma Kutishda — to'lovni tasdiqlab bo'lmaydi" : "Avval chekni ko'rib chiqing") : ""}
                                          onClick={() => {
                                            if (!canVerify) return;
                                            setVerifiedCheques(prev => ({ ...prev, [selectedOrder.id]: true }));
                                            if (isPhoneOnlineWaiting) {
                                              setOrders(prev => prev.map(o => o.id === selectedOrder.id ? {
                                                ...o,
                                                isChequeVerified: true,
                                                isConfirmedByCustomer: true,
                                                status: 'Kuryer qidirilmoqda',
                                                dispatchedAt: Date.now()
                                              } : o));
                                              setSelectedOrder(prev => prev ? {
                                                ...prev,
                                                isChequeVerified: true,
                                                isConfirmedByCustomer: true,
                                                status: 'Kuryer qidirilmoqda',
                                                dispatchedAt: Date.now()
                                              } : null);
                                              showToast("To'lov (chek) tasdiqlandi! Buyurtma Kuryer qidiruviga o'tkazildi 🚀");
                                            } else {
                                              setOrders(prev => prev.map(o => o.id === selectedOrder.id ? { ...o, isChequeVerified: true } : o));
                                              setSelectedOrder(prev => prev ? { ...prev, isChequeVerified: true } : null);
                                              showToast("To'lov holati qo'lda tasdiqlandi! ✅");
                                            }
                                          }}
                                          className={`w-full py-2.5 rounded-xl text-[10px] font-black uppercase flex items-center justify-center space-x-1 transition-all border-none ${
                                            canVerify
                                              ? 'bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer shadow-lg shadow-emerald-600/20'
                                              : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                                          }`}
                                        >
                                          <span>🟢 {hasCheque ? "Chekni Tasdiqlash (To'lov qabul qilindi)" : "To'lovni qo'lda tasdiqlash (Cheksiz)"}</span>
                                        </button>
                                        {!canVerify && (
                                          <p className="text-[9px] text-amber-400 font-bold text-center italic mt-1">
                                            {isWaitingConfirmation ? "⚠️ Buyurtma Kutishda (Mijoz tasdig'i) holatida — to'lovni tasdiqlab bo'lmaydi" : "⚠️ Avval chekni ko'rib chiqing"}
                                          </p>
                                        )}
                                      </>
                                    );
                                  })()}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                  </div>
                </div>

              </motion.div>
            </div>
          )}

          {activeZoomChequeUrl && (
            <div className={`fixed inset-0 z-[100] flex items-center justify-center p-4 ${th.overlay}`} onClick={() => setActiveZoomChequeUrl(null)}>
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                onClick={(e) => e.stopPropagation()}
                className={`relative ${th.bg} border rounded-3xl max-w-lg w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl`}
              >
                {/* Modal Header */}
                <div className={`p-4 border-b ${th.chequeZoomHeader} flex items-center justify-between`}>
                  <span className={`text-xs font-black ${th.textIndigo} uppercase tracking-widest flex items-center space-x-2`}>
                    <span>🧾</span>
                    <span>To'lov Cheki Kattalashtirildi</span>
                  </span>
                  <button
                    onClick={() => setActiveZoomChequeUrl(null)}
                    className={`h-8 w-8 rounded-full ${th.btnIcon} flex items-center justify-center transition-all cursor-pointer`}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {/* Modal Image Body */}
                <div className={`flex-1 overflow-auto p-4 flex items-center justify-center ${th.chequeZoomBody} min-h-[300px]`}>
                  <img
                    src={activeZoomChequeUrl}
                    alt="Zoomed Payment Cheque"
                    referrerPolicy="no-referrer"
                    className="max-h-[60vh] max-w-full object-contain"
                  />
                </div>

                {/* Modal Footer */}
                <div className={`p-4 ${th.chequeZoomFooter} border-t flex items-center justify-between space-x-3`}>
                  <button
                    onClick={() => {
                      if (selectedOrder) {
                        setHasViewedReceipt(true);
                        setVerifiedCheques(prev => ({ ...prev, [selectedOrder.id]: true }));
                        const isPhoneOnlineWaiting = !!selectedOrder.isManualDraft && selectedOrder.paymentMethod === 'Online' && selectedOrder.status === 'Kutishda';
                        if (isPhoneOnlineWaiting) {
                          setOrders(prev => prev.map(o => o.id === selectedOrder.id ? {
                            ...o,
                            isChequeVerified: true,
                            isConfirmedByCustomer: true,
                            status: 'Kuryer qidirilmoqda',
                            dispatchedAt: Date.now()
                          } : o));
                          setSelectedOrder(prev => prev ? {
                            ...prev,
                            isChequeVerified: true,
                            isConfirmedByCustomer: true,
                            status: 'Kuryer qidirilmoqda',
                            dispatchedAt: Date.now()
                          } : null);
                          showToast("Chek tasdiqlandi va buyurtma Kuryer qidiruviga o'tkazildi! 🚀");
                        } else {
                          setOrders(prev => prev.map(o => o.id === selectedOrder.id ? { ...o, isChequeVerified: true } : o));
                          setSelectedOrder(prev => prev ? { ...prev, isChequeVerified: true } : null);
                          showToast("Chek muvaffaqiyatli tekshirildi va tasdiqlandi! ✓");
                        }
                        setActiveZoomChequeUrl(null);
                      }
                    }}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-3 px-4 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center space-x-1.5 cursor-pointer border-none"
                  >
                    <CheckCircle className="h-4 w-4" />
                    <span>Tasdiqlash ✓</span>
                  </button>
                  <button
                    onClick={() => {
                      if (selectedOrder) {
                        const link = document.createElement('a');
                        link.href = activeZoomChequeUrl;
                        link.download = `Cheque-${selectedOrder.id}.jpg`;
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                        showToast("Chek rasmi yuklab olindi! 📥");
                      }
                    }}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white py-3 px-4 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center space-x-1.5 cursor-pointer border-none"
                  >
                    <Download className="h-4 w-4" />
                    <span>Yuklab Olish 📥</span>
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Custom Confirmation Dialog Modal (Requirement 6) */}
        <AnimatePresence>
          {confirmModalConfig && (
            <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md z-[9999] flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 10 }}
                className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 text-center"
              >
                <div className="h-12 w-12 rounded-2xl bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto text-2xl font-black">
                  ❓
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                    {confirmModalConfig.title}
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-2 leading-relaxed">
                    {confirmModalConfig.message}
                  </p>
                  {confirmModalConfig.isPrompt && (
                    <div className="mt-3">
                      <input
                        type="text"
                        value={confirmInputValue}
                        onChange={(e) => setConfirmInputValue(e.target.value)}
                        placeholder={confirmModalConfig.inputPlaceholder || "Izoh kiriting..."}
                        className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
                        autoFocus
                      />
                    </div>
                  )}
                </div>
                <div className="flex space-x-2 pt-2">
                  <button
                    onClick={() => {
                      setConfirmModalConfig(null);
                      setConfirmInputValue("");
                    }}
                    className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-extrabold text-xs rounded-xl uppercase transition-all cursor-pointer border-none"
                  >
                    Bekor qilish
                  </button>
                  <button
                    onClick={() => {
                      const modal = confirmModalConfig;
                      const inputVal = confirmInputValue;
                      setConfirmModalConfig(null);
                      setConfirmInputValue("");
                      if (modal?.isPrompt && modal?.onConfirmWithInput) {
                        modal.onConfirmWithInput(inputVal);
                      } else if (modal?.onConfirm) {
                        modal.onConfirm();
                      }
                    }}
                    className="flex-1 py-3 bg-rose-600 hover:bg-rose-700 text-white font-black text-xs rounded-xl uppercase transition-all shadow-md cursor-pointer border-none"
                  >
                    Tasdiqlash
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
};
