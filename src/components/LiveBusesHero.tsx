import React from 'react';
import { ArrowUpRight } from 'lucide-react';

export interface KlangValleyAreaPreset {
  id: string;
  name: string;
  subtitle: string;
  lat: number;
  lng: number;
  routes: string[];
}

export const KLANG_VALLEY_AREAS: KlangValleyAreaPreset[] = [
  {
    id: 'area-klcc',
    name: 'KLCC & Jalan Ampang',
    subtitle: 'Suria KLCC · Ampang Park',
    lat: 3.1588,
    lng: 101.7118,
    routes: ['300', '302', 'B103'],
  },
  {
    id: 'area-bb-trx',
    name: 'Bukit Bintang & TRX',
    subtitle: 'MRT Bukit Bintang · Exchange 106',
    lat: 3.1476,
    lng: 101.7108,
    routes: ['T460', '400', '420'],
  },
  {
    id: 'area-sentral',
    name: 'KL Sentral & Brickfields',
    subtitle: 'Main Intermodal Hub',
    lat: 3.1342,
    lng: 101.6861,
    routes: ['T850', '600', '780'],
  },
  {
    id: 'area-pasar-seni',
    name: 'Pasar Seni & Masjid Jamek',
    subtitle: 'City Centre South · Civic Quarter',
    lat: 3.1425,
    lng: 101.6953,
    routes: ['400', '500', 'B103'],
  },
];

interface LiveBusesHeroProps {
  onOpenMap: () => void;
  onSelectArea: (area: KlangValleyAreaPreset) => void;
  activeAreaId: string | null;
}

export const LiveBusesHero: React.FC<LiveBusesHeroProps> = ({
  onOpenMap,
  onSelectArea,
  activeAreaId,
}) => {
  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <>
      {/* Exclusive Crisp White Top Navigation Bar matching reference */}
      <header className="sticky top-0 z-40 h-16 w-full bg-white/95 backdrop-blur-md border-b border-slate-200/80">
        <div className="mx-auto flex h-full max-w-[1380px] items-center justify-between gap-8 px-6 md:px-10">
          {/* Zone 1: Single clean wordmark in deep slate navy */}
          <a
            href="#home"
            onClick={(e) => {
              e.preventDefault();
              scrollToSection('home');
            }}
            className="text-[22px] font-bold tracking-tight text-[#243746] whitespace-nowrap shrink-0"
          >
            KV Transit
          </a>

          {/* Zone 2: Minimal 3-link text navigation matching reference */}
          <nav
            aria-label="Primary navigation"
            className="flex items-center gap-6 md:gap-8 text-[15px] font-normal text-[#243746]"
          >
            <button
              type="button"
              onClick={() => scrollToSection('home')}
              className="hover:text-[#2E8B2E] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Home
            </button>
            <button
              type="button"
              onClick={onOpenMap}
              className="hover:text-[#2E8B2E] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Map
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('areas')}
              className="hover:text-[#2E8B2E] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Areas
            </button>
          </nav>
        </div>
      </header>

      {/* Scenic Hero Banner matching reference composition, colors, typography, and pill CTA */}
      <section
        id="home"
        className="relative w-full h-[500px] md:h-[580px] overflow-hidden bg-[#9EB1C2] flex items-center justify-center"
      >
        {/* Atmospheric Scenic Highway & Bus Roof Backdrop SVG (no external URLs, zero watermarks) */}
        <svg
          aria-hidden="true"
          viewBox="0 0 1600 760"
          preserveAspectRatio="xMidYMid slice"
          className="absolute inset-0 w-full h-full object-cover select-none pointer-events-none"
        >
          <defs>
            <linearGradient id="kvSky" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#AFC0D1" />
              <stop offset="52%" stopColor="#DCE4EC" />
              <stop offset="100%" stopColor="#EEF2F6" />
            </linearGradient>
            <linearGradient id="kvFieldLeft" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#8DA05B" />
              <stop offset="55%" stopColor="#778C4A" />
              <stop offset="100%" stopColor="#61733E" />
            </linearGradient>
            <linearGradient id="kvFieldRight" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#A5B378" />
              <stop offset="58%" stopColor="#8E9D60" />
              <stop offset="100%" stopColor="#7E705F" />
            </linearGradient>
            <linearGradient id="kvRoad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#B8BFC6" />
              <stop offset="50%" stopColor="#8C939A" />
              <stop offset="100%" stopColor="#686F76" />
            </linearGradient>
            <linearGradient id="kvBusBody" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#F8FAFC" />
              <stop offset="100%" stopColor="#CBD5E1" />
            </linearGradient>
            <radialGradient id="kvCenterScrim" cx="50%" cy="44%" r="48%">
              <stop offset="0%" stopColor="#1E293B" stopOpacity="0.34" />
              <stop offset="100%" stopColor="#1E293B" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Soft Overcast Daylight Sky */}
          <rect width="1600" height="420" fill="url(#kvSky)" />

          {/* Soft Cloud Banks */}
          <g fill="#FFFFFF" opacity="0.52">
            <ellipse cx="260" cy="140" rx="280" ry="48" />
            <ellipse cx="760" cy="115" rx="340" ry="56" />
            <ellipse cx="1290" cy="145" rx="310" ry="52" />
            <ellipse cx="520" cy="210" rx="260" ry="42" opacity="0.7" />
            <ellipse cx="1090" cy="205" rx="290" ry="40" opacity="0.65" />
          </g>

          {/* Distant Misty Hills */}
          <path
            d="M0 355 Q240 315 510 342 T1060 330 T1600 345 L1600 450 L0 450 Z"
            fill="#8F9E84"
            opacity="0.7"
          />

          {/* Tree Canopy Line across Horizon */}
          <g fill="#4E5F3E">
            <circle cx="95" cy="340" r="64" />
            <circle cx="170" cy="332" r="76" />
            <circle cx="255" cy="348" r="60" />
            <circle cx="345" cy="322" r="74" />
            <circle cx="430" cy="342" r="62" />
            <circle cx="520" cy="335" r="54" />
            <circle cx="620" cy="348" r="50" />
            <circle cx="720" cy="334" r="66" />
            <circle cx="815" cy="342" r="58" />
            <circle cx="905" cy="328" r="70" />
            <circle cx="995" cy="346" r="56" />
            <circle cx="1115" cy="330" r="64" />
            <circle cx="1220" cy="342" r="70" />
            <circle cx="1320" cy="324" r="78" />
            <circle cx="1430" cy="345" r="66" />
            <circle cx="1535" cy="332" r="74" />
          </g>
          <g fill="#617748" opacity="0.82">
            <circle cx="135" cy="360" r="52" />
            <circle cx="290" cy="365" r="58" />
            <circle cx="475" cy="362" r="48" />
            <circle cx="765" cy="360" r="54" />
            <circle cx="945" cy="364" r="52" />
            <circle cx="1170" cy="362" r="56" />
            <circle cx="1380" cy="358" r="60" />
          </g>

          {/* Open Green Slopes Left & Right */}
          <path
            d="M0 375 L1600 375 L1600 760 L0 760 Z"
            fill="url(#kvFieldLeft)"
          />
          <path
            d="M840 375 L1600 375 L1600 760 L790 760 Z"
            fill="url(#kvFieldRight)"
          />

          {/* Subtle Field Hedgerows */}
          <path
            d="M0 448 Q280 432 620 452"
            stroke="#3E4E2E"
            strokeWidth="22"
            fill="none"
            strokeLinecap="round"
            opacity="0.72"
          />
          <path
            d="M990 462 Q1280 448 1600 475"
            stroke="#445534"
            strokeWidth="20"
            fill="none"
            strokeLinecap="round"
            opacity="0.68"
          />

          {/* Winding Asphalt Transit Road from Horizon to Foreground */}
          <path
            d="M845 415 C900 458 965 510 950 555 C932 608 755 648 615 760 L1025 760 C985 655 1030 572 995 512 C965 460 905 432 868 415 Z"
            fill="url(#kvRoad)"
          />
          {/* Subtle Center Dashed Road Line */}
          <path
            d="M858 418 C915 462 978 518 962 565 C945 615 845 668 785 760"
            stroke="#E2E8F0"
            strokeWidth="4"
            strokeDasharray="18 20"
            fill="none"
            opacity="0.75"
          />

          {/* Roadside Bush Foliage Framing the Road Curve */}
          <g fill="#42582F">
            <ellipse cx="1015" cy="512" rx="68" ry="56" />
            <ellipse cx="1072" cy="532" rx="54" ry="44" />
            <ellipse cx="520" cy="642" rx="92" ry="44" opacity="0.88" />
            <ellipse cx="420" cy="680" rx="110" ry="52" opacity="0.85" />
          </g>

          {/* Foreground Bus Top & Amber LED Matrix Sign (echoing reference focal framing) */}
          <g transform="translate(808, 636)">
            {/* Roof Shell */}
            <path
              d="M36 0 L374 0 C406 0 422 18 426 48 L434 130 L-12 130 L-2 48 C2 18 14 0 36 0 Z"
              fill="url(#kvBusBody)"
              stroke="#94A3B8"
              strokeWidth="2"
            />
            {/* Transit Accent Shoulder Stripe */}
            <path
              d="M-6 58 L26 58 L16 130 L-14 130 Z"
              fill="#2B7AC9"
              opacity="0.92"
            />
            <path
              d="M404 58 L428 58 L434 130 L414 130 Z"
              fill="#2B7AC9"
              opacity="0.92"
            />
            {/* Destination Sign Bezel */}
            <rect
              x="108"
              y="22"
              width="284"
              height="68"
              rx="10"
              fill="#1E293B"
              stroke="#334155"
              strokeWidth="3"
            />
            {/* Amber LED Matrix Text */}
            <text
              x="250"
              y="66"
              textAnchor="middle"
              fill="#F59E0B"
              fontSize="25"
              fontWeight="700"
              letterSpacing="1.5"
              fontFamily="Inter, sans-serif"
            >
              T460 KV TRANSIT
            </text>
          </g>

          {/* Measured Legibility Scrim Behind Centered Headline */}
          <rect width="1600" height="760" fill="url(#kvCenterScrim)" />
        </svg>

        {/* Centered Editorial Hero Headline, 1-Line Subtext & Pill CTA */}
        <div className="relative z-10 mx-auto max-w-4xl px-6 text-center -mt-4">
          <h1
            className="text-[38px] sm:text-[54px] md:text-[64px] font-semibold tracking-tight text-white leading-[1.12] [text-wrap:balance]"
            style={{ textShadow: '0 3px 20px rgba(15, 23, 42, 0.42)' }}
          >
            <span className="inline-flex flex-wrap items-center justify-center gap-x-3 gap-y-2">
              <span>Your</span>
              <span className="inline-block rounded-lg bg-[#2E8B2E]/90 px-4 py-0.5 border border-[#1E6A20]/50 shadow-sm">
                Klang Valley
              </span>
            </span>
            <span className="mt-1 block">commute, live.</span>
          </h1>

          <p
            className="mt-4 text-sm sm:text-base font-medium text-white/95 max-w-2xl mx-auto"
            style={{ textShadow: '0 2px 12px rgba(15, 23, 42, 0.55)' }}
          >
            Real-time RapidKL &amp; MRT feeder buses with nearest-stop walking routes.
          </p>

          <div className="mt-7 flex justify-center">
            <button
              type="button"
              onClick={onOpenMap}
              className="rounded-full bg-[#2C3E50] hover:bg-[#1E2D3B] active:scale-[0.99] px-9 py-3.5 text-[15px] font-medium text-white shadow-sm transition-all whitespace-nowrap shrink-0 cursor-pointer"
            >
              Explore Live Map
            </button>
          </div>
        </div>
      </section>

      {/* Clean White Klang Valley Areas Quick-Jump Strip ("Areas" navigation target) */}
      <section
        id="areas"
        aria-label="Klang Valley transit areas"
        className="w-full bg-white border-b border-slate-200/80"
      >
        <div className="mx-auto max-w-[1380px] px-6 md:px-10 py-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 mb-4">
            <div>
              <h2 className="text-base font-semibold tracking-tight text-[#243746]">
                Klang Valley Areas
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Jump directly to a Kuala Lumpur transit hub to track live buses and walking routes.
              </p>
            </div>
            <span className="text-xs text-slate-400">
              RapidKL · MRT Feeder · OSRM First/Last-Mile
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {KLANG_VALLEY_AREAS.map((area) => {
              const isActive = activeAreaId === area.id;
              return (
                <button
                  key={area.id}
                  type="button"
                  onClick={() => onSelectArea(area)}
                  className={`group text-left p-4 rounded-xl border transition-all cursor-pointer ${
                    isActive
                      ? 'border-[#2C3E50] bg-slate-50/90'
                      : 'border-slate-200 bg-white hover:border-[#2C3E50]/50 hover:bg-slate-50/50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-[#243746] truncate">
                        {area.name}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5 truncate">
                        {area.subtitle}
                      </div>
                    </div>
                    <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-[#2C3E50] shrink-0 transition-colors" />
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-1.5">
                    {area.routes.map((code) => (
                      <span
                        key={code}
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold tabular-nums text-white ${
                          /^T\d/i.test(code) ? 'bg-[#2E8B2E]' : 'bg-red-600'
                        }`}
                      >
                        {code}
                      </span>
                    ))}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </section>
    </>
  );
};
