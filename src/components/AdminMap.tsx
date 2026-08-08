/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Compass, 
  Navigation, 
  Search, 
  Maximize2, 
  Minimize2, 
  RefreshCw,
  Play,
  Pause,
  Locate,
  Eye,
  CheckCircle2,
  Clock,
  Phone,
  Layers
} from 'lucide-react';
import { Order, Store, Courier } from '../types';

interface AdminMapProps {
  orders: Order[];
  stores: Store[];
  courierName: string;
  isCourierOnline: boolean;
  courierPhone: string;
  courierCoords?: { latitude: number; longitude: number } | null;
  couriers?: Courier[];
}

export const AdminMap: React.FC<AdminMapProps> = ({
  orders,
  stores,
  courierName,
  isCourierOnline,
  courierPhone,
  courierCoords,
  couriers = []
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [isPlayingAnimation, setIsPlayingAnimation] = useState(false);
  const [animSpeed, setAnimSpeed] = useState<number>(1);
  const [mapLayerType, setMapLayerType] = useState<'satellite' | 'street'>('satellite'); // Default Satellite HD

  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [mapLoadError, setMapLoadError] = useState(false);

  const mapRef = useRef<any>(null);
  const tileLayerRef = useRef<any>(null);
  const labelsLayerRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<Record<string, any>>({});
  const polylineRef = useRef<Record<string, any>>({});
  const progressMapRef = useRef<Record<string, number>>({});
  const animationFrameRef = useRef<number | null>(null);

  // Active non-delivered real orders (delivered orders automatically disappear)
  const activeOrders = useMemo(() => {
    return orders.filter(o => o.status !== 'Yetkazildi' && o.status !== 'Bekor qilindi');
  }, [orders]);

  // Online active couriers list (only online couriers are displayed)
  const activeCouriersList = useMemo(() => {
    if (couriers && couriers.length > 0) {
      return couriers.filter(c => c.isOnline && !c.isBlocked);
    }
    return isCourierOnline ? [
      {
        id: 'c-main',
        name: courierName || 'Islom Karimov',
        phone: courierPhone || '+998 90 123 45 67',
        balance: 100000,
        isOnline: true,
        isBlocked: false,
        transport: 'Skuter' as const,
        plate: '01 A 777 BB',
        rating: 5.0,
        ratingCount: 120,
        ordersCount: 45
      }
    ] : [];
  }, [couriers, courierName, courierPhone, isCourierOnline]);

  // Real Courier Starting Location (GPS)
  const realCourierStartLat = courierCoords?.latitude || 38.8351;
  const realCourierStartLng = courierCoords?.longitude || 65.3621;

  // Build Courier HTML Badge
  const buildCourierHtml = (assignedCourierName: string, cleanOrderId: string, progress: number) => {
    const isAtDestination = progress >= 0.98;
    const isAtStart = progress <= 0.02;

    let badgeText = `${assignedCourierName}`;
    let statusIcon = '🚴';
    let badgeBg = 'bg-emerald-600 border-emerald-300 animate-pulse';

    if (isAtDestination) {
      badgeText = `🎯 ${assignedCourierName} — Manzilda Yetib Kelgan!`;
      statusIcon = '📍';
      badgeBg = 'bg-rose-600 border-rose-300 animate-bounce shadow-rose-900/50';
    } else if (isAtStart) {
      badgeText = `🚴 ${assignedCourierName} — Boshlang'ich GPS Bazasida`;
      statusIcon = '🛰️';
      badgeBg = 'bg-indigo-600 border-indigo-300';
    } else {
      badgeText = `🚴 ${assignedCourierName} — Manzilga Harakatlanmoqda (${Math.round(progress * 100)}%)`;
      statusIcon = '🚴';
      badgeBg = 'bg-emerald-600 border-emerald-300 animate-pulse';
    }

    return `
      <div class="flex flex-col items-center select-none cursor-pointer transform -translate-x-1/2 -translate-y-full">
        <div class="${badgeBg} text-white font-black text-[11px] px-3 py-1.5 rounded-full shadow-2xl border-2 flex items-center space-x-1.5 whitespace-nowrap transition-all duration-300">
          <span class="text-sm">${statusIcon}</span>
          <span class="text-amber-200 font-extrabold">${badgeText}</span>
          <span class="opacity-50">|</span>
          <span class="bg-black/30 px-1.5 py-0.5 rounded text-[10px] font-mono">#${cleanOrderId}</span>
        </div>
        <div class="w-2.5 h-2.5 bg-black/80 transform rotate-45 border-r border-b border-white -mt-1.5"></div>
      </div>
    `;
  };

  // Switch Tile Layer between Satellite & Street
  const updateMapTileLayer = () => {
    const L = (window as any).L;
    if (!L || !mapRef.current) return;

    if (tileLayerRef.current) {
      mapRef.current.removeLayer(tileLayerRef.current);
    }
    if (labelsLayerRef.current) {
      mapRef.current.removeLayer(labelsLayerRef.current);
    }

    if (mapLayerType === 'satellite') {
      // Esri World Imagery HD Satellite
      tileLayerRef.current = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: '&copy; Esri, Maxar, Earthstar Geographics, Yandex Satellite',
        maxZoom: 19
      }).addTo(mapRef.current);

      // Hybrid Labels Overlay
      labelsLayerRef.current = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}', {
        maxZoom: 19
      }).addTo(mapRef.current);
    } else {
      // CartoDB Voyager Light / Yandex Schema
      tileLayerRef.current = L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; Yandex Maps &copy; OpenStreetMap contributors &copy; CARTO',
        subdomains: 'abcd',
        maxZoom: 20
      }).addTo(mapRef.current);
    }
  };

  useEffect(() => {
    if (mapRef.current) {
      updateMapTileLayer();
    }
  }, [mapLayerType]);

  // Leaflet init effect
  useEffect(() => {
    let isMounted = true;
    const existingLink = document.getElementById('leaflet-css');
    const existingScript = document.getElementById('leaflet-js');

    const initLeafletMap = () => {
      const L = (window as any).L;
      if (!L || !containerRef.current || !isMounted) return;

      if (mapRef.current) {
        try {
          mapRef.current.remove();
        } catch (e) {
          console.error(e);
        }
        mapRef.current = null;
      }

      const map = L.map(containerRef.current, {
        zoomControl: false
      }).setView([realCourierStartLat, realCourierStartLng], 15);
      
      mapRef.current = map;

      L.control.zoom({ position: 'topright' }).addTo(map);

      updateMapTileLayer();

      markersRef.current = {};
      polylineRef.current = {};

      activeOrders.forEach((order) => {
        const cleanOrderId = order.id.replace('KG-', '');

        // Customer real delivery destination address
        const custLat = order.address.latitude || (realCourierStartLat + 0.008);
        const custLng = order.address.longitude || (realCourierStartLng + 0.008);

        // Courier real start address (courierCoords GPS)
        const startLat = realCourierStartLat;
        const startLng = realCourierStartLng;

        // Progress defaults to 1.0 (Exact customer location arrival)
        if (progressMapRef.current[order.id] === undefined) {
          progressMapRef.current[order.id] = 1.0; 
        }
        const currentProgress = progressMapRef.current[order.id];

        // 1. Customer Destination Marker
        const custHtml = `
          <div class="flex flex-col items-center select-none cursor-pointer transform -translate-x-1/2 -translate-y-full">
            <div class="bg-rose-600 hover:bg-rose-700 text-white font-black text-[11px] px-3 py-1.5 rounded-full shadow-2xl border-2 border-white flex items-center space-x-1.5 whitespace-nowrap transition-transform duration-200 hover:scale-105">
              <span class="text-xs">📍</span>
              <span>Buyurtma #${cleanOrderId} (Mijoz Manzili)</span>
            </div>
            <div class="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] border-t-rose-600 -mt-[1px]"></div>
          </div>
        `;

        const custIcon = L.divIcon({
          html: custHtml,
          className: 'custom-yandex-order-icon',
          iconSize: [180, 45],
          iconAnchor: [90, 45]
        });

        const custMarker = L.marker([custLat, custLng], { icon: custIcon })
          .addTo(map)
          .bindPopup(`
            <div class="p-2 font-sans text-xs">
              <div class="font-extrabold text-rose-600 uppercase text-sm mb-1">📍 Mijoz Manzili: ${order.customerName}</div>
              <div class="font-bold text-slate-800 mb-0.5">Buyurtma ID: #${order.id}</div>
              <div class="text-slate-600 font-medium">Mahalla: ${order.address.mahalla}</div>
              <div class="text-slate-600 font-medium">Telefon: ${order.customerPhone}</div>
            </div>
          `);
        markersRef.current[`cust-${order.id}`] = custMarker;

        // 2. Courier Marker positioned directly from Courier GPS -> Customer Destination
        const assignedCourierName = order.courierName || courierName || 'Islom Karimov';

        const currentLat = startLat + (custLat - startLat) * currentProgress;
        const currentLng = startLng + (custLng - startLng) * currentProgress;

        const courierHtml = buildCourierHtml(assignedCourierName, cleanOrderId, currentProgress);

        const courierIcon = L.divIcon({
          html: courierHtml,
          className: 'custom-yandex-courier-icon',
          iconSize: [280, 48],
          iconAnchor: [140, 48]
        });

        const courierMarker = L.marker([currentLat, currentLng], { icon: courierIcon })
          .addTo(map)
          .bindPopup(`
            <div class="p-2 font-sans text-xs">
              <div class="font-extrabold text-emerald-600 uppercase text-sm mb-1">🚴 Kuryer: ${assignedCourierName}</div>
              <div class="font-bold text-slate-800">Buyurtma: #${order.id}</div>
              <div class="text-emerald-700 font-bold mt-1">
                ${currentProgress >= 0.98 ? '📍 Mijoz Manzilida Yetib Kelgan!' : '🚴 Real Vaqtda Harakatlanmoqda...'}
              </div>
            </div>
          `);
        markersRef.current[`courier-${order.id}`] = courierMarker;

        // 3. Direct Route Line from Courier Real GPS Location -> Customer Address
        const polyline = L.polyline([
          [startLat, startLng],
          [currentLat, currentLng],
          [custLat, custLng]
        ], {
          color: '#fbbf24', // Amber navigation line
          weight: 5,
          dashArray: '6, 8',
          opacity: 0.95
        }).addTo(map);
        polylineRef.current[`line-${order.id}`] = polyline;
      });

      // Render standalone online couriers (only online couriers stay on map)
      activeCouriersList.forEach((c) => {
        const isAlreadyPlotted = activeOrders.some(o => o.courierName === c.name || o.courierPhone === c.phone);
        if (!isAlreadyPlotted) {
          const courierHtml = `
            <div class="flex flex-col items-center select-none cursor-pointer transform -translate-x-1/2 -translate-y-full">
              <div class="bg-emerald-600 border-2 border-emerald-300 text-white font-black text-[11px] px-3 py-1.5 rounded-full shadow-2xl flex items-center space-x-1.5 whitespace-nowrap animate-pulse">
                <span class="text-sm">🚴</span>
                <span class="text-amber-200 font-extrabold">${c.name} — Onlayn (Bo'sh)</span>
              </div>
              <div class="w-2.5 h-2.5 bg-black/80 transform rotate-45 border-r border-b border-white -mt-1.5"></div>
            </div>
          `;
          const courierIcon = L.divIcon({
            html: courierHtml,
            className: 'custom-yandex-courier-icon',
            iconSize: [240, 48],
            iconAnchor: [120, 48]
          });
          const cLat = realCourierStartLat;
          const cLng = realCourierStartLng;
          const cMarker = L.marker([cLat, cLng], { icon: courierIcon })
            .addTo(map)
            .bindPopup(`
              <div class="p-2 font-sans text-xs">
                <div class="font-extrabold text-emerald-600 uppercase text-sm mb-1">🚴 ${c.name}</div>
                <div class="font-bold text-slate-800">Holati: Onlayn (Yangi buyurtma kutilmoqda)</div>
                <div class="text-slate-600 mt-0.5">Telefon: ${c.phone}</div>
              </div>
            `);
          markersRef.current[`standalone-courier-${c.id}`] = cMarker;
        }
      });

      const allMarkersGroup = Object.values(markersRef.current);
      if (allMarkersGroup.length > 0) {
        try {
          const group = L.featureGroup(allMarkersGroup);
          map.fitBounds(group.getBounds().pad(0.18));
        } catch (e) {}
      }

      setIsMapLoaded(true);
      setMapLoadError(false);
    };

    if (!existingLink) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      link.id = 'leaflet-css';
      document.head.appendChild(link);
    }

    if ((window as any).L) {
      initLeafletMap();
    } else if (!existingScript) {
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.id = 'leaflet-js';
      script.onload = () => {
        initLeafletMap();
      };
      script.onerror = () => {
        setMapLoadError(true);
      };
      document.body.appendChild(script);
    } else {
      existingScript.addEventListener('load', initLeafletMap);
    }

    const safetyTimer = setTimeout(() => {
      if ((window as any).L && !mapRef.current) {
        initLeafletMap();
      } else if (!(window as any).L) {
        const scriptFallback = document.createElement('script');
        scriptFallback.src = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.js';
        scriptFallback.onload = () => {
          initLeafletMap();
        };
        scriptFallback.onerror = () => {
          setMapLoadError(true);
        };
        document.body.appendChild(scriptFallback);
      }
    }, 1500);

    return () => {
      isMounted = false;
      clearTimeout(safetyTimer);
      if (mapRef.current) {
        try {
          mapRef.current.remove();
        } catch (e) {}
        mapRef.current = null;
      }
    };
  }, [activeOrders.length, realCourierStartLat, realCourierStartLng, courierName]);

  // Movement animation directly from Courier GPS -> Customer Address
  useEffect(() => {
    if (!isPlayingAnimation || activeOrders.length === 0) return;

    let lastTime = performance.now();

    const animateLoop = (now: number) => {
      const delta = (now - lastTime) / 1000;
      lastTime = now;

      let allReached = true;

      activeOrders.forEach((order) => {
        const L = (window as any).L;
        const cleanOrderId = order.id.replace('KG-', '');
        const assignedCourierName = order.courierName || courierName || 'Islom Karimov';

        const custLat = order.address.latitude || (realCourierStartLat + 0.008);
        const custLng = order.address.longitude || (realCourierStartLng + 0.008);

        const startLat = realCourierStartLat;
        const startLng = realCourierStartLng;

        const currentProgress = progressMapRef.current[order.id] !== undefined ? progressMapRef.current[order.id] : 1.0;

        if (currentProgress < 1.0) {
          allReached = false;
          const step = 0.06 * delta * animSpeed;
          let nextProgress = Math.min(1.0, currentProgress + step);
          progressMapRef.current[order.id] = nextProgress;

          const currentLat = startLat + (custLat - startLat) * nextProgress;
          const currentLng = startLng + (custLng - startLng) * nextProgress;

          const courierMarker = markersRef.current[`courier-${order.id}`];
          if (courierMarker && L) {
            courierMarker.setLatLng([currentLat, currentLng]);

            const newIcon = L.divIcon({
              html: buildCourierHtml(assignedCourierName, cleanOrderId, nextProgress),
              className: 'custom-yandex-courier-icon',
              iconSize: [280, 48],
              iconAnchor: [140, 48]
            });
            courierMarker.setIcon(newIcon);
          }

          const polyline = polylineRef.current[`line-${order.id}`];
          if (polyline) {
            polyline.setLatLngs([
              [startLat, startLng],
              [currentLat, currentLng],
              [custLat, custLng]
            ]);
          }
        }
      });

      if (allReached) {
        setIsPlayingAnimation(false);
      } else {
        animationFrameRef.current = requestAnimationFrame(animateLoop);
      }
    };

    animationFrameRef.current = requestAnimationFrame(animateLoop);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlayingAnimation, activeOrders, animSpeed, courierName, realCourierStartLat, realCourierStartLng]);

  // Set courier progress directly
  const setCourierProgress = (orderId: string, progress: number) => {
    progressMapRef.current[orderId] = progress;
    const L = (window as any).L;

    const order = activeOrders.find(o => o.id === orderId);
    if (!order) return;

    const cleanOrderId = order.id.replace('KG-', '');
    const assignedCourierName = order.courierName || courierName || 'Islom Karimov';

    const custLat = order.address.latitude || (realCourierStartLat + 0.008);
    const custLng = order.address.longitude || (realCourierStartLng + 0.008);

    const startLat = realCourierStartLat;
    const startLng = realCourierStartLng;

    const currentLat = startLat + (custLat - startLat) * progress;
    const currentLng = startLng + (custLng - startLng) * progress;

    const courierMarker = markersRef.current[`courier-${order.id}`];
    if (courierMarker && L) {
      courierMarker.setLatLng([currentLat, currentLng]);

      const newIcon = L.divIcon({
        html: buildCourierHtml(assignedCourierName, cleanOrderId, progress),
        className: 'custom-yandex-courier-icon',
        iconSize: [280, 48],
        iconAnchor: [140, 48]
      });
      courierMarker.setIcon(newIcon);
    }

    const polyline = polylineRef.current[`line-${order.id}`];
    if (polyline) {
      polyline.setLatLngs([
        [startLat, startLng],
        [currentLat, currentLng],
        [custLat, custLng]
      ]);
    }

    if (mapRef.current) {
      mapRef.current.setView([currentLat, currentLng], 16, { animate: true });
    }
  };

  const handleFocusOrder = (orderId: string) => {
    setSelectedOrderId(orderId);
    const order = activeOrders.find(o => o.id === orderId);
    if (!order || !mapRef.current) return;

    const custLat = order.address.latitude || realCourierStartLat;
    const custLng = order.address.longitude || realCourierStartLng;
    mapRef.current.setView([custLat, custLng], 16, { animate: true });

    const marker = markersRef.current[`cust-${order.id}`];
    if (marker) {
      marker.openPopup();
    }
  };

  const filteredOrders = useMemo(() => {
    return activeOrders.filter(o => 
      o.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.address.mahalla.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [activeOrders, searchTerm]);

  return (
    <div className={`grid grid-cols-1 xl:grid-cols-4 gap-6 items-stretch ${isFullScreen ? 'fixed inset-0 z-50 bg-slate-900 p-6 overflow-auto' : ''}`}>
      
      <style>{`
        .custom-yandex-order-icon, 
        .custom-yandex-courier-icon {
          background: transparent !important;
          border: none !important;
        }
      `}</style>

      {/* MAP VIEW CANVAS (3 Cols) */}
      <div className="xl:col-span-3 bg-white border border-slate-200 rounded-[32px] p-5 flex flex-col relative overflow-hidden shadow-xl min-h-[580px]">
        
        {/* Map Header Controls */}
        <div className="flex flex-wrap justify-between items-center mb-4 gap-3 z-10 border-b border-slate-100 pb-3">
          
          <div className="flex items-center space-x-3">
            <div className="px-3 py-1.5 rounded-2xl bg-amber-400 text-slate-950 font-black text-xs shadow-sm flex items-center space-x-1.5 border border-amber-500/30">
              <span className="text-sm">🛰️</span>
              <span className="tracking-wide uppercase">Sun'iy Yo'ldosh GPS Xaritasi</span>
            </div>
            <div>
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 flex items-center space-x-2">
                <span>Real Vaqtdagi Kuryer GPS & Mijoz Manzili</span>
                <span className="text-[9px] bg-rose-100 text-rose-800 font-bold px-2 py-0.5 rounded-full border border-rose-300">
                  🎯 Manzilda Yetib Kelgan
                </span>
              </h3>
              <p className="text-[10px] text-slate-500 font-bold block">
                Boshlang'ich manzil — kuryerning real GPS lokatsiyasi. Mijoz manzilida kuryer va buyurtma raqami ustma-ust ko'rinadi.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setMapLayerType(prev => prev === 'satellite' ? 'street' : 'satellite')}
              className="px-3 py-1.5 rounded-xl bg-slate-900 text-white hover:bg-slate-800 text-[10px] font-black uppercase transition-all border border-slate-700 flex items-center space-x-1.5 cursor-pointer shadow-sm"
              title="Xarita ko'rinishini almashtirish"
            >
              <Layers className="h-3.5 w-3.5 text-amber-400" />
              <span>{mapLayerType === 'satellite' ? "🛰️ Sun'iy Yo'ldosh" : '🗺️ Sxema Xarita'}</span>
            </button>

            <button
              onClick={() => {
                if (!isPlayingAnimation) {
                  activeOrders.forEach(o => {
                    if ((progressMapRef.current[o.id] || 1) >= 0.98) {
                      progressMapRef.current[o.id] = 0.05;
                    }
                  });
                }
                setIsPlayingAnimation(!isPlayingAnimation);
              }}
              className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase transition-all flex items-center space-x-1 cursor-pointer border ${
                isPlayingAnimation 
                  ? 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100' 
                  : 'bg-emerald-600 text-white border-emerald-700 hover:bg-emerald-700'
              }`}
            >
              {isPlayingAnimation ? (
                <>
                  <Pause className="h-3 w-3 text-amber-700" />
                  <span>To'xtatish</span>
                </>
              ) : (
                <>
                  <Play className="h-3 w-3 text-white" />
                  <span>Kuryerni Harakatlantirish</span>
                </>
              )}
            </button>

            <button
              onClick={() => {
                if (mapRef.current) {
                  const allMarkersGroup = Object.values(markersRef.current);
                  if (allMarkersGroup.length > 0) {
                    const L = (window as any).L;
                    const group = L.featureGroup(allMarkersGroup);
                    mapRef.current.fitBounds(group.getBounds().pad(0.18));
                  }
                }
              }}
              className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-black uppercase transition-all border border-slate-300 flex items-center space-x-1 cursor-pointer"
              title="Xaritani markazlashtirish"
            >
              <RefreshCw className="h-3 w-3 text-slate-600" />
              <span>Markazlashtirish</span>
            </button>

            <button
              onClick={() => setIsFullScreen(!isFullScreen)}
              className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all border border-slate-300 cursor-pointer"
            >
              {isFullScreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Live Leaflet Map Container */}
        <div 
          ref={containerRef} 
          className="flex-1 bg-slate-900 rounded-2xl border border-slate-200 relative overflow-hidden min-h-[440px] shadow-inner"
        >
          {!isMapLoaded && !mapLoadError && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center text-slate-700 text-xs font-bold font-mono bg-white/95 p-4">
              <RefreshCw className="h-6 w-6 text-amber-500 animate-spin mb-2" />
              <span>🛰️ Sun'iy Yo'ldosh GPS Xaritasi yuklanmoqda...</span>
            </div>
          )}

          {mapLoadError && (
            <iframe
              title="Yandex Navigatsiya Satellite Fallback"
              width="100%"
              height="100%"
              style={{ border: 0 }}
              src={`https://yandex.ru/map-widget/v1/?ll=${realCourierStartLng}%2C${realCourierStartLat}&z=15&l=sat%2Cskl`}
              allowFullScreen
              loading="lazy"
              className="w-full h-full relative z-10"
            />
          )}
        </div>

        {/* Bottom Bar Legend */}
        <div className="mt-3.5 flex flex-wrap items-center justify-between text-[10px] font-bold text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-200 gap-2">
          <div className="flex items-center space-x-4">
            <span className="flex items-center space-x-1">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-600 inline-block animate-ping"></span>
              <span>📍 Kuryer Manzilda Yetib Kelgan (#Buyurtma)</span>
            </span>
            <span className="flex items-center space-x-1">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 inline-block"></span>
              <span>🚴 Kuryer Real Joylashuvi (GPS)</span>
            </span>
          </div>
          <div className="text-slate-500 font-mono text-[9px]">
            Boshlang'ich Nuqta: Kuryerning Aniq GPS Koordinatasi 📡
          </div>
        </div>

      </div>

      {/* ORDERS & COURIERS SIDEBAR */}
      <div className="bg-white border border-slate-200 rounded-[32px] p-5 flex flex-col space-y-4 shadow-xl">
        
        <div>
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 mb-1 flex items-center justify-between">
            <span>Xaritadagi Buyurtmalar</span>
            <span className="bg-rose-100 text-rose-800 px-2 py-0.5 rounded-full text-[10px] font-extrabold">
              {activeOrders.length} ta faol
            </span>
          </h3>
          <p className="text-[10px] text-slate-500 font-semibold leading-relaxed">
            Kuryer real GPS koordinatadan mijozning aniq manziliga qarab harakatlanadi.
          </p>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Buyurtma ID, mijoz, mahalla..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
        </div>

        <div className="flex-1 overflow-y-auto space-y-2.5 max-h-[360px] xl:max-h-[500px] pr-1">
          {filteredOrders.length === 0 ? (
            <div className="p-6 text-center text-slate-400 text-xs font-bold bg-slate-50 rounded-2xl border border-dashed border-slate-200">
              Faol buyurtmalar topilmadi 📦
            </div>
          ) : (
            filteredOrders.map((order) => {
              const isSelected = selectedOrderId === order.id;
              const cleanOrderId = order.id.replace('KG-', '');
              const assignedCourier = order.courierName || courierName || 'Islom Karimov';
              const currentProgress = progressMapRef.current[order.id] !== undefined ? progressMapRef.current[order.id] : 1.0;
              const isAtDestination = currentProgress >= 0.98;

              return (
                <div
                  key={`map-sidebar-order-${order.id}`}
                  onClick={() => handleFocusOrder(order.id)}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-amber-50 border-amber-400 shadow-md ring-1 ring-amber-400'
                      : 'bg-slate-50 hover:bg-slate-100 border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-extrabold text-xs text-rose-600 bg-rose-50 px-2 py-0.5 rounded-lg border border-rose-200">
                      📍 Buyurtma #{cleanOrderId}
                    </span>
                    <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded ${
                      isAtDestination ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
                    }`}>
                      {isAtDestination ? '🎯 Manzilda Yetib Kelgan' : order.status}
                    </span>
                  </div>

                  <div className="text-xs font-black text-slate-800 truncate mb-1">
                    Mijoz: {order.customerName}
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-slate-500 font-semibold mb-2">
                    <span className="truncate">🏠 Mahalla: {order.address.mahalla}</span>
                    <span className="shrink-0 font-bold text-slate-700">
                      {order.totalAmount ? `${order.totalAmount.toLocaleString()} so'm` : ''}
                    </span>
                  </div>

                  <div className="pt-2 border-t border-slate-200 space-y-2">
                    <div className="flex items-center justify-between text-[9px]">
                      <span className="text-emerald-700 font-bold flex items-center space-x-1">
                        <span>🚴</span>
                        <span>{assignedCourier}</span>
                      </span>
                      <span className="font-mono font-black text-slate-600 bg-slate-200 px-1.5 py-0.5 rounded">
                        {isAtDestination ? '🎯 100% Manzilda' : `${Math.round(currentProgress * 100)}% Yo'lda`}
                      </span>
                    </div>

                    <div className="flex items-center space-x-1.5">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setCourierProgress(order.id, 1.0);
                        }}
                        className={`flex-1 py-1 rounded-lg text-[9px] font-black uppercase transition-all cursor-pointer border ${
                          isAtDestination 
                            ? 'bg-rose-600 text-white border-rose-700 shadow-sm' 
                            : 'bg-slate-200 text-slate-700 border-slate-300 hover:bg-rose-50 hover:text-rose-700'
                        }`}
                        title="Kuryerni mijozning aniq manziliga joylashtirish"
                      >
                        🎯 Manzilida (100%)
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setCourierProgress(order.id, 0.05);
                          setIsPlayingAnimation(true);
                        }}
                        className="flex-1 py-1 rounded-lg bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-[9px] uppercase transition-all border border-amber-500 cursor-pointer"
                        title="Kuryerni real GPS joylashuvidan harakatlantirish"
                      >
                        🚴 Harakatlantirish
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-1.5">
          <div className="flex items-center justify-between text-[10px] font-black uppercase text-slate-600">
            <span>🛰️ Real GPS Baza:</span>
            <span className="text-emerald-600">{activeCouriersList.length} kuryer ulangan</span>
          </div>
          <div className="text-[10px] text-slate-500 font-medium">
            Boshlang'ich nuqta kuryerning jonli GPS joylashuvidan olinadi va real vaqtda yangilanib boradi.
          </div>
        </div>

      </div>

    </div>
  );
};
