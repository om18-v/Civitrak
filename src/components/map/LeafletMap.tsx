import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { Detection } from '../../types';
import { DEMO_COORDINATES_ROUTE } from '../../mocks/mockData';
import { Filter, Layers, Navigation, ShieldAlert, Sparkles, CheckCircle2 } from 'lucide-react';

interface LeafletMapProps {
  detections: Detection[];
  onSelectDetection: (detection: Detection) => void;
}

export const LeafletMap: React.FC<LeafletMapProps> = ({ detections, onSelectDetection }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersGroupRef = useRef<L.LayerGroup | null>(null);
  const heatmapLayerRef = useRef<L.Polyline | null>(null);

  const [severityFilter, setSeverityFilter] = useState<string>('ALL');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [showTrafficDensity, setShowTrafficDensity] = useState<boolean>(true);
  const [activeMarkerId, setActiveMarkerId] = useState<string | null>(null);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    // Center on Bangalore/Metropolitan route coordinates
    const map = L.map(mapContainerRef.current, {
      center: [12.9812, 77.6045],
      zoom: 13,
      zoomControl: false,
    });

    // Clean modern base map tiles (CartoDB Positron for light technical aesthetic)
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://carto.com/">CARTO</a>, OpenStreetMap contributors',
      subdomains: 'abcd',
      maxZoom: 19,
    }).addTo(map);

    // Zoom control in top right
    L.control.zoom({ position: 'topright' }).addTo(map);

    // Draw the Inspection Video Corridor Route Polyline
    const routePolyline = L.polyline(DEMO_COORDINATES_ROUTE, {
      color: '#087EA4',
      weight: 5,
      opacity: 0.85,
      smoothFactor: 1,
      dashArray: '8, 6',
    }).addTo(map);

    // Fit bounds to route
    map.fitBounds(routePolyline.getBounds(), { padding: [40, 40] });

    // Markers layer group
    const markersGroup = L.layerGroup().addTo(map);
    markersGroupRef.current = markersGroup;
    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update Markers based on filters & selection
  useEffect(() => {
    const map = mapInstanceRef.current;
    const markersGroup = markersGroupRef.current;
    if (!map || !markersGroup) return;

    markersGroup.clearLayers();

    // Filter detections
    const filtered = detections.filter(d => {
      const matchSev = severityFilter === 'ALL' || d.severity === severityFilter;
      const matchType = typeFilter === 'ALL' || d.defect_type === typeFilter;
      return matchSev && matchType;
    });

    filtered.forEach(det => {
      const isSelected = activeMarkerId === det.id;
      const color =
        det.severity === 'CRITICAL' ? '#DC2626' :
        det.severity === 'HIGH' ? '#F59E0B' :
        det.severity === 'MODERATE' ? '#EAB308' : '#087EA4';

      // Custom pulsing HTML Pin
      const iconHtml = `
        <div class="relative flex items-center justify-center cursor-pointer group" style="width: 36px; height: 36px;">
          <div class="absolute inset-0 rounded-full animate-ping opacity-35" style="background-color: ${color};"></div>
          <div class="relative z-10 w-8 h-8 rounded-full border-2 border-white shadow-lg flex items-center justify-center font-bold text-[11px] text-white transition-transform duration-200 group-hover:scale-115 ${isSelected ? 'ring-4 ring-[#16C7D9]' : ''}" style="background-color: ${color};">
            ${det.defect_type === 'pothole' ? 'P' :
              det.defect_type === 'open_manhole' ? 'M' :
              det.defect_type === 'faded_zebra_crossing' ? 'Z' :
              det.defect_type === 'damaged_signboard' ? 'S' : 'T'}
          </div>
        </div>
      `;

      const customIcon = L.divIcon({
        className: 'custom-leaflet-marker',
        html: iconHtml,
        iconSize: [36, 36],
        iconAnchor: [18, 18],
      });

      const marker = L.marker([det.latitude, det.longitude], { icon: customIcon });

      // Rich popup content
      const popupHtml = `
        <div class="p-1 max-w-[240px] font-sans text-slate-900">
          <div class="relative aspect-video rounded-lg overflow-hidden mb-2 bg-slate-900">
            <img src="${det.annotated_thumbnail_path}" alt="${det.defect_label}" class="w-full h-full object-cover" />
            <span class="absolute top-1 left-1 text-[9px] font-mono font-bold px-1.5 py-0.5 rounded text-white" style="background: ${color};">
              ${det.severity}
            </span>
            <span class="absolute bottom-1 right-1 text-[9px] font-mono text-white bg-black/70 px-1 rounded">
              ${det.timestamp_in_video}
            </span>
          </div>
          <h4 class="font-bold text-xs text-slate-900 mb-0.5">${det.defect_label}</h4>
          <p class="text-[11px] text-slate-500 mb-1.5">${det.road_name} • ${det.chainage}</p>
          <div class="flex items-center justify-between text-[10px] pt-1.5 border-t border-slate-200">
            <span class="font-mono text-[#087EA4] font-bold">${(det.confidence * 100).toFixed(1)}% Confidence</span>
            <span class="font-bold ${det.work_order_id ? 'text-emerald-600' : 'text-amber-600'}">
              ${det.work_order_id ? det.work_order_id : 'Pending WO'}
            </span>
          </div>
        </div>
      `;

      marker.bindPopup(popupHtml, { offset: [0, -10] });

      marker.on('click', () => {
        setActiveMarkerId(det.id);
        onSelectDetection(det);
      });

      markersGroup.addLayer(marker);
    });

    // Traffic Density Heat Corridor overlay
    if (showTrafficDensity) {
      if (!heatmapLayerRef.current) {
        // High density segment near sector underpass (coordinates 10 to 12)
        const denseSegment = DEMO_COORDINATES_ROUTE.slice(8, 12);
        const heatLine = L.polyline(denseSegment, {
          color: '#EF4444',
          weight: 12,
          opacity: 0.35,
          lineCap: 'round',
        }).addTo(map);
        heatmapLayerRef.current = heatLine;
      }
    } else {
      if (heatmapLayerRef.current) {
        heatmapLayerRef.current.remove();
        heatmapLayerRef.current = null;
      }
    }
  }, [detections, severityFilter, typeFilter, showTrafficDensity, activeMarkerId, onSelectDetection]);

  return (
    <div className="relative w-full h-[650px] lg:h-[750px] rounded-3xl overflow-hidden border border-slate-200 shadow-xl bg-slate-50 flex flex-col">
      
      {/* Top Filter Floating Bar */}
      <div className="absolute top-4 left-4 right-4 z-20 flex flex-wrap items-center justify-between gap-3 pointer-events-none">
        
        {/* Left: Filter Controls */}
        <div className="flex flex-wrap items-center gap-2 pointer-events-auto bg-white/95 backdrop-blur-md px-3 py-2 rounded-2xl border border-slate-200 shadow-md text-xs">
          <div className="flex items-center gap-1.5 text-slate-500 font-semibold pr-2 border-r border-slate-200">
            <Filter className="w-3.5 h-3.5 text-[#087EA4]" />
            <span>Filter:</span>
          </div>

          {/* Severity filter */}
          <div className="flex items-center gap-1">
            {['ALL', 'CRITICAL', 'HIGH', 'MODERATE'].map(sev => (
              <button
                key={sev}
                onClick={() => setSeverityFilter(sev)}
                className={`px-2.5 py-1 rounded-lg font-mono text-[11px] font-bold transition-colors ${
                  severityFilter === sev
                    ? 'bg-[#087EA4] text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {sev}
              </button>
            ))}
          </div>

          <div className="h-4 w-px bg-slate-200 mx-1" />

          {/* Type filter */}
          <select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-slate-700 font-medium focus:outline-hidden focus:ring-1 focus:ring-[#087EA4]"
          >
            <option value="ALL">All Defect Types</option>
            <option value="pothole">Potholes</option>
            <option value="open_manhole">Open Manholes</option>
            <option value="faded_zebra_crossing">Zebra Crossings</option>
            <option value="damaged_signboard">Signboards</option>
            <option value="traffic_density_spike">Traffic Density</option>
          </select>
        </div>

        {/* Right: Layer Toggles */}
        <div className="flex items-center gap-2 pointer-events-auto">
          <button
            onClick={() => setShowTrafficDensity(!showTrafficDensity)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold backdrop-blur-md border shadow-md transition-all ${
              showTrafficDensity
                ? 'bg-[#07131D] text-amber-400 border-[#132A35]'
                : 'bg-white/95 text-slate-600 border-slate-200 hover:bg-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-amber-400" />
            <span>Traffic Congestion Overlay</span>
          </button>
        </div>

      </div>

      {/* Leaflet Map DOM Canvas */}
      <div ref={mapContainerRef} className="w-full h-full" />

      {/* Bottom GIS Honesty Legend */}
      <div className="absolute bottom-4 left-4 right-4 z-20 pointer-events-none flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="pointer-events-auto bg-[#07131D]/90 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-[#132A35] text-white text-xs shadow-xl flex items-center gap-3">
          <Navigation className="w-4 h-4 text-[#16C7D9] shrink-0" />
          <div>
            <span className="font-semibold text-slate-200">GIS Telemetry Spatial Correlation:</span>{' '}
            <span className="text-slate-400">
              AI model detects <strong className="text-white">WHAT</strong> is visible; GPS NMEA logs match <strong className="text-white">WHERE</strong> it occurred.
            </span>
          </div>
        </div>

        {/* Map Legend */}
        <div className="pointer-events-auto bg-white/95 backdrop-blur-md px-3.5 py-2 rounded-2xl border border-slate-200 text-xs shadow-md flex items-center gap-3 font-mono">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-600" />
            <span className="text-slate-700">Critical</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            <span className="text-slate-700">High</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
            <span className="text-slate-700">Moderate</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-1 bg-[#087EA4] rounded-sm" />
            <span className="text-slate-700">Inspection Route</span>
          </div>
        </div>
      </div>

    </div>
  );
};
