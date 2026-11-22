import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import {
  BusVehicle,
  TransitStop,
  WalkingRouteResult,
  DirectWalkResult,
  CrowdAlert,
} from '../data/klangValleyData';

interface KlangValleyMapProps {
  buses: BusVehicle[];
  stops: TransitStop[];
  nearestStopIds: string[];
  selectedBusId: string | null;
  selectedStopId: string | null;
  clickedOrigin: [number, number] | null;
  destinationPoint: [number, number] | null;
  walkingRoute: WalkingRouteResult | null;
  lastMileRoute: WalkingRouteResult | null;
  isShortWalk: boolean;
  directWalkRoute: DirectWalkResult | null;
  transitRouteLabel: string | null;
  alerts: CrowdAlert[];
  darkTiles: boolean;
  showStops: boolean;
  simulateMode: boolean;
  onSelectBus: (busId: string) => void;
  onSelectStop: (stopId: string) => void;
  onMapClick: (lat: number, lng: number) => void;
  onOriginDragEnd: (lat: number, lng: number) => void;
  onDestinationDragEnd: (lat: number, lng: number) => void;
  registerFlyTo: (fn: (lat: number, lng: number, zoom?: number) => void) => void;
}

const OSM_TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';

// Initial center balanced cleanly between KL Sentral and Bukit Bintang / KLCC
const INITIAL_MAP_CENTER: [number, number] = [3.1422, 101.6988];

// Gentle curved arc between Stop A and Stop B so the solid emerald transit line reads cleanly
function createCurvedArcCoords(
  from: [number, number],
  to: [number, number],
  steps = 28
): [number, number][] {
  const [lat1, lng1] = from;
  const [lat2, lng2] = to;
  const dLat = lat2 - lat1;
  const dLng = lng2 - lng1;
  const dist = Math.hypot(dLat, dLng);

  if (dist < 0.0002) {
    return [from, to];
  }

  const midLat = (lat1 + lat2) / 2;
  const midLng = (lng1 + lng2) / 2;
  const ctrlLat = midLat - dLng * 0.12;
  const ctrlLng = midLng + dLat * 0.12;

  const pts: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const inv = 1 - t;
    const lat = inv * inv * lat1 + 2 * inv * t * ctrlLat + t * t * lat2;
    const lng = inv * inv * lng1 + 2 * inv * t * ctrlLng + t * t * lng2;
    pts.push([lat, lng]);
  }
  return pts;
}

export const KlangValleyMap: React.FC<KlangValleyMapProps> = ({
  buses,
  stops,
  nearestStopIds,
  selectedBusId,
  selectedStopId,
  clickedOrigin,
  destinationPoint,
  walkingRoute,
  lastMileRoute,
  isShortWalk,
  directWalkRoute,
  transitRouteLabel,
  alerts,
  darkTiles,
  showStops,
  onSelectBus,
  onSelectStop,
  onMapClick,
  onOriginDragEnd,
  onDestinationDragEnd,
  registerFlyTo,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const busLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const stopLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const routeLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const pinLayerGroupRef = useRef<L.LayerGroup | null>(null);

  const onMapClickRef = useRef(onMapClick);
  onMapClickRef.current = onMapClick;

  const onSelectBusRef = useRef(onSelectBus);
  onSelectBusRef.current = onSelectBus;

  const onSelectStopRef = useRef(onSelectStop);
  onSelectStopRef.current = onSelectStop;

  const onOriginDragEndRef = useRef(onOriginDragEnd);
  onOriginDragEndRef.current = onOriginDragEnd;

  const onDestinationDragEndRef = useRef(onDestinationDragEnd);
  onDestinationDragEndRef.current = onDestinationDragEnd;

  // Initialize Leaflet Map once with standard OpenStreetMap tiles
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: INITIAL_MAP_CENTER,
      zoom: 14,
      zoomControl: false,
      attributionControl: true,
    });

    L.tileLayer(OSM_TILE_URL, {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);

    const routeGroup = L.layerGroup().addTo(map);
    const stopGroup = L.layerGroup().addTo(map);
    const busGroup = L.layerGroup().addTo(map);
    const pinGroup = L.layerGroup().addTo(map);

    map.on('click', (e: L.LeafletMouseEvent) => {
      onMapClickRef.current(e.latlng.lat, e.latlng.lng);
    });

    mapRef.current = map;
    busLayerGroupRef.current = busGroup;
    stopLayerGroupRef.current = stopGroup;
    routeLayerGroupRef.current = routeGroup;
    pinLayerGroupRef.current = pinGroup;

    registerFlyTo((lat: number, lng: number, zoom = 15) => {
      map.flyTo([lat, lng], zoom, { duration: 0.6 });
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Render custom pill-shaped HTML/SVG Bus Route Badges
  useEffect(() => {
    const group = busLayerGroupRef.current;
    if (!group) return;
    group.clearLayers();

    buses.forEach((bus) => {
      const isSelected = bus.id === selectedBusId;
      const hasDelayAlert =
        bus.status === 'Delayed' ||
        alerts.some(
          (a) => a.targetId === bus.routeCode && a.category === 'Delayed'
        );

      const badgeColor = hasDelayAlert
        ? '#D97706'
        : bus.operator === 'rapid-bus-mrtfeeder'
        ? '#059669'
        : '#DC2626';

      const ringStyle = isSelected
        ? 'box-shadow: 0 0 0 2px #ffffff, 0 0 0 4px #18181b; transform: scale(1.08);'
        : 'box-shadow: 0 1px 3px rgba(0,0,0,0.2);';

      const html = `
        <div style="
          display: inline-flex;
          align-items: center;
          gap: 6px;
          height: 30px;
          padding: 0 10px 0 5px;
          border-radius: 9999px;
          background-color: #18181b;
          color: #ffffff;
          border: 1px solid #27272a;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
          font-variant-numeric: tabular-nums;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: -0.01em;
          white-space: nowrap;
          cursor: pointer;
          transition: transform 150ms ease;
          ${ringStyle}
        ">
          <span style="
            display: inline-flex;
            align-items: center;
            justify-content: center;
            height: 20px;
            padding: 0 7px;
            border-radius: 9999px;
            background-color: ${badgeColor};
            color: #ffffff;
            font-size: 10px;
            font-weight: 600;
            gap: 3px;
            flex-shrink: 0;
          ">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="transform: rotate(${bus.bearing}deg);">
              <path d="M12 19V5" />
              <path d="m5 12 7-7 7 7" />
            </svg>
            <span>${bus.routeCode}</span>
          </span>
          <span style="color: #e4e4e7; font-weight: 500; font-size: 11px;">${bus.etaMinutes}m</span>
        </div>
      `;

      const icon = L.divIcon({
        className: 'kv-bus-marker-icon',
        html,
        iconSize: [96, 30],
        iconAnchor: [48, 15],
      });

      const marker = L.marker([bus.lat, bus.lng], {
        icon,
        zIndexOffset: isSelected ? 900 : 500,
      });

      marker.on('click', (e) => {
        L.DomEvent.stopPropagation(e);
        onSelectBusRef.current(bus.id);
      });

      marker.addTo(group);
    });
  }, [buses, selectedBusId, alerts]);

  // Render custom pill-shaped Stop Badges (highlighting Stop A & Stop B when transit leg is active)
  useEffect(() => {
    const group = stopLayerGroupRef.current;
    if (!group) return;
    group.clearLayers();

    if (!showStops) return;

    stops.forEach((stop) => {
      const nearestRank = nearestStopIds.indexOf(stop.id);
      const isStopA = !isShortWalk && walkingRoute?.stop.id === stop.id;
      const isStopB = !isShortWalk && lastMileRoute?.stop.id === stop.id;
      const isNearestHighlight = nearestRank !== -1;
      const isSelected = stop.id === selectedStopId || isStopA || isStopB;

      const stopAlerts = alerts.filter((a) => a.targetId === stop.code);
      const hasDelayed = stopAlerts.some((a) => a.category === 'Delayed');
      const hasFull = stopAlerts.some((a) => a.category === 'Full');

      const bgColor =
        isStopA || isStopB
          ? '#18181b'
          : isNearestHighlight
          ? '#ffffff'
          : '#fafafa';
      const textColor = isStopA || isStopB ? '#ffffff' : '#18181b';
      const borderColor = isStopA
        ? '#2563eb'
        : isStopB
        ? '#e11d48'
        : isNearestHighlight
        ? '#2563eb'
        : '#a1a1aa';

      const highlightShadow = isStopA
        ? 'box-shadow: 0 0 0 2px #ffffff, 0 0 0 4px #2563eb;'
        : isStopB
        ? 'box-shadow: 0 0 0 2px #ffffff, 0 0 0 4px #e11d48;'
        : isNearestHighlight
        ? 'box-shadow: 0 1px 4px rgba(37,99,235,0.2);'
        : '';

      const dotColor = hasDelayed
        ? '#D97706'
        : hasFull
        ? '#DC2626'
        : stop.type === 'MRT Feeder Hub'
        ? '#059669'
        : '#DC2626';

      const primaryRoute = stop.routes[0] || '';

      const stopRoleBadge = isStopA
        ? `<span style="background:#2563EB;color:#fff;padding:0 5px;border-radius:9999px;font-size:9px;font-weight:700;">A</span>`
        : isStopB
        ? `<span style="background:#E11D48;color:#fff;padding:0 5px;border-radius:9999px;font-size:9px;font-weight:700;">B</span>`
        : '';

      const alertTag =
        stopAlerts.length > 0
          ? `<span style="background:${
              hasDelayed ? '#D97706' : '#DC2626'
            };color:#fff;padding:0 5px;border-radius:9999px;font-size:9px;font-weight:600;">!${
              stopAlerts.length
            }</span>`
          : '';

      const html = `
        <div style="
          display: inline-flex;
          align-items: center;
          gap: 4px;
          height: 24px;
          padding: 0 8px;
          background-color: ${bgColor};
          color: ${textColor};
          border: 1.5px solid ${borderColor};
          border-radius: 9999px;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
          font-variant-numeric: tabular-nums;
          font-size: 10px;
          font-weight: 600;
          white-space: nowrap;
          cursor: pointer;
          ${highlightShadow}
        ">
          <span style="
            width: 6px;
            height: 6px;
            border-radius: 9999px;
            background-color: ${dotColor};
            flex-shrink: 0;
          "></span>
          <span>${stop.code}</span>
          <span style="opacity: 0.65; font-size: 10px; font-weight: 500;">· ${primaryRoute}</span>
          ${stopRoleBadge}
          ${alertTag}
        </div>
      `;

      const icon = L.divIcon({
        className: 'kv-stop-marker-icon',
        html,
        iconSize: [112, 24],
        iconAnchor: [56, 12],
      });

      const marker = L.marker([stop.lat, stop.lng], {
        icon,
        zIndexOffset: isSelected ? 750 : isNearestHighlight ? 550 : 150,
      });

      marker.on('click', (e) => {
        L.DomEvent.stopPropagation(e);
        onSelectStopRef.current(stop.id);
      });

      marker.addTo(group);
    });
  }, [
    stops,
    nearestStopIds,
    selectedStopId,
    walkingRoute,
    lastMileRoute,
    isShortWalk,
    showStops,
    alerts,
  ]);

  // Clear Line Hierarchy:
  // - If Short Walk (< 600m or same nearest stop): single solid blue direct pedestrian route
  // - Otherwise:
  //   1. First-Mile Walk (Start -> Stop A): solid blue (#2563EB, weight 4) with subtle white casing
  //   2. Transit Segment (Stop A -> Stop B): thick solid emerald green (#059669, weight 6) + floating route pill in the middle
  //   3. Last-Mile Walk (Stop B -> Dest): dashed red (#E11D48, weight 4) with subtle white casing
  useEffect(() => {
    const group = routeLayerGroupRef.current;
    if (!group) return;
    group.clearLayers();

    if (isShortWalk) {
      if (directWalkRoute && directWalkRoute.coordinates.length > 1) {
        L.polyline(directWalkRoute.coordinates, {
          color: '#ffffff',
          weight: 7,
          lineCap: 'round',
          lineJoin: 'round',
          opacity: 0.92,
        }).addTo(group);

        L.polyline(directWalkRoute.coordinates, {
          color: '#2563EB',
          weight: 4,
          lineCap: 'round',
          lineJoin: 'round',
          opacity: 1,
        }).addTo(group);
      }
      return;
    }

    // 1. Transit Segment (Stop A -> Stop B): Thick solid emerald green line (weight: 6) + floating midpoint bus badge
    if (
      walkingRoute?.stop &&
      lastMileRoute?.stop &&
      walkingRoute.stop.id !== lastMileRoute.stop.id
    ) {
      const arcCoords = createCurvedArcCoords(
        [walkingRoute.stop.lat, walkingRoute.stop.lng],
        [lastMileRoute.stop.lat, lastMileRoute.stop.lng]
      );

      L.polyline(arcCoords, {
        color: '#ffffff',
        weight: 9,
        lineCap: 'round',
        lineJoin: 'round',
        opacity: 0.88,
      }).addTo(group);

      L.polyline(arcCoords, {
        color: '#059669',
        weight: 6,
        lineCap: 'round',
        lineJoin: 'round',
        opacity: 0.96,
      }).addTo(group);

      // Floating pill in the middle of the transit segment showing the bus/route badge
      const midPoint = arcCoords[Math.floor(arcCoords.length / 2)];
      if (midPoint && transitRouteLabel) {
        const transitPillHtml = `
          <div style="
            display: inline-flex;
            align-items: center;
            gap: 5px;
            height: 24px;
            padding: 0 9px;
            border-radius: 9999px;
            background-color: #059669;
            color: #ffffff;
            border: 2px solid #ffffff;
            box-shadow: 0 2px 6px rgba(5, 150, 105, 0.35), 0 1px 2px rgba(0,0,0,0.18);
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
            font-variant-numeric: tabular-nums;
            font-size: 11px;
            font-weight: 600;
            white-space: nowrap;
            pointer-events: none;
          ">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
              <path d="M8 6v6" />
              <path d="M15 6v6" />
              <path d="M2 12h19.6" />
              <path d="M18 18h3s.5-1.7.8-2.8c.1-.4.2-.8.2-1.2 0-.4-.1-.8-.2-1.2l-1.4-5C20.1 6.8 19.1 6 18 6H4a2 2 0 0 0-2 2v10h3" />
              <circle cx="7" cy="18" r="2" />
              <path d="M9 18h5" />
              <circle cx="16" cy="18" r="2" />
            </svg>
            <span>${transitRouteLabel}</span>
          </div>
        `;

        const pillIcon = L.divIcon({
          className: 'kv-bus-marker-icon',
          html: transitPillHtml,
          iconSize: [96, 24],
          iconAnchor: [48, 12],
        });

        L.marker(midPoint, {
          icon: pillIcon,
          interactive: false,
          zIndexOffset: 820,
        }).addTo(group);
      }
    }

    // 2. First-Mile Walk (Start -> Stop A): Clean solid blue line (#2563EB, weight: 4) with subtle white casing
    if (walkingRoute && walkingRoute.coordinates.length > 1) {
      L.polyline(walkingRoute.coordinates, {
        color: '#ffffff',
        weight: 7,
        lineCap: 'round',
        lineJoin: 'round',
        opacity: 0.92,
      }).addTo(group);

      L.polyline(walkingRoute.coordinates, {
        color: '#2563EB',
        weight: 4,
        lineCap: 'round',
        lineJoin: 'round',
        opacity: 1,
      }).addTo(group);
    }

    // 3. Last-Mile Walk (Stop B -> Dest): Clean dashed red line (#E11D48, weight: 4) with subtle white casing
    if (lastMileRoute && lastMileRoute.coordinates.length > 1) {
      L.polyline(lastMileRoute.coordinates, {
        color: '#ffffff',
        weight: 7,
        lineCap: 'round',
        lineJoin: 'round',
        opacity: 0.92,
      }).addTo(group);

      L.polyline(lastMileRoute.coordinates, {
        color: '#E11D48',
        weight: 4,
        dashArray: '8, 7',
        lineCap: 'round',
        lineJoin: 'round',
        opacity: 1,
      }).addTo(group);
    }
  }, [
    walkingRoute,
    lastMileRoute,
    isShortWalk,
    directWalkRoute,
    transitRouteLabel,
  ]);

  // Render Draggable Origin (Start) & Destination (Dest) Pins
  useEffect(() => {
    const group = pinLayerGroupRef.current;
    if (!group) return;
    group.clearLayers();

    if (clickedOrigin) {
      const startPinHtml = `
        <div class="kv-you-pin" aria-label="Start location pin (draggable)">
          <span class="kv-you-label">Start</span>
          <span class="kv-you-pulse"></span>
          <span class="kv-you-dot"></span>
        </div>
      `;

      const startIcon = L.divIcon({
        className: 'kv-pin-marker-icon',
        html: startPinHtml,
        iconSize: [26, 26],
        iconAnchor: [13, 13],
      });

      const originMarker = L.marker(clickedOrigin, {
        icon: startIcon,
        draggable: true,
        zIndexOffset: 990,
      });

      originMarker.on('dragend', () => {
        const pos = originMarker.getLatLng();
        onOriginDragEndRef.current(pos.lat, pos.lng);
      });

      originMarker.addTo(group);
    }

    if (destinationPoint) {
      const destPinHtml = `
        <div class="kv-dest-pin" aria-label="Destination pin (draggable)">
          <span class="kv-dest-label">Dest</span>
          <svg class="kv-dest-teardrop" viewBox="0 0 32 40" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M16 1.5C8.544 1.5 2.5 7.544 2.5 15C2.5 24.5 16 38.5 16 38.5C16 38.5 29.5 24.5 29.5 15C29.5 7.544 23.456 1.5 16 1.5Z" fill="#E11D48" stroke="#FFFFFF" stroke-width="2"/>
            <path d="M12.5 19.5V10.5M12.5 10.5H19.5L17.8 13.2L19.5 15.9H12.5" stroke="#FFFFFF" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
      `;

      const destIcon = L.divIcon({
        className: 'kv-dest-marker-icon',
        html: destPinHtml,
        iconSize: [34, 42],
        iconAnchor: [17, 40],
      });

      const destMarker = L.marker(destinationPoint, {
        icon: destIcon,
        draggable: true,
        zIndexOffset: 995,
      });

      destMarker.on('dragend', () => {
        const pos = destMarker.getLatLng();
        onDestinationDragEndRef.current(pos.lat, pos.lng);
      });

      destMarker.addTo(group);
    }
  }, [clickedOrigin, destinationPoint]);

  return (
    <div
      className={`w-full h-full relative z-0 select-none ${
        darkTiles ? 'kv-map-dark' : 'kv-map-light'
      }`}
    >
      <div
        ref={containerRef}
        className="w-full h-full cursor-crosshair"
        aria-label="Kuala Lumpur Public Transport Map"
      />
    </div>
  );
};
