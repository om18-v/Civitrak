import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, MapPin, Navigation, ShieldCheck, Layers } from 'lucide-react';
import { LeafletMap } from '../../components/map/LeafletMap';
import { InspectionModal } from '../../components/detection/InspectionModal';
import { useApp } from '../../context/AppContext';
import { Detection } from '../../types';

export const MapPage: React.FC = () => {
  const navigate = useNavigate();
  const { detections, selectedDetection, setSelectedDetection, activeVideo, currentRole } = useApp();

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
              onSelectDetection={(det: Detection) => setSelectedDetection(det)}
            />
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
