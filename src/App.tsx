import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  Search,
  Footprints,
  ChevronLeft,
  ChevronRight,
  Compass,
  RotateCw,
  MapPin,
  Flag,
  Bus,
  X,
  ArrowUpRight,
  ThumbsUp,
  Sun,
  Moon,
  Eye,
  EyeOff,
} from 'lucide-react';
import { KlangValleyMap } from './components/KlangValleyMap';
import {
  LiveBusesHero,
  KlangValleyAreaPreset,
} from './components/LiveBusesHero';
import {
  BusVehicle,
  TransitStop,
  CrowdAlert,
  AlertCategory,
  WalkingRouteResult,
  DirectWalkResult,
  INITIAL_BUS_VEHICLES,
  KLANG_VALLEY_STOPS,
  INITIAL_ALERTS,
  KL_CENTER,
  getDistanceMeters,
  findNearestStops,
  fetchWalkingRoute,
  fetchLastMileWalkingRoute,
  fetchDirectWalkingRoute,
  createCrowdAlert,
} from './data/klangValleyData';

type DrawerTab = 'live' | 'walk' | 'alerts';
type OperatorFilter = 'rapid-bus-mrtfeeder' | 'rapid-bus-kl' | 'all';
type PinPlacementMode = 'origin' | 'destination';

interface GtfsApiPayload {
  vehicles: BusVehicle[];
  totalRawEntities: number;
  filteredCount: number;
  outsideBoundsDropped: number;
  fetchedAt: number;
  source: 'gtfs-realtime-live' | 'fallback-cache';
  feedUrl: string;
}

interface RankedNearestStop {
  stop: TransitStop;
  distanceMeters: number;
  durationMinutes: number;
  route?: WalkingRouteResult;
}

interface SuggestedBusPlan {
  isSameStop: boolean;
  isDirect: boolean;
  directRoutes: string[];
  recommendedRoute: string;
  liveBus: BusVehicle | null;
  liveBusDistanceMeters: number | null;
}

// Clear A-to-B Klang Valley demo: KL Sentral -> Bukit Bintang / KLCC
const DEFAULT_START_POINT: [number, number] = [3.1336, 101.6852]; // KL Sentral
const DEFAULT_DEST_POINT: [number, number] = [3.1484, 101.7118]; // Bukit Bintang / KLCC corridor

const SHORT_WALK_THRESHOLD_METERS = 600;

const GENERIC_ORIGINS = new Set([
  'MRT Feeder Station Hub',
  'RapidKL Corridor Origin',
  'RapidKL MRT Feeder',
  'RapidKL Bus',
]);

function formatBusTitle(bus: BusVehicle): string {
  const hasRealDestination =
    bus.origin &&
    bus.destination &&
    !GENERIC_ORIGINS.has(bus.origin) &&
    !bus.destination.startsWith('Feeder Loop ') &&
    !bus.destination.startsWith('Klang Valley Sector ') &&
    !bus.destination.startsWith('Route ');

  if (hasRealDestination) {
    return `${bus.origin} → ${bus.destination}`;
  }

  return bus.operator === 'rapid-bus-mrtfeeder'
    ? `RapidKL MRT Feeder · Route ${bus.routeCode}`
    : `RapidKL Bus · Route ${bus.routeCode}`;
}

function getRoutePillClasses(routeCode: string): string {
  if (/^T\d/i.test(routeCode.trim())) {
    return 'bg-[#2E8B2E] text-white';
  }
  return 'bg-red-600 text-white';
}

export default function App() {
  const [buses, setBuses] = useState<BusVehicle[]>(INITIAL_BUS_VEHICLES);
  const [alerts, setAlerts] = useState<CrowdAlert[]>(INITIAL_ALERTS);
  const [searchQuery, setSearchQuery] = useState('');
  const [operatorFilter, setOperatorFilter] = useState<OperatorFilter>(
    'rapid-bus-mrtfeeder'
  );
  const [activeTab, setActiveTab] = useState<DrawerTab>('walk');
  const [drawerOpen, setDrawerOpen] = useState(true);
  const [activeAreaId, setActiveAreaId] = useState<string | null>(null);

  // Compact 2-button toggle: clicking map moves Start or Dest pin
  const [pinPlacementMode, setPinPlacementMode] =
    useState<PinPlacementMode>('origin');

  // "Simulate Live Buses" fallback toggle state
  const [simulateMode, setSimulateMode] = useState(false);

  const [selectedBusId, setSelectedBusId] = useState<string | null>(
    INITIAL_BUS_VEHICLES[0].id
  );
  const [selectedStopId, setSelectedStopId] = useState<string | null>(
    'stop-sentral'
  );

  // GTFS-Realtime Backend Polling State
  const [isPollingGtfs, setIsPollingGtfs] = useState(false);
  const [gtfsMeta, setGtfsMeta] = useState<{
    totalRawEntities: number;
    filteredCount: number;
    outsideBoundsDropped: number;
    source: 'gtfs-realtime-live' | 'fallback-cache' | 'simulated-live';
    lastPolledTime: Date;
  }>({
    totalRawEntities: INITIAL_BUS_VEHICLES.length,
    filteredCount: INITIAL_BUS_VEHICLES.length,
    outsideBoundsDropped: 0,
    source: 'fallback-cache',
    lastPolledTime: new Date(),
  });

  // First-Mile (Start -> Stop A), Last-Mile (Stop B -> Dest), and Direct Walk state
  const [clickedOrigin, setClickedOrigin] = useState<[number, number] | null>(
    DEFAULT_START_POINT
  );
  const [destinationPoint, setDestinationPoint] = useState<
    [number, number] | null
  >(DEFAULT_DEST_POINT);

  const [nearestStops, setNearestStops] = useState<RankedNearestStop[]>(() =>
    findNearestStops(DEFAULT_START_POINT[0], DEFAULT_START_POINT[1], 3)
      .sort((a, b) => a.distanceMeters - b.distanceMeters)
      .map((item) => ({
        stop: item.stop,
        distanceMeters: item.distanceMeters,
        durationMinutes: Math.max(
          1,
          Math.round((item.distanceMeters * 1.2) / 78)
        ),
      }))
  );
  const [walkingRoute, setWalkingRoute] = useState<WalkingRouteResult | null>(
    null
  );
  const [lastMileRoute, setLastMileRoute] = useState<WalkingRouteResult | null>(
    null
  );
  const [directWalkRoute, setDirectWalkRoute] =
    useState<DirectWalkResult | null>(null);
  const [isRouting, setIsRouting] = useState(false);

  // Map appearance controls
  const [darkTiles, setDarkTiles] = useState(false);
  const [showStops, setShowStops] = useState(true);
  const [alertFeedback, setAlertFeedback] = useState<string | null>(null);
  const [, setTick] = useState(0);

  const flyToRef = useRef<
    ((lat: number, lng: number, zoom?: number) => void) | null
  >(null);

  const registerFlyTo = useCallback(
    (fn: (lat: number, lng: number, zoom?: number) => void) => {
      flyToRef.current = fn;
    },
    []
  );

  // Resolve First-Mile OSRM foot routes (Start -> 3 nearest stops), sort strictly ascending, select Stop A
  const resolveNearestWalkingRoutes = useCallback(
    async (lat: number, lng: number, preferredStopId?: string) => {
      const candidates = findNearestStops(lat, lng, 3).sort(
        (a, b) => a.distanceMeters - b.distanceMeters
      );

      setNearestStops(
        candidates.map((c) => ({
          stop: c.stop,
          distanceMeters: c.distanceMeters,
          durationMinutes: Math.max(
            1,
            Math.round((c.distanceMeters * 1.2) / 78)
          ),
        }))
      );

      setIsRouting(true);
      const routeResults = await Promise.all(
        candidates.map((c) => fetchWalkingRoute(lat, lng, c.stop))
      );

      const ranked: RankedNearestStop[] = routeResults
        .map((res) => ({
          stop: res.stop,
          distanceMeters: res.distanceMeters,
          durationMinutes: res.durationMinutes,
          route: res,
        }))
        .sort((a, b) => a.distanceMeters - b.distanceMeters);

      setNearestStops(ranked);

      const chosen =
        (preferredStopId
          ? ranked.find((r) => r.stop.id === preferredStopId)
          : undefined) ?? ranked[0];

      if (chosen?.route) {
        setSelectedStopId(chosen.stop.id);
        setWalkingRoute(chosen.route);
      }
      setIsRouting(false);
    },
    []
  );

  // Resolve Last-Mile OSRM foot route (Nearest Stop B -> Destination Pin)
  const resolveLastMileRoute = useCallback(async (lat: number, lng: number) => {
    const candidates = findNearestStops(lat, lng, 3).sort(
      (a, b) => a.distanceMeters - b.distanceMeters
    );

    if (candidates.length === 0) return;

    setIsRouting(true);
    const results = await Promise.all(
      candidates.map((c) => fetchLastMileWalkingRoute(c.stop, lat, lng))
    );
    results.sort((a, b) => a.distanceMeters - b.distanceMeters);
    setLastMileRoute(results[0]);
    setIsRouting(false);
  }, []);

  // Poll Express Backend Endpoint (/api/gtfs/vehicles) decoding data.gov.my GTFS-Realtime .proto feed
  const fetchLiveGtfsVehicles = useCallback(
    async (category: OperatorFilter, forceRefresh = false) => {
      setIsPollingGtfs(true);
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 6500);
        const params = new URLSearchParams({
          category,
          ...(forceRefresh ? { refresh: '1' } : {}),
        });
        const response = await fetch(
          `/api/gtfs/vehicles?${params.toString()}`,
          { signal: controller.signal }
        );
        clearTimeout(timeout);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        const data: GtfsApiPayload = await response.json();

        if (data.source === 'fallback-cache') {
          setSimulateMode(true);
          setBuses(INITIAL_BUS_VEHICLES);
          setGtfsMeta({
            totalRawEntities: INITIAL_BUS_VEHICLES.length,
            filteredCount: INITIAL_BUS_VEHICLES.length,
            outsideBoundsDropped: 0,
            source: 'simulated-live',
            lastPolledTime: new Date(),
          });
          return;
        }

        if (Array.isArray(data.vehicles) && data.vehicles.length > 0) {
          setBuses(data.vehicles);
          setSelectedBusId((prev) =>
            data.vehicles.some((v) => v.id === prev)
              ? prev
              : data.vehicles[0].id
          );
          setGtfsMeta({
            totalRawEntities: data.totalRawEntities,
            filteredCount: data.filteredCount,
            outsideBoundsDropped: data.outsideBoundsDropped,
            source: data.source,
            lastPolledTime: new Date(data.fetchedAt || Date.now()),
          });
        }
      } catch {
        setSimulateMode(true);
        setBuses(INITIAL_BUS_VEHICLES);
        setGtfsMeta((prev) => ({
          ...prev,
          source: 'simulated-live',
          lastPolledTime: new Date(),
        }));
      } finally {
        setIsPollingGtfs(false);
      }
    },
    []
  );

  // Poll GTFS-Realtime feed on mount and every 30 seconds when NOT in Simulate Live Buses mode
  useEffect(() => {
    if (simulateMode) return;
    fetchLiveGtfsVehicles(operatorFilter, false);
    const interval = setInterval(() => {
      fetchLiveGtfsVehicles(operatorFilter, false);
    }, 30000);
    return () => clearInterval(interval);
  }, [operatorFilter, simulateMode, fetchLiveGtfsVehicles]);

  // "Simulate Live Buses" real-time movement engine (ticks every 2.5s when simulateMode is active)
  useEffect(() => {
    if (!simulateMode) return;

    const simTimer = setInterval(() => {
      setBuses((prev) =>
        prev.map((bus, idx) => {
          const rad = (bus.bearing * Math.PI) / 180;
          const stepDistance = 0.00042;
          let nextLat = bus.lat + Math.cos(rad) * stepDistance;
          let nextLng = bus.lng + Math.sin(rad) * stepDistance;
          let nextBearing =
            (bus.bearing + (idx % 2 === 0 ? 6 : -6) + 360) % 360;

          if (
            nextLat < 3.12 ||
            nextLat > 3.18 ||
            nextLng < 101.67 ||
            nextLng > 101.74
          ) {
            nextBearing = (bus.bearing + 180) % 360;
            const reverseRad = (nextBearing * Math.PI) / 180;
            nextLat = bus.lat + Math.cos(reverseRad) * stepDistance;
            nextLng = bus.lng + Math.sin(reverseRad) * stepDistance;
          }

          const speedDelta = idx % 2 === 0 ? 1 : -1;
          const nextSpeed = Math.max(
            16,
            Math.min(48, bus.speedKmh + speedDelta)
          );

          return {
            ...bus,
            lat: Number(nextLat.toFixed(5)),
            lng: Number(nextLng.toFixed(5)),
            bearing: nextBearing,
            speedKmh: nextSpeed,
            updatedAt: Date.now(),
          };
        })
      );

      setGtfsMeta((prev) => ({
        ...prev,
        source: 'simulated-live',
        lastPolledTime: new Date(),
      }));
    }, 2500);

    return () => clearInterval(simTimer);
  }, [simulateMode]);

  // Toggle handler for "Simulate Live Buses" fallback mode
  const handleToggleSimulateMode = () => {
    setSimulateMode((prev) => {
      const next = !prev;
      if (next) {
        setBuses((curr) => (curr.length > 12 ? INITIAL_BUS_VEHICLES : curr));
        setGtfsMeta((m) => ({
          ...m,
          source: 'simulated-live',
          lastPolledTime: new Date(),
        }));
      } else {
        fetchLiveGtfsVehicles(operatorFilter, true);
      }
      return next;
    });
  };

  // Compute initial First-Mile and Last-Mile OSRM foot legs on mount
  useEffect(() => {
    resolveNearestWalkingRoutes(
      DEFAULT_START_POINT[0],
      DEFAULT_START_POINT[1]
    );
    resolveLastMileRoute(DEFAULT_DEST_POINT[0], DEFAULT_DEST_POINT[1]);
  }, [resolveNearestWalkingRoutes, resolveLastMileRoute]);

  // Smart "Just Walk" Rule: < 600m straight-line apart OR sharing the exact same nearest stop
  const pinToPinStraightMeters = useMemo(() => {
    if (!clickedOrigin || !destinationPoint) return Infinity;
    return getDistanceMeters(
      clickedOrigin[0],
      clickedOrigin[1],
      destinationPoint[0],
      destinationPoint[1]
    );
  }, [clickedOrigin, destinationPoint]);

  const isSameNearestStop = Boolean(
    walkingRoute?.stop &&
      lastMileRoute?.stop &&
      walkingRoute.stop.id === lastMileRoute.stop.id
  );

  const isShortWalk =
    pinToPinStraightMeters < SHORT_WALK_THRESHOLD_METERS || isSameNearestStop;

  // Fetch direct OSRM pedestrian route whenever Smart "Just Walk" Rule activates
  useEffect(() => {
    if (!isShortWalk || !clickedOrigin || !destinationPoint) {
      setDirectWalkRoute(null);
      return;
    }

    let cancelled = false;
    setIsRouting(true);
    fetchDirectWalkingRoute(
      clickedOrigin[0],
      clickedOrigin[1],
      destinationPoint[0],
      destinationPoint[1]
    ).then((res) => {
      if (!cancelled) {
        setDirectWalkRoute(res);
        setIsRouting(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [isShortWalk, clickedOrigin, destinationPoint]);

  // Prune expired crowdsourced alerts (30-minute expiry window) every 10s
  useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now();
      setAlerts((prev) => prev.filter((a) => a.expiresAt > now));
      setTick((t) => t + 1);
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  // Strictly sorted ascending list of nearest stops around Start pin
  const sortedNearestStops = useMemo(
    () =>
      [...nearestStops].sort((a, b) => a.distanceMeters - b.distanceMeters),
    [nearestStops]
  );

  const nearestStopIds = useMemo(
    () => sortedNearestStops.map((item) => item.stop.id),
    [sortedNearestStops]
  );

  // Suggested Bus matching between Stop A (First-Mile) and Stop B (Last-Mile)
  const suggestedBusPlan: SuggestedBusPlan | null = useMemo(() => {
    const stopA = walkingRoute?.stop;
    const stopB = lastMileRoute?.stop;
    if (!stopA || !stopB) return null;

    const isSameStop = stopA.id === stopB.id;
    const directRoutes = stopA.routes.filter((r) => stopB.routes.includes(r));

    const findNearestLiveBus = (routeList: string[]) => {
      const normalized = new Set(routeList.map((r) => r.toUpperCase()));
      const matchingBuses = buses
        .filter((b) => normalized.has(b.routeCode.toUpperCase()))
        .map((b) => ({
          bus: b,
          dist: getDistanceMeters(stopA.lat, stopA.lng, b.lat, b.lng),
        }))
        .sort((a, b) => a.dist - b.dist);

      if (matchingBuses.length > 0) {
        return {
          bus: matchingBuses[0].bus,
          dist: matchingBuses[0].dist,
        };
      }

      if (buses.length > 0) {
        const nearestAny = buses
          .map((b) => ({
            bus: b,
            dist: getDistanceMeters(stopA.lat, stopA.lng, b.lat, b.lng),
          }))
          .sort((a, b) => a.dist - b.dist)[0];
        return {
          bus: nearestAny.bus,
          dist: nearestAny.dist,
        };
      }

      return { bus: null, dist: null };
    };

    if (directRoutes.length > 0) {
      const liveMatch = findNearestLiveBus(directRoutes);
      return {
        isSameStop,
        isDirect: true,
        directRoutes,
        recommendedRoute: directRoutes[0],
        liveBus: liveMatch.bus,
        liveBusDistanceMeters: liveMatch.dist,
      };
    }

    const liveMatch = findNearestLiveBus(stopA.routes);
    return {
      isSameStop: false,
      isDirect: false,
      directRoutes: [],
      recommendedRoute:
        liveMatch.bus &&
        stopA.routes.some(
          (r) => r.toUpperCase() === liveMatch.bus!.routeCode.toUpperCase()
        )
          ? liveMatch.bus.routeCode
          : stopA.routes[0] || liveMatch.bus?.routeCode || 'T850',
      liveBus: liveMatch.bus,
      liveBusDistanceMeters: liveMatch.dist,
    };
  }, [walkingRoute, lastMileRoute, buses]);

  // Midpoint badge label on the solid emerald transit line (e.g., "Bus 400" or "Bus T850")
  const transitRouteLabel = useMemo(() => {
    if (isShortWalk || !suggestedBusPlan) return null;
    return `Bus ${suggestedBusPlan.recommendedRoute}`;
  }, [isShortWalk, suggestedBusPlan]);

  // Drag handlers for Start (Origin) and Destination pins
  const handleOriginDragEnd = useCallback(
    async (lat: number, lng: number) => {
      setClickedOrigin([lat, lng]);
      setDrawerOpen(true);
      setActiveTab('walk');
      await resolveNearestWalkingRoutes(lat, lng);
    },
    [resolveNearestWalkingRoutes]
  );

  const handleDestinationDragEnd = useCallback(
    async (lat: number, lng: number) => {
      setDestinationPoint([lat, lng]);
      setDrawerOpen(true);
      setActiveTab('walk');
      await resolveLastMileRoute(lat, lng);
    },
    [resolveLastMileRoute]
  );

  // Map click moves whichever pin is currently selected in compact "Start | Dest" toggle
  const handleMapClick = useCallback(
    async (lat: number, lng: number) => {
      setDrawerOpen(true);
      setActiveTab('walk');
      if (pinPlacementMode === 'origin') {
        setClickedOrigin([lat, lng]);
        await resolveNearestWalkingRoutes(lat, lng);
      } else {
        setDestinationPoint([lat, lng]);
        await resolveLastMileRoute(lat, lng);
      }
    },
    [pinPlacementMode, resolveNearestWalkingRoutes, resolveLastMileRoute]
  );

  // Select a specific stop as Stop A for the First-Mile leg
  const handleSelectStopForWalk = useCallback(
    async (stop: TransitStop) => {
      setSelectedStopId(stop.id);
      const existing = nearestStops.find((n) => n.stop.id === stop.id);
      if (existing?.route) {
        setWalkingRoute(existing.route);
        return;
      }
      const origin = clickedOrigin ?? KL_CENTER;
      setIsRouting(true);
      const routeResult = await fetchWalkingRoute(origin[0], origin[1], stop);
      setWalkingRoute(routeResult);
      setIsRouting(false);
    },
    [clickedOrigin, nearestStops]
  );

  const handleSelectBus = useCallback(
    (busId: string) => {
      setSelectedBusId(busId);
      setDrawerOpen(true);
      setActiveTab('live');
      const found = buses.find((b) => b.id === busId);
      if (found) {
        flyToRef.current?.(found.lat, found.lng, 15);
      }
    },
    [buses]
  );

  const handleSelectStopFromMap = useCallback(
    (stopId: string) => {
      const stop = KLANG_VALLEY_STOPS.find((s) => s.id === stopId);
      if (!stop) return;
      setSelectedStopId(stopId);
      setDrawerOpen(true);
      setActiveTab('walk');
      handleSelectStopForWalk(stop);
    },
    [handleSelectStopForWalk]
  );

  const handleOpenMap = useCallback(() => {
    setDrawerOpen(true);
    const mapSection = document.getElementById('live-map');
    if (mapSection) {
      mapSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  const handleSelectArea = useCallback(
    async (area: KlangValleyAreaPreset) => {
      setActiveAreaId(area.id);
      setDrawerOpen(true);
      setActiveTab('walk');
      flyToRef.current?.(area.lat, area.lng, 15);
      handleOpenMap();
      if (pinPlacementMode === 'destination') {
        setDestinationPoint([area.lat, area.lng]);
        await resolveLastMileRoute(area.lat, area.lng);
      } else {
        setClickedOrigin([area.lat, area.lng]);
        await resolveNearestWalkingRoutes(area.lat, area.lng);
      }
    },
    [
      handleOpenMap,
      pinPlacementMode,
      resolveLastMileRoute,
      resolveNearestWalkingRoutes,
    ]
  );

  // Submit 1-Click Crowdsourced Alert ('Delayed', 'Full', 'Skipped Stop') with 30-min TTL
  const handleReportAlert = (
    targetId: string,
    targetLabel: string,
    category: AlertCategory
  ) => {
    const newAlert = createCrowdAlert(targetId, targetLabel, category);
    setAlerts((prev) => [newAlert, ...prev]);

    if (category === 'Delayed') {
      setBuses((prev) =>
        prev.map((b) =>
          b.routeCode === targetId ? { ...b, status: 'Delayed' } : b
        )
      );
    } else if (category === 'Full') {
      setBuses((prev) =>
        prev.map((b) =>
          b.routeCode === targetId ? { ...b, occupancy: 'Full Capacity' } : b
        )
      );
    }

    setAlertFeedback(
      `${category} alert logged for ${targetId} · expires in 30 min`
    );
    setTimeout(() => setAlertFeedback(null), 3500);
  };

  const handleUpvoteAlert = (alertId: string) => {
    setAlerts((prev) =>
      prev.map((a) => (a.id === alertId ? { ...a, upvotes: a.upvotes + 1 } : a))
    );
  };

  const filteredBuses = useMemo(() => {
    return buses.filter((bus) => {
      const matchesOp =
        operatorFilter === 'all' || bus.operator === operatorFilter;
      if (!matchesOp) return false;

      const q = searchQuery.trim().toLowerCase();
      if (!q) return true;
      return (
        bus.routeCode.toLowerCase().includes(q) ||
        bus.destination.toLowerCase().includes(q) ||
        bus.origin.toLowerCase().includes(q) ||
        bus.licensePlate.toLowerCase().includes(q) ||
        formatBusTitle(bus).toLowerCase().includes(q)
      );
    });
  }, [buses, operatorFilter, searchQuery]);

  const filteredStops = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    return KLANG_VALLEY_STOPS.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.code.toLowerCase().includes(q) ||
        s.routes.some((r) => r.toLowerCase().includes(q))
    ).slice(0, 4);
  }, [searchQuery]);

  const selectedBus = useMemo(
    () =>
      filteredBuses.find((b) => b.id === selectedBusId) ??
      filteredBuses[0] ??
      buses[0],
    [filteredBuses, buses, selectedBusId]
  );

  const formatRemainingMinutes = (expiresAt: number) => {
    const diff = Math.max(1, Math.ceil((expiresAt - Date.now()) / 60000));
    return `${diff}m left`;
  };

  const totalWalkMinutes =
    (walkingRoute?.durationMinutes ?? 0) +
    (lastMileRoute?.durationMinutes ?? 0);
  const totalWalkMeters =
    (walkingRoute?.distanceMeters ?? 0) + (lastMileRoute?.distanceMeters ?? 0);

  return (
    <div className="min-h-screen w-full bg-white text-[#1E293B]">
      {/* Top Navbar, Exclusive Scenic Hero & Klang Valley Areas Strip */}
      <LiveBusesHero
        onOpenMap={handleOpenMap}
        onSelectArea={handleSelectArea}
        activeAreaId={activeAreaId}
      />

      {/* Interactive Live Map Workspace Section */}
      <section
        id="live-map"
        aria-label="Interactive Kuala Lumpur Live Bus Map"
        className="relative w-full h-[calc(100vh-64px)] min-h-[680px] overflow-hidden bg-slate-100 select-none scroll-mt-16"
      >
        {/* Full-Bleed Leaflet Map */}
        <KlangValleyMap
          buses={filteredBuses}
          stops={KLANG_VALLEY_STOPS}
          nearestStopIds={nearestStopIds}
          selectedBusId={selectedBusId}
          selectedStopId={selectedStopId}
          clickedOrigin={clickedOrigin}
          destinationPoint={destinationPoint}
          walkingRoute={walkingRoute}
          lastMileRoute={lastMileRoute}
          isShortWalk={isShortWalk}
          directWalkRoute={directWalkRoute}
          transitRouteLabel={transitRouteLabel}
          alerts={alerts}
          darkTiles={darkTiles}
          showStops={showStops}
          simulateMode={simulateMode}
          onSelectBus={handleSelectBus}
          onSelectStop={handleSelectStopFromMap}
          onMapClick={handleMapClick}
          onOriginDragEnd={handleOriginDragEnd}
          onDestinationDragEnd={handleDestinationDragEnd}
          registerFlyTo={registerFlyTo}
        />

        {/* Floating Frosted-Glass Search Bar */}
        <div className="absolute top-4 left-4 z-20 flex items-center gap-2">
          <div className="w-[380px] max-w-[calc(100vw-11rem)] sm:max-w-[380px] bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-2xl shadow-sm overflow-hidden">
            <div className="flex items-center h-11 px-3.5 gap-2.5">
              <Search className="w-4 h-4 text-slate-400 shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search route (T460, 300), stop code (KL094)..."
                className="w-full bg-transparent text-xs text-[#243746] placeholder:text-slate-400 focus:outline-none"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="p-1 text-slate-400 hover:text-[#243746] transition-colors cursor-pointer"
                  aria-label="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
              <div className="h-4 w-[1px] bg-slate-200 shrink-0" />
              <button
                onClick={() => setDrawerOpen((prev) => !prev)}
                className="p-1 text-slate-500 hover:text-[#243746] transition-colors shrink-0 cursor-pointer"
                title={drawerOpen ? 'Collapse drawer' : 'Expand drawer'}
                aria-label={drawerOpen ? 'Collapse drawer' : 'Expand drawer'}
              >
                {drawerOpen ? (
                  <ChevronLeft className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
              </button>
            </div>

            {filteredStops.length > 0 && (
              <div className="border-t border-slate-200 bg-white divide-y divide-slate-100">
                {filteredStops.map((stop) => (
                  <button
                    key={stop.id}
                    onClick={() => {
                      setSearchQuery('');
                      handleSelectStopForWalk(stop);
                      setActiveTab('walk');
                      setDrawerOpen(true);
                      flyToRef.current?.(stop.lat, stop.lng, 15);
                    }}
                    className="w-full px-3.5 py-2.5 text-left hover:bg-slate-50 flex items-center justify-between transition-colors cursor-pointer"
                  >
                    <div className="min-w-0 pr-2">
                      <div className="text-xs font-medium text-[#243746] truncate">
                        {stop.name}
                      </div>
                      <div className="text-[11px] text-slate-500 tabular-nums">
                        {stop.code} · Routes {stop.routes.join(', ')}
                      </div>
                    </div>
                    <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Compact Top-Right Floating Pin Mode Toggle: Start | Dest */}
        <div
          className="absolute top-4 right-4 z-20 flex items-center gap-0.5 bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-full p-1 shadow-sm"
          role="group"
          aria-label="Pin placement mode"
        >
          <button
            type="button"
            onClick={() => setPinPlacementMode('origin')}
            title="Click map to place Start pin (or drag blue dot)"
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              pinPlacementMode === 'origin'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-[#243746]'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                pinPlacementMode === 'origin' ? 'bg-white' : 'bg-blue-600'
              }`}
            />
            <span>Start</span>
          </button>

          <button
            type="button"
            onClick={() => setPinPlacementMode('destination')}
            title="Click map to place Destination pin (or drag red pin)"
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              pinPlacementMode === 'destination'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-[#243746]'
            }`}
          >
            <Flag className="w-3 h-3 shrink-0" />
            <span>Dest</span>
          </button>
        </div>

        {/* Collapsible Floating Side Drawer (380px wide) */}
        <aside
          className={`absolute top-[68px] left-4 bottom-4 w-[380px] max-w-[calc(100vw-2rem)] z-20 bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-2xl shadow-sm flex flex-col overflow-hidden transition-transform duration-200 ease-out ${
            drawerOpen ? 'translate-x-0' : '-translate-x-[412px]'
          }`}
          aria-label="Klang Valley Transit Planner Drawer"
        >
          {/* Drawer Header */}
          <div className="px-4 pt-4 pb-3 border-b border-slate-200/80">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <h2 className="text-sm font-semibold tracking-tight text-[#243746] truncate">
                  Klang Valley Live Feed
                </h2>
                <p className="text-xs text-slate-500 mt-0.5 tabular-nums truncate">
                  {simulateMode
                    ? `Simulated feed · ${filteredBuses.length} active buses`
                    : `data.gov.my GTFS-RT · ${gtfsMeta.filteredCount} buses`}
                </p>
              </div>

              <button
                onClick={() => fetchLiveGtfsVehicles(operatorFilter, true)}
                disabled={isPollingGtfs || simulateMode}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-[#243746] bg-slate-100 hover:bg-slate-200/80 border border-slate-200 transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-40"
                title="Refresh live GTFS-Realtime bus positions"
              >
                <RotateCw
                  className={`w-3.5 h-3.5 ${isPollingGtfs ? 'animate-spin' : ''}`}
                />
                <span>{isPollingGtfs ? 'Updating' : 'Refresh'}</span>
              </button>
            </div>

            {/* Primary Navigation Segmented Pill Tabs */}
            <div className="grid grid-cols-3 gap-1 p-1 mt-3 bg-slate-100 rounded-full border border-slate-200/70">
              <button
                onClick={() => setActiveTab('walk')}
                className={`py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer tabular-nums ${
                  activeTab === 'walk'
                    ? 'bg-[#2C3E50] text-white shadow-xs'
                    : 'text-slate-600 hover:text-[#243746]'
                }`}
              >
                Journey
              </button>
              <button
                onClick={() => setActiveTab('live')}
                className={`py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer tabular-nums ${
                  activeTab === 'live'
                    ? 'bg-[#2C3E50] text-white shadow-xs'
                    : 'text-slate-600 hover:text-[#243746]'
                }`}
              >
                Buses ({filteredBuses.length})
              </button>
              <button
                onClick={() => setActiveTab('alerts')}
                className={`py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer tabular-nums ${
                  activeTab === 'alerts'
                    ? 'bg-[#2C3E50] text-white shadow-xs'
                    : 'text-slate-600 hover:text-[#243746]'
                }`}
              >
                Alerts ({alerts.length})
              </button>
            </div>
          </div>

          {/* Transient Feedback Banner for 1-Click Alert Submission */}
          {alertFeedback && (
            <div className="px-4 py-2 bg-[#2C3E50] text-white text-xs flex items-center justify-between border-b border-slate-700">
              <span>{alertFeedback}</span>
              <button
                onClick={() => setAlertFeedback(null)}
                className="text-slate-300 hover:text-white cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Drawer Body Content */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-200/80">
            {/* TAB 1: FIRST + LAST-MILE JOURNEY PLANNER (OR SMART "JUST WALK" BANNER) */}
            {activeTab === 'walk' && (
              <div className="p-4 space-y-4">
                {isShortWalk ? (
                  /* Smart "Just Walk" Rule Banner (< 600m apart or same nearest stop) */
                  <div className="rounded-xl border border-blue-200 border-l-4 border-l-blue-600 bg-blue-50/50 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-blue-700">
                          <Footprints className="w-4 h-4 shrink-0" />
                          <span>Short walk — no bus needed</span>
                        </div>
                        <p className="mt-1 text-xs text-slate-600">
                          {pinToPinStraightMeters < SHORT_WALK_THRESHOLD_METERS
                            ? 'Your Start and Destination pins are less than 600 m apart. A direct sidewalk route is faster than boarding a bus.'
                            : 'Both pins share the same nearest transit stop. Walking directly is recommended.'}
                        </p>
                      </div>
                    </div>

                    {directWalkRoute && (
                      <div className="mt-3 pt-2.5 border-t border-blue-200/70 flex items-baseline justify-between">
                        <div>
                          <span className="text-lg font-semibold text-[#243746] tabular-nums">
                            {directWalkRoute.durationMinutes} min
                          </span>
                          <span className="text-xs text-slate-600 ml-1.5">
                            direct walk
                          </span>
                        </div>
                        <span className="text-xs text-slate-600 tabular-nums">
                          {directWalkRoute.distanceMeters} m · Sidewalk route
                        </span>
                      </div>
                    )}
                  </div>
                ) : (
                  /* 3-Step First / Last-Mile Journey Card */
                  walkingRoute &&
                  lastMileRoute && (
                    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
                      <div className="px-3.5 py-2.5 bg-slate-50/90 border-b border-slate-200/80 flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-[#243746]">
                          First &amp; Last-Mile Journey
                        </span>
                        <span className="text-[11px] font-medium text-slate-600 tabular-nums">
                          {totalWalkMinutes} min walk ({totalWalkMeters} m)
                        </span>
                      </div>

                      <div className="divide-y divide-slate-200/70">
                        {/* Step 1: Walk to Stop A (Solid Blue Accent) */}
                        <div className="border-l-4 border-l-blue-600 bg-blue-50/40 px-3.5 py-3">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5 text-xs font-semibold text-blue-700">
                              <Footprints className="w-3.5 h-3.5 shrink-0" />
                              <span>Walk to Stop A</span>
                            </div>
                            <span className="text-xs font-semibold text-[#243746] tabular-nums shrink-0">
                              {walkingRoute.durationMinutes} min (
                              {walkingRoute.distanceMeters} m)
                            </span>
                          </div>
                          <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-700">
                            <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                            <span className="font-medium text-[#243746] tabular-nums shrink-0">
                              {walkingRoute.stop.code}
                            </span>
                            <span className="truncate">
                              {walkingRoute.stop.name}
                            </span>
                          </div>
                        </div>

                        {/* Step 2: Suggested Bus (Emerald Solid Transit Segment) */}
                        {suggestedBusPlan && (
                          <div className="border-l-4 border-l-emerald-600 bg-emerald-50/35 px-3.5 py-3">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                                <Bus className="w-3.5 h-3.5 shrink-0" />
                                <span>Suggested Bus</span>
                              </div>

                              {suggestedBusPlan.isDirect ? (
                                <span className="text-[11px] font-semibold text-emerald-700">
                                  Direct route
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                                  Transfer required
                                </span>
                              )}
                            </div>

                            <div className="mt-2 flex items-center justify-between gap-2">
                              <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                                {suggestedBusPlan.isDirect ? (
                                  suggestedBusPlan.directRoutes.map((code) => (
                                    <span
                                      key={code}
                                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold tabular-nums ${getRoutePillClasses(
                                        code
                                      )}`}
                                    >
                                      {code}
                                    </span>
                                  ))
                                ) : (
                                  <span
                                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold tabular-nums ${getRoutePillClasses(
                                      suggestedBusPlan.recommendedRoute
                                    )}`}
                                  >
                                    {suggestedBusPlan.recommendedRoute}
                                  </span>
                                )}

                                <span className="text-xs text-slate-600 truncate">
                                  {suggestedBusPlan.isDirect
                                    ? `${walkingRoute.stop.code} → ${lastMileRoute.stop.code}`
                                    : `Board at ${walkingRoute.stop.code}`}
                                </span>
                              </div>

                              {suggestedBusPlan.liveBus && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedBusId(
                                      suggestedBusPlan.liveBus!.id
                                    );
                                    flyToRef.current?.(
                                      suggestedBusPlan.liveBus!.lat,
                                      suggestedBusPlan.liveBus!.lng,
                                      15
                                    );
                                  }}
                                  className="text-[11px] font-semibold text-[#243746] hover:text-emerald-700 tabular-nums shrink-0 cursor-pointer"
                                  title="Locate live bus on map"
                                >
                                  Live · {suggestedBusPlan.liveBus.etaMinutes}{' '}
                                  min
                                </button>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Step 3: Walk to Destination (Dashed Red Accent) */}
                        <div className="border-l-4 border-l-rose-600 bg-rose-50/40 px-3.5 py-3">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5 text-xs font-semibold text-rose-700">
                              <Footprints className="w-3.5 h-3.5 shrink-0" />
                              <span>Walk to Destination</span>
                            </div>
                            <span className="text-xs font-semibold text-[#243746] tabular-nums shrink-0">
                              {lastMileRoute.durationMinutes} min (
                              {lastMileRoute.distanceMeters} m)
                            </span>
                          </div>
                          <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-700">
                            <Flag className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                            <span className="text-slate-500 shrink-0">
                              from Stop B:
                            </span>
                            <span className="font-medium text-[#243746] tabular-nums shrink-0">
                              {lastMileRoute.stop.code}
                            </span>
                            <span className="truncate">
                              {lastMileRoute.stop.name}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                )}

                {/* Nearest 3 Highlighted Stops around Start Pin — Strictly Sorted Ascending by Distance */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xs font-semibold text-[#243746]">
                      Nearest stops to Start (closest first)
                    </h3>
                    <span className="text-[11px] text-slate-500">
                      {isRouting
                        ? 'Calculating...'
                        : 'Drag Start or Dest pin'}
                    </span>
                  </div>

                  <div className="divide-y divide-slate-200/80 border border-slate-200 rounded-xl bg-white overflow-hidden">
                    {sortedNearestStops.map(
                      ({ stop, distanceMeters, durationMinutes }, index) => {
                        const isStopA =
                          !isShortWalk && walkingRoute?.stop.id === stop.id;
                        const stopAlerts = alerts.filter(
                          (a) => a.targetId === stop.code
                        );

                        return (
                          <div
                            key={stop.id}
                            className={`p-3.5 transition-colors ${
                              isStopA
                                ? 'bg-blue-50/35'
                                : 'bg-white hover:bg-slate-50/80'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <span
                                    className={`px-1.5 py-0.5 rounded-full text-[10px] font-semibold text-white tabular-nums shrink-0 ${
                                      isStopA
                                        ? 'bg-blue-600'
                                        : 'bg-[#2C3E50]'
                                    }`}
                                  >
                                    {isStopA ? 'Stop A' : `#${index + 1}`}
                                  </span>
                                  <span className="text-[11px] font-semibold text-slate-500 tabular-nums shrink-0">
                                    {stop.code}
                                  </span>
                                  <span className="text-xs font-semibold text-[#243746] truncate">
                                    {stop.name}
                                  </span>
                                </div>

                                <div className="mt-1.5 flex flex-wrap items-center gap-1">
                                  {stop.routes.map((routeCode) => (
                                    <span
                                      key={routeCode}
                                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold tabular-nums ${getRoutePillClasses(
                                        routeCode
                                      )}`}
                                    >
                                      {routeCode}
                                    </span>
                                  ))}
                                  <span className="text-[11px] text-slate-400 ml-1 truncate">
                                    {stop.district}
                                  </span>
                                </div>
                              </div>

                              <div className="text-right shrink-0 tabular-nums">
                                <div className="text-xs font-semibold text-[#243746]">
                                  {durationMinutes} min
                                </div>
                                <div className="text-[11px] text-slate-500">
                                  {distanceMeters} m
                                </div>
                              </div>
                            </div>

                            {stopAlerts.length > 0 && (
                              <div className="mt-2.5 pt-2 border-t border-slate-200/80 space-y-1">
                                {stopAlerts.map((al) => (
                                  <div
                                    key={al.id}
                                    className="flex items-center justify-between text-xs"
                                  >
                                    <div className="flex items-center gap-1.5">
                                      <span
                                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold text-white ${
                                          al.category === 'Delayed'
                                            ? 'bg-amber-600'
                                            : 'bg-red-600'
                                        }`}
                                      >
                                        {al.category}
                                      </span>
                                      <span className="text-slate-600">
                                        Active report
                                      </span>
                                    </div>
                                    <span className="text-slate-500 tabular-nums text-[11px]">
                                      {formatRemainingMinutes(al.expiresAt)}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}

                            <div className="mt-3 pt-2.5 border-t border-slate-200/80 flex items-center justify-between gap-1.5">
                              <button
                                onClick={() => {
                                  handleSelectStopForWalk(stop);
                                  flyToRef.current?.(stop.lat, stop.lng, 15);
                                }}
                                className={`px-3 py-1 rounded-full text-[11px] font-medium border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                                  isStopA
                                    ? 'bg-blue-600 text-white border-blue-600'
                                    : 'bg-white text-[#243746] border-slate-300 hover:border-[#2C3E50]'
                                }`}
                              >
                                {isStopA ? 'Active Stop A' : 'Use as Stop A'}
                              </button>

                              <div className="flex items-center gap-1.5">
                                <button
                                  onClick={() =>
                                    handleReportAlert(
                                      stop.code,
                                      `${stop.code} ${stop.name}`,
                                      'Delayed'
                                    )
                                  }
                                  className="px-2.5 py-1 rounded-full text-[11px] font-medium text-amber-800 bg-amber-50 hover:bg-amber-600 hover:text-white border border-amber-300 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                                  title="Report 30-minute Delayed alert at this stop"
                                >
                                  + Delayed
                                </button>
                                <button
                                  onClick={() =>
                                    handleReportAlert(
                                      stop.code,
                                      `${stop.code} ${stop.name}`,
                                      'Full'
                                    )
                                  }
                                  className="px-2.5 py-1 rounded-full text-[11px] font-medium text-red-800 bg-red-50 hover:bg-red-600 hover:text-white border border-red-300 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                                  title="Report 30-minute Full bus alert at this stop"
                                >
                                  + Full
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      }
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: LIVE DATA.GOV.MY GTFS-REALTIME / SIMULATED BUSES */}
            {activeTab === 'live' && (
              <>
                <div className="px-4 py-2.5 bg-slate-50/80 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setOperatorFilter('rapid-bus-mrtfeeder')}
                      className={`px-3 py-1 rounded-full text-[11px] font-medium border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                        operatorFilter === 'rapid-bus-mrtfeeder'
                          ? 'bg-[#2E8B2E] text-white border-[#2E8B2E]'
                          : 'bg-white text-slate-600 border-slate-200 hover:border-[#2C3E50]'
                      }`}
                    >
                      MRT Feeder
                    </button>
                    <button
                      onClick={() => setOperatorFilter('rapid-bus-kl')}
                      className={`px-3 py-1 rounded-full text-[11px] font-medium border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                        operatorFilter === 'rapid-bus-kl'
                          ? 'bg-[#2C3E50] text-white border-[#2C3E50]'
                          : 'bg-white text-slate-600 border-slate-200 hover:border-[#2C3E50]'
                      }`}
                    >
                      RapidKL
                    </button>
                    <button
                      onClick={() => setOperatorFilter('all')}
                      className={`px-3 py-1 rounded-full text-[11px] font-medium border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                        operatorFilter === 'all'
                          ? 'bg-[#2C3E50] text-white border-[#2C3E50]'
                          : 'bg-white text-slate-600 border-slate-200 hover:border-[#2C3E50]'
                      }`}
                    >
                      All
                    </button>
                  </div>
                  <span className="text-[11px] text-slate-500 tabular-nums">
                    {gtfsMeta.lastPolledTime.toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>

                <div className="divide-y divide-slate-200/70">
                  {filteredBuses.map((bus) => {
                    const isSelected = bus.id === selectedBusId;
                    const isDelayed =
                      bus.status === 'Delayed' ||
                      alerts.some(
                        (a) =>
                          a.targetId === bus.routeCode &&
                          a.category === 'Delayed'
                      );

                    const semanticBadgeClass = isDelayed
                      ? 'bg-amber-600 text-white'
                      : bus.operator === 'rapid-bus-mrtfeeder'
                      ? 'bg-[#2E8B2E] text-white'
                      : 'bg-red-600 text-white';

                    const busTitle = formatBusTitle(bus);

                    return (
                      <div
                        key={bus.id}
                        onClick={() => {
                          setSelectedBusId(bus.id);
                          flyToRef.current?.(bus.lat, bus.lng, 15);
                        }}
                        className={`px-4 py-3.5 transition-colors cursor-pointer ${
                          isSelected ? 'bg-slate-100/90' : 'hover:bg-slate-50/80'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2.5">
                          <div className="flex items-center gap-2 min-w-0">
                            <span
                              className={`inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-tight tabular-nums shrink-0 ${semanticBadgeClass}`}
                            >
                              {bus.routeCode}
                            </span>
                            <span className="text-[13px] font-semibold text-[#243746] truncate">
                              {busTitle}
                            </span>
                          </div>
                          <span className="text-[13px] font-semibold text-[#243746] tabular-nums shrink-0">
                            {bus.etaMinutes} min
                          </span>
                        </div>

                        <div className="mt-1 flex items-center justify-between gap-2 text-xs text-slate-500">
                          <div className="truncate tabular-nums">
                            <span>{bus.licensePlate}</span>
                            <span className="mx-1.5">·</span>
                            <span>{bus.speedKmh} km/h</span>
                            <span className="mx-1.5">·</span>
                            <span>{bus.occupancy}</span>
                          </div>
                          <span
                            className={`shrink-0 ${
                              isDelayed
                                ? 'text-amber-700 font-medium'
                                : 'text-slate-500'
                            }`}
                          >
                            {isDelayed ? 'Delayed' : 'On Time'}
                          </span>
                        </div>

                        {isSelected && (
                          <div
                            className="mt-3 pt-2.5 border-t border-slate-200/80 flex items-center justify-between gap-2"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <span className="text-[11px] text-slate-500">
                              Report (30m):
                            </span>
                            <div className="flex items-center gap-1.5">
                              {(
                                ['Delayed', 'Full', 'Skipped Stop'] as AlertCategory[]
                              ).map((cat) => (
                                <button
                                  key={cat}
                                  onClick={() =>
                                    handleReportAlert(
                                      bus.routeCode,
                                      `Route ${bus.routeCode} (${bus.licensePlate})`,
                                      cat
                                    )
                                  }
                                  className="px-2.5 py-1 rounded-full text-[11px] font-medium text-[#243746] bg-white hover:bg-[#2C3E50] hover:text-white border border-slate-300 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                                >
                                  {cat}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            {/* TAB 3: CROWDSOURCED ALERTS (30-MINUTE EXPIRY) */}
            {activeTab === 'alerts' && (
              <div className="p-4 space-y-4">
                {selectedBus && (
                  <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3.5">
                    <div className="flex items-center justify-between mb-2.5">
                      <span className="text-xs font-semibold text-[#243746]">
                        Quick report · Route {selectedBus.routeCode}
                      </span>
                      <span className="text-[11px] text-slate-500">
                        Expires in 30 min
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {(['Delayed', 'Full'] as AlertCategory[]).map(
                        (category) => (
                          <button
                            key={category}
                            onClick={() =>
                              handleReportAlert(
                                selectedBus.routeCode,
                                `Route ${selectedBus.routeCode} (${selectedBus.licensePlate})`,
                                category
                              )
                            }
                            className="py-1.5 px-3 rounded-full text-xs font-medium bg-white hover:bg-[#2C3E50] text-[#243746] hover:text-white border border-slate-300 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                          >
                            + {category}
                          </button>
                        )
                      )}
                    </div>
                  </div>
                )}

                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-semibold text-[#243746]">
                      Active alerts
                    </h3>
                    <span className="text-[11px] text-slate-500">
                      Auto-expires after 30 min
                    </span>
                  </div>

                  {alerts.length === 0 ? (
                    <div className="rounded-xl border border-slate-200 p-6 text-center">
                      <p className="text-xs text-slate-600">
                        No active alerts in the last 30 minutes.
                      </p>
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-200/80 border border-slate-200 rounded-xl bg-white overflow-hidden">
                      {alerts.map((alert) => {
                        const badgeTone =
                          alert.category === 'Delayed'
                            ? 'bg-amber-600 text-white'
                            : alert.category === 'Full'
                            ? 'bg-red-600 text-white'
                            : 'bg-[#2C3E50] text-white';

                        return (
                          <div key={alert.id} className="p-3.5">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2 min-w-0">
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-semibold shrink-0 ${badgeTone}`}
                                >
                                  {alert.category}
                                </span>
                                <span className="text-xs font-semibold text-[#243746] truncate">
                                  {alert.targetLabel}
                                </span>
                              </div>
                              <span className="text-[11px] text-slate-500 shrink-0 tabular-nums">
                                {formatRemainingMinutes(alert.expiresAt)}
                              </span>
                            </div>

                            {alert.note && (
                              <p className="text-xs text-slate-600 mt-1.5">
                                {alert.note}
                              </p>
                            )}

                            <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-500 tabular-nums">
                              <span>
                                Reported{' '}
                                {new Date(alert.createdAt).toLocaleTimeString(
                                  [],
                                  {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  }
                                )}
                              </span>
                              <button
                                onClick={() => handleUpvoteAlert(alert.id)}
                                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-slate-700 hover:text-[#243746] bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-colors cursor-pointer"
                              >
                                <ThumbsUp className="w-3 h-3" />
                                <span>Confirm ({alert.upvotes})</span>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Drawer Footer: Semantic Legend + Compact "Simulate Live" Switch */}
          <div className="px-4 py-2.5 border-t border-slate-200/80 bg-slate-50/90 flex items-center justify-between gap-2 text-[11px] text-slate-600">
            <div className="flex items-center gap-2.5">
              <span className="inline-flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-red-600 inline-block" />
                <span>RapidKL</span>
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-[#2E8B2E] inline-block" />
                <span>MRT</span>
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-amber-600 inline-block" />
                <span>Delayed</span>
              </span>
            </div>

            <button
              onClick={handleToggleSimulateMode}
              role="switch"
              aria-checked={simulateMode}
              title="Toggle simulated live bus movement fallback"
              className="inline-flex items-center gap-1.5 text-[11px] font-medium text-[#243746] hover:text-[#2E8B2E] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <span>Simulate Live</span>
              <span
                className={`relative inline-flex h-4 w-7 items-center rounded-full transition-colors ${
                  simulateMode ? 'bg-[#2E8B2E]' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`inline-block h-3 w-3 rounded-full bg-white transition-transform ${
                    simulateMode ? 'translate-x-3.5' : 'translate-x-0.5'
                  }`}
                />
              </span>
            </button>
          </div>
        </aside>

        {/* Bottom-Right Map Controls */}
        <div className="absolute bottom-6 right-4 z-20 flex flex-col bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-2xl shadow-sm overflow-hidden divide-y divide-slate-200/80">
          <button
            onClick={() => flyToRef.current?.(3.1422, 101.6988, 14)}
            className="p-2.5 text-slate-600 hover:text-[#243746] hover:bg-slate-100/80 transition-colors cursor-pointer"
            title="Recenter map on Kuala Lumpur"
            aria-label="Recenter map on Kuala Lumpur"
          >
            <Compass className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowStops((prev) => !prev)}
            className="p-2.5 text-slate-600 hover:text-[#243746] hover:bg-slate-100/80 transition-colors cursor-pointer"
            title={showStops ? 'Hide transit stops' : 'Show transit stops'}
            aria-label={showStops ? 'Hide transit stops' : 'Show transit stops'}
          >
            {showStops ? (
              <Eye className="w-4 h-4" />
            ) : (
              <EyeOff className="w-4 h-4" />
            )}
          </button>
          <button
            onClick={() => setDarkTiles((prev) => !prev)}
            className="p-2.5 text-slate-600 hover:text-[#243746] hover:bg-slate-100/80 transition-colors cursor-pointer"
            title={darkTiles ? 'Switch to Light Map' : 'Switch to Dark Map'}
            aria-label="Toggle map basemap theme"
          >
            {darkTiles ? (
              <Sun className="w-4 h-4" />
            ) : (
              <Moon className="w-4 h-4" />
            )}
          </button>
        </div>
      </section>
    </div>
  );
}
