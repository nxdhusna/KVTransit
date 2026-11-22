# 🚌 KVTransit — Klang Valley Real-Time Transit & First/Last-Mile Route Planner

[![Live Demo](https://img.shields.io/badge/Live%20Demo-GitHub%20Pages-blue?style=for-the-badge&logo=github)](https://YOUR_GITHUB_USERNAME.github.io/KVTransit/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg?style=for-the-badge)](LICENSE)

An interactive web application engineered to solve the "ghost bus" and first/last-mile connectivity challenge in Greater Kuala Lumpur. By ingesting official real-time GTFS-Realtime binary streams from `data.gov.my`, KVTransit provides live GPS tracking for over 80+ RapidKL and MRT feeder buses paired with pedestrian routing via OSRM.

👉 **[Experience the Live Demo Here](https://YOUR_GITHUB_USERNAME.github.io/KVTransit/)**

---

## 🎯 The Problem & Solution

### The Challenge in Klang Valley

1. **The "Ghost Bus" Dilemma:** Commuters waiting for MRT feeder buses (`T-series`) or RapidKL trunk routes often face unpredictable delays and missing timetable synchronization.
2. **First/Last-Mile Friction:** Knowing a bus is 5 minutes away is unhelpful if you don't know the shortest walking path to the exact bus stop or how to navigate from your drop-off stop to your final destination.

### The Engineering Solution

**KVTransit** bridges physical telemetry and pedestrian graph routing into a unified interface:

* **Live Telemetry Proxy & Fallback Engine:** Decodes binary Protocol Buffer feeds from `data.gov.my` every 30 seconds to plot vehicle locations, speeds, and bearings. Falls back gracefully to client-side simulated telemetry when running on static deployments.
* **Dual-Leg Pedestrian Routing:** Calculates exact walking paths (`Origin → Stop A` and `Stop B → Destination`) using real sidewalk topology via OSRM instead of straight-line highway loops.
* **Crowdsourced Intelligence:** Enables riders to broadcast localized alerts (`+ Delayed`, `+ Full`) with automatic 30-minute expiry windows.

---

## 🚀 Key Features

* 📍 **Draggable A-to-B Route Planning:** Interactive Origin (Blue pulsing dot) and Destination (Red teardrop flag) pins with instant dual-walking route recalculation.
* 🚶 **Pedestrian-First Navigation:** Connects to OSRM's foot-routing engine (`routed-foot`), following actual sidewalks and walkways.
* ⚡ **Protobuf Stream Ingestion:** Node.js backend handles compressed `.proto` decoding using `gtfs-realtime-bindings`, shielding the client from heavy data parsing.
* 🛡️ **Static Live Demo Mode:** Built-in client fallback engine ensures the GitHub Pages demo works 24/7 even without hosting a dedicated backend server.
* 🎨 **High-Contrast Custom Map UI:** Built on Leaflet.js with customized OpenStreetMap tiles, clean solid route lines, and transit badges.

---

## 🛠️ System Architecture & Data Flow

```
┌────────────────────────┐      ┌───────────────────────────┐      ┌─────────────────────────┐
│   data.gov.my Feed     │      │   Node.js / Express Proxy │      │    React + Leaflet UI   │
│  (Binary GTFS-RT .pb)  │ ───► │  (Protobuf Decoder &      │ ───► │  (Interactive Map &     │
└────────────────────────┘      │   Geospatial Bounding)    │      │   OSRM Line Render)     │
                                └───────────────────────────┘      └─────────────────────────┘
                                              ▲                                 │
                                              │                                 ▼
                                ┌───────────────────────────┐      ┌─────────────────────────┐
                                │ Telemetry Fallback Engine │      │   OSRM Pedestrian API   │
                                │ (Simulated Bus Telemetry) │      │ (Sidewalk Graph Router) │
                                └───────────────────────────┘      └─────────────────────────┘
```

---

## 🧰 Tech Stack

### **Frontend**
* **Framework:** React.js (Vite)
* **Styling:** Tailwind CSS
* **Mapping Library:** [Leaflet.js](https://leafletjs.com/) with `react-leaflet` wrappers
* **Typography:** `Inter` with `tabular-nums` formatting for live telemetry readouts
* **Deployment:** GitHub Pages (Static hosting)

### **Backend & Data Pipeline**
* **Runtime:** Node.js + Express.js *(Deployable on Render / Vercel Serverless)*
* **Binary Decoding:** `gtfs-realtime-bindings` (Google Protocol Buffer parser)
* **Geospatial & Maps:** OpenStreetMap & Open Source Routing Machine (OSRM `routed-foot`)

---

## ⚡ Deployment to GitHub Pages

To deploy the frontend static site to GitHub Pages:

```bash
# Install gh-pages package
npm install gh-pages --save-dev

# Build and deploy
npm run deploy
```

For automatic deployments, set up GitHub Actions via `.github/workflows/deploy.yml` on push to `main`.

---

## 🛣️ Roadmap & Future Enhancements

* [ ] **Supabase + PostGIS Integration:** Persistent spatial storage for Klang Valley bus stop nodes and crowdsourced alert logs.
* [ ] **Multi-Modal Trip Routing:** Full itinerary generation combining MRT/LRT rail lines with feeder buses.
* [ ] **Predictive Delay Engine:** Machine learning models trained on historical timestamp data to estimate arrival delays during peak rain/traffic hours.

---

## 📜 License & Acknowledgments

* Data provided by [data.gov.my](https://data.gov.my) under the Open Data Initiative.
* Routing powered by [OSRM](http://project-osrm.org/) & [OpenStreetMap](https://www.openstreetmap.org/).
* Transit operators: **Prasarana Malaysia Berhad (RapidKL)**.

Distributed under the MIT License. See `LICENSE` for details.