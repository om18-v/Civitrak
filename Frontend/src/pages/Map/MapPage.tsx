import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, MapPin, Navigation, ShieldCheck, Layers, Activity, Route, CheckCircle2 } from 'lucide-react';
import { LeafletMap } from '../../components/map/LeafletMap';
import { InspectionModal } from '../../components/detection/InspectionModal';
import { useApp } from '../../context/AppContext';
import { AnalyticsOverview, Detection } from '../../types';
import { apiClient } from '../../api/client';

export const MapPage: React.FC = () => {
  const navigate = useNavigate();
  const { detections, selectedDetection, setSelectedDetection, activeVideo, currentRole } = useApp();
  const [analytics, setAnalytics] = React.useState<AnalyticsOverview | null>(null);

  React.useEffect(() => {
    apiClient.getAnalyticsOverview().then(setAnalytics);
    const timer = window.setInterval(() => apiClient.getAnalyticsOverview().then(setAnalytics), 10000);
    return () => window.clearInterval(timer);
  }, [detections.length]);

  const criticalCount = detections.filter((d) => d.severity === 'CRITICAL').length;
  const highCount = detections.filter((d) => d.severity === 'HIGH').length;
  const mappedCount = detections.length;

  return (
    <div className="civi-page-shell relative w-full min-h-[calc(100vh-72px)] overflow-hidden px-4 py-8 text-left sm:px-6 lg:px-8 lg:py-10">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.035] bg-[radial-gradient(#087EA4_1px,transparent_1px)] [background-size:28px_28px]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-40 top-24 h-[460px] w-[460px] rounded-full bg-[#0EA5C6]/[0.04] blur-3xl"
      />

      <div className="relative mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-800 shadow-sm">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              PAGE 05: GIS SPATIAL INTELLIGENCE
            </div>
            <h1 className="font-heading text-3xl font-extrabold tracking-tight text-[#07131D] sm:text-4xl">
              Interactive Route & GIS Defect Map
            </h1>
            <p className="max-w-2xl text-sm leading-6 text-slate-600">
              Survey run:{' '}
              <strong className="text-slate-800">
                {activeVideo?.route_name || 'Outer Ring Road (Western Sector 4)'}
              </strong>{' '}
              . Interactive geolocated pins correlated with video timestamps.
            </p>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-3">
            <button
              onClick={() => navigate('/results')}
              className="group inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-[#087EA4] hover:text-[#087EA4] hover:shadow-md"
            >
              <ArrowRight className="h-3.5 w-3.5 rotate-180 transition-transform group-hover:-translate-x-0.5" />
              Back to Results
            </button>
            <button
              onClick={() => navigate(currentRole === 'AUTHORITY' ? '/authority' : currentRole === 'CONTRACTOR' ? '/contractor' : '/citizen')}
              className="group inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#087EA4] to-[#16C7D9] px-5 py-2.5 text-xs font-bold text-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg"
            >
              <span>{currentRole === 'AUTHORITY' ? 'Authority Control' : currentRole === 'CONTRACTOR' ? 'Contractor Workbench' : 'Citizen Portal'}</span>
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            </button>
          </div>
        </div>

        {/* Map status strip */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#EEF5F8] text-[#087EA4]">
                  <MapPin className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Mapped Findings</p>
                  <p className="mt-0.5 font-heading text-xl font-extrabold text-[#07131D]">{mappedCount}</p>
                </div>
              </div>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-500">GIS</span>
            </div>
          </div>

          <div className="rounded-2xl border border-red-200 bg-red-50/60 p-4 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/80 text-red-600">
                <ShieldCheck className="h-4 w-4" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-red-600">Critical Hazards</p>
                <p className="mt-0.5 font-heading text-xl font-extrabold text-red-700">{criticalCount}</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/80 text-amber-700">
                <Layers className="h-4 w-4" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-amber-700">High Priority</p>
                <p className="mt-0.5 font-heading text-xl font-extrabold text-amber-800">{highCount}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Map container */}
        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white p-2 shadow-lg shadow-slate-900/[0.04] sm:p-3">
          <div className="mb-2 flex flex-col gap-2 px-2 pt-1 sm:flex-row sm:items-center sm:justify-between sm:px-3">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#EEF5F8] text-[#087EA4]">
                <Navigation className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-800">Live Spatial Evidence</p>
                <p className="text-[10px] text-slate-500">Select a pin to inspect the associated detection.</p>
              </div>
            </div>
            <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-700">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              GPS CORRELATED
            </span>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200">
            <LeafletMap
              detections={detections}
              heatPoints={analytics?.heat_points}
              onSelectDetection={(det: Detection) => setSelectedDetection(det)}
            />
          </div>
        </section>

        {/* Route analytics + heatmap summary */}
        <section className="grid grid-cols-1 gap-5 lg:grid-cols-[1.35fr_.65fr]">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <Route className="h-5 w-5 text-[#087EA4]" />
                <div>
                  <h3 className="font-heading text-base font-bold text-slate-900">Route-level analytics</h3>
                  <p className="text-[11px] text-slate-500">Live issue density and maintenance progress by surveyed route.</p>
                </div>
              </div>
              <span className="rounded-full bg-[#EEF5F8] px-2.5 py-1 text-[10px] font-bold text-[#087EA4]">LIVE GIS</span>
            </div>
            <div className="mt-4 space-y-3">
              {(analytics?.route_analytics || []).slice(0, 5).map((route) => (
                <div key={route.route} className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="truncate text-xs font-bold text-slate-800">{route.route}</span>
                    <span className="font-mono text-[10px] font-bold text-[#087EA4]">{route.issues} issues</span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2 text-[10px] font-semibold">
                    <span className="rounded-full bg-red-50 px-2 py-1 text-red-700">Critical {route.critical}</span>
                    <span className="rounded-full bg-amber-50 px-2 py-1 text-amber-700">High {route.high}</span>
                    <span className="rounded-full bg-emerald-50 px-2 py-1 text-emerald-700">Resolved {route.resolved}</span>
                    <span className="rounded-full bg-blue-50 px-2 py-1 text-blue-700">Assigned {route.assigned}</span>
                  </div>
                </div>
              ))}
              {!analytics?.route_analytics?.length && <p className="py-8 text-center text-xs text-slate-500">Analytics will populate after real detections are processed.</p>}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-gradient-to-br from-[#07131D] to-[#0D2B3A] p-5 text-white shadow-sm sm:p-6">
            <div className="flex items-center gap-2.5">
              <Activity className="h-5 w-5 text-[#16C7D9]" />
              <div>
                <h3 className="font-heading text-base font-bold">GIS heat intelligence</h3>
                <p className="text-[11px] text-slate-400">Dynamic severity-weighted detection density.</p>
              </div>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-3"><div className="text-[10px] uppercase tracking-wider text-slate-400">Heat points</div><div className="mt-1 font-mono text-2xl font-bold">{analytics?.heat_points?.length ?? 0}</div></div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-3"><div className="text-[10px] uppercase tracking-wider text-slate-400">Resolved</div><div className="mt-1 font-mono text-2xl font-bold">{analytics?.workflow.resolved ?? 0}</div></div>
            </div>
            <div className="mt-4 flex items-center gap-2 text-[11px] text-emerald-300"><CheckCircle2 className="h-4 w-4" /> No external heatmap API required.</div>
          </div>
        </section>

        {/* Detailed modal if clicked */}
        <InspectionModal
          detection={selectedDetection}
          onClose={() => setSelectedDetection(null)}
        />
      </div>
    </div>
  );
};
