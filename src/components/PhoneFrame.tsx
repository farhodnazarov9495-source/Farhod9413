/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ShoppingBag,
  Flame,
  UtensilsCrossed,
  Award,
  Coffee,
  Flower2,
  LayoutGrid,
  Search,
  ChevronLeft,
  ChevronRight,
  Star,
  Clock,
  MapPin,
  Plus,
  Minus,
  Check,
  Phone,
  Map as MapIcon,
  Upload,
  X,
  Lock,
  User,
  Home,
  ShoppingCart,
  Package,
  AlertTriangle,
  Send,
  Camera,
  Copy,
  CheckCircle
} from 'lucide-react';
import { Product, Store, CartItem, Order, ScreenType, Category, PromoBanner, PopularPartner, DeliveryZone, Courier } from '../types';
import { CATEGORIES, STORES as INITIAL_STORES, INITIAL_DELIVERY_ZONES, INITIAL_COURIERS } from '../data';
import { playNotificationSound } from '../utils/audio';
import { compressImage } from '../utils/image';
import { isCashPaymentAllowed, doesCartRequireOnlinePayment, getMandatoryOnlineReason } from '../utils/paymentRules';
import { renumberOrders } from '../utils/orderUtils';
import { PhoneInput, isUzbekPhoneValid, formatPhoneInput } from './PhoneInput';

export const ProductImage: React.FC<{ 
  image?: string | null; 
  className?: string; 
  emojiClassName?: string;
  fallbackEmoji?: string;
  alt?: string;
}> = ({ 
  image, 
  className = "h-full w-full object-cover", 
  emojiClassName = "text-2xl",
  fallbackEmoji = "📦",
  alt = ""
}) => {
  if (!image) {
    return <span className={emojiClassName}>{fallbackEmoji}</span>;
  }

  const isImg = image.startsWith('data:') || 
                image.startsWith('http://') || 
                image.startsWith('https://') || 
                image.startsWith('/') || 
                image.startsWith('blob:') ||
                /\.(jpg|jpeg|png|gif|webp|svg)($|\?)/i.test(image);

  if (isImg) {
    return <img src={image} className={className} alt={alt} referrerPolicy="no-referrer" />;
  }

  if (image.length <= 8) {
    return <span className={emojiClassName}>{image}</span>;
  }

  return <span className={emojiClassName}>{fallbackEmoji}</span>;
};

const renderProductImage = (image?: string | null, className = "h-full w-full object-cover", fallbackEmoji = "📦") => (
  <ProductImage image={image} className={className} fallbackEmoji={fallbackEmoji} />
);

export const OFFICIAL_KASBIGO_LOGO_URL = "https://i.ibb.co/p64BNF4B/a34c4781-022c-440d-8f9e-4b75d867aea3.png";

export const KasbiGoLogo = ({ className = "h-14 w-14" }: { className?: string }) => (
  <div className={`relative ${className} shrink-0 select-none flex items-center justify-center p-0.5 rounded-full group`}>
    {/* Ultra Pro Splash Gradient Backdrop Aura: Emerald + Orange + Violet/Purple */}
    <div className="absolute -inset-1.5 rounded-full bg-[conic-gradient(from_0deg,#059669,#f97316,#7c3aed,#059669)] opacity-85 blur-md animate-[spin_6s_linear_infinite]" />
    
    {/* Rotating Dynamic Gradient Ring */}
    <div className="absolute -inset-1 rounded-full bg-[conic-gradient(from_180deg,#10b981,#f97316,#9333ea,#10b981)] animate-[spin_4s_linear_infinite] shadow-lg" />

    {/* Inner Mask & Logo */}
    <div className="relative w-full h-full rounded-full overflow-hidden bg-slate-900 p-0.5 ring-2 ring-white/40 shadow-xl flex items-center justify-center z-10">
      <img 
        src={OFFICIAL_KASBIGO_LOGO_URL} 
        alt="KasbiGo" 
        className="w-full h-full object-cover rounded-full transition-transform duration-300 group-hover:scale-105"
        referrerPolicy="no-referrer"
      />
    </div>
  </div>
);

const CategoryIcon = ({ icon, className }: { icon: string; className?: string }) => {
  switch (icon) {
    case 'ShoppingBag': return <ShoppingBag className={className} />;
    case 'Flame': return <Flame className={className} />;
    case 'UtensilsCrossed': return <UtensilsCrossed className={className} />;
    case 'Award': return <Award className={className} />;
    case 'Coffee': return <Coffee className={className} />;
    case 'Flower2': return <Flower2 className={className} />;
    case 'LayoutGrid': return <LayoutGrid className={className} />;
    default: return <ShoppingBag className={className} />;
  }
};

function toCyrillic(text: string): string {
  if (!text) return text;
  
  const wordMap: Record<string, string> = {
    "YETKAZISH XIZMATI": "ЕТКАЗИШ ХИЗМАТИ",
    "Kasbi Go 24/7": "Касби Го 24/7",
    "FAOL • 24/7": "ФАОЛ • 24/7",
    "Qidiruv": "Қидирув",
    "Katalog": "Каталог",
    "Katalog bo'limlari": "Каталог бўлимлари",
    "Barchasi": "Барчаси",
    "To'liq ro'yxat": "Тоʻлиқ рўйхат",
    "Savat": "Сават",
    "Buyurtmalar": "Буюртмалар",
    "Profil": "Профиль",
    "Market": "Маркет",
    "Dorixona": "Дорихона",
    "Fastfud": "Фастфуд",
    "Fast Food": "Фаст Фуд",
    "Oshxona": "Ошхона",
    "Restoran": "Ресторан",
    "Ichimliklar": "Ичимликлар",
    "Gullar": "Гуллар",
    "Boshqalar": "Бошқалар",
    "Mashhur Hamkorlar": "Машҳур Ҳамкорлар",
    "Bo'limlar": "Бўлимлар",
    "YOZMA BUYURTMA": "ЁЗМА БУЮРТМА",
    "OVOZLI BUYURTMA": "ОВОЗЛИ БУЮРТМА",
    "HYPER FAST": "ГИПЕР ТЕЗКОР",
    "SMART VOICE AI": "СМАРТ ОВОЗ АИ",
    "Xohlagan narsangizni yozma ravishda buyurtma qiling": "Хоҳлаган нарсангизни ёзма равишда буюртма қилинг",
    "Ovozli xabar yuborish orqali tezkor buyurtma bering": "Овозли хабар юбориш орқали тезкор буюртма беринг",
    "Yozma buyurtma berish": "Ёзма буюртма бериш",
    "Ovozli buyurtma berish": "Овозли буюртма бериш",
    "Savatga nima qo'shmoqchisiz?": "Саватга нима қўшмоқчисиз?",
    "Telefon raqamingiz": "Телефон рақамингиз",
    "Mahallangiz": "Маҳаллангиз",
    "Dispetcherga yuborish": "Диспетчерга юбориш",
    "Ovoz yozilmoqda...": "Овоз ёзилмоқда...",
    "Yozuv yakunlandi": "Ёзув якунланди",
    "Tugmani bosing va gapiring": "Тугмани босинг ва гапиринг",
    "Ovozingizni eshiting:": "Овозингизни эшитинг:",
    "Qayta yozib olish": "Қайта ёзиб олиш",
    "Istalgan narsangizni nomi, miqdori va boshqa ma'lumotlari haqida gapiring! Biz qisqa fursatda buyurtmangiz va uni yetkazish narxini sizga ma'lum qilamiz.": "Исталган нарсангизни номи, миқдори ва бошқа маълумотлари ҳақида гапиринг! Биз қисқа фурсатда буюртмангиз ва уни етказиш нархини сизга маълум қиламиз.",
    "Siz istalgan mahsulotni yozib yuboring. Operatorimiz uni tekshirib, narxini belgilaydi. Keyin manzilni kiritib buyurtmani tasdiqlashingiz mumkin bo'ladi.": "Сиз исталган маҳсулотни ёзиб юборинг. Операторимиз уни текшириб, нархини белгилайди. Кейин манзилни киритиб буюртмани тасдиқлашингиз мумкин бўлади.",
    "Qo'shish": "Қўшиш",
    "Buyurtma berish": "Буюртма бериш",
    "To'lov qilish": "Тўлов қилиш",
    "Kuryerni baholang": "Курьерни баҳоланг",
    "Xizmat sifatini baholashga yordam bering": "Хизмат сифатини баҳолашга ёрдам беринг",
    "Izoh qoldiring": "Изоҳ қолдиринг",
    "Bahoni yuborish": "Баҳони юбориш",
    "Keyinroq": "Кейинроқ",
    "Jami:": "Жами:",
    "Mahsulotlar": "Маҳсулотлар",
    "Do'konlar": "Дўконлар",
    "Mahsulot yoki do'kon qidiring...": "Маҳсулот ёки дўкон қидиринг...",
    "Naqd": "Нақд",
    "Online": "Онлайн",
    "Yangi": "Янги",
    "Narx belgilashda": "Нарх белгилашда",
    "Kutishda": "Кутишда",
    "Mijoz tasdiqlashini kutmoqda": "Мижоз тасдиқлашини кутмоқда",
    "Kuryer qidirilmoqda": "Курьер қидирилмоқда",
    "Kuryerda": "Курьерда",
    "Yetkazildi": "Етказилди",
    "Bekor qilindi": "Бекор қилинди"
  };

  if (wordMap[text]) return wordMap[text];

  let str = text;
  str = str.replace(/Sh/g, "Ш").replace(/sh/g, "ш")
           .replace(/Ch/g, "Ч").replace(/ch/g, "ч")
           .replace(/Yo/g, "Ё").replace(/yo/g, "ё")
           .replace(/Yu/g, "Ю").replace(/yu/g, "ю")
           .replace(/Ya/g, "Я").replace(/ya/g, "я")
           .replace(/Ye/g, "Е").replace(/ye/g, "е")
           .replace(/O['’`ʻ]/g, "Ў").replace(/o['’`ʻ]/g, "ў")
           .replace(/G['’`ʻ]/g, "Ғ").replace(/g['’`ʻ]/g, "ғ");

  const singleChars: Record<string, string> = {
    'A': 'А', 'a': 'а', 'B': 'Б', 'b': 'б', 'V': 'В', 'v': 'в',
    'G': 'Г', 'g': 'г', 'D': 'Д', 'd': 'д', 'E': 'Е', 'e': 'е',
    'Z': 'З', 'z': 'з', 'I': 'И', 'i': 'и', 'J': 'Ж', 'j': 'ж',
    'K': 'К', 'k': 'к', 'L': 'Л', 'l': 'л', 'M': 'М', 'm': 'м',
    'N': 'Н', 'n': 'н', 'O': 'О', 'o': 'о', 'P': 'П', 'p': 'п',
    'R': 'Р', 'r': 'р', 'S': 'С', 's': 'с', 'T': 'Т', 't': 'т',
    'U': 'У', 'u': 'у', 'F': 'Ф', 'f': 'ф', 'X': 'Х', 'x': 'х',
    'H': 'Ҳ', 'h': 'ҳ', 'Q': 'Қ', 'q': 'қ'
  };

  return str.split('').map(c => singleChars[c] || c).join('');
}

function convertScript(text: string, scriptMode: 'latin' | 'cyrillic'): string {
  if (scriptMode === 'latin' || !text) return text;
  return toCyrillic(text);
}

export const getCategoryEmojiDetails = (id: string, name: string = '', icon?: string) => {
  const isLogo = icon && (
    icon.includes('p64BNF4B') || 
    icon.includes('a34c4781') || 
    icon.includes('kasbi_go_logo') || 
    icon.includes('kasbigo-logo')
  );

  const cleanIcon = isLogo ? undefined : icon;

  if (cleanIcon && (cleanIcon.startsWith('data:image') || cleanIcon.startsWith('http') || cleanIcon.startsWith('/')) && !cleanIcon.includes('p64BNF4B')) {
    return { isImage: true, src: cleanIcon, emoji: '📦' };
  }

  if (cleanIcon && cleanIcon.length <= 4 && !cleanIcon.includes('Flower') && !cleanIcon.includes('Pill') && !cleanIcon.includes('Shopping') && !cleanIcon.includes('Flame')) {
    return { isImage: false, emoji: cleanIcon };
  }

  const lowerId = (id || '').toLowerCase();
  const lowerName = (name || '').toLowerCase();

  const emojis: Record<string, string> = {
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

  if (emojis[lowerId]) return { isImage: false, emoji: emojis[lowerId] };
  if (lowerName.includes('gullar') || lowerName.includes('gul')) return { isImage: false, emoji: "💐" };
  if (lowerName.includes('dorixona') || lowerName.includes('dori') || lowerName.includes('apteka')) return { isImage: false, emoji: "💊" };
  if (lowerName.includes('qurilish')) return { isImage: false, emoji: "🏗️" };
  if (lowerName.includes('xojalik') || lowerName.includes('xo\'jalik') || lowerName.includes('ro\'zg\'or')) return { isImage: false, emoji: "🧹" };
  if (lowerName.includes('market') || lowerName.includes('do\'kon')) return { isImage: false, emoji: "🛒" };
  if (lowerName.includes('fast') || lowerName.includes('burger')) return { isImage: false, emoji: "🍔" };
  if (lowerName.includes('oshxona') || lowerName.includes('milliy')) return { isImage: false, emoji: "🍛" };
  if (lowerName.includes('restoran')) return { isImage: false, emoji: "🍽️" };
  if (lowerName.includes('ichimlik')) return { isImage: false, emoji: "🥤" };

  return { isImage: false, emoji: emojis[lowerId] || "📦" };
};

const ThreeDGlassIcon = ({ id, color, icon, name }: { id: string; color: string; icon?: string; name?: string }) => {
  const { isImage, src, emoji } = getCategoryEmojiDetails(id, name, icon);

  return (
    <div className="relative w-full aspect-square rounded-xl flex items-center justify-center select-none group shrink-0 overflow-hidden shadow-xs bg-slate-100 dark:bg-slate-800 transition-all duration-200">
      {isImage && src ? (
        <img src={src} alt="" className="w-full h-full object-cover rounded-xl transition-transform duration-300 group-hover:scale-105" />
      ) : (
        <div className={`w-full h-full rounded-xl bg-gradient-to-tr ${color} flex items-center justify-center relative overflow-hidden`}>
          <div className="relative z-10 text-2xl sm:text-3xl filter drop-shadow transform transition-transform duration-300 group-hover:scale-110 flex items-center justify-center">
            {emoji}
          </div>
        </div>
      )}
    </div>
  );
};

interface ThreeDNavIconProps {
  type: 'home' | 'cart' | 'orders' | 'profile';
  active: boolean;
  count?: number;
}

const ThreeDNavIcon = ({ type, active, count = 0 }: ThreeDNavIconProps) => {
  let label = '';
  let IconComponent: any = Home;
  let activeGradient = '';
  let glowColor = '';

  switch (type) {
    case 'home':
      label = 'Asosiy';
      IconComponent = Home;
      activeGradient = 'from-emerald-500 via-teal-500 to-emerald-600';
      glowColor = 'shadow-emerald-500/50';
      break;
    case 'cart':
      label = 'Savat';
      IconComponent = ShoppingCart;
      activeGradient = 'from-rose-500 via-red-500 to-rose-600';
      glowColor = 'shadow-rose-500/50';
      break;
    case 'orders':
      label = 'Buyurtma';
      IconComponent = Package;
      activeGradient = 'from-amber-500 via-orange-500 to-amber-600';
      glowColor = 'shadow-amber-500/50';
      break;
    case 'profile':
      label = 'Profil';
      IconComponent = User;
      activeGradient = 'from-indigo-500 via-purple-500 to-indigo-600';
      glowColor = 'shadow-indigo-500/50';
      break;
  }

  return (
    <div className="flex flex-col items-center justify-center py-0.5 transition-all duration-300 cursor-pointer relative group">
      {/* Dynamic Active Pill Container */}
      <div className={`relative flex items-center justify-center transition-all duration-300 ${
        active 
          ? `px-3.5 py-1.5 rounded-2xl bg-gradient-to-r ${activeGradient} text-white shadow-lg ${glowColor} scale-105 -translate-y-0.5`
          : 'px-3 py-1.5 rounded-xl text-slate-600 dark:text-slate-400 hover:text-slate-900 hover:bg-amber-100/60 dark:hover:bg-slate-800/50'
      }`}>
        <IconComponent className={`h-4.5 w-4.5 transition-transform duration-300 ${active ? 'scale-110 drop-shadow-md' : 'group-hover:scale-110'}`} />

        {/* Counter Badge */}
        {count > 0 && (
          <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] bg-rose-600 text-white border-2 border-[#FFFDF5] dark:border-slate-900 rounded-full flex items-center justify-center text-[8.5px] font-black px-1 shadow-md animate-bounce">
            {count}
          </span>
        )}
      </div>

      <span className={`text-[8.5px] font-black uppercase tracking-wider mt-0.5 transition-all duration-200 ${
        active 
          ? 'text-emerald-700 dark:text-emerald-400 font-extrabold scale-105' 
          : 'text-slate-600 dark:text-slate-400 group-hover:text-slate-900'
      }`}>
        {label}
      </span>
    </div>
  );
};


const getCategoryColor = (id: string) => {
  const colors: Record<string, string> = {
    market: "from-emerald-400 to-teal-500",
    dorixona: "from-rose-400 to-red-500",
    fastfood: "from-amber-400 to-orange-500",
    oshxona: "from-yellow-400 to-amber-500",
    restoran: "from-indigo-400 to-purple-500",
    ichimliklar: "from-sky-400 to-blue-500",
    gullar: "from-pink-400 to-rose-500",
    boshqalar: "from-slate-400 to-slate-600",
  };
  return colors[id] || "from-emerald-400 to-teal-500";
};

interface PhoneFrameProps {
  activeScreen: ScreenType;
  setActiveScreen: (screen: ScreenType) => void;
  selectedCategory: string | null;
  setSelectedCategory: (cat: string | null) => void;
  selectedStore: Store | null;
  setSelectedStore: (store: Store | null) => void;
  cart: CartItem[];
  addToCart: (product: Product, store: Store) => void;
  removeFromCart: (product: Product) => void;
  clearCart: () => void;
  userAddress: { mahalla: string; comment: string; additionalComment?: string; latitude?: number; longitude?: number };
  setUserAddress: (address: { mahalla: string; comment: string; additionalComment?: string; latitude?: number; longitude?: number }) => void;
  paymentMethod: 'Naqd' | 'Online';
  setPaymentMethod: (method: 'Naqd' | 'Online') => void;
  orders: Order[];
  setOrders?: React.Dispatch<React.SetStateAction<Order[]>>;
  placeOrder: (chequeUrls?: string[]) => void;
  rateDriver: (orderId: string, rating: number, comment?: string) => void;
  courierList?: Courier[];
  
  isBlacklisted: boolean;
  cashlessLimit: number;
  adminCardNumber: string;
  adminPhone: string;
  adminTelegram: string;
  userProfile: { name: string; phone: string };
  setUserProfile: React.Dispatch<React.SetStateAction<{ name: string; phone: string }>>;
  minOrderLimit: number;
  deliveryZones?: DeliveryZone[];
  extraStopFee?: number;
  updateCartItemPrice: (productId: string, price: number) => void;
  stores?: Store[];
  promos?: PromoBanner[];
  categories?: Category[];
  partners?: PopularPartner[];
  theme?: 'light' | 'dark';
  setTheme?: (theme: 'light' | 'dark') => void;
  mandatoryOnlineCategories?: string[];
  cardHolderName?: string;
}

export const PhoneFrame: React.FC<PhoneFrameProps> = ({
  activeScreen,
  setActiveScreen,
  selectedCategory,
  setSelectedCategory,
  selectedStore,
  setSelectedStore,
  cart,
  addToCart,
  removeFromCart,
  clearCart,
  userAddress,
  setUserAddress,
  paymentMethod,
  setPaymentMethod,
  orders,
  setOrders,
  placeOrder,
  rateDriver,
  courierList,
  
  isBlacklisted,
  cashlessLimit,
  adminCardNumber,
  adminPhone,
  adminTelegram,
  userProfile,
  setUserProfile,
  minOrderLimit,
  deliveryZones,
  extraStopFee = 3000,
  updateCartItemPrice,
  stores,
  promos,
  categories,
  partners,
  theme = 'dark',
  setTheme,
  mandatoryOnlineCategories = ['Fast Food', 'Oshxona', 'Gullar'],
  cardHolderName: propCardHolderName,
}) => {
  const STORES = stores || INITIAL_STORES;
  const ALL_PROMOS = promos || [];
  const ALL_CATEGORIES = categories || CATEGORIES;
  const ALL_PARTNERS = partners || [];
  const [time, setTime] = useState('12:00');
  const [searchTerm, setSearchTerm] = useState('');
  const [storeSearchTerm, setStoreSearchTerm] = useState('');
  const [favorites, setFavorites] = useState<string[]>(['kasbi-market', 'dori-darmon']);
  const [addressingOrderId, setAddressingOrderId] = useState<string | null>(null);

  // Script Mode: 'latin' (O'z) vs 'cyrillic' (Ўз)
  const [scriptMode, setScriptMode] = useState<'latin' | 'cyrillic'>(() => 
    (typeof window !== 'undefined' && localStorage.getItem('kasbigo_script_mode') as 'latin' | 'cyrillic') || 'latin'
  );

  const toggleScriptMode = (mode: 'latin' | 'cyrillic') => {
    setScriptMode(mode);
    if (typeof window !== 'undefined') {
      localStorage.setItem('kasbigo_script_mode', mode);
    }
  };

  // Large Courier Rating Modal state (Requirements B & C)
  const [dismissedRatingOrderIds, setDismissedRatingOrderIds] = useState<string[]>([]);
  const [selectedStars, setSelectedStars] = useState<number>(0);
  const [hoverStars, setHoverStars] = useState<number>(0);
  const [ratingComment, setRatingComment] = useState<string>('');

  // Requirement 5: Client App Orders - Exclude phone/manual draft orders created by call center
  const clientOrders = (orders || []).filter(o => !o.isManualDraft);

  // Auto-detect unrated delivered order that hasn't been dismissed
  const unratedOrder = clientOrders.find(
    o => o.status === 'Yetkazildi' && !o.driverRating && !dismissedRatingOrderIds.includes(o.id)
  );

  useEffect(() => {
    if (unratedOrder) {
      setSelectedStars(0);
      setHoverStars(0);
      setRatingComment('');
    }
  }, [unratedOrder?.id]);

  const handleDismissRatingModal = (orderId: string) => {
    setDismissedRatingOrderIds(prev => [...prev, orderId]);
  };

  const handleSubmitRating = (orderId: string) => {
    if (selectedStars === 0) return;
    rateDriver(orderId, selectedStars, ratingComment.trim() ? ratingComment.trim() : undefined);
    setDismissedRatingOrderIds(prev => [...prev, orderId]);
  };

  const getCourierForOrder = (order: Order) => {
    if (!order.claimedBy) return null;
    const allCouriers = courierList && courierList.length > 0 ? courierList : INITIAL_COURIERS;
    
    // 1. Phone matching
    const cleanO = order.claimedBy.replace(/\D/g, '');
    if (cleanO.length >= 5) {
      const byPhone = allCouriers.find(c => {
        const cleanPhone = c.phone ? c.phone.replace(/\D/g, '') : '';
        return cleanPhone && (cleanPhone.endsWith(cleanO) || cleanO.endsWith(cleanPhone));
      });
      if (byPhone) return byPhone;
    }

    // 2. Name matching
    const byName = allCouriers.find(c => c.name.toLowerCase() === order.claimedBy?.toLowerCase());
    if (byName) return byName;

    // 3. ID matching
    const byId = allCouriers.find(c => c.id === order.claimedBy);
    if (byId) return byId;

    return null;
  };
  
  // Address location state
  const [addressInput, setAddressInput] = useState(userAddress.mahalla);
  const [commentInput, setCommentInput] = useState(userAddress.comment);
  const [mahallaSearchFilter, setMahallaSearchFilter] = useState('');

  const activeZones = deliveryZones || INITIAL_DELIVERY_ZONES;
  const allMahallasList = React.useMemo(() => {
    const list: string[] = [];
    // Requirement 2: Grouped by zone order (Markaz, Markaz atrofi, Markaz cheti, Markazdan uzoq, Olis hudud) without alphabetical re-sorting
    activeZones.forEach(z => {
      (z.mahallas || []).forEach(m => {
        if (m && !list.includes(m)) list.push(m);
      });
    });
    return list;
  }, [activeZones]);

  const filteredMahallasList = React.useMemo(() => {
    if (!mahallaSearchFilter.trim()) return allMahallasList;
    const q = mahallaSearchFilter.trim().toLowerCase();
    return allMahallasList.filter(m => m.toLowerCase().includes(q));
  }, [allMahallasList, mahallaSearchFilter]);
  const [isDetectingGPS, setIsDetectingGPS] = useState(false);
  const [gpsMessage, setGpsMessage] = useState('');

  // Simulated GPS Settings status
  const [isGPSEnabled, setIsGPSEnabled] = useState(false);
  const [showGPSWarning, setShowGPSWarning] = useState(false);
  const [detectedCoords, setDetectedCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Unified real-time GPS locator function - Geolocation API Integration with high-accuracy
  const [gpsPermissionDenied, setGpsPermissionDenied] = useState(false);

  const enableGPSAndDetect = (silent = false) => {
    setIsGPSEnabled(true);
    setIsDetectingGPS(true);
    setGpsPermissionDenied(false);
    if (!silent) {
      setGpsMessage("GPS sun'iy yo'ldoshidan real koordinatalar olinmoqda...");
    } else {
      setGpsMessage("📍 Geolokatsiya so'ralmoqda...");
    }
    
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          setDetectedCoords({ latitude: lat, longitude: lng });
          setUserAddress({
            ...userAddress,
            latitude: lat,
            longitude: lng
          });
          setGpsMessage(`📍 Haqiqiy joylashuvingiz muvaffaqiyatli aniqlandi va xarita yangilandi!`);
          setIsDetectingGPS(false);
          setShowGPSWarning(false);
        },
        (error) => {
          console.warn("Geolocation failed:", error);
          setDetectedCoords(null);
          setIsDetectingGPS(false);
          setGpsPermissionDenied(true);
          setGpsMessage("Iltimos, telefoningizdan GPS funksiyasini yoqing!");
          if (!silent) setShowGPSWarning(true);
        },
        { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
      );
    } else {
      setDetectedCoords(null);
      setGpsMessage("Iltimos, telefoningizdan GPS funksiyasini yoqing!");
      setIsDetectingGPS(false);
      if (!silent) setShowGPSWarning(true);
    }
  };

  const handleGPSDetection = () => {
    enableGPSAndDetect(false);
  };
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedChequeUrl, setSelectedChequeUrl] = useState<string | null>(null);
  const [selectedChequeUrls, setSelectedChequeUrls] = useState<string[]>([]);
  const [selectedFilterDate, setSelectedFilterDate] = useState<string>('');
  const [additionalCommentInput, setAdditionalCommentInput] = useState(userAddress.additionalComment || '');
  const [copiedCardToast, setCopiedCardToast] = useState(false);

  // Profile Edit fields inside Phone
  const [tempProfileName, setTempProfileName] = useState(userProfile.name);
  const [tempProfilePhone, setTempProfilePhone] = useState(userProfile.phone);
  const [tempAddressPhone, setTempAddressPhone] = useState(userProfile.phone);
  const [showProfileSavedAlert, setShowProfileSavedAlert] = useState(false);
  const [profileEditMode, setProfileEditMode] = useState<'none' | 'name' | 'phone'>('none');

  // Rotating top market ads index
  const [adIndex, setAdIndex] = useState(0);

  // Custom order states
  const [customOrderText, setCustomOrderText] = useState('');
  const [customOrderPhone, setCustomOrderPhone] = useState('');
  const [customOrderMahalla, setCustomOrderMahalla] = useState(userAddress.mahalla || '');
  const [voiceOrderPhone, setVoiceOrderPhone] = useState('');
  const [voiceOrderMahalla, setVoiceOrderMahalla] = useState(userAddress.mahalla || '');
  const [showCustomOrderModal, setShowCustomOrderModal] = useState(false);
  const [showVoiceOrderModal, setShowVoiceOrderModal] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null);
  const [recordedAudioBlob, setRecordedAudioBlob] = useState<Blob | null>(null);
  const recordingTimerRef = useRef<any>(null);
  const [pricingStatusMessage, setPricingStatusMessage] = useState('');
  const [customPriceOverrideText, setCustomPriceOverrideText] = useState('');

  // Standalone Phone Prompt Modal
  const [showPhonePromptModal, setShowPhonePromptModal] = useState(false);
  const [pendingOrderType, setPendingOrderType] = useState<'custom' | 'voice' | 'standard' | null>(null);
  const [promptPhoneInput, setPromptPhoneInput] = useState('');

  // Image Zoom states
  const [zoomedProductImage, setZoomedProductImage] = useState<string | null>(null);
  const [zoomedProductName, setZoomedProductName] = useState<string | null>(null);

  // Support chat state
  const [supportMessage, setSupportMessage] = useState('');
  const [supportLog, setSupportLog] = useState<Array<{ sender: 'user' | 'bot'; text: string; time: string }>>([
    { sender: 'bot', text: "Assalomu alaykum! KasbiGo yetkazish qo'llab-quvvatlash xizmatiga xush kelibsiz. Qanday yordam bera olaman?", time: "12:00" }
  ]);

  // Sync profile edits, address phone, and address mahalla
  useEffect(() => {
    setTempProfileName(userProfile.name);
    setTempProfilePhone(userProfile.phone);
    if (activeScreen === 'address') {
      const currentDraft = addressingOrderId ? orders.find(o => o.id === addressingOrderId) : null;
      const initialMahalla = (currentDraft?.address?.mahalla && currentDraft.address.mahalla !== "Kutilmoqda...")
        ? currentDraft.address.mahalla
        : (userAddress.mahalla || '');
      
      if (initialMahalla && !addressInput) {
        setAddressInput(initialMahalla);
      }

      const initialPhone = currentDraft?.customerPhone || userProfile.phone;
      if (initialPhone && (!tempAddressPhone || tempAddressPhone === '+998')) {
        setTempAddressPhone(initialPhone);
      }

      if (currentDraft?.address?.comment && !commentInput) {
        setCommentInput(currentDraft.address.comment);
      }
      if (currentDraft?.address?.additionalComment && !additionalCommentInput) {
        setAdditionalCommentInput(currentDraft.address.additionalComment);
      }
    }
  }, [userProfile, activeScreen, addressingOrderId, orders, userAddress.mahalla]);

  // Auto-detect geolocation when entering address screen
  useEffect(() => {
    if (activeScreen === 'address') {
      if (navigator.permissions && navigator.permissions.query) {
        navigator.permissions.query({ name: 'geolocation' as PermissionName })
          .then((result) => {
            if (result.state === 'granted' || result.state === 'prompt') {
              enableGPSAndDetect(true); // Silent mode so we do not show full red error banners automatically on mount
            }
          })
          .catch((err) => {
            console.warn("Permission query failed, attempting silent geolocation fetch:", err);
            enableGPSAndDetect(true);
          });
      } else {
        enableGPSAndDetect(true);
      }
    }
  }, [activeScreen]);

  // Automated ad rotation interval (cycles every 4 seconds)
  useEffect(() => {
    const timer = setInterval(() => {
      setAdIndex((prev) => (prev + 1) % 4);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  // Task 7: Auto-fill phone and mahalla when opening voice/custom order modals
  useEffect(() => {
    if (showVoiceOrderModal && userProfile.phone && (!voiceOrderPhone || voiceOrderPhone === '+998')) {
      setVoiceOrderPhone(userProfile.phone);
    }
    if (showVoiceOrderModal && userAddress.mahalla && !voiceOrderMahalla) {
      setVoiceOrderMahalla(userAddress.mahalla);
    }
    if (showCustomOrderModal && userProfile.phone && (!customOrderPhone || customOrderPhone === '+998')) {
      setCustomOrderPhone(userProfile.phone);
    }
  }, [showVoiceOrderModal, showCustomOrderModal, userProfile.phone, userAddress.mahalla]);

  // Track when admin sets price for a custom order in cart, and play short voice message / sound signal (Requirement 3)
  const [hadPendingCustomItem, setHadPendingCustomItem] = useState(false);

  useEffect(() => {
    const hasPending = cart.some(item => item.product.id.startsWith('custom-') && item.product.price === 0);
    const hasPriced = cart.some(item => item.product.id.startsWith('custom-') && item.product.price > 0);

    if (hadPendingCustomItem && !hasPending && hasPriced) {
      // Short audio signal played to customer when price is assigned
      playNotificationSound('customer');
    }
    setHadPendingCustomItem(hasPending);
  }, [cart, hadPendingCustomItem]);

  // Track order state changes to play sound when admin sets price on a submitted order (Requirement 6)
  const prevPendingOrdersRef = useRef<Record<string, { isPending: boolean; total: number }>>({});

  // Auto-switch payment method to 'Online' if mandatory online payment is triggered or user is blacklisted (Tasks 4 & 5)
  useEffect(() => {
    const mandatoryInfo = getMandatoryOnlineReason(
      cart,
      STORES,
      mandatoryOnlineCategories,
      cart.reduce((s, i) => s + (i.product.price * i.quantity), 0),
      cashlessLimit,
      adminPhone
    );
    if ((mandatoryInfo.isMandatory || isBlacklisted) && paymentMethod === 'Naqd') {
      setPaymentMethod('Online');
    }
  }, [cart, STORES, mandatoryOnlineCategories, cashlessLimit, adminPhone, isBlacklisted, paymentMethod, setPaymentMethod]);

  useEffect(() => {
    if (!orders) return;
    
    orders.forEach(o => {
      const prev = prevPendingOrdersRef.current[o.id];
      const isPending = Boolean(o.isCustomPendingPrice || o.status === 'Narx belgilashda');
      const currentTotal = o.total || 0;
      
      if (prev) {
        // If it transitioned from pending to priced, or total went from 0 to >0 while pending
        if (((prev.isPending && !isPending) || (prev.total === 0 && currentTotal > 0 && prev.isPending)) &&
            !o.isConfirmedByCustomer &&
            o.status !== 'Yangi' &&
            o.status !== 'Bekor qilindi' &&
            o.status !== 'Yetkazildi') {
          playNotificationSound('customer');
          // Requirement 5: Auto-redirect to Address screen when price gets confirmed
          setAddressingOrderId(o.id);
          const existingMahalla = (o.address?.mahalla && o.address.mahalla !== "Kutilmoqda...")
            ? o.address.mahalla
            : (userAddress.mahalla || '');
          setAddressInput(existingMahalla);
          setCommentInput(o.address?.comment || userAddress.comment || '');
          setAdditionalCommentInput(o.address?.additionalComment || userAddress.additionalComment || '');
          if (o.customerPhone) {
            setTempAddressPhone(o.customerPhone);
          }
          setActiveScreen('address');
        }
      }
      
      prevPendingOrdersRef.current[o.id] = { isPending, total: currentTotal };
    });
  }, [orders]);

  // Custom order pricing state observer (Requirement 3: admin qo'lda yozilgan buyurtmani tekshirib narx belgilaydi)
  useEffect(() => {
    if (activeScreen === 'cart') {
      const pendingCustomItem = cart.find(item => item.product.id.startsWith('custom-') && item.product.price === 0);
      if (pendingCustomItem) {
        setPricingStatusMessage('Admin buyurtmani o\'rganmoqda...');
      } else {
        setPricingStatusMessage('✅ Narx belgilandi!');
      }
    }
  }, [activeScreen, cart]);

  // Keep time updated
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      let hours = now.getHours();
      let minutes = now.getMinutes();
      setTime(`${hours < 10 ? '0' + hours : hours}:${minutes < 10 ? '0' + minutes : minutes}`);
    };
    updateTime();
    const interval = setInterval(updateTime, 15000);
    return () => {
      clearInterval(interval);
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
    };
  }, []);

  const formatPrice = (price: number) => {
    return price.toLocaleString('uz-UZ') + " so'm";
  };

  const getCartCount = () => {
    return cart.reduce((acc, item) => acc + item.quantity, 0);
  };

  const getCartTotal = () => {
    return cart.reduce((acc, item) => acc + (item.product.price * item.quantity), 0);
  };

  // Filtered stores/products based on search
  const displayedStores = STORES.filter(store => {
    const matchesCategory = selectedCategory ? store.category === selectedCategory : true;
    const matchesSearch = store.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          store.location.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const allFilteredProducts = STORES.flatMap(s => s.products.map(p => ({ ...p, store: s }))).filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleFavorite = (storeId: string) => {
    if (favorites.includes(storeId)) {
      setFavorites(favorites.filter(id => id !== storeId));
    } else {
      setFavorites([...favorites, storeId]);
    }
  };

  const executeCustomOrderSubmission = (phoneToUse: string, mahallaToUse?: string) => {
    const customId = `custom-${Date.now()}`;
    const customProduct: Product = {
      id: customId,
      name: customOrderText.trim(),
      price: 0,
      image: '✍️',
      description: "Mijoz tomonidan qo'lda yozilgan maxsus buyurtma.",
    };

    const today = new Date();
    const formattedDate = today.toLocaleDateString('uz-UZ').split('.').reverse().join('-');
    const chosenMahalla = (mahallaToUse || customOrderMahalla || userAddress.mahalla || '').trim();

    if (chosenMahalla && setUserAddress) {
      setUserAddress(prev => ({ ...prev, mahalla: chosenMahalla }));
    }
    if (phoneToUse && setUserProfile) {
      setUserProfile(prev => ({ ...prev, phone: phoneToUse }));
    }

    const draftOrder: Order = {
      id: `#KG-2026-${Math.floor(10000 + Math.random() * 90000)}`,
      items: [{ product: customProduct, quantity: 1, storeId: 'custom-store', storeName: 'KasbiGo Maxsus Xizmati' }],
      total: 0,
      storeName: 'KasbiGo Maxsus Xizmati',
      address: { mahalla: chosenMahalla || "Kutilmoqda...", comment: "" },
      customerName: userProfile.name || "Mijoz",
      customerPhone: phoneToUse,
      paymentMethod: 'Naqd',
      status: 'Narx belgilashda',
      isCustomPendingPrice: true,
      isConfirmedByCustomer: false,
      date: formattedDate,
      time: new Date().toTimeString().split(' ')[0].substring(0, 5),
    };

    if (setOrders) {
      setOrders(prev => renumberOrders([draftOrder, ...prev]));
    }
    setCustomOrderText('');
    setShowCustomOrderModal(false);
    setPricingStatusMessage('Buyurtma qabul qilindi. Narx hisoblanmoqda...');
    setActiveScreen('orders');
    playNotificationSound('customer');
  };

  const handleSubmitCustomOrder = (phoneArg?: string, mahallaArg?: string) => {
    if (!customOrderText.trim()) return;
    const phoneToUse = (phoneArg || customOrderPhone || userProfile.phone || '').trim();
    const mahallaToUse = (mahallaArg || customOrderMahalla || userAddress.mahalla || '').trim();
    if (!phoneToUse) return;
    if (setUserProfile && phoneToUse !== userProfile.phone) {
      setUserProfile(prev => ({ ...prev, phone: phoneToUse }));
    }
    executeCustomOrderSubmission(phoneToUse, mahallaToUse);
  };

  const executeVoiceOrderSubmission = (phoneToUse: string, mahallaToUse?: string) => {
    if (!recordedAudioUrl) return;

    const customId = `custom-voice-${Date.now()}`;
    const voiceProduct: Product = {
      id: customId,
      name: `🎙️ Ovozli buyurtma (${recordingSeconds}s)`,
      price: 0,
      image: '🎙️',
      description: "Mijoz tomonidan ovozli xabar orqali yuborilgan buyurtma.",
      voiceUrl: recordedAudioUrl
    };

    const today = new Date();
    const formattedDate = today.toLocaleDateString('uz-UZ').split('.').reverse().join('-');
    const chosenMahalla = (mahallaToUse || voiceOrderMahalla || userAddress.mahalla || '').trim();

    if (chosenMahalla && setUserAddress) {
      setUserAddress(prev => ({ ...prev, mahalla: chosenMahalla }));
    }
    if (phoneToUse && setUserProfile) {
      setUserProfile(prev => ({ ...prev, phone: phoneToUse }));
    }

    const draftOrder: Order = {
      id: `#KG-2026-${Math.floor(10000 + Math.random() * 90000)}`,
      items: [{ product: voiceProduct, quantity: 1, storeId: 'custom-store', storeName: 'KasbiGo Maxsus Xizmati' }],
      total: 0,
      storeName: 'KasbiGo Maxsus Xizmati',
      address: { mahalla: chosenMahalla || "Kutilmoqda...", comment: "" },
      customerName: userProfile.name || "Mijoz",
      customerPhone: phoneToUse,
      paymentMethod: 'Naqd',
      status: 'Narx belgilashda',
      isCustomPendingPrice: true,
      isConfirmedByCustomer: false,
      date: formattedDate,
      time: new Date().toTimeString().split(' ')[0].substring(0, 5),
    };

    if (setOrders) {
      setOrders(prev => renumberOrders([draftOrder, ...prev]));
    }
    setRecordedAudioUrl(null);
    setRecordedAudioBlob(null);
    setRecordingSeconds(0);
    setShowVoiceOrderModal(false);
    setPricingStatusMessage('Buyurtma qabul qilindi. Narx hisoblanmoqda...');
    setActiveScreen('orders');
    playNotificationSound('customer');
  };

  const handleSubmitVoiceOrder = (phoneArg?: string, mahallaArg?: string) => {
    if (!recordedAudioUrl) return;
    const phoneToUse = (phoneArg || voiceOrderPhone || userProfile.phone || '').trim();
    const mahallaToUse = (mahallaArg || voiceOrderMahalla || userAddress.mahalla || '').trim();
    if (!phoneToUse) return;
    if (setUserProfile && phoneToUse !== userProfile.phone) {
      setUserProfile(prev => ({ ...prev, phone: phoneToUse }));
    }
    executeVoiceOrderSubmission(phoneToUse, mahallaToUse);
  };

  const startRecording = async () => {
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

      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = () => {
        const audioBlob = new Blob(chunks, { type: recorder.mimeType || mimeType });
        const audioUrl = URL.createObjectURL(audioBlob);
        setRecordedAudioUrl(audioUrl);
        setRecordedAudioBlob(audioBlob);
        
        // Stop all tracks to release microphone
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
      setRecordingSeconds(0);

      const recordingStartTime = Date.now();
      recordingTimerRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - recordingStartTime) / 1000);
        setRecordingSeconds(elapsed);
      }, 250);
    } catch (err) {
      console.warn("Microphone access not granted or unavailable, switching to demo voice mode:", err);
      // Fallback demo recording when microphone permission is denied or restricted in frame
      setIsRecording(true);
      setRecordingSeconds(0);
      setMediaRecorder(null);

      const recordingStartTime = Date.now();
      recordingTimerRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - recordingStartTime) / 1000);
        setRecordingSeconds(elapsed);
      }, 250);
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
    } else if (!mediaRecorder && isRecording) {
      // Demo voice fallback audio sample
      const demoAudioUrl = "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAAA";
      setRecordedAudioUrl(demoAudioUrl);
    }
    setIsRecording(false);
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
    }
  };

  const copyAdminCard = () => {
    navigator.clipboard.writeText(adminCardNumber);
    setCopiedCardToast(true);
    setTimeout(() => setCopiedCardToast(false), 2000);
  };

  // Mock cheques that user can select from gallery
  const mockCheques = [
    { name: 'Payme Kvitansiya', img: 'https://images.unsplash.com/photo-1554415707-6e8cfc93fe23?auto=format&fit=crop&q=80&w=300' },
    { name: 'Click Tasdiqnoma', img: 'https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?auto=format&fit=crop&q=80&w=300' },
    { name: 'Uzum To\'lov Cheki', img: 'https://images.unsplash.com/photo-1621416894569-0f39ed31d247?auto=format&fit=crop&q=80&w=300' }
  ];

  const handleSelectMockCheque = (imgUrl: string) => {
    setIsGalleryOpen(false);
    setIsUploading(true);
    setUploadProgress(0);
    const interval = setInterval(() => {
      setUploadProgress(p => {
        if (p >= 100) {
          clearInterval(interval);
          setIsUploading(false);
          setSelectedChequeUrl(imgUrl);
          return 100;
        }
        return p + 25;
      });
    }, 150);
  };

  const handleRealImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsGalleryOpen(false);
    setIsUploading(true);
    setUploadProgress(20);

    try {
      const uploadedUrls: string[] = [];
      for (let i = 0; i < files.length; i++) {
        // Compress image to max 800x800 quality 0.7 to prevent memory freeze
        const compressedUrl = await compressImage(files[i], 800, 800, 0.7);
        uploadedUrls.push(compressedUrl);
      }

      setUploadProgress(100);
      setIsUploading(false);
      setSelectedChequeUrls(prev => [...prev, ...uploadedUrls]);
      if (uploadedUrls.length > 0) {
        setSelectedChequeUrl(uploadedUrls[0]);
      }
    } catch (err) {
      setIsUploading(false);
      alert("Rasmni yuklashda xatolik yuz berdi! Qayta urinib ko'ring.");
    }
  };



  const handleSaveAddress = () => {
    const draftOrderToSave = addressingOrderId ? orders.find(o => o.id === addressingOrderId) : null;
    const effectiveMahalla = addressInput.trim() || (draftOrderToSave?.address?.mahalla && draftOrderToSave.address.mahalla !== "Kutilmoqda..." ? draftOrderToSave.address.mahalla : userAddress.mahalla) || '';

    if (!effectiveMahalla.trim()) {
      alert("Iltimos, mahalla yoki qishlog'ingizni tanlang!");
      return;
    }

    if (addressingOrderId && setOrders) {
      const requiresOnline = draftOrderToSave?.paymentMethod === 'Online';

      setOrders(prev => prev.map(o => {
        if (o.id === addressingOrderId) {
          const nowStr = new Date().toTimeString().split(' ')[0].substring(0, 5);
          return {
            ...o,
            address: {
              mahalla: effectiveMahalla.trim(),
              comment: commentInput.trim(),
              additionalComment: additionalCommentInput.trim(),
              latitude: detectedCoords?.latitude || o.address.latitude,
              longitude: detectedCoords?.longitude || o.address.longitude
            },
            customerPhone: tempAddressPhone,
            time: nowStr,
            paymentMethod: requiresOnline ? 'Online' : o.paymentMethod,
            isConfirmedByCustomer: !requiresOnline,
            status: !requiresOnline ? 'Yangi' : o.status,
            isCustomPendingPrice: false
          };
        }
        return o;
      }));

      setUserProfile(prev => ({ ...prev, phone: tempAddressPhone }));
      if (setUserAddress) {
        setUserAddress(prev => ({ ...prev, mahalla: effectiveMahalla.trim() }));
      }

      if (requiresOnline) {
        setPaymentMethod('Online');
        setActiveScreen('checkout');
      } else {
        setAddressingOrderId(null);
        setActiveScreen('success');
        playNotificationSound('customer');
        playNotificationSound('admin');
      }
      return;
    }

    setUserAddress({
      mahalla: effectiveMahalla.trim(),
      comment: commentInput.trim(),
      additionalComment: additionalCommentInput.trim(),
      latitude: detectedCoords?.latitude,
      longitude: detectedCoords?.longitude
    });
    // Sync the mandatory phone field to user profile
    setUserProfile(prev => ({ ...prev, phone: tempAddressPhone }));
    setActiveScreen('checkout');
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!supportMessage.trim()) return;
    const userMsg = supportMessage;
    setSupportLog(prev => [...prev, { sender: 'user', text: userMsg, time: new Date().toTimeString().substring(0,5) }]);
    setSupportMessage('');

    setTimeout(() => {
      let botResponse = "Tushunarli. Buyurtmangiz haqidagi so'rovingiz dispetcherga yo'llandi. Tezkorda siz bilan bog'lanishadi.";
      if (userMsg.toLowerCase().includes('tel') || userMsg.toLowerCase().includes('admin')) {
        botResponse = `Biz bilan to'g'ridan-to'g'ri aloqa: ${adminPhone} raqami yoki Telegram: ${adminTelegram} orqali bog'lanishingiz mumkin.`;
      } else if (userMsg.toLowerCase().includes('kech') || userMsg.toLowerCase().includes('qayerda')) {
        botResponse = "Kuryerlarimiz hozirda yo'lda, buyurtmangiz navbat asosida tez orada yetkaziladi. Sabringiz uchun rahmat!";
      }
      setSupportLog(prev => [...prev, { sender: 'bot', text: botResponse, time: new Date().toTimeString().substring(0,5) }]);
    }, 1000);
  };

  // Checkout process guard
  const draftOrder = orders.find(o => o.id === addressingOrderId);
  const activeStoreId = addressingOrderId && draftOrder ? draftOrder.items[0]?.storeId : cart[0]?.storeId;
  const activeStore = (stores || INITIAL_STORES).find(s => s.id === activeStoreId);
  
  const currentCheckoutTotal = addressingOrderId && draftOrder ? draftOrder.total : getCartTotal();

  // Requirement A: If AT LEAST ONE category in the cart (or draft order) belongs to mandatoryOnlineCategories OR total > cashlessLimit, online payment is strictly required!
  const requiresOnlinePayment = doesCartRequireOnlinePayment(
    cart,
    stores || INITIAL_STORES,
    mandatoryOnlineCategories,
    currentCheckoutTotal,
    cashlessLimit,
    [draftOrder?.category, activeStore?.category]
  );

  const isCashAllowedForCheckout = !requiresOnlinePayment;

  useEffect(() => {
    if (activeScreen === 'checkout' && !isCashAllowedForCheckout && paymentMethod !== 'Online') {
      setPaymentMethod('Online');
    }
  }, [activeScreen, isCashAllowedForCheckout, paymentMethod, setPaymentMethod]);

  return (
    <div className={`relative flex h-[100dvh] w-full max-w-[430px] md:h-[920px] md:w-[370px] flex-col overflow-hidden rounded-none md:rounded-[48px] border-none md:border-[12px] md:border-slate-900 shadow-none md:shadow-2xl ring-0 md:ring-1 md:ring-black/10 select-none mx-auto ${theme === 'dark' ? 'dark bg-slate-950 text-slate-100' : 'bg-white text-slate-900'}`}>
      
      {/* Dynamic Island Notch */}
      <div className="hidden md:flex absolute top-2 left-1/2 z-50 h-7 w-[120px] -translate-x-1/2 rounded-full bg-black items-center justify-between px-3 text-white">
        <div className="flex items-center space-x-1">
          <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping"></div>
          {cart.length > 0 ? (
            <span className="text-[9px] font-bold text-emerald-400">🛒 {getCartCount()}</span>
          ) : (
            <span className="text-[8px] text-gray-400 font-mono">24/7 LIVE</span>
          )}
        </div>
        <div className="h-2 w-2 rounded-full bg-slate-800 border border-slate-700"></div>
      </div>

      {/* iOS Status Bar */}
      <div className="hidden md:flex h-11 items-end justify-between px-6 pb-2 text-[12px] font-semibold text-slate-800 dark:text-slate-200 z-40 select-none bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800">
        <span>{time}</span>
        <div className="flex items-center space-x-1.5">
          <div className="flex items-end space-x-0.5 h-2.5">
            <div className="w-[2px] h-[3px] bg-slate-700 dark:bg-slate-300 rounded-2xs"></div>
            <div className="w-[2px] h-[5px] bg-slate-700 dark:bg-slate-300 rounded-2xs"></div>
            <div className="w-[2px] h-[7px] bg-slate-700 dark:bg-slate-300 rounded-2xs"></div>
            <div className="w-[2px] h-[9px] bg-slate-700 dark:bg-slate-300 rounded-2xs"></div>
          </div>
          <span className="text-[9px] font-black">5G</span>
          <div className="relative w-5 h-2.5 border border-slate-700 dark:border-slate-300 rounded-xs p-[1px] flex items-center">
            <div className="h-full w-[85%] bg-emerald-500 rounded-2xs"></div>
          </div>
        </div>
      </div>

      {/* Internal App View */}
      <div className="relative flex-1 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col overflow-hidden">
        
        {/* GLOBAL BLACKLIST LOCK CARD (Absolute Overlap) */}
        <AnimatePresence>
          {isBlacklisted && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="absolute inset-0 bg-white z-50 flex flex-col items-center justify-center p-6 text-center"
            >
              <div className="h-20 w-20 rounded-full bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 mb-6 animate-pulse shadow-lg shadow-rose-200">
                <Lock className="h-10 w-10" />
              </div>

              <KasbiGoLogo className="h-16 w-16 mb-4 drop-shadow-md" />
              <h2 className="text-xl font-black text-slate-900">Kasbi Go 24/7</h2>
              <span className="inline-block mt-2 px-4 py-1.5 rounded-full text-xs font-black bg-rose-100 text-rose-800 uppercase tracking-wider animate-bounce">
                Siz qora ro'yxatdasiz! Adminga bog'laning
              </span>

              <p className="text-xs text-slate-500 mt-4 max-w-[260px] leading-relaxed">
                Tizimda soxta chaqiruv yoki asossiz online to'lov cheklari jo'natilganligi sababli, sizning profilingiz bloklangan.
              </p>

              <div className="mt-8 bg-slate-50 border border-slate-100 p-4 rounded-2xl w-full text-left space-y-3">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Admin bilan Bog'lanish:</span>
                
                <a 
                  href={`tel:${adminPhone}`}
                  className="w-full bg-white hover:bg-slate-100 text-slate-800 border border-slate-200 rounded-xl py-2.5 px-3 text-xs font-bold transition-all flex items-center justify-between"
                >
                  <span className="flex items-center">
                    <Phone className="h-4 w-4 text-emerald-600 mr-2" />
                    <span>{adminPhone}</span>
                  </span>
                  <ChevronRight className="h-4 w-4 text-slate-400" />
                </a>

                <a 
                  href={adminTelegram}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl py-2.5 px-3 text-xs font-bold transition-all flex items-center justify-between"
                >
                  <span className="flex items-center">
                    <Send className="h-4 w-4 text-white mr-2" />
                    <span>Telegram Admin bilan suhbat</span>
                  </span>
                  <ChevronRight className="h-4 w-4 text-emerald-100" />
                </a>
              </div>

              <p className="text-[9px] text-slate-400 mt-8">
                KasbiGo Dispatch Control System • 2026
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Persistent Brand Header */}
        <div className="relative overflow-hidden px-4 py-3.5 pt-[calc(0.85rem+env(safe-area-inset-top))] flex items-center justify-between shadow-2xl z-40 shrink-0 select-none border border-white/50 rounded-[28px] my-1 ultra-header-splash">
          {/* Top Glass 3D Gloss Reflection */}
          <div className="absolute inset-x-0 top-0 h-[50%] bg-gradient-to-b from-white/50 via-white/20 to-transparent pointer-events-none z-10" />
          
          {/* Moving diagonal shimmer highlight sweep */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent ultra-shimmer-sweep pointer-events-none z-10" />

          {/* CHAP ZONA: Logotip + Vertikal matn */}
          <div className="relative z-20 flex items-center space-x-3">
            <KasbiGoLogo className="h-12 w-12 shrink-0 filter drop-shadow-[0_4px_8px_rgba(0,0,0,0.3)]" />
            <div className="flex flex-col justify-center">
              <span className="text-[9px] font-black uppercase tracking-wider text-emerald-200 opacity-90 leading-tight block drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                YETKAZISH XIZMATI
              </span>
              <h2 className="text-base font-black italic tracking-tight leading-none text-amber-200 drop-shadow-[0_2px_5px_rgba(0,0,0,0.95)] whitespace-nowrap mt-0.5">
                Kasbi Go 24/7
              </h2>
            </div>
          </div>

          {/* O'NG ZONA: Status ko'rsatkichi + Rejim almashtirgich */}
          <div className="relative z-20 flex items-center space-x-2">
            {/* Status Indicator (FAOL) */}
            <div className="inline-flex items-center space-x-1.5 bg-black/25 backdrop-blur-xs border border-white/30 px-2.5 py-1 rounded-full shadow-md shrink-0">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
              </span>
              <span className="text-[10px] text-white font-black italic tracking-wider uppercase drop-shadow-xs whitespace-nowrap">
                FAOL
              </span>
            </div>

            {/* Theme Toggle Button */}
            {setTheme && (
              <button
                type="button"
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="h-8 w-8 rounded-full bg-black/20 hover:bg-black/35 border border-white/30 text-white transition-all cursor-pointer flex items-center justify-center active:scale-90 hover:scale-105 shadow-md shrink-0"
                title={theme === 'dark' ? "Kunduzgi rejim" : "Tungi rejim"}
              >
                {theme === 'dark' ? (
                  <span className="text-sm leading-none filter drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]">☀️</span>
                ) : (
                  <span className="text-sm leading-none filter drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]">🌙</span>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Normal Interactive Screens Container */}
        <div className="flex-1 flex flex-col overflow-hidden relative">
          <AnimatePresence mode="wait">
            
            {/* SCREEN: HOME */}
            {activeScreen === 'home' && (
              <motion.div
                key="home"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex-1 flex flex-col overflow-hidden h-full"
              >
                {/* Fixed Top Section: Promotional Banner Carousel & Search Input */}
                <div className="px-4 pt-3 pb-2.5 shrink-0 bg-white z-10 border-b border-slate-100 flex flex-col space-y-3">
                  
                  {/* Market Advertisements Carousel (Requirement 3 - Clockwise/Smooth Rotating Banner at the top of the main page) */}
                  <div className="relative overflow-hidden rounded-2xl w-full aspect-[16/9] shadow-xl border border-slate-200 dark:border-slate-700">
                    <AnimatePresence mode="wait">
                      {(() => {
                        const ads = ALL_PROMOS;
                        if (ads.length === 0) return null;
                        const activeAd = ads[adIndex] || ads[0];
                        if (!activeAd) return null;
                        
                        const isBgUploaded = activeAd.bg && (activeAd.bg.startsWith('data:image') || activeAd.bg.startsWith('http'));
                        const gradientMap = [
                          "from-emerald-700 to-emerald-950",
                          "from-indigo-700 to-indigo-950",
                          "from-amber-600 to-amber-950",
                          "from-sky-700 to-blue-950"
                        ];
                        const fallbackBg = gradientMap[adIndex % gradientMap.length];

                        return (
                           <motion.div
                             key={adIndex}
                             initial={{ x: '-100%', scale: 0.95, opacity: 0 }}
                             animate={{ x: 0, scale: 1, opacity: 1 }}
                             exit={{ x: '100%', scale: 0.95, opacity: 0 }}
                             transition={{ 
                               type: "spring",
                               stiffness: 110,
                               damping: 15,
                               mass: 0.8
                             }}
                             onClick={() => {
                               if (activeAd.targetType === 'url' || (activeAd.targetValue && activeAd.targetValue.startsWith('http'))) {
                                 window.open(activeAd.targetValue || activeAd.storeId, '_blank');
                               } else if (activeAd.targetType === 'category') {
                                 if (activeAd.targetValue) {
                                   setSelectedCategory(activeAd.targetValue);
                                   setActiveScreen('stores');
                                 } else {
                                   setActiveScreen('categories');
                                 }
                               } else {
                                 const store = STORES.find(s => s.id === activeAd.targetValue || s.id === activeAd.storeId || s.name.toLowerCase() === activeAd.title.toLowerCase());
                                 if (store) {
                                   setSelectedStore(store);
                                   setActiveScreen('store-detail');
                                 } else {
                                   setActiveScreen('stores');
                                 }
                               }
                             }}
                             style={isBgUploaded ? { backgroundImage: `url(${activeAd.bg})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}
                             className={`absolute inset-0 ${isBgUploaded ? '' : `bg-gradient-to-br ${activeAd.bg || fallbackBg}`} p-3.5 flex flex-col justify-between text-white overflow-hidden cursor-pointer group`}
                           >
                             {/* Dark gradient overlay for text readability */}
                             <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/45 to-slate-950/20 z-0 pointer-events-none" />

                             <div className="relative z-10 space-y-1">
                               <h3 className="text-base sm:text-lg font-black tracking-tight leading-tight text-yellow-300 drop-shadow-md">
                                 {activeAd.title}
                               </h3>
                               <p className="text-xs sm:text-sm font-bold text-sky-300 leading-snug max-w-[90%] line-clamp-2 drop-shadow-md">
                                 {activeAd.desc || activeAd.tag}
                               </p>
                             </div>

                             <div className="relative z-10 flex items-center justify-between pt-1">
                               <button
                                 type="button"
                                 onClick={(e) => {
                                   e.stopPropagation();
                                   if (activeAd.targetType === 'url' || (activeAd.targetValue && activeAd.targetValue.startsWith('http'))) {
                                     window.open(activeAd.targetValue || activeAd.storeId, '_blank');
                                   } else if (activeAd.targetType === 'category') {
                                     if (activeAd.targetValue) {
                                       setSelectedCategory(activeAd.targetValue);
                                       setActiveScreen('stores');
                                     } else {
                                       setActiveScreen('categories');
                                     }
                                   } else {
                                     const store = STORES.find(s => s.id === activeAd.targetValue || s.id === activeAd.storeId || s.name.toLowerCase() === activeAd.title.toLowerCase());
                                     if (store) {
                                       setSelectedStore(store);
                                       setActiveScreen('store-detail');
                                     } else {
                                       setActiveScreen('stores');
                                     }
                                   }
                                 }}
                                 className="bg-emerald-500 hover:bg-emerald-400 text-white font-black text-xs uppercase tracking-wider px-4 py-2 rounded-xl transition-all shadow-lg active:scale-95 flex items-center space-x-1 border border-emerald-300"
                               >
                                 <span className="text-yellow-200">{activeAd.actionText || "O'tish"}</span>
                                 <ChevronRight className="h-3.5 w-3.5 text-yellow-200" />
                               </button>
                               
                               {/* Carousel dots indicator */}
                               <div className="flex space-x-1.5 mr-1">
                                 {ads.map((_, idx) => (
                                   <button
                                     key={idx}
                                     onClick={(e) => {
                                       e.stopPropagation();
                                       setAdIndex(idx);
                                     }}
                                     className={`h-2 rounded-full transition-all duration-300 ${
                                       idx === adIndex ? 'bg-yellow-300 w-4' : 'bg-sky-200/60 w-2'
                                     }`}
                                   />
                                 ))}
                               </div>
                             </div>
                           </motion.div>
                         );
                       })()}
                    </AnimatePresence>
                  </div>
                                {/* Custom Order Methods: Side-by-Side Ultra Pro Splash Cards */}
                  <div className="grid grid-cols-2 gap-2.5 items-stretch select-none">
                    {/* Manual Custom Order Button Card */}
                    <div 
                      onClick={() => {
                        if (isUzbekPhoneValid(userProfile.phone)) {
                          setCustomOrderPhone(userProfile.phone);
                        } else {
                          setCustomOrderPhone('');
                        }
                        setShowCustomOrderModal(true);
                      }}
                      className="relative rounded-2xl p-[1.5px] overflow-hidden shadow-xl hover:shadow-2xl hover:scale-[1.02] cursor-pointer transition-all duration-300 min-h-[68px] h-full group flex"
                    >
                      {/* Rotating Splash Border Background */}
                      <div className="absolute -inset-[180%] ultra-card-border-splash opacity-95 group-hover:opacity-100" />

                      {/* Shiny Shimmer Diagonal Sweep Overlay */}
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/45 to-transparent ultra-shimmer-sweep pointer-events-none z-20" />

                      {/* Inner Card Body with Sharp Saturated Gradient & 3D Top Reflection */}
                      <div className="relative z-10 w-full h-full bg-gradient-to-br from-emerald-500 via-teal-600 to-cyan-700 rounded-[14px] p-2.5 flex items-center text-white shadow-[inset_0_2.5px_4px_rgba(255,255,255,0.9),0_8px_24px_rgba(16,185,129,0.6)] border border-emerald-300/80">
                        {/* 3D Glass Gloss Reflection Overlay */}
                        <div className="absolute inset-x-0 top-0 h-[50%] bg-gradient-to-b from-white/60 via-white/20 to-transparent pointer-events-none rounded-t-[14px]" />

                        <div className="flex items-center space-x-2 relative z-10 w-full">
                          <div className="flex items-center justify-center h-8 w-8 rounded-xl bg-slate-950/40 border-2 border-amber-300/90 text-white text-lg font-black shadow-xl backdrop-blur-xs shrink-0 transform group-hover:scale-110 transition-transform">
                            ✍️
                          </div>
                          <div className="min-w-0 flex-1">
                            <span className="text-[10px] font-black tracking-tight uppercase text-yellow-300 drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)] block leading-tight">
                              {convertScript("YOZMA BUYURTMA", scriptMode)}
                            </span>
                            <p className="text-[8.5px] text-white font-black leading-tight mt-0.5 drop-shadow-[0_1.5px_2px_rgba(0,0,0,0.9)] opacity-100">
                              {convertScript("Matnli xabar yuborish", scriptMode)}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Voice Custom Order Button Card */}
                    <div 
                      onClick={() => setShowVoiceOrderModal(true)}
                      className="relative rounded-2xl p-[1.5px] overflow-hidden shadow-xl hover:shadow-2xl hover:scale-[1.02] cursor-pointer transition-all duration-300 min-h-[68px] h-full group flex"
                    >
                      {/* Rotating Splash Border Background */}
                      <div className="absolute -inset-[180%] ultra-card-border-splash opacity-95 group-hover:opacity-100" />

                      {/* Shiny Shimmer Diagonal Sweep Overlay */}
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/45 to-transparent ultra-shimmer-sweep pointer-events-none z-20" />

                      {/* Inner Card Body with Sharp Saturated Gradient & 3D Top Reflection */}
                      <div className="relative z-10 w-full h-full bg-gradient-to-br from-fuchsia-600 via-rose-500 to-indigo-700 rounded-[14px] p-2.5 flex items-center text-white shadow-[inset_0_2.5px_4px_rgba(255,255,255,0.9),0_8px_24px_rgba(217,70,239,0.6)] border border-pink-300/80">
                        {/* 3D Glass Gloss Reflection Overlay */}
                        <div className="absolute inset-x-0 top-0 h-[50%] bg-gradient-to-b from-white/60 via-white/20 to-transparent pointer-events-none rounded-t-[14px]" />

                        <div className="flex items-center space-x-2 relative z-10 w-full">
                          <div className="flex items-center justify-center h-8 w-8 rounded-xl bg-slate-950/40 border-2 border-amber-300/90 text-white text-lg font-black shadow-xl backdrop-blur-xs shrink-0 transform group-hover:scale-110 transition-transform">
                            🎙️
                          </div>
                          <div className="min-w-0 flex-1">
                            <span className="text-[10px] font-black tracking-tight uppercase text-yellow-300 drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)] block leading-tight">
                              {convertScript("OVOZLI BUYURTMA", scriptMode)}
                            </span>
                            <p className="text-[8.5px] text-white font-black leading-tight mt-0.5 drop-shadow-[0_1.5px_2px_rgba(0,0,0,0.9)] opacity-100">
                              {convertScript("Ovozli xabar yuborish", scriptMode)}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Live Search Input - Ultra Modern High-Visibility Style */}
                  <div>
                    <div className="relative w-full group">
                      {/* Gradient glow halo */}
                      <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-500 via-teal-400 to-indigo-500 rounded-2xl opacity-70 group-hover:opacity-100 blur-xs transition duration-300 pointer-events-none" />

                      <div className="relative flex items-center bg-white dark:bg-slate-900 rounded-2xl p-1 shadow-lg border border-emerald-300/60 dark:border-emerald-500/40">
                        <div className="flex items-center justify-center h-8 w-8 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-white shadow-md shadow-emerald-500/30 ml-1 shrink-0">
                          <Search className="h-4 w-4" />
                        </div>
                        
                        <input
                          type="text"
                          placeholder={convertScript("Mahsulot yoki do'kon qidiring...", scriptMode)}
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="w-full bg-transparent py-2 pl-2.5 pr-8 text-xs font-bold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none"
                        />

                        {searchTerm ? (
                          <button 
                            type="button"
                            onClick={() => setSearchTerm('')} 
                            className="absolute right-3.5 h-6 w-6 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-300 hover:text-slate-900 flex items-center justify-center transition-all cursor-pointer border border-slate-200 dark:border-slate-700"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        ) : (
                          <div className="absolute right-3 pointer-events-none">
                            <span className="text-[8.5px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                              ⚡ {convertScript("TEZKOR", scriptMode)}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                </div> {/* End of Fixed Top Section */}

                {/* Main scrollable content below the header section */}
                <div className="flex-1 overflow-y-auto px-4 pb-24 pt-2.5 scrollbar-thin">

                {/* Real-time search feedback panel */}
                {searchTerm && (
                  <div className="mb-4 bg-emerald-50/50 dark:bg-emerald-950/60 border border-emerald-100 dark:border-emerald-800/60 rounded-2xl p-3 text-xs text-emerald-800 dark:text-emerald-200">
                    <span className="font-bold">Real-vaqt qidiruv natijalari:</span> {displayedStores.length} ta do'kon va {allFilteredProducts.length} ta mahsulot mos keldi.
                  </div>
                )}

                {/* Search Results / Normal Categories List */}
                {searchTerm ? (
                  <div className="space-y-4">
                    {/* Filtered Products segment */}
                    {allFilteredProducts.length > 0 && (
                      <div>
                        <h4 className="text-[10px] font-extrabold tracking-wider text-slate-400 uppercase mb-2">MAHSULOTLAR ({allFilteredProducts.length})</h4>
                        <div className="grid grid-cols-2 gap-2.5">
                          {allFilteredProducts.slice(0, 8).map((product, pIdx) => {
                            const cartItem = cart.find(item => item.product.id === product.id && item.storeId === product.store.id);
                            const qty = cartItem ? cartItem.quantity : 0;
                            return (
                              <div 
                                key={`search-prod-${product.store.id}-${product.id}-${pIdx}`}
                                className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 p-3 flex flex-col justify-between"
                              >
                                <div 
                                  onClick={() => {
                                    setSelectedStore(product.store);
                                    setActiveScreen('store-detail');
                                  }}
                                  className="cursor-pointer"
                                >
                                  <div className="h-16 bg-slate-50 dark:bg-slate-700 rounded-xl flex items-center justify-center text-2xl border border-slate-100 dark:border-slate-600 mb-1.5 overflow-hidden relative">
                                    <ProductImage image={product.image} className="h-full w-full object-cover" emojiClassName="text-2xl" />
                                    {product.volume && (
                                      <span className="absolute bottom-1 right-1 text-[8px] bg-slate-900 text-white font-bold border border-slate-700/50 px-1 py-0.5 rounded font-mono z-10">
                                        {product.volume}
                                      </span>
                                    )}
                                  </div>
                                  <div>
                                    <h5 className="text-[11px] font-bold text-slate-800 dark:text-slate-100 truncate">{product.name}</h5>
                                    <span className="text-[9px] text-slate-400 block truncate">{product.store.name}</span>
                                    <span className="text-[11px] font-black text-emerald-600 dark:text-emerald-400 block mt-1">{formatPrice(product.price)}</span>
                                  </div>
                                </div>

                                <div className="mt-2">
                                  {qty > 0 ? (
                                    <div className="flex items-center justify-between bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-100 dark:border-emerald-800/60 rounded-xl p-1">
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          e.preventDefault();
                                          removeFromCart(product);
                                        }}
                                        className="h-5 w-5 bg-emerald-100 dark:bg-emerald-800 hover:bg-emerald-200 dark:hover:bg-emerald-700 rounded-lg text-emerald-700 dark:text-emerald-100 flex items-center justify-center transition-all active:scale-90 border-none cursor-pointer"
                                      >
                                        <Minus className="h-3 w-3" />
                                      </button>
                                      <span className="text-xs font-black text-emerald-900 dark:text-emerald-100 font-mono px-1">{qty}</span>
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          e.preventDefault();
                                          addToCart(product, product.store);
                                        }}
                                        className="h-5 w-5 bg-emerald-100 dark:bg-emerald-800 hover:bg-emerald-200 dark:hover:bg-emerald-700 rounded-lg text-emerald-700 dark:text-emerald-100 flex items-center justify-center transition-all active:scale-90 border-none cursor-pointer"
                                      >
                                        <Plus className="h-3 w-3" />
                                      </button>
                                    </div>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        e.preventDefault();
                                        addToCart(product, product.store);
                                      }}
                                      className="w-full bg-gradient-to-r from-emerald-500 to-green-600 text-white text-[10px] font-bold py-1.5 rounded-xl shadow-md active:scale-95 transition-transform flex items-center justify-center space-x-1 border-none cursor-pointer"
                                    >
                                      <Plus className="h-3 w-3" />
                                      <span>Qo'shish</span>
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Filtered Stores segment */}
                    <div>
                      <h4 className="text-[10px] font-extrabold tracking-wider text-slate-400 uppercase mb-2">DO'KONLAR ({displayedStores.length})</h4>
                      <div className="space-y-2">
                        {displayedStores.length > 0 ? (
                          displayedStores.map((store) => (
                            <div
                              key={store.id}
                              onClick={() => {
                                setSelectedStore(store);
                                setActiveScreen('store-detail');
                              }}
                              className="flex items-center p-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700/80 cursor-pointer transition-all"
                            >
                              <div className="h-10 w-10 rounded-lg overflow-hidden bg-slate-200 dark:bg-slate-700 shrink-0 flex items-center justify-center">
                                <ProductImage image={store.image} className="h-full w-full object-cover" emojiClassName="text-xl" fallbackEmoji="🏪" />
                              </div>
                              <div className="ml-2.5 flex-1 min-w-0">
                                <h5 className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">{store.name}</h5>
                                <span className="text-[10px] text-slate-400">⭐ {store.rating}</span>
                              </div>
                              <ChevronRight className="h-4 w-4 text-slate-400" />
                            </div>
                          ))
                        ) : (
                          <div className="text-center py-4 text-xs text-slate-400">Mos do'konlar topilmadi.</div>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Categories segment - Clean Compact Grid View (No Bo'limlar/To'liq ro'yxat headers) */}
                    <div className="mb-4">
                      <div className="grid grid-cols-4 gap-2 sm:gap-2.5">
                        {ALL_CATEGORIES.map((cat) => (
                          <button
                            key={cat.id}
                            onClick={() => {
                              setSelectedCategory(cat.id === 'boshqalar' ? null : cat.id);
                              setActiveScreen('stores');
                            }}
                            className="flex flex-col items-center justify-center p-1.5 py-2 rounded-xl bg-white dark:bg-slate-800/90 shadow-sm hover:shadow-md border border-slate-200/80 dark:border-slate-700 active:scale-95 transition-all cursor-pointer group overflow-hidden"
                          >
                            <ThreeDGlassIcon id={cat.id} color={getCategoryColor(cat.id)} icon={cat.icon} name={cat.name} />
                            <span className="text-[9.5px] font-extrabold mt-1 text-center truncate w-full text-slate-800 dark:text-slate-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors leading-tight">
                              {convertScript(cat.name, scriptMode)}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Active Stores */}
                    <div>
                      <h4 className="text-[10px] font-extrabold tracking-wider text-slate-400 uppercase mb-3">Mashhur Hamkorlar</h4>
                      <div className="space-y-3">
                        {ALL_PARTNERS.map((partner) => (
                          <div
                            key={partner.id}
                            onClick={() => {
                              const store = STORES.find(s => s.id === partner.storeId || s.name.toLowerCase() === partner.name.toLowerCase());
                              if (store) {
                                setSelectedStore(store);
                                setActiveScreen('store-detail');
                              }
                            }}
                            className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 p-3 active:scale-95 transition-transform cursor-pointer flex items-center"
                          >
                            <div className="h-14 w-14 rounded-xl overflow-hidden bg-slate-200 dark:bg-slate-700 shrink-0 flex items-center justify-center">
                              <ProductImage image={partner.image} className="h-full w-full object-cover" emojiClassName="text-2xl" fallbackEmoji="🏪" />
                            </div>
                            <div className="flex-1 min-w-0 ml-3">
                              <div className="flex items-center justify-between">
                                <h5 className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">{partner.name}</h5>
                                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-extrabold flex items-center">
                                  ⭐ {partner.rating}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
                </div> {/* End of Scrollable Main Content Section */}
              </motion.div>
            )}

            {/* SCREEN: STORES */}
            {activeScreen === 'stores' && (
              <motion.div
                key="stores"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex-1 flex flex-col overflow-y-auto px-4 pb-20 pt-2"
              >
                <div className="flex items-center justify-between my-2 border-b border-slate-100 dark:border-slate-800 pb-2">
                  <div className="flex items-center space-x-1">
                    <button onClick={() => setActiveScreen('home')} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg">
                      <ChevronLeft className="h-5 w-5" />
                    </button>
                    <h3 className="text-xs font-black text-slate-800 dark:text-slate-100 truncate max-w-[150px]">
                      {selectedCategory ? `${selectedCategory.toUpperCase()} bo'limi` : 'Barcha do\'konlar'}
                    </h3>
                  </div>
                  <span className="text-[9px] text-slate-500 dark:text-slate-400 font-bold bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                    {displayedStores.length} do'kon
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 mt-2">
                  {displayedStores.map((store) => (
                    <div
                      key={store.id}
                      onClick={() => {
                        setSelectedStore(store);
                        setActiveScreen('store-detail');
                      }}
                      className="overflow-hidden rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 hover:border-emerald-500/40 cursor-pointer shadow-sm transition-all flex flex-col group"
                    >
                      <div className="relative aspect-[16/9] w-full overflow-hidden bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
                        <ProductImage image={store.image} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" emojiClassName="text-4xl" fallbackEmoji="🏪" />
                      </div>
                      <div className="p-2.5">
                        <div className="flex justify-between items-start">
                          <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">{store.name}</h4>
                          <span className="text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400 shrink-0 ml-1">⭐ {store.rating}</span>
                        </div>
                        <p className="text-[9px] text-slate-400 mt-0.5 truncate">{store.location}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* SCREEN: STORE DETAIL */}
            {activeScreen === 'store-detail' && selectedStore && (
              <motion.div
                key="store-detail"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex-1 flex flex-col overflow-y-auto pb-24 pt-2"
              >
                <div className="relative h-36 w-full">
                  <img src={selectedStore.image} alt={selectedStore.name} className="h-full w-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent"></div>
                  
                  <button
                    onClick={() => setActiveScreen('home')}
                    className="absolute top-3 left-3 p-1.5 rounded-full bg-slate-900/60 text-white"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>

                  <div className="absolute bottom-3 left-3 right-3 text-white">
                    <h3 className="text-sm font-black leading-tight">{selectedStore.name}</h3>
                    <p className="text-[9px] text-slate-300 flex items-center mt-0.5">
                      ⭐ {selectedStore.rating} ({selectedStore.reviewsCount}+)
                    </p>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-900/80 border-b border-slate-100 dark:border-slate-800 text-[10px] text-slate-500 dark:text-slate-400">
                  <span className="font-bold text-slate-700 dark:text-slate-200">Manzil:</span> {selectedStore.location}
                </div>

                {/* Products List inside store */}
                <div className="p-3 space-y-3">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">MAHSULOTLAR</span>
                    <div className="relative w-1/2">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Do'kondan qidirish..."
                        value={storeSearchTerm}
                        onChange={(e) => setStoreSearchTerm(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg py-1 pl-7 pr-3 text-[9px] text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {selectedStore.products
                      .filter(p => p.name.toLowerCase().includes(storeSearchTerm.toLowerCase()))
                      .map((product, pIdx) => {
                        const cartItem = cart.find(item => item.product.id === product.id && item.storeId === selectedStore.id);
                        const qty = cartItem ? cartItem.quantity : 0;

                        return (
                          <div 
                            key={`store-prod-${selectedStore.id}-${product.id}-${pIdx}`} 
                            className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 p-3 active:scale-95 transition-transform overflow-hidden flex flex-col justify-between"
                          >
                            <div 
                              onClick={() => {
                                setZoomedProductImage(product.image);
                                setZoomedProductName(product.name);
                              }}
                              className="aspect-square w-full overflow-hidden bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-700 dark:to-slate-800 flex items-center justify-center relative cursor-zoom-in group/img"
                            >
                              <ProductImage image={product.image} className="h-full w-full object-cover" emojiClassName="text-3xl" />
                              <div className="absolute inset-0 bg-slate-950/45 opacity-0 group-hover/img:opacity-100 transition-opacity duration-150 flex items-center justify-center text-[9px] text-white font-extrabold select-none">
                                🔍 KATTALASHTIRISH
                              </div>
                              {product.volume && (
                                <span className="absolute bottom-1.5 right-1.5 text-[8.5px] bg-slate-900 text-white font-bold border border-slate-700/60 shadow-md px-1.5 py-0.5 rounded-md font-mono z-10">
                                  {product.volume}
                                </span>
                              )}
                            </div>
                            <div className="p-3 space-y-1 flex-1 flex flex-col justify-between">
                              <div>
                                <p className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">{product.name}</p>
                                <p className="text-xs font-black text-emerald-600 dark:text-emerald-400 mt-0.5">{formatPrice(product.price)}</p>
                              </div>

                              <div className="mt-2">
                                {qty > 0 ? (
                                  <div className="flex items-center justify-between bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-100 dark:border-emerald-800/60 rounded-xl p-1">
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        e.preventDefault();
                                        removeFromCart(product);
                                      }}
                                      className="h-6 w-6 bg-emerald-100 dark:bg-emerald-800 hover:bg-emerald-200 dark:hover:bg-emerald-700 rounded-lg text-emerald-700 dark:text-emerald-100 flex items-center justify-center transition-all active:scale-90 border-none cursor-pointer"
                                    >
                                      <Minus className="h-3 w-3" />
                                    </button>
                                    <span className="text-xs font-black text-emerald-900 dark:text-emerald-100 font-mono px-2">{qty}</span>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        e.preventDefault();
                                        addToCart(product, selectedStore);
                                      }}
                                      className="h-6 w-6 bg-emerald-100 dark:bg-emerald-800 hover:bg-emerald-200 dark:hover:bg-emerald-700 rounded-lg text-emerald-700 dark:text-emerald-100 flex items-center justify-center transition-all active:scale-90 border-none cursor-pointer"
                                    >
                                      <Plus className="h-3 w-3" />
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      e.preventDefault();
                                      addToCart(product, selectedStore);
                                    }}
                                    className="w-full bg-gradient-to-r from-emerald-500 to-green-600 text-white text-xs font-bold py-2 rounded-xl shadow-lg shadow-emerald-500/25 active:scale-95 transition-transform flex items-center justify-center space-x-1 border-none cursor-pointer"
                                  >
                                    <Plus className="h-3.5 w-3.5" />
                                    <span>Qo'shish</span>
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>

                {/* Floating Cart action banner (Requirement 3: pull a bit higher and ensure full visibility) */}
                {cart.length > 0 && (
                  <div className="absolute bottom-[92px] left-3.5 right-3.5 z-35">
                    <button
                      onClick={() => setActiveScreen('cart')}
                      className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-black text-xs py-3.5 px-4.5 rounded-2xl flex items-center justify-between shadow-xl active:scale-98 transition-all"
                    >
                      <span className="bg-slate-900 text-white text-[9.5px] px-2.5 py-1 rounded-lg shrink-0">
                        {getCartCount()} ta mahsulot
                      </span>
                      <span className="font-extrabold uppercase tracking-wider mx-2">Savatga o'tish</span>
                      <span className="font-mono text-[11px] bg-white/20 px-2.5 py-0.5 rounded-lg shrink-0">{formatPrice(getCartTotal())}</span>
                    </button>
                  </div>
                )}
              </motion.div>
            )}

            {/* SCREEN: CART */}
            {activeScreen === 'cart' && (
              <motion.div
                key="cart"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex-1 flex flex-col overflow-y-auto px-4 pb-20 pt-2"
              >
                <div className="flex items-center justify-between my-2 border-b border-slate-100 dark:border-slate-800 pb-2">
                  <div className="flex items-center space-x-1">
                    <button onClick={() => setActiveScreen('home')} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg">
                      <ChevronLeft className="h-5 w-5" />
                    </button>
                    <h3 className="text-sm font-black text-slate-800 dark:text-slate-100">Xarid Savati</h3>
                  </div>
                  {cart.length > 0 && (
                    <button onClick={clearCart} className="text-[10px] text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/60 px-2 py-1 rounded-lg">
                      Bo'shatish
                    </button>
                  )}
                </div>

                {cart.length > 0 ? (
                  <div className="space-y-3.5 mt-2">
                    {/* Multi-store Header Info */}
                    {(() => {
                      const storeMap = new Map<string, { storeName: string; total: number; minOrder: number }>();
                      cart.forEach(item => {
                        const storeObj = (stores || INITIAL_STORES).find(s => s.id === item.storeId);
                        const storeMin = (storeObj && storeObj.minOrder && storeObj.minOrder > 0) ? storeObj.minOrder : (minOrderLimit || 0);
                        const existing = storeMap.get(item.storeId) || {
                          storeName: item.storeName || storeObj?.name || "Do'kon",
                          total: 0,
                          minOrder: storeMin
                        };
                        existing.total += item.product.price * item.quantity;
                        storeMap.set(item.storeId, existing);
                      });

                      const storeSummaries = Array.from(storeMap.values());
                      const isMultiStore = storeSummaries.length > 1;

                      return (
                        <div className="p-3.5 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 text-[11px] text-slate-600 dark:text-slate-300 space-y-1">
                          <span className="font-bold text-slate-800 dark:text-slate-100 block">
                            {isMultiStore ? `Buyurtma berilayotgan do'konlar (${storeSummaries.length} ta):` : "Buyurtma berilayotgan do'kon:"}
                          </span>
                          <span className="text-emerald-600 dark:text-emerald-400 font-extrabold block">
                            {storeSummaries.map(s => s.storeName).join(', ')}
                          </span>
                          {isMultiStore && (
                            <span className="inline-block text-[9px] font-black text-emerald-800 dark:text-emerald-200 bg-emerald-100 dark:bg-emerald-950 px-2 py-0.5 rounded-md mt-1">
                              📍 Multi-do'kon: Kuryer bir nechta joydan yig'adi
                            </span>
                          )}
                        </div>
                      );
                    })()}

                    <div className="space-y-2">
                      {cart.map((item, idx) => (
                        <div key={`cart-item-${item.product.id}-${item.storeId || ''}-${idx}`} className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 p-3 flex items-center justify-between transition-transform">
                          <div className="flex items-center space-x-2.5">
                            <div className="h-10 w-10 bg-white dark:bg-slate-700 rounded-lg border border-slate-100 dark:border-slate-600 flex items-center justify-center text-xl overflow-hidden shrink-0">
                              <ProductImage image={item.product.image} className="h-full w-full object-cover" emojiClassName="text-2xl" />
                            </div>
                            <div>
                              <h5 className="text-[11px] font-bold text-slate-800 dark:text-slate-100">{item.product.name}</h5>
                              <span className="text-[9.5px] text-slate-400 dark:text-slate-400 font-medium block">
                                {item.storeName && <span className="text-slate-500 dark:text-slate-300 font-semibold mr-1">[{item.storeName}]</span>}
                                {item.product.price === 0 ? (
                                  <span className="text-orange-600 dark:text-orange-400 font-extrabold animate-pulse">⏳ Narxi hisoblanmoqda...</span>
                                ) : (
                                  formatPrice(item.product.price)
                                )}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center space-x-2 bg-white dark:bg-slate-700 border border-slate-100 dark:border-slate-600 p-0.5 rounded-lg">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                                removeFromCart(item.product);
                              }}
                              className="h-5.5 w-5.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 flex items-center justify-center"
                            >
                              <Minus className="h-3 w-3" />
                            </button>
                            <span className="text-xs font-bold font-mono text-slate-800 dark:text-slate-100">{item.quantity}</span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                                addToCart(item.product, (stores || INITIAL_STORES).find(s => s.id === item.storeId)!);
                              }}
                              className="h-5.5 w-5.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 flex items-center justify-center"
                            >
                              <Plus className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Custom handwritten order information (if any in cart) */}
                    {(() => {
                      const customItem = cart.find(item => item.product.id.startsWith('custom-'));
                      const hasPendingCustomItem = cart.some(item => item.product.id.startsWith('custom-') && item.product.price === 0);
                      if (!customItem) return null;

                      return (
                        <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-emerald-500/15 p-4 rounded-2xl text-white space-y-3.5 relative overflow-hidden shadow-lg">
                          <div className="absolute right-0 top-0 h-20 w-20 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-emerald-500/15 via-transparent to-transparent pointer-events-none" />
                          
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-1.5">
                              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
                              <span className="text-[10px] font-black uppercase text-emerald-400 tracking-wider">Maxsus buyurtma</span>
                            </div>
                            <span className={`text-[8px] font-black px-2 py-0.5 rounded-full ${
                              hasPendingCustomItem ? 'bg-orange-500/20 text-orange-400' : 'bg-emerald-500/20 text-emerald-400'
                            }`}>
                              {hasPendingCustomItem ? 'HISOBLANMOQDA' : 'TASDIQLANDI'}
                            </span>
                          </div>

                          {hasPendingCustomItem ? (
                            <div className="space-y-2">
                              <p className="text-[10px] text-slate-300 leading-normal">
                                ⏳ Maxsus yozilgan buyurtmangiz uchun dispetcher hozir narx belgilamoqda. Sahifa yangilanishisiz to'lov summasi ko'rinadi!
                              </p>
                              <div className="w-full bg-white/10 rounded-full h-1 overflow-hidden">
                                <div className="bg-emerald-500 h-1 rounded-full animate-pulse w-3/4"></div>
                              </div>
                            </div>
                          ) : (
                            <p className="text-[10px] text-slate-300 leading-normal">
                              ✅ Admin buyurtma narxini qo'lda tekshirdi va tasdiqladi! Quyida "Manzilni kiritish" tugmasi faollashtirildi.
                            </p>
                          )}
                        </div>
                      );
                    })()}

                    {/* Breakdown with Extra Stop Fee calculation */}
                    {(() => {
                      const itemsTotal = getCartTotal();
                      const isGlobalMinUnmet = minOrderLimit > 0 && itemsTotal < minOrderLimit;
                      const globalMinDiff = minOrderLimit - itemsTotal;

                      return (
                        <div className="space-y-3">
                          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 p-3.5 space-y-2 text-xs">
                            <div className="flex justify-between">
                              <span className="text-slate-500 dark:text-slate-400">Mahsulotlar summasi:</span>
                              <span className="font-bold text-slate-800 dark:text-slate-100 font-mono">
                                {cart.some(item => item.product.id.startsWith('custom-') && item.product.price === 0) ? (
                                  <span className="text-orange-600 dark:text-orange-400 font-extrabold animate-pulse">⏳ Hisoblanmoqda...</span>
                                ) : (
                                  formatPrice(itemsTotal)
                                )}
                              </span>
                            </div>
                            
                            <div className="bg-slate-100 dark:bg-slate-700/60 p-2.5 rounded-xl text-[10.5px] text-slate-600 dark:text-slate-300 flex items-center space-x-1.5 font-medium">
                              <span>📍</span>
                              <span>Yetkazish narxi: mahalla tanlangandan keyin aniqlanadi</span>
                            </div>

                            <div className="h-[1px] bg-slate-200 dark:bg-slate-700 my-1"></div>
                            <div className="flex justify-between font-black text-slate-900 dark:text-white text-sm">
                              <span>Jami summa:</span>
                              <span className="text-emerald-600 dark:text-emerald-400 font-mono">
                                {cart.some(item => item.product.id.startsWith('custom-') && item.product.price === 0) ? (
                                  <span className="text-orange-600 dark:text-orange-400 font-extrabold animate-pulse">⏳ Hisoblanmoqda...</span>
                                ) : (
                                  formatPrice(itemsTotal)
                                )}
                              </span>
                            </div>
                          </div>

                          {/* Requirement 1: Global min order limit check */}
                          {isGlobalMinUnmet && (
                            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-[11px] font-bold leading-normal flex items-start space-x-2">
                              <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                              <div>
                                <span>
                                  Eng kam buyurtma miqdori {minOrderLimit.toLocaleString('uz-UZ')} so'm! Iltimos savatga yana kamida {globalMinDiff.toLocaleString('uz-UZ')} so'mlik mahsulot qo'shing.
                                </span>
                              </div>
                            </div>
                          )}

                          {/* Navigation buttons */}
                          {(() => {
                            const hasPendingCustomItem = cart.some(item => item.product.id.startsWith('custom-') && item.product.price === 0);

                            if (hasPendingCustomItem) {
                              return (
                                <div className="space-y-2">
                                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-[10px] font-bold leading-normal">
                                    ⏳ Maxsus buyurtma narxi kutilmoqda. Admin narxni belgilamaguncha manzilni kiritish oynasiga o'tib bo'lmaydi.
                                  </div>
                                  <button
                                    disabled
                                    className="w-full bg-slate-100 border border-slate-200 text-slate-400 font-black py-3.5 rounded-xl text-xs uppercase cursor-not-allowed flex items-center justify-center space-x-1.5"
                                  >
                                    <span className="h-3.5 w-3.5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                                    <span>Narx hisoblanmoqda...</span>
                                  </button>
                                </div>
                              );
                            }

                            if (isGlobalMinUnmet) {
                              return (
                                <button
                                  disabled
                                  className="w-full bg-slate-200 border border-slate-300 text-slate-400 font-black py-3.5 rounded-xl text-xs uppercase cursor-not-allowed"
                                >
                                  Manzilni kiritish
                                </button>
                              );
                            }

                            return (
                              <button
                                onClick={() => {
                                  setActiveScreen('address');
                                }}
                                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-3.5 rounded-xl text-xs uppercase transition-all shadow-md shadow-emerald-600/15 cursor-pointer"
                              >
                                Manzilni kiritish
                              </button>
                            );
                          })()}
                        </div>
                      );
                    })()}
                  </div>
                ) : (
                  <div className="text-center py-24">
                    <span className="text-4xl">🛍️</span>
                    <h4 className="text-sm font-bold text-slate-700 mt-3">Savat bo'sh</h4>
                    <p className="text-xs text-slate-400 mt-1">Siz xarid qilishni boshlash uchun do'konlardan mahsulotlarni qo'shishingiz kerak.</p>
                  </div>
                )}
              </motion.div>
            )}

            {/* SCREEN: ADDRESS INPUT - Requirement 6 (No Muglon/Galaba options, fully manual + real inputs) */}
            {activeScreen === 'address' && (
              <motion.div
                key="address"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex-1 flex flex-col overflow-y-auto px-4 pb-20 pt-2"
              >
                <div className="flex items-center space-x-2 my-2 border-b border-slate-100 pb-2">
                  <button onClick={() => {
                    if (addressingOrderId) {
                      setAddressingOrderId(null);
                      setActiveScreen('orders');
                    } else {
                      setActiveScreen('cart');
                    }
                  }} className="p-1 hover:bg-slate-100 rounded-lg text-slate-600">
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <h3 className="text-sm font-black text-slate-800">Manzilni kiritish</h3>
                </div>

                <div className="space-y-4 mt-3">
                  {/* Automated GPS helper */}
                  <div className="p-3.5 bg-emerald-50/50 border border-emerald-100 rounded-2xl relative overflow-hidden">
                    <span className="text-[10px] font-black text-emerald-800 uppercase tracking-wider block mb-1">Tezkor Joylashuv:</span>
                    <p className="text-[10px] text-emerald-900 mb-2 leading-relaxed">
                      Quyidagi tugmani bosing va sun'iy yo'ldosh orqali joylashuvingizni ulashing.
                    </p>
                    <button
                      type="button"
                      disabled={isDetectingGPS}
                      onClick={handleGPSDetection}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 rounded-xl text-[10px] font-black flex items-center justify-center space-x-1.5 transition-all shadow-md shadow-emerald-600/10 active:scale-98 cursor-pointer border-none"
                    >
                      <MapPin className="h-3.5 w-3.5 animate-bounce" />
                      <span>{isDetectingGPS ? "Joylashuv aniqlanmoqda..." : "Joylashuvni ulashish"}</span>
                    </button>
                    {gpsMessage && <span className="text-[9px] text-emerald-600 mt-1.5 block font-bold text-center">{gpsMessage}</span>}
                  </div>

                  {/* GPS Coordinates Separate Box - Requirement 4 */}
                  <div className="p-3 bg-slate-50 border border-slate-150 rounded-2xl flex flex-col space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2.5">
                        <span className="text-base shrink-0">🛰️</span>
                        <div>
                          <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider block">Sun'iy yo'ldosh GPS koordinatalari</span>
                          {detectedCoords ? (
                            <span className="text-[11px] font-mono font-bold text-slate-800 block">
                              Lat: {detectedCoords.latitude.toFixed(6)}, Lng: {detectedCoords.longitude.toFixed(6)}
                            </span>
                          ) : (
                            <span className="text-[10px] font-semibold text-rose-500 block">
                              Real joylashuv ulashilmagan
                            </span>
                          )}
                        </div>
                      </div>
                      {detectedCoords && (
                        <span className="px-1.5 py-0.5 rounded-full text-[8px] font-black bg-emerald-100 text-emerald-800 uppercase tracking-tight">
                          Ulashildi ✅
                        </span>
                      )}
                    </div>
                  </div>

                  {/* LIVE GOOGLE MAPS PREVIEW CONTAINER */}
                  {(detectedCoords || userAddress.latitude) ? (
                    <div className="overflow-hidden rounded-2xl border border-slate-200 shadow-md relative h-40 w-full bg-white">
                      <iframe
                        title="Yandex Map Location Preview"
                        width="100%"
                        height="100%"
                        style={{ border: 0 }}
                        src={`https://yandex.ru/map-widget/v1/?ll=${detectedCoords?.longitude || userAddress.longitude}%2C${detectedCoords?.latitude || userAddress.latitude}&z=15&pt=${detectedCoords?.longitude || userAddress.longitude}%2C${detectedCoords?.latitude || userAddress.latitude}%2Cpm2rdm&l=sat%2Cskl`}
                        allowFullScreen
                        loading="lazy"
                        referrerPolicy="no-referrer"
                        className="w-full h-full"
                      />
                      {/* Absolute center pin overlay representing target destination */}
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="h-4 w-4 bg-emerald-500 rounded-full border-2 border-white shadow-lg animate-ping absolute" />
                        <span className="text-3xl relative -top-3.5 filter drop-shadow-md">📍</span>
                      </div>
                    </div>
                  ) : (
                    <div className="h-28 border border-dashed border-slate-200 bg-slate-50/50 rounded-2xl flex flex-col items-center justify-center p-4 text-center">
                      <span className="text-xl mb-1 opacity-60">🗺️</span>
                      <span className="text-[10px] font-bold text-slate-500 leading-relaxed">
                        Xaritadan foydalanish uchun yuqoridagi "Joylashuvni ulashish" tugmasini bosing yoki quyida mahalla va mo'ljalni kiriting.
                      </span>
                    </div>
                  )}

                  {/* Manual forms */}
                  <div className="space-y-3">
                    {/* MAHBURIY MAHALLA TANLASH */}
                    {(() => {
                      const activeDraftOrder = addressingOrderId ? orders.find(o => o.id === addressingOrderId) : null;
                      const effectiveMahalla = addressInput.trim() || (activeDraftOrder?.address?.mahalla && activeDraftOrder.address.mahalla !== "Kutilmoqda..." ? activeDraftOrder.address.mahalla : userAddress.mahalla) || '';

                      return (
                        <>
                          <div className="p-3 bg-emerald-50/40 border border-emerald-100 rounded-2xl space-y-2">
                            <label className="block text-[10px] font-black text-emerald-900 uppercase flex justify-between items-center">
                              <span>Mahalla yoki qishloq (MAJBURIY) <span className="text-red-500">*</span></span>
                              {effectiveMahalla ? (
                                <span className="text-[9px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full flex items-center space-x-1">
                                  <Check className="h-3 w-3 text-emerald-600" />
                                  <span>Tanlandi</span>
                                </span>
                              ) : null}
                            </label>

                            {effectiveMahalla ? (
                              <div className="flex items-center justify-between p-2.5 bg-white border border-emerald-200 rounded-xl shadow-xs">
                                <div className="flex items-center space-x-2">
                                  <MapPin className="h-4 w-4 text-emerald-600 shrink-0" />
                                  <div>
                                    <span className="text-[9px] font-bold text-slate-400 uppercase block">Tanlangan Mahalla:</span>
                                    <span className="text-xs font-black text-slate-900">{effectiveMahalla}</span>
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setAddressInput('');
                                    if (setUserAddress) setUserAddress(prev => ({ ...prev, mahalla: '' }));
                                  }}
                                  className="text-[10px] font-bold text-rose-600 hover:underline bg-rose-50 px-2 py-1 rounded-lg border-none cursor-pointer"
                                >
                                  O'zgartirish
                                </button>
                              </div>
                            ) : (
                              <>
                                <div className="relative">
                                  <Search className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-3" />
                                  <input
                                    type="text"
                                    value={mahallaSearchFilter}
                                    onChange={(e) => setMahallaSearchFilter(e.target.value)}
                                    placeholder="Mahallangizni qidiring yoki tanlang..."
                                    className="w-full border border-slate-200 bg-white rounded-xl py-2 pl-8 pr-3 text-xs text-slate-800 focus:outline-none focus:border-emerald-500 transition-all placeholder:text-slate-400"
                                  />
                                </div>

                                <div className="max-h-36 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                                  {filteredMahallasList.length > 0 ? (
                                    (Array.from(new Set(filteredMahallasList)) as string[]).map((m, mIdx) => {
                                      const isSelected = addressInput.trim().toLowerCase() === m.toLowerCase();
                                      return (
                                        <button
                                          key={`pf-mahalla-${m}-${mIdx}`}
                                          type="button"
                                          onClick={() => {
                                            setAddressInput(m);
                                            setMahallaSearchFilter('');
                                            if (setUserAddress) setUserAddress(prev => ({ ...prev, mahalla: m }));
                                          }}
                                          className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between transition-all cursor-pointer border-none ${
                                            isSelected
                                              ? 'bg-emerald-600 text-white font-black shadow-xs'
                                              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-100'
                                          }`}
                                        >
                                          <span>{m}</span>
                                          {isSelected && <Check className="h-3.5 w-3.5 text-white" />}
                                        </button>
                                      );
                                    })
                                  ) : (
                                    <div className="p-2 text-center text-[10px] text-slate-400 font-medium">
                                      Mahalla topilmadi. Qidiruvni tozalang.
                                    </div>
                                  )}
                                </div>
                              </>
                            )}
                          </div>

                          <div>
                            <label className="block text-[10px] font-black text-slate-500 uppercase mb-1 flex justify-between items-center">
                              <span>Qo'shimcha ma'lumot (mo'ljal, izoh)</span>
                              <span className="text-slate-400 text-[8px] font-black uppercase tracking-wider bg-slate-100 px-1.5 py-0.5 rounded">ixtiyoriy</span>
                            </label>
                            <textarea
                              value={commentInput}
                              onChange={(e) => setCommentInput(e.target.value)}
                              className="w-full border border-slate-200 bg-slate-50 focus:bg-white rounded-xl py-2.5 px-3 text-xs text-slate-800 focus:outline-none focus:border-emerald-500 h-16 resize-none transition-all placeholder:text-slate-400"
                              placeholder="Masalan: ko'k darvoza, 2-qavat, mo'ljal..."
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">
                              Telefon raqamingiz <span className="text-red-500">*</span>
                            </label>
                            <PhoneInput
                              value={tempAddressPhone}
                              onChange={(val) => setTempAddressPhone(val)}
                              className={`w-full border bg-slate-50 focus:bg-white rounded-xl py-2.5 px-3 text-xs text-slate-800 focus:outline-none transition-all ${
                                tempAddressPhone.trim() && !isUzbekPhoneValid(tempAddressPhone)
                                  ? 'border-rose-400 focus:border-rose-500'
                                  : 'border-slate-200 focus:border-emerald-500'
                              }`}
                              required
                            />
                            {tempAddressPhone.trim() && !isUzbekPhoneValid(tempAddressPhone) && (
                              <p className="text-[9px] text-rose-600 font-bold mt-1">
                                ⚠️ Noto'g'ri format. Kamida 9 xonali raqam kiriting (+998(xx) xxx-xx-xx)
                              </p>
                            )}
                          </div>

                          <button
                            onClick={handleSaveAddress}
                            disabled={
                              !effectiveMahalla || 
                              !isUzbekPhoneValid(tempAddressPhone)
                            }
                            className={`w-full py-3.5 rounded-xl text-xs font-black uppercase transition-all active:scale-98 cursor-pointer border-none mt-2 ${
                              effectiveMahalla && 
                              isUzbekPhoneValid(tempAddressPhone)
                                ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/20' 
                                : 'bg-slate-150 text-slate-400 cursor-not-allowed'
                            }`}
                          >
                            Davom etish
                          </button>
                        </>
                      );
                    })()}
                  </div>
                </div>

                {/* GPS Settings Dialog / Simulation Warning Modal - Requirement 6 */}
                {showGPSWarning && (
                  <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-3xl p-5 w-full max-w-[310px] shadow-2xl border border-slate-100 dark:border-slate-700 flex flex-col items-center text-center animate-in fade-in zoom-in duration-200">
                      <div className="h-12 w-12 rounded-full bg-amber-50 dark:bg-amber-950 flex items-center justify-center text-amber-500 mb-3.5">
                        <AlertTriangle className="h-6 w-6" />
                      </div>
                      
                      <h4 className="text-xs font-black text-slate-800 dark:text-slate-100 uppercase tracking-wider mb-1.5">
                        {gpsPermissionDenied ? "⚠️ GPS Ruxsati Berilmagan!" : "⚠️ GPS Joylashuv Xatoligi"}
                      </h4>
                      
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed mb-4">
                        Iltimos, telefoningizdan GPS funksiyasini yoqing!
                      </p>
                      
                      <div className="w-full space-y-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            enableGPSAndDetect(false);
                          }}
                          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[10px] py-2.5 rounded-xl transition-all shadow-md active:scale-95 cursor-pointer border-none"
                        >
                          Qayta urinish
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowGPSWarning(false)}
                          className="w-full bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-700 dark:text-slate-200 font-bold text-[10px] py-2 rounded-xl transition-all cursor-pointer border-none"
                        >
                          Qo'lda mahalla tanlash
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* SCREEN: CHECKOUT & PAYMENT METHOD - Requirement 10 (cashless limit warning, automatic / block toggle, admin contact links) */}
            {activeScreen === 'checkout' && (
              <motion.div
                key="checkout"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex-1 flex flex-col overflow-y-auto px-4 pb-20 pt-2"
              >
                <div className="flex items-center space-x-2 my-2 border-b border-slate-100 pb-2">
                  <button onClick={() => setActiveScreen('address')} className="p-1 hover:bg-slate-100 rounded-lg text-slate-600">
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <h3 className="text-sm font-black text-slate-800">Rasmiylashtirish</h3>
                </div>

                <div className="space-y-4 mt-2">
                  
                  {/* Mandatory online payment reasoning box (Tasks 4 & 5) */}
                  {(() => {
                    const activeCart = addressingOrderId && draftOrder ? (draftOrder.items || []) : cart;
                    const activeCartTotal = addressingOrderId && draftOrder ? draftOrder.total : getCartTotal();
                    const mandatoryOnlineInfo = getMandatoryOnlineReason(
                      activeCart,
                      STORES,
                      mandatoryOnlineCategories,
                      activeCartTotal,
                      cashlessLimit,
                      adminPhone,
                      [draftOrder?.category, activeStore?.category]
                    );
                    if (mandatoryOnlineInfo.isMandatory) {
                      return (
                        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-rose-900 text-[11px] font-bold leading-relaxed flex items-start space-x-2">
                          <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                          <span>{mandatoryOnlineInfo.reasonText}</span>
                        </div>
                      );
                    }
                    if (isBlacklisted) {
                      return (
                        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-rose-900 text-[11px] font-bold leading-relaxed flex items-start space-x-2">
                          <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                          <span>Siz qora ro'yxatdasiz. Faqat onlayn to'lov orqali buyurtma bera olasiz.</span>
                        </div>
                      );
                    }
                    return null;
                  })()}

                  {/* Order review details */}
                  {(() => {
                    const activeCart = cart;
                    const storeMap = new Map<string, { storeName: string; total: number }>();
                    activeCart.forEach(item => {
                      const storeObj = (stores || INITIAL_STORES).find(s => s.id === item.storeId);
                      const existing = storeMap.get(item.storeId) || {
                        storeName: item.storeName || storeObj?.name || "Do'kon",
                        total: 0
                      };
                      existing.total += item.product.price * item.quantity;
                      storeMap.set(item.storeId, existing);
                    });

                    const storeSummaries = Array.from(storeMap.values());
                    const uniqueStoreCount = storeSummaries.length;
                    
                    const draftPickupCount = (draftOrder?.pickupPointsCount && draftOrder.pickupPointsCount > 1)
                      ? draftOrder.pickupPointsCount - 1
                      : ((draftOrder?.stores && draftOrder.stores.length > 1)
                          ? draftOrder.stores.length - 1
                          : (uniqueStoreCount > 1 ? uniqueStoreCount - 1 : 0));
                    const extraStopsCount = draftPickupCount;
                    const extraStopsFeeTotal = extraStopsCount * extraStopFee;

                    const targetMahalla = addressingOrderId && draftOrder ? draftOrder.address.mahalla : userAddress.mahalla;
                    const isMahallaSelected = Boolean(targetMahalla && targetMahalla.trim().length > 0 && targetMahalla !== "Kutilmoqda...");
                    const matchedZone = activeZones.find(z => (z.mahallas || []).some(m => m.trim().toLowerCase() === (targetMahalla || '').trim().toLowerCase()));
                    const baseDeliveryFee = matchedZone ? matchedZone.price : (activeZones[0]?.price || 10000);
                    const totalDeliveryFee = baseDeliveryFee + extraStopsFeeTotal;

                    const itemsTotal = addressingOrderId && draftOrder
                      ? (draftOrder.items && draftOrder.items.length > 0
                          ? draftOrder.items.reduce((s, it) => s + ((it.product?.price || 0) * (it.quantity || 1)), 0)
                          : draftOrder.total)
                      : getCartTotal();
                    const grandTotal = itemsTotal + totalDeliveryFee;

                    return (
                      <div className="bg-slate-50 border border-slate-100 p-3.5 rounded-xl space-y-2 text-xs text-slate-600">
                        <div>
                          <span className="font-semibold text-slate-800">Do'kon(lar):</span>{" "}
                          <span className="font-bold text-slate-900">
                            {addressingOrderId && draftOrder ? draftOrder.storeName : (storeSummaries.map(s => s.storeName).join(', ') || "KasbiGo Maxsus Xizmati")}
                          </span>
                          {uniqueStoreCount > 1 && (
                            <span className="ml-1 text-[9px] font-black text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded">
                              {uniqueStoreCount} ta do'kon
                            </span>
                          )}
                        </div>
                        <div><span className="font-semibold text-slate-800">Kuryer manzili:</span> <span className="font-bold text-slate-900">{targetMahalla || 'Tanlanmagan'}</span></div>
                        <div><span className="font-semibold text-slate-800">Mo'ljal:</span> {addressingOrderId && draftOrder ? (draftOrder.address.comment || 'Kiritilmagan') : (userAddress.comment || 'Kiritilmagan')}</div>
                        
                        <div className="h-[1px] bg-slate-200 my-1"></div>
                        <div className="flex justify-between text-slate-600">
                          <span>Mahsulotlar summasi:</span>
                          <span className="font-mono font-bold text-slate-800">{formatPrice(itemsTotal)}</span>
                        </div>
                        <div className="flex justify-between text-slate-600">
                          <span>Asosiy yetkazish ({targetMahalla || 'Mahalla'}):</span>
                          <span className="font-mono text-emerald-600 font-bold">{formatPrice(baseDeliveryFee)}</span>
                        </div>
                        {extraStopsCount > 0 && (
                          <div className="flex justify-between text-emerald-700 bg-emerald-50/80 p-1.5 rounded-lg border border-emerald-100">
                            <span className="font-bold text-[10px]">
                              + {extraStopsCount} ta qo'shimcha nuqta ({extraStopsCount} × {formatPrice(extraStopFee)}):
                            </span>
                            <span className="font-mono font-black text-[11px]">+{formatPrice(extraStopsFeeTotal)}</span>
                          </div>
                        )}
                        <div className="flex justify-between text-[11px] font-extrabold text-emerald-800 bg-emerald-100/50 p-1.5 rounded-lg">
                          <span>Yetkazish jami:</span>
                          <span className="font-mono">{formatPrice(baseDeliveryFee)} + {formatPrice(extraStopsFeeTotal)} = {formatPrice(totalDeliveryFee)}</span>
                        </div>

                        <div className="h-[1px] bg-slate-200 my-1"></div>
                        <div className="flex justify-between font-black text-slate-900 text-sm">
                          <span>Jami to'lov:</span>
                          <span className="text-emerald-600 font-mono">
                            {formatPrice(grandTotal)}
                          </span>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Payment Methods */}
                  <div className="space-y-2">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">To'lov usulini tanlang:</span>
                    
                    {/* CASH OPTION BUTTON */}
                    {isCashAllowedForCheckout && (
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('Naqd')}
                        className={`w-full flex items-center justify-between p-3.5 rounded-xl border text-left transition-all ${
                          paymentMethod === 'Naqd'
                            ? 'border-emerald-500 bg-emerald-50/20'
                            : 'border-slate-200 bg-white hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center space-x-2.5">
                          <span className="text-lg">💵</span>
                          <div>
                            <span className="text-xs font-bold text-slate-800 block">Eshik oldida naqd to'lash</span>
                            <span className="text-[9px] text-slate-400">Kuryerga yetkazilgan vaqtda beriladi</span>
                          </div>
                        </div>
                        {paymentMethod === 'Naqd' && <CheckCircle className="h-4 w-4 text-emerald-600" />}
                      </button>
                    )}

                    {/* ONLINE TRANSFER OPTION BUTTON */}
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('Online')}
                      className={`w-full flex items-center justify-between p-3.5 rounded-xl border text-left transition-all ${
                        paymentMethod === 'Online'
                          ? 'border-emerald-500 bg-emerald-50/20'
                          : 'border-slate-200 bg-white hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center space-x-2.5">
                        <span className="text-lg">💳</span>
                        <div>
                          <span className="text-xs font-bold text-slate-800 block">Karta orqali online to'lash</span>
                          <span className="text-[9px] text-slate-400">Admin kartasiga pul o'tkaziladi</span>
                        </div>
                      </div>
                      {paymentMethod === 'Online' && <CheckCircle className="h-4 w-4 text-emerald-600" />}
                    </button>
                  </div>

                  {/* Warning if mahalla not selected */}
                  {(() => {
                    const targetMahalla = addressingOrderId && draftOrder ? draftOrder.address.mahalla : userAddress.mahalla;
                    const isMahallaSelected = Boolean(targetMahalla && targetMahalla.trim().length > 0 && targetMahalla !== "Kutilmoqda...");
                    if (!isMahallaSelected) {
                      return (
                        <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl flex items-center space-x-2 text-amber-800 text-[11px] font-bold">
                          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
                          <span>⚠️ Buyurtma berish uchun mahalla tanlanishi shart! Iltimos, manzil kiritish oynasiga o'tib mahalla tanlang.</span>
                        </div>
                      );
                    }
                    return null;
                  })()}

                  {/* NORMAL CHECKOUT TRIGGER BUTTON */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        const targetMahalla = addressingOrderId && draftOrder ? draftOrder.address.mahalla : userAddress.mahalla;
                        const isMahallaSelected = Boolean(targetMahalla && targetMahalla.trim().length > 0 && targetMahalla !== "Kutilmoqda...");
                        if (isSubmitting || !isMahallaSelected) return;

                        if (paymentMethod === 'Online') {
                          setActiveScreen('payment');
                        } else {
                          setIsSubmitting(true);
                          if (addressingOrderId && setOrders) {
                            setOrders(prev => prev.map(o => {
                              if (o.id === addressingOrderId) {
                                const nowStr = new Date().toTimeString().split(' ')[0].substring(0, 5);
                                const currentMahalla = o.address.mahalla || userAddress.mahalla;
                                const matchedZone = activeZones.find(z => (z.mahallas || []).some(m => m.trim().toLowerCase() === (currentMahalla || '').trim().toLowerCase()));
                                const baseFee = matchedZone ? matchedZone.price : (activeZones[0]?.price || 10000);
                                const extraStopsCount = (o.pickupPointsCount && o.pickupPointsCount > 1)
                                  ? o.pickupPointsCount - 1
                                  : ((o.stores && o.stores.length > 1) ? o.stores.length - 1 : 0);
                                const totalDeliveryFee = baseFee + (extraStopsCount * (extraStopFee || 3000));
                                const subTotal = (o.items && o.items.length > 0)
                                  ? o.items.reduce((s, it) => s + ((it.product?.price || 0) * (it.quantity || 1)), 0)
                                  : o.total;
                                const finalTotal = subTotal + totalDeliveryFee;

                                return {
                                  ...o,
                                  paymentMethod: 'Naqd',
                                  isConfirmedByCustomer: true,
                                  status: 'Yangi',
                                  time: nowStr,
                                  deliveryFee: totalDeliveryFee,
                                  total: finalTotal,
                                  address: { mahalla: currentMahalla, comment: userAddress.comment || o.address.comment }
                                };
                              }
                              return o;
                            }));
                            setAddressingOrderId(null);
                            setTimeout(() => {
                              setActiveScreen('success');
                              setIsSubmitting(false);
                              playNotificationSound('customer');
                              playNotificationSound('admin');
                            }, 100);
                          } else {
                            placeOrder();
                            setTimeout(() => {
                              setActiveScreen('success');
                              setIsSubmitting(false);
                            }, 100);
                          }
                        }
                      }}
                      disabled={isSubmitting || !Boolean((addressingOrderId && draftOrder ? draftOrder.address.mahalla : userAddress.mahalla) && (addressingOrderId && draftOrder ? draftOrder.address.mahalla : userAddress.mahalla).trim().length > 0 && (addressingOrderId && draftOrder ? draftOrder.address.mahalla : userAddress.mahalla) !== "Kutilmoqda...")}
                      className={`w-full font-black py-3.5 rounded-xl text-xs uppercase transition-all ${
                        isSubmitting || !Boolean((addressingOrderId && draftOrder ? draftOrder.address.mahalla : userAddress.mahalla) && (addressingOrderId && draftOrder ? draftOrder.address.mahalla : userAddress.mahalla).trim().length > 0 && (addressingOrderId && draftOrder ? draftOrder.address.mahalla : userAddress.mahalla) !== "Kutilmoqda...")
                          ? 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300'
                          : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/15 cursor-pointer'
                      }`}
                    >
                      {isSubmitting ? "Yuborilmoqda..." : (paymentMethod === 'Online' ? "To'lov sahifasiga o'tish" : "Buyurtma berish")}
                    </button>
                </div>
              </motion.div>
            )}

            {/* SCREEN: ONLINE PAYMENT - Requirement 7, 8, 9, 10 (card field eliminated, cheque upload area works, green 'to'ladim' button) */}
            {activeScreen === 'payment' && (
              <motion.div
                key="payment"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex-1 flex flex-col overflow-y-auto px-4 pb-20 pt-2"
              >
                <div className="flex items-center space-x-2 my-2 border-b border-slate-100 pb-2">
                  <button onClick={() => setActiveScreen('checkout')} className="p-1 hover:bg-slate-100 rounded-lg text-slate-600">
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <h3 className="text-sm font-black text-slate-800">Online to'lash</h3>
                </div>

                <div className="space-y-4 mt-2">
                  {/* Requirement B: Real Bank Card Design */}
                  <div className="relative rounded-2xl p-5 text-white bg-gradient-to-br from-emerald-800 via-emerald-700 to-green-900 border border-emerald-500/30 shadow-2xl overflow-hidden select-none">
                    {/* Decorative glossy/shiny gradient light overlays */}
                    <div className="absolute -top-12 -right-12 w-36 h-36 bg-emerald-400/20 rounded-full blur-2xl pointer-events-none"></div>
                    <div className="absolute -bottom-12 -left-12 w-36 h-36 bg-emerald-300/15 rounded-full blur-2xl pointer-events-none"></div>
                    <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent pointer-events-none"></div>
                    
                    {/* Top Row: Microchip, Card Logo & Copy Button */}
                    <div className="flex items-center justify-between mb-4 relative z-10">
                      <div className="flex items-center space-x-2.5">
                        {/* EMV Microchip */}
                        <div className="w-9 h-7 rounded-md bg-gradient-to-tr from-amber-300 via-yellow-400 to-amber-200 border border-amber-500/60 p-1 shadow-inner relative overflow-hidden flex flex-col justify-between shrink-0">
                          <div className="w-full h-[1px] bg-amber-700/40"></div>
                          <div className="w-full h-[1px] bg-amber-700/40"></div>
                          <div className="w-full h-[1px] bg-amber-700/40"></div>
                          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full border border-amber-700/40"></div>
                        </div>
                        <span className="text-[10px] font-black tracking-widest text-emerald-100 uppercase opacity-90 font-mono">
                          KASBIGO CARD
                        </span>
                      </div>

                      <button 
                        type="button"
                        onClick={copyAdminCard}
                        className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 active:scale-95 border border-white/30 text-white text-[10px] font-extrabold tracking-wider transition-all backdrop-blur-md shadow-md shrink-0"
                      >
                        <Copy className="h-3.5 w-3.5 text-emerald-100" />
                        <span>Nusxalash</span>
                      </button>
                    </div>

                    {/* Middle Row: Card Number */}
                    <div className="my-2 relative z-10">
                      <span className="text-[8px] font-bold uppercase tracking-widest text-emerald-200/80 block mb-1">
                        Karta Raqami:
                      </span>
                      <div className="text-lg sm:text-xl font-black font-mono tracking-widest text-white drop-shadow-md flex items-center justify-between">
                        {adminCardNumber}
                      </div>
                    </div>

                    {/* Bottom Row: Card Holder (Task 1: Expiry date removed) */}
                    <div className="flex justify-between items-end mt-4 pt-2.5 border-t border-emerald-600/40 relative z-10">
                      <div>
                        <span className="text-[8px] font-bold uppercase tracking-widest text-emerald-200/80 block">
                          Karta Egasi
                        </span>
                        <span className="text-xs font-black text-white tracking-wider uppercase font-mono">
                          {propCardHolderName || (typeof window !== 'undefined' && (localStorage.getItem('kasbigo_cardHolderName') || localStorage.getItem('kasbigo-card-holder-name'))) || "KasbiGo Admin"}
                        </span>
                      </div>
                    </div>

                    {/* Copied Toast Notification */}
                    {copiedCardToast && (
                      <div className="mt-2.5 py-1 px-2.5 bg-emerald-500/40 border border-emerald-300/40 rounded-lg text-center backdrop-blur-md relative z-10 animate-fade-in">
                        <span className="text-[10px] text-emerald-100 font-extrabold tracking-wide">
                          ✓ Karta raqami muvaffaqiyatli nusxalandi!
                        </span>
                      </div>
                    )}
                  </div>

                  {/* GALLERY CHEQUE SELECTOR DROPZONE - Multi-file direct device upload */}
                  <div className="space-y-2">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">To'lov chekini biriktirish:</span>
                    
                    {selectedChequeUrls.length === 0 && !isUploading && (
                      <label
                        className="w-full h-32 border-2 border-dashed border-slate-300 rounded-2xl bg-slate-50 hover:bg-slate-100 hover:border-emerald-500/50 transition-all flex flex-col items-center justify-center text-center p-4 cursor-pointer"
                      >
                        <Camera className="h-6 w-6 text-slate-400 mb-1.5" />
                        <span className="text-xs font-bold text-slate-700">Chek rasmlarini yuklash</span>
                        <span className="text-[9px] text-slate-400 mt-0.5">Click, Payme yoki bank kvitansiyasi rasmini tanlang</span>
                        <input 
                          type="file" 
                          multiple 
                          accept="image/*" 
                          className="hidden" 
                          onChange={handleRealImageUpload} 
                        />
                      </label>
                    )}

                    {/* Progress animation */}
                    {isUploading && (
                      <div className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-center">
                        <Upload className="h-5 w-5 text-emerald-600 mx-auto animate-bounce mb-2" />
                        <span className="text-[11px] font-bold text-slate-700 block">Fayllar yuklanmoqda...</span>
                        <div className="w-full bg-slate-200 h-1.5 rounded-full mt-2 overflow-hidden">
                          <div className="bg-emerald-500 h-full transition-all duration-150" style={{ width: `${uploadProgress}%` }}></div>
                        </div>
                      </div>
                    )}

                    {/* Success thumbnail grid with delete option */}
                    {selectedChequeUrls.length > 0 && !isUploading && (
                      <div className="space-y-2">
                        <div className="grid grid-cols-3 gap-2.5">
                          {selectedChequeUrls.map((url, idx) => (
                            <div key={`${url}-${idx}`} className="relative h-20 bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                              <img src={url} alt={`cheque receipt ${idx}`} className="h-full w-full object-cover" />
                              <button
                                type="button"
                                onClick={() => setSelectedChequeUrls(prev => prev.filter((_, i) => i !== idx))}
                                className="absolute top-1 right-1 h-5 w-5 bg-rose-600 hover:bg-rose-700 text-white rounded-full flex items-center justify-center shadow-md transition-all active:scale-90"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          ))}
                          
                          {/* Plus add more block */}
                          <label className="h-20 border border-dashed border-slate-300 bg-slate-50 hover:bg-slate-100 rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all">
                            <Plus className="h-5 w-5 text-slate-400" />
                            <span className="text-[8px] font-bold text-slate-500 mt-1">Yana qo'shish</span>
                            <input 
                              type="file" 
                              multiple 
                              accept="image/*" 
                              className="hidden" 
                              onChange={handleRealImageUpload} 
                            />
                          </label>
                        </div>
                        <span className="text-[9px] text-emerald-600 font-bold block text-center mt-1">
                          ✓ Jami {selectedChequeUrls.length} ta chek biriktirildi
                        </span>
                      </div>
                    )}
                  </div>

                  <p className="text-[10px] text-slate-400 text-center italic mt-2">
                    Chek yuklamasdan ham "To'ladim" tugmasini bosishingiz mumkin. Buyurtma adminga o'tadi.
                  </p>

                  {/* Katta yashil 'to'ladim' yozuvi - Requirement 10 */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      const targetMahalla = addressingOrderId && draftOrder ? draftOrder.address.mahalla : userAddress.mahalla;
                      const isMahallaSelected = Boolean(targetMahalla && targetMahalla.trim().length > 0 && targetMahalla !== "Kutilmoqda...");
                      if (isSubmitting || !isMahallaSelected) return;

                      setIsSubmitting(true);
                      if (addressingOrderId && setOrders) {
                        setOrders(prev => prev.map(o => {
                          if (o.id === addressingOrderId) {
                            const nowStr = new Date().toTimeString().split(' ')[0].substring(0, 5);
                            const currentMahalla = o.address.mahalla || userAddress.mahalla;
                            const matchedZone = activeZones.find(z => (z.mahallas || []).some(m => m.trim().toLowerCase() === (currentMahalla || '').trim().toLowerCase()));
                            const baseFee = matchedZone ? matchedZone.price : (activeZones[0]?.price || 10000);
                            const extraStopsCount = (o.pickupPointsCount && o.pickupPointsCount > 1)
                              ? o.pickupPointsCount - 1
                              : ((o.stores && o.stores.length > 1) ? o.stores.length - 1 : 0);
                            const totalDeliveryFee = baseFee + (extraStopsCount * (extraStopFee || 3000));
                            const subTotal = (o.items && o.items.length > 0)
                              ? o.items.reduce((s, it) => s + ((it.product?.price || 0) * (it.quantity || 1)), 0)
                              : o.total;
                            const finalTotal = subTotal + totalDeliveryFee;

                            return {
                              ...o,
                              paymentMethod: 'Online',
                              isConfirmedByCustomer: true,
                              status: 'Yangi',
                              time: nowStr,
                              deliveryFee: totalDeliveryFee,
                              total: finalTotal,
                              address: { mahalla: currentMahalla, comment: userAddress.comment || o.address.comment },
                              uploadedChequeUrl: selectedChequeUrls.length > 0 ? selectedChequeUrls[0] : undefined,
                              uploadedChequeUrls: selectedChequeUrls
                            };
                          }
                          return o;
                        }));
                        setAddressingOrderId(null);
                        setSelectedChequeUrls([]);
                        setSelectedChequeUrl(null);
                        setTimeout(() => {
                          setActiveScreen('success');
                          setIsSubmitting(false);
                          playNotificationSound('customer');
                          playNotificationSound('admin');
                        }, 100);
                      } else {
                        placeOrder(selectedChequeUrls);
                        setSelectedChequeUrls([]);
                        setSelectedChequeUrl(null);
                        setTimeout(() => {
                          setActiveScreen('success');
                          setIsSubmitting(false);
                        }, 100);
                      }
                    }}
                    disabled={isSubmitting || !Boolean((addressingOrderId && draftOrder ? draftOrder.address.mahalla : userAddress.mahalla) && (addressingOrderId && draftOrder ? draftOrder.address.mahalla : userAddress.mahalla).trim().length > 0 && (addressingOrderId && draftOrder ? draftOrder.address.mahalla : userAddress.mahalla) !== "Kutilmoqda...")}
                    className={`w-full font-black py-4 rounded-2xl text-xs uppercase shadow-md transition-all active:scale-98 tracking-wider mt-4 ${
                      isSubmitting || !Boolean((addressingOrderId && draftOrder ? draftOrder.address.mahalla : userAddress.mahalla) && (addressingOrderId && draftOrder ? draftOrder.address.mahalla : userAddress.mahalla).trim().length > 0 && (addressingOrderId && draftOrder ? draftOrder.address.mahalla : userAddress.mahalla) !== "Kutilmoqda...")
                        ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                        : 'bg-[#16A34A] hover:bg-[#15803D] text-white cursor-pointer'
                    }`}
                  >
                    {isSubmitting ? "Yuborilmoqda..." : "To'ladim 💳"}
                  </button>
                </div>
              </motion.div>
            )}

            {/* SCREEN: SUCCESS / EXH-INFO */}
            {activeScreen === 'success' && (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="flex-1 flex flex-col overflow-y-auto px-4 pb-20 pt-2 text-center justify-center items-center"
              >
                <div className="h-16 w-16 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-full flex items-center justify-center text-3xl mb-4 shadow-lg shadow-emerald-100 animate-bounce">
                  🎉
                </div>
                <h3 className="text-base font-black text-slate-800">Buyurtma Qabul Qilindi!</h3>
                <p className="text-xs text-slate-400 mt-2 max-w-[240px] leading-relaxed">
                  Tabriklaymiz, buyurtmangiz muvaffaqiyatli tarzda tizimga qo'shildi va dispetcher paneliga jo'natildi!
                </p>

                <div className="my-6 bg-slate-50 border border-slate-100 rounded-2xl p-4 w-full text-left space-y-2 text-xs text-slate-600">
                  <span className="font-extrabold text-[10px] text-slate-400 uppercase tracking-wider block">NAVIGATSIYA:</span>
                  <p className="text-[11px] leading-relaxed">
                    Siz ushbu buyurtmani va uning kuryer statusini chap paneldagi <span className="font-bold text-slate-800">"Kelgan Buyurtmalar"</span> ro'yxatida tekshira olasiz va statusini o'zgartirib kuzatishingiz mumkin.
                  </p>
                </div>

                <div className="space-y-2 w-full">
                  <button
                    onClick={() => setActiveScreen('orders')}
                    className="w-full bg-slate-900 text-white font-bold py-2.5 rounded-xl text-xs"
                  >
                    Buyurtmalarim ro'yxatiga o'tish
                  </button>
                  <button
                    onClick={() => setActiveScreen('home')}
                    className="w-full bg-white text-slate-600 border border-slate-200 font-bold py-2.5 rounded-xl text-xs"
                  >
                    Asosiy sahifaga qaytish
                  </button>
                </div>
              </motion.div>
            )}

            {/* SCREEN: ORDERS HISTORY */}
            {activeScreen === 'orders' && (
              <motion.div
                key="orders"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex-1 flex flex-col overflow-y-auto px-4 pb-20 pt-2"
              >
                <div className="flex items-center justify-between my-2 border-b border-slate-100 dark:border-slate-800 pb-2">
                  <div className="flex items-center space-x-2">
                    <button onClick={() => setActiveScreen('home')} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-300">
                      <ChevronLeft className="h-5 w-5" />
                    </button>
                    <h3 className="text-sm font-black text-slate-800 dark:text-slate-100">Buyurtmalarim</h3>
                  </div>

                  {/* Calendar Filter - Requirement 2 */}
                  <div className="flex items-center space-x-1.5 shrink-0">
                    <input
                      type="date"
                      value={selectedFilterDate}
                      onChange={(e) => setSelectedFilterDate(e.target.value)}
                      className="border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-[10px] font-bold text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:border-emerald-500 cursor-pointer w-28 sm:w-32 max-w-full"
                    />
                    {selectedFilterDate && (
                      <button
                        onClick={() => setSelectedFilterDate('')}
                        className="p-1 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/60 rounded-lg"
                        title="Filtrni tozalash"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {clientOrders.length > 0 ? (
                  <div className="space-y-3.5 mt-2">
                    {(() => {
                      const filtered = clientOrders.filter(o => !selectedFilterDate || o.date === selectedFilterDate);
                      if (filtered.length === 0) {
                        return (
                          <div className="text-center py-16 text-slate-400 text-xs">
                            <span className="text-2xl block">📅</span>
                            {selectedFilterDate} kunida buyurtmalar topilmadi.
                          </div>
                        );
                      }
                      return filtered.map((o) => {
                        const isPendingPrice = o.isCustomPendingPrice;
                        const isDraft = o.isConfirmedByCustomer === false;

                        return (
                          <div key={o.id} className={`rounded-2xl p-3.5 text-xs text-slate-600 dark:text-slate-300 space-y-2 shadow-xl border border-slate-200 dark:border-slate-700 transition-all ${
                            o.status === 'Bekor qilindi'
                              ? 'bg-rose-50/20 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/50 opacity-80'
                              : 'bg-white dark:bg-slate-800'
                          }`}>
                            <div className="flex justify-between items-center">
                              <span className="font-bold text-slate-800 dark:text-slate-100 font-mono text-emerald-600 dark:text-emerald-400">{o.id}</span>
                              <span className={`text-[10px] font-black px-2 py-0.5 rounded-md ${
                                o.status === 'Bekor qilindi'
                                  ? 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-200 border border-rose-200 dark:border-rose-800'
                                  : isPendingPrice
                                    ? 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-200 animate-pulse'
                                    : isDraft
                                      ? 'bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-200'
                                      : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200'
                              }`}>
                                {o.status === 'Bekor qilindi'
                                  ? '🛑 Bekor qilindi'
                                  : isPendingPrice 
                                    ? '⏳ Narx kutilmoqda' 
                                    : isDraft 
                                      ? '⏳ Qoralama' 
                                      : o.status
                                }
                              </span>
                            </div>
                            
                            {/* Order Date and Time Display - Requirement 2 */}
                            <div className="flex justify-between items-center text-[10px] text-slate-400 font-semibold border-b border-dashed border-slate-200/60 dark:border-slate-700 pb-1.5 mb-1.5">
                              <span>Sana: {o.date}</span>
                              <span>Soat: {o.time}</span>
                            </div>

                            <div className="space-y-1">
                              <div><span className="font-semibold text-slate-800 dark:text-slate-100">Do'kon:</span> {o.storeName}</div>
                              {isPendingPrice && o.status !== 'Bekor qilindi' ? (
                                <div className="text-amber-600 dark:text-amber-400 font-bold animate-pulse">
                                  📌 Dispetcher tez orada narx belgilaydi
                                </div>
                              ) : (
                                <div><span className="font-semibold text-slate-800 dark:text-slate-100">Yetkazish:</span> {o.address.mahalla || "Kiritilmagan"}</div>
                              )}
                              
                              <div>
                                <span className="font-semibold text-slate-800 dark:text-slate-100">To'lov:</span>{' '}
                                <span className="font-bold text-slate-700 dark:text-slate-200">{o.paymentMethod}</span>
                              </div>
                              <div>
                                <span className="font-semibold text-slate-800 dark:text-slate-100">Qiymati:</span>{' '}
                                {isPendingPrice && o.status !== 'Bekor qilindi' ? (
                                  <span className="font-black text-amber-600 dark:text-amber-400 font-mono animate-pulse">⏳ Narx hisoblanmoqda...</span>
                                ) : (
                                  <span className="font-black text-emerald-600 dark:text-emerald-400 font-mono">{formatPrice(o.total)}</span>
                                )}
                              </div>
                              {o.pickupPointsCount && o.pickupPointsCount > 1 ? (
                                <div className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold">
                                  📍 Olish nuqtalari: <span className="font-bold text-slate-700 dark:text-slate-300">{o.pickupPointsCount} ta do'kon</span> (+{formatPrice(o.extraStopsFee || 0)})
                                </div>
                              ) : null}
                            </div>

                            {/* Requirement: Mijoz panelida buyurtma Kuryerda holatiga o'tgach mijozga kuryer nomi va telefon raqami ko'rinib tursin */}
                            {(o.status === 'Kuryerda' || (o.claimedBy && o.status !== 'Yetkazildi' && o.status !== 'Bekor qilindi')) && (() => {
                              const courier = getCourierForOrder(o);
                              const cName = courier?.name || (o.claimedBy ? (o.claimedBy.includes('+') ? `Kuryer (${o.claimedBy})` : o.claimedBy) : 'Biriktirilgan kuryer');
                              const cPhone = courier?.phone || (o.claimedBy && (o.claimedBy.includes('+') || o.claimedBy.replace(/\D/g, '').length >= 7) ? o.claimedBy : '');
                              const cVehicle = courier?.carModel ? `${courier.carModel} (${courier.carNumber || ''})` : (courier?.vehicle || '');

                              return (
                                <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-3.5 rounded-2xl shadow-lg border border-indigo-500/30 my-2 space-y-2">
                                  <div className="flex justify-between items-center">
                                    <div className="flex items-center space-x-2">
                                      <div className="p-2 bg-indigo-500/20 text-indigo-300 rounded-xl border border-indigo-500/30 text-base">
                                        🚴
                                      </div>
                                      <div>
                                        <span className="text-[8.5px] font-black uppercase text-indigo-300 tracking-wider block">
                                          Biriktirilgan Kuryer:
                                        </span>
                                        <h4 className="text-xs font-black text-yellow-300 tracking-wide">{cName}</h4>
                                      </div>
                                    </div>
                                  </div>

                                  {cVehicle && (
                                    <div className="text-[9.5px] text-slate-300 font-medium flex items-center space-x-1 pl-1">
                                      <span>🚘 Transport:</span>
                                      <span className="font-bold text-white">{cVehicle}</span>
                                    </div>
                                  )}

                                  {cPhone ? (
                                    <div className="pt-2 border-t border-indigo-800/60 flex items-center justify-between">
                                      <div className="text-[11px] font-mono font-black text-emerald-300 flex items-center space-x-1">
                                        <span>📞</span>
                                        <span>{cPhone}</span>
                                      </div>
                                      <a
                                        href={`tel:${cPhone.replace(/\s+/g, '')}`}
                                        className="bg-rose-600 hover:bg-rose-500 text-white py-1.5 px-3 rounded-xl text-[10px] font-black flex items-center space-x-1.5 transition-all shadow-md active:scale-95 border-none cursor-pointer"
                                      >
                                        <Phone className="h-3.5 w-3.5 shrink-0 text-white fill-white" />
                                        <span>Qo'ng'iroq qilish</span>
                                      </a>
                                    </div>
                                  ) : (
                                    <div className="pt-1 text-[10px] text-indigo-300 font-semibold italic">
                                      Kuryer biriktirilgan
                                    </div>
                                  )}
                                </div>
                              );
                            })()}

                            {/* Cancelled Order Notice */}
                            {o.status === 'Bekor qilindi' && (
                              <div className="bg-rose-50 border border-rose-200/50 text-rose-800 p-2.5 rounded-xl text-[10px] font-bold leading-relaxed mt-2 space-y-1">
                                <div className="font-black text-rose-700 uppercase flex items-center space-x-1">
                                  <span>🚫</span>
                                  <span>Ushbu buyurtma admin tomonidan bekor qilingan</span>
                                </div>
                                {(o.adminComment || o.cancellationReason) && (
                                  <div className="text-slate-800 bg-white/90 p-2 rounded-lg border border-rose-200">
                                    <span className="font-black text-rose-800 text-[9px] uppercase block mb-0.5">Bekor qilish sababi:</span>
                                    <span className="font-bold text-slate-900 text-xs">{o.adminComment || o.cancellationReason}</span>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Price Assigned / Set Address Callout */}
                            {!isPendingPrice && isDraft && o.status !== 'Bekor qilindi' && (() => {
                              const productSubtotal = o.items.reduce((s, it) => s + ((it.product?.price || 0) * (it.quantity || 1)), 0);
                              const orderDeliveryFee = o.deliveryFee || (o.total - productSubtotal > 0 ? o.total - productSubtotal : 10000);
                              const grandTotal = o.total;

                              return (
                                <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl mt-2 space-y-2">
                                  <div className="flex items-center space-x-1.5 text-amber-800">
                                    <span className="text-sm">🔔</span>
                                    <span className="font-extrabold text-[10px] uppercase tracking-wider">Narx belgilandi!</span>
                                  </div>

                                  <div className="bg-white/90 p-2.5 rounded-lg border border-amber-100 text-[11px] space-y-1">
                                    <div className="flex justify-between text-slate-600">
                                      <span>📦 Mahsulotlar summasi:</span>
                                      <span className="font-bold">{formatPrice(productSubtotal)}</span>
                                    </div>
                                    <div className="flex justify-between text-slate-600">
                                      <span>🚴 Yetkazib berish summasi:</span>
                                      <span className="font-bold">{formatPrice(orderDeliveryFee)}</span>
                                    </div>
                                    <div className="flex justify-between text-slate-900 pt-1.5 border-t border-amber-200 font-black text-xs">
                                      <span>💳 JAMI SUMMA:</span>
                                      <span className="text-emerald-700 font-mono">{formatPrice(grandTotal)}</span>
                                    </div>
                                  </div>

                                  <button
                                    onClick={() => {
                                      setAddressingOrderId(o.id);
                                      const existingMahalla = (o.address?.mahalla && o.address.mahalla !== "Kutilmoqda...")
                                        ? o.address.mahalla
                                        : (userAddress.mahalla || '');
                                      setAddressInput(existingMahalla);
                                      setCommentInput(o.address?.comment || userAddress.comment || '');
                                      setAdditionalCommentInput(o.address?.additionalComment || userAddress.additionalComment || '');
                                      if (o.customerPhone) {
                                        setTempAddressPhone(o.customerPhone);
                                      }
                                      setActiveScreen('address');
                                    }}
                                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-2.5 rounded-xl text-[10px] uppercase tracking-wider transition-all shadow-md active:scale-95 cursor-pointer border-none flex items-center justify-center space-x-1"
                                  >
                                    <span>📍 MANZILNI KIRITISH VA TASDIQLASH 🚀</span>
                                  </button>
                                </div>
                              );
                            })()}

                            {o.uploadedChequeUrl && (
                              <div className="pt-2 border-t border-slate-200 flex items-center space-x-2">
                                <img src={o.uploadedChequeUrl} alt="receipt" className="h-8 w-8 object-cover rounded-md border border-slate-200" />
                                <span className="text-[9px] text-emerald-600 font-bold">✓ To'lov cheki yuborilgan</span>
                              </div>
                            )}


                          </div>
                        );
                      });
                    })()}
                  </div>
                ) : (
                  <div className="text-center py-20 text-slate-400 text-xs">
                    <span className="text-3xl block">📦</span>
                    Sizda hali buyurtmalar yo'q.
                  </div>
                )}
              </motion.div>
            )}

            {/* SCREEN: PROFILE - Requirement 9 (Real updating subpages for changing name and phone number) */}
            {activeScreen === 'profile' && (
              <motion.div
                key="profile"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex-1 flex flex-col overflow-y-auto px-4 pb-20 pt-2"
              >
                <div className="flex items-center space-x-2 my-2 border-b border-slate-100 dark:border-slate-800 pb-2">
                  <button onClick={() => {
                    if (profileEditMode !== 'none') {
                      setProfileEditMode('none');
                    } else {
                      setActiveScreen('home');
                    }
                  }} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-300">
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <h3 className="text-sm font-black text-slate-800 dark:text-slate-100">
                    {profileEditMode === 'name' ? "Ismni o'zgartirish" : profileEditMode === 'phone' ? "Telefonni o'zgartirish" : "Mening profilim"}
                  </h3>
                </div>

                {/* Subpage for editing Name */}
                {profileEditMode === 'name' ? (
                  <div className="space-y-4 mt-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                        Yangi ismingizni kiriting
                      </label>
                      <input
                        type="text"
                        value={tempProfileName}
                        onChange={(e) => setTempProfileName(e.target.value)}
                        className="w-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-700 rounded-xl py-2.5 px-3 text-xs text-slate-800 dark:text-slate-100 focus:outline-none"
                      />
                    </div>
                    <button
                      onClick={() => {
                        setUserProfile({ ...userProfile, name: tempProfileName });
                        setProfileEditMode('none');
                        setShowProfileSavedAlert(true);
                        setTimeout(() => setShowProfileSavedAlert(false), 2500);
                      }}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-xl text-xs"
                    >
                      O'zgarishlarni Saqlash
                    </button>
                  </div>
                ) : profileEditMode === 'phone' ? (
                  /* Subpage for editing Phone */
                  <div className="space-y-4 mt-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                        Yangi telefon raqamingizni kiriting
                      </label>
                      <PhoneInput
                        value={tempProfilePhone}
                        onChange={(val) => setTempProfilePhone(val)}
                        className="w-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-700 rounded-xl py-2.5 px-3 text-xs text-slate-800 dark:text-slate-100 focus:outline-none font-medium"
                      />
                    </div>
                    <button
                      onClick={() => {
                        setUserProfile({ ...userProfile, phone: tempProfilePhone });
                        setProfileEditMode('none');
                        setShowProfileSavedAlert(true);
                        setTimeout(() => setShowProfileSavedAlert(false), 2500);
                      }}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-xl text-xs"
                    >
                      O'zgarishlarni Saqlash
                    </button>
                  </div>
                ) : (
                  /* Normal Profile Info list */
                  <div className="space-y-4 mt-3">
                    {showProfileSavedAlert && (
                      <div className="p-2 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-100 dark:border-emerald-800 rounded-xl text-[10px] text-emerald-800 dark:text-emerald-200 font-bold text-center">
                        ✓ Profil ma'lumotlari muvaffaqiyatli saqlandi!
                      </div>
                    )}

                    <div className="flex flex-col items-center py-4 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 p-4">
                      <div className="h-16 w-16 rounded-full bg-emerald-500 text-white flex items-center justify-center text-2xl font-black mb-2 shadow-md">
                        {userProfile.name.charAt(0)}
                      </div>
                      <h4 className="text-sm font-black text-slate-800 dark:text-slate-100">{userProfile.name}</h4>
                      <p className="text-xs text-slate-400 mt-0.5">{userProfile.phone ? formatPhoneInput(userProfile.phone) : "Telefon raqam kiritilmagan"}</p>
                    </div>

                    <div className="space-y-2">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">PROFIL SOZLAMALARI:</span>
                      
                      {/* Name editing trigger */}
                      <button
                        onClick={() => setProfileEditMode('name')}
                        className="w-full flex items-center justify-between p-3.5 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/80 text-left text-xs font-bold text-slate-700 dark:text-slate-200 active:scale-95 transition-transform cursor-pointer"
                      >
                        <span>Ismni tahrirlash</span>
                        <ChevronRight className="h-4 w-4 text-slate-400" />
                      </button>

                      {/* Phone editing trigger */}
                      <button
                        onClick={() => setProfileEditMode('phone')}
                        className="w-full flex items-center justify-between p-3.5 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/80 text-left text-xs font-bold text-slate-700 dark:text-slate-200 active:scale-95 transition-transform cursor-pointer"
                      >
                        <span>Telefon raqamini tahrirlash</span>
                        <ChevronRight className="h-4 w-4 text-slate-400" />
                      </button>
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* SCREEN: HELP / SUPPORT CHAT - Requirement 14 (Admin Call, Admin Telegram, FAQ) */}
            {activeScreen === 'help' && (
              <motion.div
                key="help"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex-1 flex flex-col overflow-y-auto px-4 pb-20 pt-2"
              >
                <div className="flex items-center space-x-2 my-2 border-b border-slate-100 pb-2">
                  <button onClick={() => setActiveScreen('home')} className="p-1 hover:bg-slate-100 rounded-lg text-slate-600">
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <h3 className="text-sm font-black text-slate-800">Yordam markazi</h3>
                </div>

                <div className="space-y-4 mt-3">
                  
                  {/* DIRECT CONTACT CARD */}
                  <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 space-y-3.5">
                    <div>
                      <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest block">ADMIN BILAN BOG'LANISH</span>
                      <p className="text-[10px] text-slate-500 mt-0.5">Sizda savol yoki muammo bormi? Ma'murlarimiz 24/7 aloqada!</p>
                    </div>

                    <div className="space-y-2">
                      <a 
                        href={`tel:${adminPhone}`}
                        className="w-full bg-white hover:bg-slate-100 text-slate-800 border border-slate-200 rounded-xl py-3 px-4 text-xs font-black transition-all flex items-center justify-between shadow-xs"
                      >
                        <span className="flex items-center">
                          <Phone className="h-4 w-4 text-emerald-600 mr-2" />
                          <span>{adminPhone}</span>
                        </span>
                        <span className="text-[10px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg font-bold">Qo'ng'iroq</span>
                      </a>

                      <a 
                        href={adminTelegram}
                        target="_blank"
                        rel="noreferrer"
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl py-3 px-4 text-xs font-black transition-all flex items-center justify-between shadow-md shadow-emerald-600/10"
                      >
                        <span className="flex items-center">
                          <Send className="h-4 w-4 text-white mr-2" />
                          <span>Adminga yozish</span>
                        </span>
                        <span className="text-[10px] text-emerald-100 font-extrabold uppercase tracking-wider">Telegram</span>
                      </a>
                    </div>
                  </div>

                  {/* FAQ SECTION */}
                  <div className="space-y-2.5">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">TEZ-TEZ BERILADIGAN SAVOLLAR (FAQ)</span>
                    
                    {[
                      {
                        q: "Yetkazish xizmati mutlaqo bepulmi?",
                        a: "Ha! Kasbi tumanidagi barcha do'konlarimizdan buyurtmalar yetkazib berish xizmati 100% mutlaqo bepul!"
                      },
                      {
                        q: "Buyurtma qancha vaqtda yetib boradi?",
                        a: "Buyurtmalar o'rtacha 20 daqiqadan 35 daqiqagacha bo'lgan vaqt oralig'ida tezkorlik bilan manzilingizga yetkaziladi."
                      },
                      {
                        q: "Online to'lov chekini qanday yuklayman?",
                        a: "Online to'lov sahifasida 'Chek rasmini yuklash' tugmasini bosing va o'tkazma kvitansiyasi rasmini tanlang."
                      },
                      {
                        q: "Qora ro'yxatga tushib qolsam nima bo'ladi?",
                        a: "Agar soxta chaqiruv qilgan bo'lsangiz, profilingiz bloklanadi. Qayta faollashtirish uchun Admin bilan bog'laning."
                      }
                    ].map((faq, i) => (
                      <div key={i} className="p-3 bg-white border border-slate-150 rounded-xl space-y-1">
                        <span className="text-[10px] font-black text-slate-800 block">❓ {faq.q}</span>
                        <p className="text-[10px] text-slate-500 leading-normal">{faq.a}</p>
                      </div>
                    ))}
                  </div>

                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>

        {/* MOCK PHOTO GALLERY POPUP FOR SELECTING MOCK CHEQUES (Requirement 5) */}
        <AnimatePresence>
          {isGalleryOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex flex-col justify-end"
            >
              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                className="bg-white rounded-t-[32px] p-5 space-y-4 flex flex-col border-t border-slate-200 max-h-[80%]"
              >
                <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center">
                    <Camera className="h-4 w-4 mr-1 text-emerald-600" /> Rasmlar Galereyasi
                  </h4>
                  <button onClick={() => setIsGalleryOpen(false)} className="p-1 text-slate-400 hover:text-slate-700">
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <p className="text-[10px] text-slate-500 leading-normal">
                  Telefoningiz galereyasidan tayyorlangan quyidagi to'lov kvitansiyalaridan birini tanlang (Click, Payme, yoki Uzum):
                </p>

                <div className="grid grid-cols-3 gap-2.5">
                  {mockCheques.map((ch) => (
                    <button
                      key={ch.name}
                      type="button"
                      onClick={() => handleSelectMockCheque(ch.img)}
                      className="group flex flex-col text-left border border-slate-200 rounded-xl overflow-hidden hover:border-emerald-500 bg-slate-50"
                    >
                      <img src={ch.img} alt={ch.name} className="h-16 w-full object-cover" />
                      <span className="p-1.5 text-[8px] font-bold text-slate-700 block truncate group-hover:text-emerald-600">
                        {ch.name}
                      </span>
                    </button>
                  ))}
                </div>

                <div className="relative pt-1">
                  <div className="flex items-center my-2">
                    <div className="flex-1 h-[1px] bg-slate-100"></div>
                    <span className="text-[8px] font-black text-slate-400 px-2.5 uppercase tracking-wider">Yoki</span>
                    <div className="flex-1 h-[1px] bg-slate-100"></div>
                  </div>

                  <label className="w-full flex items-center justify-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black py-3 px-4 rounded-xl text-xs uppercase cursor-pointer transition-all active:scale-98 shadow-md shadow-emerald-500/10">
                    <Upload className="h-4 w-4" />
                    <span>Telefoningizdan real rasm yuklash</span>
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      onChange={handleRealImageUpload} 
                    />
                  </label>
                </div>

                <button
                  type="button"
                  onClick={() => setIsGalleryOpen(false)}
                  className="w-full bg-slate-100 text-slate-600 py-2.5 rounded-xl text-xs font-bold"
                >
                  Bekor qilish
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* PRODUCT IMAGE ZOOM MODAL (Requirement 1 - Kliklab kattalashtirish) */}
        <AnimatePresence>
          {zoomedProductImage && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setZoomedProductImage(null);
                setZoomedProductName(null);
              }}
              className="absolute inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex flex-col items-center justify-center p-6 cursor-zoom-out select-none"
            >
              <motion.div
                initial={{ scale: 0.85, y: 15 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.85, y: 15 }}
                className="bg-white/10 backdrop-blur-xl border border-white/15 p-6 rounded-[32px] max-w-[280px] w-full flex flex-col items-center shadow-2xl relative overflow-hidden text-center"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="h-48 w-full bg-white/5 border border-white/5 rounded-3xl mb-5 shadow-inner select-none flex items-center justify-center overflow-hidden p-4">
                  <ProductImage image={zoomedProductImage} className="max-h-full max-w-full object-contain" emojiClassName="text-8xl" />
                </div>

                <h4 className="text-sm font-black text-white leading-tight uppercase tracking-wider">
                  {zoomedProductName}
                </h4>

                <button 
                  onClick={() => {
                    setZoomedProductImage(null);
                    setZoomedProductName(null);
                  }}
                  className="mt-6 px-5 py-2.5 rounded-xl bg-white text-slate-900 text-[10px] font-black uppercase tracking-wider hover:bg-slate-100 active:scale-95 transition-all cursor-pointer"
                >
                  Yopish
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* CUSTOM ORDER HANDWRITTEN MODAL (Ultra Hyper Max Design) */}
        <AnimatePresence>
          {showCustomOrderModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-950/70 backdrop-blur-xl z-50 flex flex-col justify-end"
              onClick={() => setShowCustomOrderModal(false)}
            >
              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 26, stiffness: 240 }}
                className="bg-white dark:bg-slate-900 border-t-2 border-emerald-400/50 rounded-t-[40px] p-6 text-slate-800 dark:text-slate-100 space-y-5 max-h-[88%] overflow-y-auto shadow-2xl relative"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Glowing top line accent */}
                <div className="absolute top-3 left-1/2 -translate-x-1/2 w-16 h-1 bg-emerald-400/40 rounded-full" />

                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center space-x-2.5">
                    <div className="flex items-center justify-center h-9 w-9 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-white text-base font-black shadow-lg shadow-emerald-500/30">
                      ✍️
                    </div>
                    <div>
                      <h3 className="text-sm font-black tracking-wider text-amber-500 dark:text-amber-400 uppercase">
                        {convertScript("Yozma buyurtma berish", scriptMode)}
                      </h3>
                    </div>
                  </div>
                  <button 
                    onClick={() => setShowCustomOrderModal(false)}
                    className="h-8 w-8 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-300 flex items-center justify-center transition-all cursor-pointer border border-slate-200 dark:border-slate-700"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black tracking-wider text-slate-500 dark:text-slate-400 uppercase block">
                    {convertScript("Savatga nima qo'shmoqchisiz?", scriptMode)}
                  </label>
                  <div className="relative">
                    <textarea
                      value={customOrderText}
                      onChange={(e) => setCustomOrderText(e.target.value)}
                      placeholder={convertScript("Masalan: 3 ta issiq non, 2 litr sut va 1 kg olma olib keling...", scriptMode)}
                      rows={4}
                      className="w-full bg-slate-50 dark:bg-slate-800/80 border-2 border-slate-200 dark:border-slate-700 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 rounded-2xl p-4 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none transition-all resize-none font-medium leading-relaxed shadow-inner"
                    />
                    <div className="absolute right-3.5 bottom-3.5 text-[9px] text-emerald-600 dark:text-emerald-400 font-extrabold font-mono bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800">
                      {customOrderText.length} {convertScript("ta belgi", scriptMode)}
                    </div>
                  </div>
                </div>

                {/* Mandatory Phone Input directly in Modal */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black tracking-wider text-slate-600 dark:text-slate-300 uppercase flex justify-between items-center">
                    <span>{convertScript("Telefon raqamingiz", scriptMode)} <span className="text-rose-500">* ({convertScript("Majburiy", scriptMode)})</span></span>
                  </label>
                  <PhoneInput
                    value={customOrderPhone}
                    onChange={(val) => setCustomOrderPhone(val)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 rounded-2xl p-3 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none transition-all font-bold"
                  />
                  {customOrderPhone.trim() && !isUzbekPhoneValid(customOrderPhone) && (
                    <p className="text-[9px] text-rose-500 font-bold mt-0.5">
                      ⚠️ {convertScript("Kamida 9 xonali telefon raqam kiriting", scriptMode)}
                    </p>
                  )}
                </div>

                {/* Mandatory Mahalla Selection directly in Modal */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black tracking-wider text-slate-600 dark:text-slate-300 uppercase flex justify-between items-center">
                    <span>{convertScript("Mahallangiz", scriptMode)} <span className="text-rose-500">* ({convertScript("Majburiy", scriptMode)})</span></span>
                  </label>
                  <select
                    value={customOrderMahalla}
                    onChange={(e) => setCustomOrderMahalla(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 focus:border-emerald-500 rounded-2xl p-3 text-xs text-slate-900 dark:text-white font-bold focus:outline-none"
                  >
                    <option value="">-- {convertScript("Mahallangizni tanlang", scriptMode)} --</option>
                    {(Array.from(new Set(allMahallasList)) as string[]).map((m, mIdx) => (
                      <option key={`custom-m-${m}-${mIdx}`} value={m}>{m}</option>
                    ))}
                  </select>
                  {!customOrderMahalla.trim() && (
                    <p className="text-[9px] text-rose-500 font-bold mt-0.5">
                      ⚠️ {convertScript("Mahalla tanlanishi shart", scriptMode)}
                    </p>
                  )}
                </div>

                <div className="bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-emerald-500/10 border border-emerald-500/30 rounded-2xl p-4 space-y-1 text-[11px] text-emerald-900 dark:text-emerald-200 leading-normal">
                  <span className="font-extrabold text-emerald-700 dark:text-emerald-400 flex items-center space-x-1 uppercase tracking-wider text-[10px]">
                    <span>💡 {convertScript("Shtatizatsiyalangan operator ko'magi", scriptMode)}</span>
                  </span>
                  <p className="font-semibold text-[10px] leading-relaxed">
                    {convertScript("Siz istalgan mahsulotni yozib yuboring. Operatorimiz uni tekshirib, narxini belgilaydi. Keyin manzilni kiritib buyurtmani tasdiqlashingiz mumkin bo'ladi.", scriptMode)}
                  </p>
                </div>

                {(() => {
                  const isPhoneValid = customOrderPhone.replace(/\D/g, '').length >= 9;
                  const isMahallaValid = customOrderMahalla.trim().length > 0;
                  const canSubmit = customOrderText.trim().length > 0 && isPhoneValid && isMahallaValid;
                  return (
                    <button
                      onClick={() => {
                        handleSubmitCustomOrder(customOrderPhone.trim(), customOrderMahalla.trim());
                        setShowCustomOrderModal(false);
                      }}
                      disabled={!canSubmit}
                      className={`w-full py-4 rounded-2xl font-black uppercase tracking-wider text-xs flex items-center justify-center space-x-2 transition-all duration-300 cursor-pointer ${
                        canSubmit
                          ? 'bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 text-white hover:opacity-95 shadow-xl shadow-emerald-500/30 active:scale-95'
                          : 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed'
                      }`}
                    >
                      <span>{convertScript("Dispetcherga yuborish", scriptMode)}</span>
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  );
                })()}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* VOICE ORDER MODAL (Ultra Hyper Max Design) */}
        <AnimatePresence>
          {showVoiceOrderModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-950/70 backdrop-blur-xl z-50 flex flex-col justify-end"
              onClick={() => {
                stopRecording();
                setShowVoiceOrderModal(false);
              }}
            >
              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 26, stiffness: 240 }}
                className="bg-white dark:bg-slate-900 border-t-2 border-indigo-400/50 rounded-t-[40px] p-5 text-slate-800 dark:text-slate-100 space-y-4 max-h-[92vh] overflow-y-auto shadow-2xl pb-10 my-auto custom-scrollbar relative"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Glowing top line accent */}
                <div className="absolute top-3 left-1/2 -translate-x-1/2 w-16 h-1 bg-indigo-400/40 rounded-full" />

                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center space-x-2.5">
                    <div className="flex items-center justify-center h-9 w-9 rounded-2xl bg-gradient-to-tr from-indigo-500 via-violet-500 to-purple-600 text-white text-base font-black shadow-lg shadow-indigo-500/30">
                      🎙️
                    </div>
                    <div>
                      <h3 className="text-sm font-black tracking-wider text-red-800 dark:text-red-500 uppercase">
                        {convertScript("Ovozli buyurtma berish", scriptMode)}
                      </h3>
                    </div>
                  </div>
                  <button 
                    onClick={() => {
                      stopRecording();
                      setShowVoiceOrderModal(false);
                    }}
                    className="h-8 w-8 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-300 flex items-center justify-center transition-all cursor-pointer border border-slate-200 dark:border-slate-700"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="flex flex-col items-center justify-center py-5 space-y-4 bg-indigo-50/40 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 rounded-3xl p-4">
                  {/* Pulsing Visualizer Ring */}
                  <div className="relative flex items-center justify-center">
                    {isRecording && (
                      <>
                        <span className="absolute animate-ping h-28 w-28 rounded-full bg-rose-500/30"></span>
                        <span className="absolute animate-pulse h-20 w-20 rounded-full bg-rose-500/50"></span>
                      </>
                    )}
                    <button
                      onClick={isRecording ? stopRecording : startRecording}
                      className={`h-20 w-20 rounded-full flex items-center justify-center text-white transition-all duration-300 shadow-2xl cursor-pointer ${
                        isRecording 
                          ? 'bg-rose-600 shadow-rose-500/50 hover:bg-rose-700 scale-105 border-2 border-white' 
                          : recordedAudioUrl 
                            ? 'bg-slate-800 border-2 border-indigo-400 hover:bg-slate-700'
                            : 'bg-gradient-to-tr from-indigo-600 to-violet-500 shadow-indigo-500/40 hover:scale-105 border-2 border-indigo-300/50'
                      }`}
                    >
                      {isRecording ? (
                        <div className="h-6 w-6 bg-white rounded-sm animate-pulse" />
                      ) : (
                        <span className="text-3xl filter drop-shadow">🎙️</span>
                      )}
                    </button>
                  </div>

                  {/* Dynamic Sound Wave Animation during recording */}
                  {isRecording && (
                    <div className="flex items-center space-x-1.5 h-6 my-1">
                      {[...Array(9)].map((_, i) => (
                        <span
                          key={i}
                          className="w-1 bg-indigo-500 dark:bg-indigo-400 rounded-full animate-bounce"
                          style={{
                            height: `${Math.floor(Math.random() * 16) + 8}px`,
                            animationDelay: `${i * 0.1}s`,
                            animationDuration: '0.6s'
                          }}
                        />
                      ))}
                    </div>
                  )}

                  {/* Status and Timer */}
                  <div className="text-center space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                      {isRecording 
                        ? convertScript('Ovoz yozilmoqda...', scriptMode)
                        : recordedAudioUrl 
                          ? convertScript('Yozuv yakunlandi', scriptMode) 
                          : convertScript('Tugmani bosing va gapiring', scriptMode)}
                    </p>
                    <h4 className="text-3xl font-black font-mono text-slate-900 dark:text-white tracking-tight">
                      {Math.floor(recordingSeconds / 60).toString().padStart(2, '0')}:
                      {(recordingSeconds % 60).toString().padStart(2, '0')}
                    </h4>
                  </div>

                  {/* Audio Playback Review Block */}
                  {recordedAudioUrl && (
                    <div className="w-full bg-white dark:bg-slate-800 border border-indigo-200 dark:border-indigo-800 p-4 rounded-2xl flex flex-col space-y-2.5 items-center shadow-md">
                      <span className="text-[9px] font-extrabold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest block">
                        🎧 {convertScript("Ovozingizni eshiting:", scriptMode)}
                      </span>
                      <audio src={recordedAudioUrl} controls className="w-full h-9 max-w-full accent-indigo-500 rounded-lg" />
                      <button
                        onClick={startRecording}
                        className="text-[9.5px] font-black text-rose-500 hover:text-rose-600 transition-all uppercase bg-transparent border-none cursor-pointer"
                      >
                        🔄 {convertScript("Qayta yozib olish", scriptMode)}
                      </button>
                    </div>
                  )}
                </div>

                {/* Mandatory Phone Input directly in Voice Order Modal */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black tracking-wider text-slate-600 dark:text-slate-300 uppercase flex justify-between items-center">
                    <span>{convertScript("Telefon raqamingiz", scriptMode)} <span className="text-rose-500">* ({convertScript("Majburiy", scriptMode)})</span></span>
                  </label>
                  <PhoneInput
                    value={voiceOrderPhone}
                    onChange={(val) => setVoiceOrderPhone(val)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 rounded-2xl p-3 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none transition-all font-bold"
                  />
                  {voiceOrderPhone.trim() && !isUzbekPhoneValid(voiceOrderPhone) && (
                    <p className="text-[9px] text-rose-500 font-bold mt-0.5">
                      ⚠️ {convertScript("Kamida 9 xonali telefon raqam kiriting", scriptMode)}
                    </p>
                  )}
                </div>

                {/* Mandatory Mahalla Selection directly in Voice Order Modal */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black tracking-wider text-slate-600 dark:text-slate-300 uppercase flex justify-between items-center">
                    <span>{convertScript("Mahallangiz", scriptMode)} <span className="text-rose-500">* ({convertScript("Majburiy", scriptMode)})</span></span>
                  </label>
                  <select
                    value={voiceOrderMahalla}
                    onChange={(e) => setVoiceOrderMahalla(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 focus:border-indigo-500 rounded-2xl p-3 text-xs text-slate-900 dark:text-white font-bold focus:outline-none"
                  >
                    <option value="">-- {convertScript("Mahallangizni tanlang", scriptMode)} --</option>
                    {(Array.from(new Set(allMahallasList)) as string[]).map((m, mIdx) => (
                      <option key={`voice-m-${m}-${mIdx}`} value={m}>{m}</option>
                    ))}
                  </select>
                  {!voiceOrderMahalla.trim() && (
                    <p className="text-[9px] text-rose-500 font-bold mt-0.5">
                      ⚠️ {convertScript("Mahalla tanlanishi shart", scriptMode)}
                    </p>
                  )}
                </div>

                {/* Instruction text */}
                <div className="bg-indigo-50/90 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 rounded-2xl p-4 space-y-1 text-indigo-950 dark:text-indigo-200 leading-normal">
                  <span className="font-extrabold text-indigo-700 dark:text-indigo-400 flex items-center space-x-1 uppercase tracking-wider text-[10px]">
                    <span>💡 {convertScript("Yo'riqnoma", scriptMode)}</span>
                  </span>
                  <p className="font-semibold text-[10.5px] leading-relaxed">
                    {convertScript("Istalgan narsangizni nomi, miqdori va boshqa ma'lumotlari haqida gapiring! Biz qisqa fursatda buyurtmangiz va uni yetkazish narxini sizga ma'lum qilamiz.", scriptMode)}
                  </p>
                </div>

                {(() => {
                  const isPhoneValid = voiceOrderPhone.replace(/\D/g, '').length >= 9;
                  const isMahallaValid = voiceOrderMahalla.trim().length > 0;
                  const canSubmit = Boolean(recordedAudioUrl) && isPhoneValid && isMahallaValid;
                  return (
                    <button
                      onClick={() => {
                        handleSubmitVoiceOrder(voiceOrderPhone.trim(), voiceOrderMahalla.trim());
                        setShowVoiceOrderModal(false);
                      }}
                      disabled={!canSubmit}
                      className={`w-full py-4 rounded-2xl font-black uppercase tracking-wider text-xs flex items-center justify-center space-x-2 transition-all duration-300 cursor-pointer ${
                        canSubmit
                          ? 'bg-gradient-to-r from-indigo-600 via-violet-600 to-indigo-700 text-white hover:opacity-95 shadow-xl shadow-indigo-500/30 active:scale-95'
                          : 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed'
                      }`}
                    >
                      <span>{convertScript("Dispetcherga yuborish", scriptMode)}</span>
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  );
                })()}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Phone Prompt Modal for users without a phone number */}
        <AnimatePresence>
          {showPhonePromptModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-md z-50 flex items-center justify-center p-4"
            >
              <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                className="bg-white rounded-3xl p-5 w-full max-w-xs shadow-2xl border border-slate-100 flex flex-col space-y-4"
              >
                <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                  <div className="flex items-center space-x-2">
                    <div className="p-2 bg-emerald-50 rounded-xl text-emerald-600 font-bold">📞</div>
                    <h3 className="font-black text-slate-900 text-sm">Telefon raqamingiz</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowPhonePromptModal(false)}
                    className="p-1 rounded-full text-slate-400 hover:text-slate-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <p className="text-xs text-slate-500 font-medium leading-relaxed">
                  Buyurtmani muvaffaqiyatli rasmiylashtirish va kuryer bog'lanishi uchun telefon raqamingizni kiriting:
                </p>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Telefon raqam:</label>
                  <PhoneInput
                    required
                    value={promptPhoneInput}
                    onChange={(val) => setPromptPhoneInput(val)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-3.5 py-3 text-sm font-bold text-slate-900 focus:outline-none focus:border-emerald-500 focus:bg-white"
                  />
                </div>

                <div className="flex space-x-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowPhonePromptModal(false)}
                    className="flex-1 py-3 bg-slate-100 text-slate-600 font-bold text-xs rounded-2xl hover:bg-slate-200 transition-all"
                  >
                    Bekor
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!promptPhoneInput.trim()) return;
                      const clean = promptPhoneInput.trim();
                      if (setUserProfile) {
                        setUserProfile(prev => ({ ...prev, phone: clean }));
                      }
                      setShowPhonePromptModal(false);
                      if (pendingOrderType === 'custom') {
                        executeCustomOrderSubmission(clean);
                      } else if (pendingOrderType === 'voice') {
                        executeVoiceOrderSubmission(clean);
                      } else {
                        setActiveScreen('orders');
                      }
                      setPendingOrderType(null);
                    }}
                    className="flex-1 py-3 bg-gradient-to-r from-emerald-500 to-green-600 text-white font-black text-xs rounded-2xl shadow-lg shadow-emerald-500/20 hover:from-emerald-600 hover:to-green-700 transition-all cursor-pointer"
                  >
                    Tasdiqlash
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* LARGE CENTERED COURIER RATING MODAL OVERLAY (Requirements B & C) */}
        <AnimatePresence>
          {unratedOrder && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-4 rounded-[40px] overflow-hidden"
            >
              <motion.div
                initial={{ scale: 0.85, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.85, opacity: 0, y: 20 }}
                className="bg-white dark:bg-slate-900 rounded-3xl p-5 shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-xs text-center relative"
              >
                {/* Skip / Close Button */}
                <button
                  type="button"
                  onClick={() => handleDismissRatingModal(unratedOrder.id)}
                  className="absolute top-3 right-3 p-1.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 bg-slate-100 dark:bg-slate-800 transition-colors cursor-pointer"
                  title="Keyinroq"
                >
                  <X className="h-4 w-4" />
                </button>

                {/* Header Icon & Title */}
                <div className="mb-3 pt-1">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto mb-2 text-2xl font-bold shadow-inner border border-amber-500/20">
                    ⭐
                  </div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
                    Kuryerni baholang
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                    Xizmat sifatini baholashga yordam bering
                  </p>
                </div>

                {/* Courier Info Box */}
                {(() => {
                  const courier = getCourierForOrder(unratedOrder);
                  const courierName = courier?.name || (unratedOrder.claimedBy ? `Kuryer (${unratedOrder.claimedBy})` : 'Xizmat kuryeri');
                  const courierPhoto = courier?.avatar || courier?.photo || courier?.image;

                  return (
                    <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 my-2.5 text-center">
                      <div className="relative inline-block mb-1">
                        {courierPhoto ? (
                          <img
                            src={courierPhoto}
                            alt={courierName}
                            className="w-14 h-14 rounded-full object-cover border-2 border-emerald-500 shadow-md mx-auto"
                          />
                        ) : (
                          <div className="w-14 h-14 rounded-full bg-emerald-500/15 border-2 border-emerald-500 flex items-center justify-center text-2xl mx-auto shadow-sm">
                            🛵
                          </div>
                        )}
                        <span className="absolute -bottom-1 -right-1 bg-emerald-500 text-white p-0.5 rounded-full text-[9px] shadow">
                          <Check className="h-3 w-3 stroke-[3]" />
                        </span>
                      </div>
                      <h4 className="font-extrabold text-sm text-slate-900 dark:text-slate-100">
                        {courierName}
                      </h4>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                        Buyurtma: <strong className="text-emerald-600 dark:text-emerald-400">#{unratedOrder.id}</strong>
                      </p>
                    </div>
                  );
                })()}

                {/* 5 Big Interactive Stars */}
                <div className="my-3">
                  <div className="flex justify-center items-center space-x-1.5">
                    {[1, 2, 3, 4, 5].map((star) => {
                      const active = star <= (hoverStars || selectedStars);
                      return (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setSelectedStars(star)}
                          onMouseEnter={() => setHoverStars(star)}
                          onMouseLeave={() => setHoverStars(0)}
                          className="p-1 transition-transform active:scale-125 focus:outline-none cursor-pointer"
                        >
                          <Star
                            className={`h-7 w-7 ${
                              active
                                ? 'text-amber-400 fill-amber-400 drop-shadow-sm scale-110'
                                : 'text-slate-300 dark:text-slate-700'
                            } transition-all`}
                          />
                        </button>
                      );
                    })}
                  </div>
                  <div className="h-5 mt-1 flex items-center justify-center text-[11px] font-black text-amber-500">
                    {(hoverStars || selectedStars) === 1 && '😞 Juda yomon'}
                    {(hoverStars || selectedStars) === 2 && '🙁 Qoniqarsiz'}
                    {(hoverStars || selectedStars) === 3 && '😐 O\'rtacha'}
                    {(hoverStars || selectedStars) === 4 && '🙂 Yaxshi'}
                    {(hoverStars || selectedStars) === 5 && '🌟 A\'lo xizmat!'}
                    {(hoverStars || selectedStars) === 0 && (
                      <span className="text-slate-400 dark:text-slate-500 font-medium text-[10px]">
                        Baho berish uchun yulduzchani bosing
                      </span>
                    )}
                  </div>
                </div>

                {/* Optional Comment Input */}
                <div className="mb-3 text-left">
                  <textarea
                    value={ratingComment}
                    onChange={(e) => setRatingComment(e.target.value)}
                    placeholder="Fikringiz bormi? (ixtiyoriy)"
                    rows={2}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 resize-none font-medium"
                  />
                </div>

                {/* Submit & Skip Actions */}
                <div className="space-y-1.5 pt-1">
                  <button
                    type="button"
                    disabled={selectedStars === 0}
                    onClick={() => handleSubmitRating(unratedOrder.id)}
                    className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-emerald-500/20 active:scale-95 transition-all cursor-pointer flex items-center justify-center space-x-1.5"
                  >
                    <span>Yuborish</span>
                    <Send className="h-3.5 w-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDismissRatingModal(unratedOrder.id)}
                    className="w-full py-1 text-[11px] font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors cursor-pointer"
                  >
                    Keyinroq
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Navigation bottom bar inside phone - Ultra Hyper Modern Floating Dock */}
        <div className="absolute bottom-2 left-3 right-3 h-16 bg-[#FFFDF5] dark:bg-slate-900/95 backdrop-blur-xl border border-amber-200/90 dark:border-slate-800 rounded-2xl flex items-center justify-around px-2 z-30 shadow-xl shadow-amber-950/10">
          <button
            onClick={() => setActiveScreen('home')}
            className="flex-1 focus:outline-none"
          >
            <ThreeDNavIcon type="home" active={activeScreen === 'home'} />
          </button>
          
          <button
            onClick={() => setActiveScreen('cart')}
            className="flex-1 focus:outline-none"
          >
            <ThreeDNavIcon type="cart" active={activeScreen === 'cart'} count={getCartCount()} />
          </button>

          <button
            onClick={() => setActiveScreen('orders')}
            className="flex-1 focus:outline-none"
          >
            <ThreeDNavIcon type="orders" active={activeScreen === 'orders'} count={clientOrders.filter(order => order.status !== 'Yetkazildi' && order.status !== 'Bekor qilindi').length} />
          </button>

          <button
            onClick={() => setActiveScreen('profile')}
            className="flex-1 focus:outline-none"
          >
            <ThreeDNavIcon type="profile" active={activeScreen === 'profile'} />
          </button>
        </div>

      </div>

      {/* Decorative Speaker and camera notch */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 h-1 w-12 rounded-full bg-slate-800 z-50"></div>
    </div>
  );
};
