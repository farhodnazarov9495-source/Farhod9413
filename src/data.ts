/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Store, Category, PromoBanner, PopularPartner, DeliveryZone } from './types';

export const INITIAL_PROMOS: PromoBanner[] = [
  {
    id: 'promo-1',
    storeId: 'kasbi-market',
    title: "Kasbi Market",
    tag: "ISSIQ NON VA SOVUQ ICHIMLIKLAR",
    desc: "Kasbi tumanining yirik do'koni. Barcha mahsulotlar tezda yetkaziladi!",
    bg: "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=800",
    actionText: "O'tish",
    targetType: 'store',
    targetValue: 'kasbi-market'
  },
  {
    id: 'promo-2',
    storeId: 'mega-market',
    title: "Mega Market",
    tag: "KENG ASSORTIMENT, ARZON NARXLAR",
    desc: "Ro'zg'or buyumlari, sabzavot va oziq-ovqatlarni oson buyurtma qiling!",
    bg: "https://images.unsplash.com/photo-1578916171728-46686eac8d58?auto=format&fit=crop&q=80&w=800",
    actionText: "O'tish",
    targetType: 'store',
    targetValue: 'mega-market'
  },
  {
    id: 'promo-3',
    storeId: 'home-food',
    title: "Home Food",
    tag: "MAZALI BURGER VA ISSIQ LAVASHLAR",
    desc: "Tezkor va issiqqina lavash, burger va shaurmalar. Sifatli va mazali fast-food!",
    bg: "https://images.unsplash.com/photo-1561758033-d89a9ad46330?auto=format&fit=crop&q=80&w=800",
    actionText: "O'tish",
    targetType: 'store',
    targetValue: 'home-food'
  },
  {
    id: 'promo-4',
    storeId: 'dori-darmon',
    title: "Dori-Darmon",
    tag: "24/7 SALOMATLIK XIZMATIDA",
    desc: "Zarur dori-darmonlarni istalgan vaqtda uyingizga yetkazamiz!",
    bg: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&q=80&w=800",
    actionText: "O'tish",
    targetType: 'store',
    targetValue: 'dori-darmon'
  }
];

export const INITIAL_PARTNERS: PopularPartner[] = [
  {
    id: 'partner-1',
    name: 'Kasbi Market',
    image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=400',
    rating: 4.8,
    deliveryTime: '',
    minOrder: 0,
    location: 'Kasbi markazi, G\'alaba ko\'chasi, 14-uy',
    storeId: 'kasbi-market'
  },
  {
    id: 'partner-2',
    name: 'Mega Market',
    image: 'https://images.unsplash.com/photo-1578916171728-46686eac8d58?auto=format&fit=crop&q=80&w=400',
    rating: 4.7,
    deliveryTime: '',
    minOrder: 0,
    location: 'Kasbi tumani, Mustaqillik shohko\'chasi, 8-uy',
    storeId: 'mega-market'
  },
  {
    id: 'partner-3',
    name: 'Home Food',
    image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&q=80&w=400',
    rating: 4.6,
    deliveryTime: '',
    minOrder: 0,
    location: 'Kasbi, Do\'stlik ko\'chasi, 2-uy',
    storeId: 'home-food'
  }
];

export const CATEGORIES: Category[] = [
  { id: 'market', name: 'Market', count: '312 do\'kon', icon: 'ShoppingBag', color: 'from-emerald-500/20 to-teal-500/10' },
  { id: 'dorixona', name: 'Dorixona', count: '85 do\'kon', icon: 'Pills', color: 'from-sky-500/20 to-indigo-500/10' },
  { id: 'fastfood', name: 'Fast Food', count: '120 do\'kon', icon: 'Flame', color: 'from-orange-500/20 to-red-500/10' },
  { id: 'oshxona', name: 'Oshxona', count: '95 do\'kon', icon: 'UtensilsCrossed', color: 'from-amber-500/20 to-yellow-500/10' },
  { id: 'restoran', name: 'Restoran', count: '60 do\'kon', icon: 'Award', color: 'from-purple-500/20 to-pink-500/10' },
  { id: 'ichimliklar', name: 'Ichimliklar', count: '40 do\'kon', icon: 'Coffee', color: 'from-cyan-500/20 to-blue-500/10' },
  { id: 'gullar', name: 'Gullar', count: '27 do\'kon', icon: 'Flower2', color: 'from-rose-500/20 to-pink-600/10' },
  { id: 'boshqalar', name: 'Boshqalar', count: 'Barcha do\'konlar', icon: 'LayoutGrid', color: 'from-gray-500/20 to-slate-500/10' },
];

export const STORES: Store[] = [
  {
    id: 'kasbi-market',
    name: 'Kasbi Market',
    rating: 4.8,
    reviewsCount: 320,
    deliveryTime: '',
    minOrder: 0,
    status: 'Ochiq',
    location: 'Kasbi markazi, G\'alaba ko\'chasi, 14-uy',
    category: 'market',
    image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=400',
    products: [
      { id: 'p1', name: 'Coca Cola 1.5L', price: 14000, image: '🥤', description: 'Klassik alkogolsiz gazlangan ichimlik, sovuq holda yetkaziladi', volume: '1.5 L' },
      { id: 'p2', name: 'Pepsi 1.5L', price: 14000, image: '🥤', description: 'Alkogolsiz tetiklashtiruvchi gazli ichimlik', volume: '1.5 L' },
      { id: 'p3', name: 'Sprite 1.5L', price: 14000, image: '🍋', description: 'Limon va laym ta\'mli shirin gazlangan ichimlik', volume: '1.5 L' },
      { id: 'p4', name: 'Fanta 1.5L', price: 14000, image: '🍊', description: 'Yorqin apelsin ta\'mli quvnoq gazli ichimlik', volume: '1.5 L' },
      { id: 'p5', name: 'Lays Chips Max', price: 17000, image: '🥔', description: 'Saralangan kartoshkalardan tayyorlangan pishloqli chips', volume: '140 g' },
      { id: 'p6', name: 'Snickers 50g', price: 7000, image: '🍫', description: 'Yong\'oqli va karamelli shokoladli batonchik', volume: '50 g' },
      { id: 'p7', name: 'Nestlé Sut 3.2%', price: 12000, image: '🥛', description: 'Tabiiy va sterillangan sigir suti', volume: '1.0 L' },
      { id: 'p8', name: 'Kasbi noni (issiq)', price: 5000, image: '🫓', description: 'Tandirdan uzilgan shirmon issiq non', volume: '1 dona' },
    ],
  },
  {
    id: 'mega-market',
    name: 'Mega Market',
    rating: 4.7,
    reviewsCount: 195,
    deliveryTime: '',
    minOrder: 0,
    status: 'Ochiq',
    location: 'Kasbi tumani, Mustaqillik shohko\'chasi, 8-uy',
    category: 'market',
    image: 'https://images.unsplash.com/photo-1578916171728-46686eac8d58?auto=format&fit=crop&q=80&w=400',
    products: [
      { id: 'p11', name: 'Coca Cola 1.5L', price: 14000, image: '🥤', description: 'Gazli tetiklantiruvchi ichimlik', volume: '1.5 L' },
      { id: 'p12', name: 'Pepsi 1.5L', price: 14000, image: '🥤', description: 'Mazali va muzdek Pepsi ichimligi', volume: '1.5 L' },
      { id: 'p13', name: 'Lays Chips Max', price: 17000, image: '🥔', description: 'Oila uchun pishloqli chips', volume: '140 g' },
      { id: 'p14', name: 'Snickers 50g', price: 7000, image: '🍫', description: 'Karamel va yong\'oqli shokolad', volume: '50 g' },
    ],
  },
  {
    id: 'home-food',
    name: 'Home Food',
    rating: 4.6,
    reviewsCount: 145,
    deliveryTime: '',
    minOrder: 0,
    status: 'Ochiq',
    location: 'Kasbi, Do\'stlik ko\'chasi, 2-uy',
    category: 'fastfood',
    image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&q=80&w=400',
    products: [
      { id: 'p21', name: 'Shaurma Big', price: 28000, image: '🌯', description: 'Tovuq go\'shti, ketchup, mayonez va yangi sabzavotlar', volume: '350 g' },
      { id: 'p22', name: 'Burger Classic', price: 25000, image: '🍔', description: 'Yumshoq bulochka, mol go\'shtidan kotlet, pishloq va pomidor', volume: '250 g' },
      { id: 'p23', name: 'Hot Dog Lavash', price: 18000, image: '🌭', description: 'Sosiska, sosiska sousi va yangi salatlar lavash xamirida', volume: '200 g' },
      { id: 'p24', name: 'Kartoshka Fri', price: 12000, image: '🍟', description: 'Qarsildoq oltinrang kartoshka fri', volume: '150 g' },
    ],
  },
  {
    id: 'dori-darmon',
    name: 'Dori-Darmon',
    rating: 4.9,
    reviewsCount: 512,
    deliveryTime: '',
    minOrder: 0,
    status: 'Ochiq',
    location: 'Kasbi tumani, Shifokorlar ko\'chasi, 1-bino',
    category: 'dorixona',
    image: 'https://images.unsplash.com/photo-1586015555751-63bb77f4322a?auto=format&fit=crop&q=80&w=400',
    products: [
      { id: 'p31', name: 'Paracetamol 500mg', price: 2000, image: '💊', description: 'Isitmani tushiruvchi va og\'riq qoldiruvchi dori vositasi', volume: '10 tabletka' },
      { id: 'p32', name: 'Vitamin C 500mg', price: 15000, image: '🍋', description: 'Immun tizimini mustahkamlovchi askorbin kislotasi', volume: '20 ta' },
      { id: 'p33', name: 'Kardio-magnil', price: 22000, image: '❤️', description: 'Yurak qon-tomir tizimi faoliyatini yaxshilash uchun', volume: '30 tabletka' },
      { id: 'p34', name: 'Nurofen Bolalar uchun', price: 34000, image: '🧪', description: 'Og\'riq qoldiruvchi va haroratni pasaytiruvchi sirop', volume: '150 ml' },
    ],
  },
  {
    id: 'gosht-house',
    name: 'Go\'sht House',
    rating: 4.8,
    reviewsCount: 88,
    deliveryTime: '',
    minOrder: 0,
    status: 'Ochiq',
    location: 'Kasbi Dehqon bozori ro\'parasi, 4-do\'kon',
    category: 'oshxona',
    image: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&q=80&w=400',
    products: [
      { id: 'p41', name: 'Chayxona Palov (0.5kg)', price: 35000, image: '🍛', description: 'Kasbi guruchidan, qo\'y go\'shti va zira bilan tayyorlangan milliy taom', volume: '500 g' },
      { id: 'p42', name: 'Tandir Somsa', price: 10000, image: '🥟', description: 'Qarsildoq xamir, maydalangan mol go\'shti va piyoz bilan', volume: '1 dona' },
      { id: 'p43', name: 'Shashlik Mol Go\'shtidan', price: 16000, image: '🍢', description: 'Ko\'mirda pishirilgan yumshoq va marinadlangan mol go\'shti', volume: '1 bitta' },
      { id: 'p44', name: 'Qozon Kabob', price: 42000, image: '🥘', description: 'Qozonda pishirilgan qo\'y go\'shti va oltinrang kartoshkalar', volume: '400 g' },
    ],
  },
  {
    id: 'gullar-saloni',
    name: 'Kasbi Gullar Dunyosi',
    rating: 4.9,
    reviewsCount: 64,
    deliveryTime: '',
    minOrder: 0,
    status: 'Ochiq',
    location: 'Kasbi tumani, San\'atkorlar ko\'chasi, 12-uy',
    category: 'gullar',
    image: 'https://images.unsplash.com/photo-1526047932273-341f2a7631f9?auto=format&fit=crop&q=80&w=400',
    products: [
      { id: 'p51', name: 'Atorgul Qizil (Premium)', price: 15000, image: '🌹', description: 'Yangi kesilgan yirik golland atorguli', volume: '1 dona' },
      { id: 'p52', name: 'Mix Buket "Bahor"', price: 120000, image: '💐', description: 'Turli xil gullardan iborat nafis bayramona guldasta', volume: 'O\'rtacha' },
      { id: 'p53', name: 'Oq Atorgullar (Buket)', price: 180000, image: '💮', description: '15 dona oppoq va nozik atorgullar to\'plami', volume: 'Katta guldasta' },
    ],
  }
];

export const INITIAL_COURIERS = [
  { id: 'KG-1001', name: 'Islom Karimov', phone: '+998 90 123 45 67', password: 'password1001', balance: 0, isOnline: false, isBlocked: false, transport: 'Yuk mototsikli' as const, plate: '01 A 123 BC', rating: 5.0, ratingCount: 0, ordersCount: 0, addedDate: '2024-05-10 10:30', verified: true },
  { id: 'KG-1002', name: 'Jahongir Ortiqov', phone: '+998 91 987 65 43', password: 'password1002', balance: 0, isOnline: false, isBlocked: false, transport: 'Velosiped' as const, plate: '-', rating: 5.0, ratingCount: 0, ordersCount: 0, addedDate: '2024-05-12 14:20', verified: true },
  { id: 'KG-1003', name: 'Akmal Rustamov', phone: '+998 93 456 78 90', password: 'password1003', balance: 0, isOnline: false, isBlocked: false, transport: 'Skuter' as const, plate: '01 B 456 CD', rating: 5.0, ratingCount: 0, ordersCount: 0, addedDate: '2024-05-15 09:15', verified: true },
  { id: 'KG-1004', name: 'Shoxrux Mirzayev', phone: '+998 94 321 54 76', password: 'password1004', balance: 0, isOnline: false, isBlocked: false, transport: 'Yengil avtomobil' as const, plate: '01 D 789 EF', rating: 5.0, ratingCount: 0, ordersCount: 0, addedDate: '2024-05-18 16:45', verified: true },
  { id: 'KG-1005', name: 'Otabek Yusupov', phone: '+998 97 654 32 10', password: 'password1005', balance: 0, isOnline: false, isBlocked: false, transport: 'Yuk avtomobili (Labo)' as const, plate: '01 LABO 01', rating: 5.0, ratingCount: 0, ordersCount: 0, addedDate: '2024-05-20 11:30', verified: true },
  { id: 'KG-1006', name: 'Azizbek Qodirov', phone: '+998 99 111 22 33', password: 'password1006', balance: 0, isOnline: false, isBlocked: true, transport: 'Yuk mototsikli' as const, plate: '01 E 321 GH', rating: 5.0, ratingCount: 0, ordersCount: 0, addedDate: '2024-05-22 13:10', verified: false },
];

export const INITIAL_DELIVERY_ZONES: DeliveryZone[] = [
  {
    id: 'zone-1',
    zoneName: "Markaz",
    distanceLabel: "2 km",
    name: "Markaz (2 km)",
    distance: "2 km",
    price: 10000,
    mahallas: ["Oqqamish", "Tinchlik", "Mug'lon", "Xo'jakasbi", "Do'stlik"]
  },
  {
    id: 'zone-2',
    zoneName: "Markaz atrofi",
    distanceLabel: "4 km",
    name: "Markaz atrofi (4 km)",
    distance: "4 km",
    price: 15000,
    mahallas: ["Qoratepa", "Xitoy", "Toshquduq", "Xo'jaxitoy", "Ravot", "Qo'riq", "Yangi Do'stlik"]
  },
  {
    id: 'zone-3',
    zoneName: "Markaz cheti",
    distanceLabel: "7 km",
    name: "Markaz cheti (7 km)",
    distance: "7 km",
    price: 20000,
    mahallas: ["Jizza", "Kasbi", "Do'rmon", "Shakarjo'y", "Chimqo'rg'on"]
  },
  {
    id: 'zone-4',
    zoneName: "Markazdan uzoq",
    distanceLabel: "10 km",
    name: "Markazdan uzoq (10 km)",
    distance: "10 km",
    price: 25000,
    mahallas: ["Qoraxo'ja", "Kiyikchi", "Mustaqilobod", "Qorako'ng'irot"]
  },
  {
    id: 'zone-5',
    zoneName: "Olis hudud",
    distanceLabel: "10 km+",
    name: "Olis hudud (10 km+)",
    distance: "10 km+",
    price: 30000,
    mahallas: ["G'alaba", "Komilon", "Mesit", "Xo'jahayron", "Talishbe", "Qamashi", "Denov", "Pandiron", "Talliyulg'in", "Qatag'on", "Maymanoq", "Baydoqchi", "O'yrot", "Chovqay", "Qozoq", "Xo'jaqarliq", "Fazli", "Nazartepa"]
  }
];

