import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MapPin,
  ArrowRight,
  Download,
  Filter,
  SlidersHorizontal,
  Sparkles,
  AlertTriangle,
  CheckCircle,
  Cpu,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { DetectionCard } from '../../components/detection/DetectionCard';
import { InspectionModal } from '../../components/detection/InspectionModal';

export const ResultsPage: React.FC = () => {
  const navigate = useNavigate();
  const { detections, selectedDetection, setSelectedDetection, activeVideo } = useApp();

  const [activeCategory, setActiveCategory] = useState<string>('ALL');
  const [severityFilter, setSeverityFilter] = useState<string>('ALL');

  const totalIssues = detections.length;
  const criticalCount = detections.filter((d) => d.severity === 'CRITICAL').length;
  const highCount = detections.filter((d) => d.severity === 'HIGH').length;
  const moderateCount = detections.filter((d) => d.severity === 'MODERATE').length;
  const trafficEvents = detections.filter((d) => d.defect_type === 'traffic_density_spike').length;

  const filteredDetections = useMemo(
    () =>
      detections.filter((d) => {
        const matchCat = activeCategory === 'ALL' || d.defect_type === activeCategory;
        const matchSev = severityFilter === 'ALL' || d.severity === severityFilter;
        return matchCat && matchSev;
      }),
    [detections, activeCategory, severityFilter]
  );

  const categoryOptions = [
    { id: 'ALL', label: 'All Defects' },
    { id: 'pothole', label: 'Potholes' },
    { id: 'open_manhole', label: 'Open Manholes' },
    { id: 'faded_zebra_crossing', label: 'Zebra Crossings' },
    { id: 'damaged_signboard', label: 'Signboards' },
    { id: 'traffic_density_spike', label: 'Traffic Density' },
  ];

  return (
    <div className="relative min-h-[calc(100vh-72px)] w-full overflow-hidden bg-[#F7FAFC] px-4 py-10 text-left sm:px-6 lg:px-8 lg:py-12">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-[0.035] bg-[radial-gradient(#087EA4_1px,transparent_1px)] [background-size:28px_28px]" />
      <div aria-hidden="true" className="pointer-events-none absolute -right-40 top-0 h-[520px] w-[520px] rounded-full bg-[#0EA5C6]/[0.045] blur-3xl" />

      <div className="relative mx-auto max-w-7xl space-y-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#087EA4]/20 bg-[#EEF5F8] px-3 py-1 text-xs font-mono font-bold text-[#087EA4]">
              <span className="h-2 w-2 rounded-full bg-[#087EA4]" />
              PAGE 04: AI ROAD INSPECTION EVIDENCE
            </div>
            <h1 className="font-heading text-3xl font-extrabold tracking-tight text-[#07131D] sm:text-4xl">
              Defect Analysis & Inference Results
            </h1>
            <p className="max-w-2xl text-sm leading-6 text-slate-600">
              Corridor footage:{' '}
              <strong className="text-slate-800">
                {activeVideo?.route_name || 'Outer Ring Road (Western Sector 4)'}
              </strong>
              . Review bounding-box evidence, confidence metrics, and dispatch work orders.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => navigate('/map')}
              className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-5 py-2.5 text-xs font-semibold text-slate-700 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-[#087EA4] hover:text-[#087EA4] hover:shadow-md"
            >
              <MapPin className="h-3.5 w-3.5 text-[#087EA4]" />
              Explore on GIS Map
            </button>
            <button
              onClick={() => navigate('/authority')}
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#087EA4] to-[#16C7D9] px-5 py-2.5 text-xs font-bold text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
            >
              Command Center
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[
            { label: 'TOTAL ISSUES', value: totalIssues, note: '100% video footage scanned', icon: Cpu, tone: 'neutral' },
            { label: 'CRITICAL HAZARDS', value: criticalCount, note: 'Emergency 12h/24h SLA required', icon: AlertTriangle, tone: 'critical' },
            { label: 'MODERATE DEFECTS', value: moderateCount, note: 'Scheduled road maintenance', icon: CheckCircle, tone: 'moderate' },
            { label: 'TRAFFIC EVENTS', value: trafficEvents, note: 'Bottlenecks & Density spikes', icon: Sparkles, tone: 'traffic' },
          ].map((metric) => {
            const toneClasses = {
              neutral: 'border-slate-200 bg-white text-[#07131D] ',
              critical: 'border-red-200 bg-red-50/60 text-red-600 ',
              moderate: 'border-yellow-200 bg-yellow-50/60 text-yellow-700 ',
              traffic: 'border-cyan-200 bg-cyan-50/60 text-[#087EA4] ',
            }[metric.tone];
            const iconClasses = {
              neutral: 'bg-slate-100 text-[#087EA4]',
              critical: 'bg-red-100 text-red-600',
              moderate: 'bg-yellow-100 text-yellow-700',
              traffic: 'bg-cyan-100 text-[#087EA4]',
            }[metric.tone];
            return (
              <div
                key={metric.label}
                className={`group rounded-2xl border p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${toneClasses}`}
              >
                <div className="mb-4 flex items-start justify-between gap-3">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider opacity-80">{metric.label}</span>
                  <span className={`flex h-8 w-8 items-center justify-center rounded-xl ${iconClasses}`}>
                    <metric.icon className="h-4 w-4" />
                  </span>
                </div>
                <div className="font-heading font-mono text-3xl font-extrabold">{metric.value}</div>
                <span className="mt-1 block text-xs font-medium opacity-80">{metric.note}</span>
              </div>
            );
          })}
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center gap-2 border-b border-slate-100 px-4 pt-4 text-[11px] font-mono font-bold uppercase tracking-wider text-slate-400">
            <Filter className="h-3.5 w-3.5" />
            Evidence filters
          </div>
          <div className="flex flex-col gap-4 p-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <span className="mr-2 text-[11px] font-mono text-slate-400">Category:</span>
              {categoryOptions.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`rounded-xl px-3 py-1.5 font-medium transition-all duration-200 ${
                    activeCategory === cat.id
                      ? 'bg-[#087EA4] font-semibold text-white shadow-sm'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 text-xs">
              <SlidersHorizontal className="h-3.5 w-3.5 text-slate-400" />
              <span className="text-[11px] font-mono text-slate-400">Severity:</span>
              <select
                value={severityFilter}
                onChange={(e) => setSeverityFilter(e.target.value)}
                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 font-medium text-slate-700 outline-none transition focus:border-[#087EA4] focus:ring-2 focus:ring-[#087EA4]/10"
              >
                <option value="ALL">All Severities</option>
                <option value="CRITICAL">Critical Only</option>
                <option value="HIGH">High Only</option>
                <option value="MODERATE">Moderate Only</option>
              </select>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-slate-800">Detected evidence</p>
            <p className="text-xs text-slate-500">
              Showing {filteredDetections.length} of {totalIssues} detected events
            </p>
          </div>
          <span className="hidden items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-mono text-slate-500 shadow-sm sm:inline-flex">
            <span className="h-1.5 w-1.5 rounded-full bg-[#087EA4]" />
            AI INFERENCE COMPLETE
          </span>
        </div>

        {filteredDetections.length > 0 ? (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredDetections.map((det) => (
              <DetectionCard key={det.id} detection={det} onInspect={(d) => setSelectedDetection(d)} />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center shadow-sm">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
              <Filter className="h-5 w-5" />
            </div>
            <h2 className="mt-4 font-heading text-lg font-bold text-slate-800">No matching evidence</h2>
            <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">
              Try clearing one of the filters to view the available detections from this inspection.
            </p>
            <button
              onClick={() => {
                setActiveCategory('ALL');
                setSeverityFilter('ALL');
              }}
              className="mt-5 rounded-full border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition hover:border-[#087EA4] hover:text-[#087EA4]"
            >
              Clear filters
            </button>
          </div>
        )}

        <InspectionModal detection={selectedDetection} onClose={() => setSelectedDetection(null)} />
      </div>
    </div>
  );
};
