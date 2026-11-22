export type OperatorType = 'rapid-bus-kl' | 'rapid-bus-mrtfeeder';

export type AlertCategory = 'Delayed' | 'Full' | 'Skipped Stop';

export interface BusVehicle {
  id: string;
  routeCode: string;
  operator: OperatorType;
  origin: string;
  destination: string;
  nextStopId: string;
  nextStopName: string;
  etaMinutes: number;
  lat: number;
  lng: number;
  bearing: number; // degrees 0-359
  speedKmh: number;
  licensePlate: string;
  occupancy: 'Seated Available' | 'Standing Only' | 'Full Capacity';
  status: 'On Time' | 'Delayed';
  updatedAt: number;
}

export interface TransitStop {
  id: string;
  code: string;
  name: string;
  district: string;
  lat: number;
  lng: number;
  routes: string[];
  type: 'RapidKL Bus Stop' | 'MRT Feeder Hub' | 'LRT/MRT Interchange';
}

export interface CrowdAlert {
  id: string;
  targetId: string; // routeCode or stopCode
  targetLabel: string;
  category: AlertCategory;
  note?: string;
  createdAt: number;
  expiresAt: number; // createdAt + 30 mins
  upvotes: number;
}

export interface WalkingRouteResult {
  stop: TransitStop;
  distanceMeters: number;
  durationMinutes: number;
  coordinates: [number, number][]; // [lat, lng][]
  source: 'osrm' | 'direct-grid';
}

export const KL_CENTER: [number, number] = [3.1478, 101.7019];

// 5 Hardcoded Mock RapidKL & MRT Feeder Bus Markers in Central Kuala Lumpur
export const INITIAL_BUS_VEHICLES: BusVehicle[] = [
  {
    id: 'veh-kl-300',
    routeCode: '300',
    operator: 'rapid-bus-kl',
    origin: 'Pandan Indah Hub',
    destination: 'Lebuh Ampang',
    nextStopId: 'stop-klcc',
    nextStopName: 'KL094 Suria KLCC',
    etaMinutes: 2,
    lat: 3.1579,
    lng: 101.7138,
    bearing: 245,
    speedKmh: 28,
    licensePlate: 'WVP 4812',
    occupancy: 'Seated Available',
    status: 'On Time',
    updatedAt: Date.now() - 12000,
  },
  {
    id: 'veh-mrt-t460',
    routeCode: 'T460',
    operator: 'rapid-bus-mrtfeeder',
    origin: 'MRT Bukit Bintang',
    destination: 'TRX Exchange 106',
    nextStopId: 'stop-bb',
    nextStopName: 'KL86 MRT Bukit Bintang Pintu A',
    etaMinutes: 4,
    lat: 3.1466,
    lng: 101.7114,
    bearing: 165,
    speedKmh: 22,
    licensePlate: 'VCE 9031',
    occupancy: 'Standing Only',
    status: 'On Time',
    updatedAt: Date.now() - 8000,
  },
  {
    id: 'veh-kl-400',
    routeCode: '400',
    operator: 'rapid-bus-kl',
    origin: 'Damai Perdana',
    destination: 'Hab Lebuh Pudu',
    nextStopId: 'stop-pudu',
    nextStopName: 'KL114 Hab Pasar Seni (Platform B)',
    etaMinutes: 7,
    lat: 3.1422,
    lng: 101.6968,
    bearing: 280,
    speedKmh: 16,
    licensePlate: 'WXY 1174',
    occupancy: 'Full Capacity',
    status: 'Delayed',
    updatedAt: Date.now() - 19000,
  },
  {
    id: 'veh-mrt-t850',
    routeCode: 'T850',
    operator: 'rapid-bus-mrtfeeder',
    origin: 'MRT Semantan',
    destination: 'KL Sentral / Bangsar',
    nextStopId: 'stop-sentral',
    nextStopName: 'KL1079 KL Sentral Utama',
    etaMinutes: 3,
    lat: 3.1357,
    lng: 101.6869,
    bearing: 130,
    speedKmh: 34,
    licensePlate: 'VDU 6240',
    occupancy: 'Seated Available',
    status: 'On Time',
    updatedAt: Date.now() - 5000,
  },
  {
    id: 'veh-kl-b103',
    routeCode: 'B103',
    operator: 'rapid-bus-kl',
    origin: 'Titiwangsa Hub',
    destination: 'Bukit Bintang / Raja Chulan',
    nextStopId: 'stop-masjid-jamek',
    nextStopName: 'KL107 LRT Masjid Jamek',
    etaMinutes: 5,
    lat: 3.1518,
    lng: 101.6989,
    bearing: 145,
    speedKmh: 24,
    licensePlate: 'VBL 3398',
    occupancy: 'Standing Only',
    status: 'On Time',
    updatedAt: Date.now() - 15000,
  },
];

export const KLANG_VALLEY_STOPS: TransitStop[] = [
  {
    id: 'stop-klcc',
    code: 'KL094',
    name: 'Suria KLCC (Jalan Ampang)',
    district: 'Kuala Lumpur City Centre',
    lat: 3.1588,
    lng: 101.7118,
    routes: ['300', '302', '303', 'B103'],
    type: 'LRT/MRT Interchange',
  },
  {
    id: 'stop-bb',
    code: 'KL86',
    name: 'MRT Bukit Bintang (Pintu A)',
    district: 'Bukit Bintang',
    lat: 3.1476,
    lng: 101.7108,
    routes: ['T460', '400', '420', 'B103'],
    type: 'MRT Feeder Hub',
  },
  {
    id: 'stop-pudu',
    code: 'KL114',
    name: 'Hab Pasar Seni (Platform B)',
    district: 'City Centre South',
    lat: 3.1425,
    lng: 101.6953,
    routes: ['400', '500', '600', '750', '780'],
    type: 'LRT/MRT Interchange',
  },
  {
    id: 'stop-sentral',
    code: 'KL1079',
    name: 'KL Sentral Transit Hub',
    district: 'Brickfields',
    lat: 3.1342,
    lng: 101.6861,
    routes: ['T850', '600', '770', '780', '800'],
    type: 'LRT/MRT Interchange',
  },
  {
    id: 'stop-masjid-jamek',
    code: 'KL107',
    name: 'LRT Masjid Jamek (Jalan Tun Perak)',
    district: 'Civic Quarter',
    lat: 3.1496,
    lng: 101.6966,
    routes: ['B103', '180', '202', '250'],
    type: 'LRT/MRT Interchange',
  },
  {
    id: 'stop-trx',
    code: 'KL241',
    name: 'MRT Tun Razak Exchange (TRX)',
    district: 'Imbi / TRX',
    lat: 3.1426,
    lng: 101.7186,
    routes: ['T460', 'T407', '402'],
    type: 'MRT Feeder Hub',
  },
  {
    id: 'stop-ampang-park',
    code: 'KL091',
    name: 'MRT/LRT Ampang Park',
    district: 'Jalan Ampang',
    lat: 3.1599,
    lng: 101.7192,
    routes: ['300', '302', '303'],
    type: 'LRT/MRT Interchange',
  },
  {
    id: 'stop-kg-baru',
    code: 'KL152',
    name: 'Saloma Link / Kampung Baru',
    district: 'Kampung Baru',
    lat: 3.1614,
    lng: 101.7054,
    routes: ['220', 'B103', '302'],
    type: 'RapidKL Bus Stop',
  },
  {
    id: 'stop-raja-chulan',
    code: 'KL082',
    name: 'Wisma Cosway / Raja Chulan',
    district: 'Golden Triangle',
    lat: 3.1508,
    lng: 101.7089,
    routes: ['B103', 'T460', '400'],
    type: 'RapidKL Bus Stop',
  },
];

const THIRTY_MINS_MS = 30 * 60 * 1000;

export const INITIAL_ALERTS: CrowdAlert[] = [
  {
    id: 'al-1',
    targetId: '400',
    targetLabel: 'Route 400 (Hab Lebuh Pudu)',
    category: 'Delayed',
    note: 'Heavy congestion along Jalan Pudu approaching Pasar Seni.',
    createdAt: Date.now() - 8 * 60 * 1000,
    expiresAt: Date.now() + 22 * 60 * 1000,
    upvotes: 6,
  },
  {
    id: 'al-2',
    targetId: 'T460',
    targetLabel: 'Route T460 (MRT Bukit Bintang)',
    category: 'Full',
    note: 'Peak hour commuter load at Pintu A boarding bay.',
    createdAt: Date.now() - 14 * 60 * 1000,
    expiresAt: Date.now() + 16 * 60 * 1000,
    upvotes: 4,
  },
];

// Haversine distance in meters
export function getDistanceMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

// Find nearest stops sorted by distance
export function findNearestStops(
  lat: number,
  lng: number,
  limit = 3
): { stop: TransitStop; distanceMeters: number }[] {
  return KLANG_VALLEY_STOPS.map((stop) => ({
    stop,
    distanceMeters: getDistanceMeters(lat, lng, stop.lat, stop.lng),
  }))
    .sort((a, b) => a.distanceMeters - b.distanceMeters)
    .slice(0, limit);
}

const OSRM_FOOT_BASE_URL =
  'https://routing.openstreetmap.de/routed-foot/route/v1/foot';

export interface DirectWalkResult {
  distanceMeters: number;
  durationMinutes: number;
  coordinates: [number, number][];
  source: 'osrm-foot' | 'direct-grid';
}

// Query real OSRM pedestrian foot server (follows sidewalks & walkways, avoids one-way highway loops)
export async function fetchWalkingRoute(
  fromLat: number,
  fromLng: number,
  stop: TransitStop
): Promise<WalkingRouteResult> {
  const url = `${OSRM_FOOT_BASE_URL}/${fromLng},${fromLat};${stop.lng},${stop.lat}?overview=full&geometries=geojson`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3800);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      if (data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        const coords: [number, number][] = route.geometry.coordinates.map(
          (c: [number, number]) => [c[1], c[0]]
        );
        const dist = Math.round(route.distance);
        const duration = Math.max(1, Math.round(dist / 78));
        return {
          stop,
          distanceMeters: dist,
          durationMinutes: duration,
          coordinates: coords,
          source: 'osrm',
        };
      }
    }
  } catch {
    // Fallback to urban grid interpolation if OSRM foot server is unreachable
  }

  const straightDist = getDistanceMeters(fromLat, fromLng, stop.lat, stop.lng);
  const manhattanDist = Math.round(straightDist * 1.2);
  const duration = Math.max(1, Math.round(manhattanDist / 78));

  const midLat = fromLat + (stop.lat - fromLat) * 0.62;
  const midLng = fromLng + (stop.lng - fromLng) * 0.38;

  return {
    stop,
    distanceMeters: manhattanDist,
    durationMinutes: duration,
    coordinates: [
      [fromLat, fromLng],
      [midLat, fromLng],
      [midLat, midLng],
      [stop.lat, midLng],
      [stop.lat, stop.lng],
    ],
    source: 'direct-grid',
  };
}

// Query real OSRM foot server from Stop B -> Destination pin (Last-Mile leg)
export async function fetchLastMileWalkingRoute(
  stop: TransitStop,
  toLat: number,
  toLng: number
): Promise<WalkingRouteResult> {
  const url = `${OSRM_FOOT_BASE_URL}/${stop.lng},${stop.lat};${toLng},${toLat}?overview=full&geometries=geojson`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3800);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      if (data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        const coords: [number, number][] = route.geometry.coordinates.map(
          (c: [number, number]) => [c[1], c[0]]
        );
        const dist = Math.round(route.distance);
        const duration = Math.max(1, Math.round(dist / 78));
        return {
          stop,
          distanceMeters: dist,
          durationMinutes: duration,
          coordinates: coords,
          source: 'osrm',
        };
      }
    }
  } catch {
    // Fallback to urban grid interpolation if OSRM foot server is unreachable
  }

  const straightDist = getDistanceMeters(stop.lat, stop.lng, toLat, toLng);
  const manhattanDist = Math.round(straightDist * 1.2);
  const duration = Math.max(1, Math.round(manhattanDist / 78));

  const midLat = stop.lat + (toLat - stop.lat) * 0.62;
  const midLng = stop.lng + (toLng - stop.lng) * 0.38;

  return {
    stop,
    distanceMeters: manhattanDist,
    durationMinutes: duration,
    coordinates: [
      [stop.lat, stop.lng],
      [midLat, stop.lng],
      [midLat, midLng],
      [toLat, midLng],
      [toLat, toLng],
    ],
    source: 'direct-grid',
  };
}

// Direct pedestrian walk from Origin -> Destination (used by Smart "Just Walk" Rule)
export async function fetchDirectWalkingRoute(
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number
): Promise<DirectWalkResult> {
  const url = `${OSRM_FOOT_BASE_URL}/${fromLng},${fromLat};${toLng},${toLat}?overview=full&geometries=geojson`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3800);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      if (data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        const coords: [number, number][] = route.geometry.coordinates.map(
          (c: [number, number]) => [c[1], c[0]]
        );
        const dist = Math.round(route.distance);
        const duration = Math.max(1, Math.round(dist / 78));
        return {
          distanceMeters: dist,
          durationMinutes: duration,
          coordinates: coords,
          source: 'osrm-foot',
        };
      }
    }
  } catch {
    // Fallback to clean urban grid
  }

  const straightDist = getDistanceMeters(fromLat, fromLng, toLat, toLng);
  const manhattanDist = Math.round(straightDist * 1.18);
  const duration = Math.max(1, Math.round(manhattanDist / 78));
  const midLat = fromLat + (toLat - fromLat) * 0.55;
  const midLng = fromLng + (toLng - fromLng) * 0.45;

  return {
    distanceMeters: manhattanDist,
    durationMinutes: duration,
    coordinates: [
      [fromLat, fromLng],
      [midLat, fromLng],
      [midLat, midLng],
      [toLat, midLng],
      [toLat, toLng],
    ],
    source: 'direct-grid',
  };
}

export function createCrowdAlert(
  targetId: string,
  targetLabel: string,
  category: AlertCategory
): CrowdAlert {
  const now = Date.now();
  const descriptions: Record<AlertCategory, string> = {
    Delayed: 'Commuter reported route delay >10 mins vs scheduled headway.',
    Full: 'Vehicle at full standing capacity; next bus recommended.',
    'Skipped Stop': 'Driver bypassed stop due to full load or lane obstruction.',
  };

  return {
    id: `al-${now}-${Math.random().toString(36).slice(2, 6)}`,
    targetId,
    targetLabel,
    category,
    note: descriptions[category],
    createdAt: now,
    expiresAt: now + THIRTY_MINS_MS,
    upvotes: 1,
  };
}
