import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Video, 
  Cpu, 
  MapPin, 
  ArrowRight, 
  ShieldCheck, 
  TrendingUp,
Layers, 
  CheckCircle2, 
  AlertTriangle,
BarChart3, 
  Flame 
} from 'lucide-react';
import { City3DCanvas } from '../../components/3d/City3DCanvas';
import { useApp } from '../../context/AppContext';
import { SAMPLE_DEFECT_IMAGES } from '../../mocks/mockData';
import { CiviTrakLogo } from '../../components/brand/CiviTrakLogo';

export const HomePage: React.FC = () => {
  const { stats } = useApp();

  // Animation reveal sequence timing
  const [animStep, setAnimStep] = useState(0);

  useEffect(() => {
    const t0 = setTimeout(() => setAnimStep(1), 50);    // Badge
    const t1 = setTimeout(() => setAnimStep(2), 250);   // SMART
    const t2 = setTimeout(() => setAnimStep(3), 450);   // ROAD
    const t3 = setTimeout(() => setAnimStep(4), 650);   // & TRAFFIC
    const t4 = setTimeout(() => setAnimStep(5), 850);   // INTELLIGENCE
    const t5 = setTimeout(() => setAnimStep(6), 1100);  // Supporting headline
    const t6 = setTimeout(() => setAnimStep(7), 1400);  // Description
    const t7 = setTimeout(() => setAnimStep(8), 1600);  // CTA buttons

    return () => {
      clearTimeout(t0); clearTimeout(t1); clearTimeout(t2); clearTimeout(t3);
      clearTimeout(t4); clearTimeout(t5); clearTimeout(t6); clearTimeout(t7);
    };
  }, []);

  return (
    <div className="civi-page-shell w-full overflow-hidden">
      
      {/* 1. HERO SECTION (Light background with contrasting panels) */}
      <section className="relative overflow-hidden border-b border-slate-200 bg-[#F7FAFC] pb-16 pt-8 lg:pb-24 lg:pt-14">
        
        {/* Subtle geometric grid + ambient backdrop */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-[0.035] bg-[radial-gradient(#087EA4_1px,transparent_1px)] [background-size:28px_28px]" />
        <div aria-hidden="true" className="pointer-events-none absolute -right-40 top-10 h-[520px] w-[520px] rounded-full bg-[#0EA5C6]/[0.045] blur-3xl" />
        <div aria-hidden="true" className="pointer-events-none absolute -left-40 bottom-0 h-[380px] w-[380px] rounded-full bg-[#087EA4]/[0.025] blur-3xl" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            
            {/* Left Column: Animated Typography & Narrative */}
            <div className="lg:col-span-6 space-y-8 text-left">
              
              {/* Badge: 0ms */}
              <div 
                className={`transition-all duration-700 transform ${
                  animStep >= 1 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'
                }`}
              >
                <div className="mb-1 inline-flex items-center gap-3 rounded-2xl border border-white/80 bg-white/72 px-3 py-2 shadow-[0_10px_30px_rgba(13,43,58,.06)] backdrop-blur-md">
                  <CiviTrakLogo variant="emblem" className="h-8 w-11" alt="CiviTrak emblem" />
                  <div className="pr-1 text-left">
                    <div className="text-[9px] font-extrabold uppercase tracking-[.16em] text-[#123F59]">CiviTrak Vision</div>
                    <div className="mt-0.5 text-[10px] text-slate-500">Active civic intelligence layer</div>
                  </div>
                </div>
                <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-[#EEF5F8] border border-[#087EA4]/20 shadow-2xs">
                  <span className="w-2 h-2 rounded-full bg-[#087EA4] animate-pulse" />
                  <span className="font-mono text-xs font-bold tracking-wider uppercase text-[#087EA4]">
                    AI Computer Vision + GIS Platform
                  </span>
                </div>
              </div>

              {/* Main Headline with Individual Word Animation */}
              <div className="space-y-1">
                <h1 className="font-heading text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-[#07131D] leading-[1.08]">
                  <span
                    className={`inline-block transition-all duration-600 mr-3 ${
                      animStep >= 2 ? 'opacity-100 translate-y-0 filter-none' : 'opacity-0 translate-y-4 blur-[4px]'
                    }`}
                  >
                    SMART
                  </span>
                  <span
                    className={`inline-block text-[#087EA4] transition-all duration-600 mr-3 ${
                      animStep >= 3 ? 'opacity-100 translate-y-0 filter-none' : 'opacity-0 translate-y-4 blur-[4px]'
                    }`}
                  >
                    ROAD
                  </span>
                  <br className="hidden sm:inline" />
                  <span
                    className={`inline-block text-[#0EA5C6] transition-all duration-600 mr-3 ${
                      animStep >= 4 ? 'opacity-100 translate-y-0 filter-none' : 'opacity-0 translate-y-4 blur-[4px]'
                    }`}
                  >
                    & TRAFFIC
                  </span>
                  <span
                    className={`inline-block text-[#07131D] transition-all duration-600 ${
                      animStep >= 5 ? 'opacity-100 translate-y-0 filter-none' : 'opacity-0 translate-y-4 blur-[4px]'
                    }`}
                  >
                    INTELLIGENCE
                  </span>
                </h1>

                {/* Animated Supporting Headline */}
                <div 
                  className={`pt-3 transition-all duration-700 ${
                    animStep >= 6 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                  }`}
                >
                  <p className="font-heading text-lg sm:text-xl font-bold tracking-tight uppercase">
                    <span className="text-slate-700">TURNING ROAD VIDEOS </span>
                    <span className="text-[#F97316]">INTO ACTIONABLE </span>
                    <span className="text-[#0D202B]">URBAN INTELLIGENCE</span>
                  </p>
                </div>
              </div>

              {/* Description paragraph */}
              <p 
                className={`text-base sm:text-lg text-slate-600 leading-relaxed max-w-xl transition-all duration-700 ${
                  animStep >= 7 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                }`}
              >
                Upload pre-recorded dashcam or mobile road footage. Our AI model automatically detects pavement defects, pedestrian zebra crossings, road signs, and traffic bottlenecks, ties each issue to GIS telemetry, and dispatches accountable contractor work orders.
              </p>

              {/* Three Large Clean Pill-Shaped Controls (Section 8) */}
              <div 
                className={`pt-2 space-y-3.5 transition-all duration-700 ${
                  animStep >= 8 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
                }`}
              >
                
                {/* Button 1: Upload Road Video */}
                <Link
                  to="/upload"
                  className="group flex items-center justify-between rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-[#087EA4]/40 hover:shadow-lg hover:shadow-slate-200/50"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#EEF5F8] text-[#087EA4] shadow-sm transition-all duration-300 group-hover:bg-[#087EA4] group-hover:text-white group-hover:shadow-md">
                      <Video className="w-6 h-6" />
                    </div>
                    <div className="text-left">
                      <div className="font-heading font-bold text-slate-900 text-base group-hover:text-[#087EA4] transition-colors">
                        UPLOAD ROAD VIDEO
                      </div>
                      <div className="text-xs text-slate-500">
                        Start a new AI road inspection
                      </div>
                    </div>
                  </div>
                  <div className="w-9 h-9 rounded-full bg-slate-50 group-hover:bg-[#EEF5F8] text-slate-400 group-hover:text-[#087EA4] flex items-center justify-center transition-colors mr-1">
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </Link>

                <Link
                  to="/citizen"
                  className="group flex items-center justify-between rounded-2xl border border-[#123F59]/10 bg-[#E9F3F5] p-4 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-[#087EA4]/35 hover:shadow-lg"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#1F3A5F] text-white shadow-sm"><ShieldCheck className="h-6 w-6" /></div>
                    <div className="text-left"><div className="font-heading text-base font-bold text-slate-900">CITIZEN CASE TRACKER</div><div className="text-xs text-slate-500">Follow repairs, completion and contractor ratings</div></div>
                  </div>
                  <div className="mr-1 flex h-9 w-9 items-center justify-center rounded-full bg-white text-slate-400 transition-colors group-hover:text-[#087EA4]"><ArrowRight className="h-4 w-4" /></div>
                </Link>

                {/* Button 2: AI Inspection */}
                <Link
                  to="/results"
                  className="group flex items-center justify-between rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-[#0EA5C6]/40 hover:shadow-lg hover:shadow-slate-200/50"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-cyan-50 text-[#0EA5C6] shadow-sm transition-all duration-300 group-hover:bg-[#0EA5C6] group-hover:text-white group-hover:shadow-md">
                      <Cpu className="w-6 h-6" />
                    </div>
                    <div className="text-left">
                      <div className="font-heading font-bold text-slate-900 text-base group-hover:text-[#0EA5C6] transition-colors">
                        AI INSPECTION
                      </div>
                      <div className="text-xs text-slate-500">
                        View detected road issues
                      </div>
                    </div>
                  </div>
                  <div className="w-9 h-9 rounded-full bg-slate-50 group-hover:bg-cyan-50 text-slate-400 group-hover:text-[#0EA5C6] flex items-center justify-center transition-colors mr-1">
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </Link>

                {/* Button 3: GIS Intelligence */}
                <Link
                  to="/map"
                  className="group flex items-center justify-between rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-emerald-500/40 hover:shadow-lg hover:shadow-slate-200/50"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 shadow-sm transition-all duration-300 group-hover:bg-emerald-600 group-hover:text-white group-hover:shadow-md">
                      <MapPin className="w-6 h-6" />
                    </div>
                    <div className="text-left">
                      <div className="font-heading font-bold text-slate-900 text-base group-hover:text-emerald-700 transition-colors">
                        GIS INTELLIGENCE
                      </div>
                      <div className="text-xs text-slate-500">
                        Explore issues by location
                      </div>
                    </div>
                  </div>
                  <div className="w-9 h-9 rounded-full bg-slate-50 group-hover:bg-emerald-50 text-slate-400 group-hover:text-emerald-600 flex items-center justify-center transition-colors mr-1">
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </Link>

              </div>

            </div>

            {/* Right Column: 3D Smart-City Road Visualization */}
            <div className="lg:col-span-6 relative">
              <City3DCanvas />
            </div>

          </div>
        </div>
      </section>

{/* 2. KEY METRICS STRIP (Section 12) */}
<section className="border-b border-slate-200 bg-white py-12 lg:py-14">
  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:gap-5">

      {/* Metric 1 */}
      <div className="group rounded-2xl border border-slate-200/80 bg-[#F7FAFC] p-5 text-left shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-slate-300 hover:bg-white hover:shadow-md sm:p-6">
        <span className="mb-1.5 block text-[11px] font-mono font-bold uppercase tracking-wider text-slate-500">
          ROAD VIDEOS ANALYZED
        </span>

        <div className="font-heading text-3xl font-extrabold tracking-tight text-[#07131D] transition-transform duration-300 group-hover:translate-x-0.5 sm:text-4xl">
          {stats.road_videos_analyzed.toLocaleString()}
        </div>

        <div className="mt-2 flex items-center gap-1 text-xs font-medium text-[#087EA4]">
          <TrendingUp className="h-3 w-3" />
          <span>Verified Dashcam Runs</span>
        </div>
      </div>

      {/* Metric 2 */}
      <div className="group rounded-2xl border border-slate-200/80 bg-[#F7FAFC] p-5 text-left shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-slate-300 hover:bg-white hover:shadow-md sm:p-6">
        <span className="mb-1.5 block text-[11px] font-mono font-bold uppercase tracking-wider text-slate-500">
          DETECTION TYPES
        </span>

        <div className="font-heading text-3xl font-extrabold tracking-tight text-[#0EA5C6] transition-transform duration-300 group-hover:translate-x-0.5 sm:text-4xl">
          {stats.detection_types}
        </div>

        <div className="mt-2 text-xs font-medium text-slate-500">
          Potholes, Manholes, Signs & More
        </div>
      </div>

      {/* Metric 3 */}
      <div className="group rounded-2xl border border-slate-200/80 bg-[#F7FAFC] p-5 text-left shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-slate-300 hover:bg-white hover:shadow-md sm:p-6">
        <span className="mb-1.5 block text-[11px] font-mono font-bold uppercase tracking-wider text-slate-500">
          ISSUES LOCATED
        </span>

        <div className="font-heading text-3xl font-extrabold tracking-tight text-[#F59E0B] transition-transform duration-300 group-hover:translate-x-0.5 sm:text-4xl">
          {stats.issues_located.toLocaleString()}
        </div>

        <div className="mt-2 flex items-center gap-1 text-xs font-medium text-amber-600">
          <MapPin className="h-3 w-3" />
          <span>Geotagged with Chainage</span>
        </div>
      </div>

      {/* Metric 4 */}
      <div className="group rounded-2xl border border-slate-200/80 bg-[#F7FAFC] p-5 text-left shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-slate-300 hover:bg-white hover:shadow-md sm:p-6">
        <span className="mb-1.5 block text-[11px] font-mono font-bold uppercase tracking-wider text-slate-500">
          WORK ORDERS GENERATED
        </span>

        <div className="font-heading text-3xl font-extrabold tracking-tight text-emerald-600 transition-transform duration-300 group-hover:translate-x-0.5 sm:text-4xl">
          {stats.work_orders_generated.toLocaleString()}
        </div>

        <div className="mt-2 flex items-center gap-1 text-xs font-medium text-emerald-700">
          <CheckCircle2 className="h-3 w-3" />
          <span>83.3% SLA Resolution</span>
        </div>
      </div>

    </div>
  </div>
</section>

{/* 3. WORKFLOW OVERVIEW (Section 13) */}
<section className="border-b border-slate-200 bg-[#F7FAFC] py-20 lg:py-24">
  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">

    <div className="mx-auto mb-14 max-w-2xl space-y-3 lg:mb-16">
      <span className="inline-flex items-center rounded-full border border-[#087EA4]/20 bg-[#EEF5F8] px-3 py-1 font-mono text-xs font-bold uppercase tracking-widest text-[#087EA4] shadow-sm">
        End-to-End Operational Lifecycle
      </span>

      <h2 className="font-heading text-3xl font-extrabold tracking-tight text-[#07131D] sm:text-4xl">
        FROM ROAD VIDEO TO ROAD ACTION
      </h2>

      <p className="text-base leading-relaxed text-slate-600">
        One connected workflow from visual detection to accountable resolution.
      </p>
    </div>

    {/* 8-step workflow */}
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4 lg:grid-cols-8 lg:gap-3">
      {[
        { num: '01', title: 'UPLOAD', desc: 'Pre-recorded road MP4 video', color: 'border-slate-300', accent: 'text-slate-600', bg: 'bg-slate-50' },
        { num: '02', title: 'ANALYZE', desc: 'Frame extraction at 30fps', color: 'border-[#087EA4]', accent: 'text-[#087EA4]', bg: 'bg-[#EEF5F8]' },
        { num: '03', title: 'DETECT', desc: 'Computer vision inference', color: 'border-[#16C7D9]', accent: 'text-[#0EA5C6]', bg: 'bg-cyan-50' },
        { num: '04', title: 'LOCATE', desc: 'GPS NMEA route correlation', color: 'border-emerald-500', accent: 'text-emerald-600', bg: 'bg-emerald-50' },
        { num: '05', title: 'VISUALIZE', desc: 'Interactive Leaflet GIS map', color: 'border-blue-500', accent: 'text-blue-600', bg: 'bg-blue-50' },
        { num: '06', title: 'ASSIGN', desc: 'Auto work order generation', color: 'border-amber-500', accent: 'text-amber-600', bg: 'bg-amber-50' },
        { num: '07', title: 'FIX', desc: 'Contractor ground remediation', color: 'border-orange-500', accent: 'text-orange-600', bg: 'bg-orange-50' },
        { num: '08', title: 'TRACK', desc: 'SLA escalation & leaderboard', color: 'border-emerald-600', accent: 'text-emerald-700', bg: 'bg-emerald-50' },
      ].map((step) => (
        <div
          key={step.num}
          className={`group relative flex h-40 flex-col justify-between rounded-2xl border bg-white p-4 text-left shadow-sm transition-all duration-300 hover:-translate-y-1.5 hover:shadow-md ${step.color}`}
        >
          <div>
            <div className="flex items-center justify-between">
              <span className={`rounded-md px-2 py-0.5 font-mono text-[10px] font-bold ${step.bg} ${step.accent}`}>
                {step.num}
              </span>

              <span className="h-1.5 w-1.5 rounded-full bg-slate-200 transition-all duration-300 group-hover:scale-150 group-hover:bg-current" />
            </div>

            <h3 className="mt-3 font-heading text-sm font-extrabold tracking-tight text-[#07131D]">
              {step.title}
            </h3>
          </div>

          <p className="text-[11px] leading-relaxed text-slate-500">
            {step.desc}
          </p>

          <div className="absolute inset-x-4 bottom-0 h-px origin-left scale-x-0 bg-current opacity-20 transition-transform duration-300 group-hover:scale-x-100" />
        </div>
      ))}
    </div>

    <div className="mt-10">
      <Link
        to="/upload"
        className="group inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-2.5 text-xs font-semibold text-[#087EA4] shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-[#087EA4]/30 hover:text-[#076c8c] hover:shadow-md"
      >
        <span>Walk through the interactive workflow</span>
        <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1" />
      </Link>
    </div>

  </div>
</section>

{/* 4. AI DETECTION PREVIEW (Section 14 & 15: 4 Visual Cards) */}
<section className="border-b border-slate-200 bg-white py-20 lg:py-24">
  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

    <div className="mb-12 flex flex-col gap-5 md:mb-14 md:flex-row md:items-end md:justify-between">
      <div className="max-w-2xl space-y-3">
        <span className="inline-flex rounded-full border border-[#087EA4]/20 bg-[#EEF5F8] px-3 py-1 font-mono text-xs font-bold uppercase tracking-widest text-[#087EA4] shadow-sm">
          Inference Evidence Preview
        </span>

        <h2 className="font-heading text-3xl font-extrabold tracking-tight text-[#07131D] sm:text-4xl">
          AI THAT SEES THE ROAD DIFFERENTLY
        </h2>

        <p className="max-w-xl text-sm leading-relaxed text-slate-600">
          Trained neural bounding box detection isolates infrastructure defects directly from video frames with confidence telemetry.
        </p>
      </div>

      <Link
        to="/results"
        className="group inline-flex shrink-0 items-center gap-2 self-start rounded-full border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-[#087EA4] shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-[#087EA4]/30 hover:shadow-md md:self-auto"
      >
        <span>View All 6 Inspection Detections</span>
        <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
      </Link>
    </div>

    {/* 4 Large Visual Cards */}
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">

      {/* Card 1: Pothole */}
      <div className="group overflow-hidden rounded-2xl border border-slate-200 bg-[#F7FAFC] shadow-sm transition-all duration-300 hover:-translate-y-1.5 hover:border-slate-300 hover:shadow-lg">
        <div className="relative aspect-[4/3] overflow-hidden bg-slate-900">
          <img
            src={SAMPLE_DEFECT_IMAGES.pothole}
            alt="Pothole Detection"
            referrerPolicy="no-referrer"
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
          />

          {/* Simulated Bounding Box */}
          <div className="absolute left-[30%] top-[35%] h-[35%] w-[40%] border-2 border-red-500 bg-red-500/15">
            <div className="absolute -top-6 left-0 rounded-sm bg-red-600 px-1.5 py-0.5 font-mono text-[9px] font-bold text-white shadow-sm">
              POTHOLE 94%
            </div>
          </div>

          <div className="absolute right-3 top-3 rounded-full bg-red-600 px-2.5 py-1 font-mono text-[10px] font-bold text-white shadow-sm">
            CRITICAL
          </div>

          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
        </div>

        <div className="space-y-2 p-4 text-left">
          <h3 className="font-heading text-sm font-bold text-slate-900">
            Severe Pothole
          </h3>

          <p className="text-xs text-slate-500">
            Outer Ring Road • KM 14+320
          </p>

          <div className="flex items-center justify-between border-t border-slate-200 pt-2.5 font-mono text-[11px] font-semibold text-[#087EA4]">
            <span>Confidence: 94.2%</span>
            <span className="text-slate-500">Frame #6660</span>
          </div>
        </div>
      </div>

      {/* Card 2: Open Manhole */}
      <div className="group overflow-hidden rounded-2xl border border-slate-200 bg-[#F7FAFC] shadow-sm transition-all duration-300 hover:-translate-y-1.5 hover:border-slate-300 hover:shadow-lg">
        <div className="relative aspect-[4/3] overflow-hidden bg-slate-900">
          <img
            src={SAMPLE_DEFECT_IMAGES.open_manhole}
            alt="Open Manhole Detection"
            referrerPolicy="no-referrer"
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
          />

          {/* Simulated Bounding Box */}
          <div className="absolute left-[35%] top-[40%] h-[38%] w-[32%] border-2 border-amber-500 bg-amber-500/15">
            <div className="absolute -top-6 left-0 rounded-sm bg-amber-600 px-1.5 py-0.5 font-mono text-[9px] font-bold text-white shadow-sm">
              OPEN MANHOLE 96%
            </div>
          </div>

          <div className="absolute right-3 top-3 rounded-full bg-red-600 px-2.5 py-1 font-mono text-[10px] font-bold text-white shadow-sm">
            CRITICAL
          </div>

          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
        </div>

        <div className="space-y-2 p-4 text-left">
          <h3 className="font-heading text-sm font-bold text-slate-900">
            Dislodged Manhole Grate
          </h3>

          <p className="text-xs text-slate-500">
            Junction Ramp • KM 16+150
          </p>

          <div className="flex items-center justify-between border-t border-slate-200 pt-2.5 font-mono text-[11px] font-semibold text-[#087EA4]">
            <span>Confidence: 96.5%</span>
            <span className="text-slate-500">Frame #11340</span>
          </div>
        </div>
      </div>

      {/* Card 3: Zebra Crossing */}
      <div className="group overflow-hidden rounded-2xl border border-slate-200 bg-[#F7FAFC] shadow-sm transition-all duration-300 hover:-translate-y-1.5 hover:border-slate-300 hover:shadow-lg">
        <div className="relative aspect-[4/3] overflow-hidden bg-slate-900">
          <img
            src={SAMPLE_DEFECT_IMAGES.faded_zebra_crossing}
            alt="Pedestrian Zebra Crossing"
            referrerPolicy="no-referrer"
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
          />

          {/* Simulated Bounding Box */}
          <div className="absolute left-[12%] top-[28%] h-[54%] w-[76%] border-2 border-emerald-500 bg-emerald-500/15">
            <div className="absolute -top-6 left-0 rounded-sm bg-emerald-600 px-1.5 py-0.5 font-mono text-[9px] font-bold text-white shadow-sm">
              ZEBRA CROSSING 95%
            </div>
          </div>

          <div className="absolute right-3 top-3 rounded-full bg-emerald-600 px-2.5 py-1 font-mono text-[10px] font-bold text-white shadow-sm">
            VERIFIED
          </div>

          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
        </div>

        <div className="space-y-2 p-4 text-left">
          <h3 className="font-heading text-sm font-bold text-slate-900">
            Pedestrian Zebra Crossing
          </h3>

          <p className="text-xs text-slate-500">
            Metro Arterial Crosswalk • KM 18+800
          </p>

          <div className="flex items-center justify-between border-t border-slate-200 pt-2.5 font-mono text-[11px] font-semibold text-[#087EA4]">
            <span>Confidence: 94.8%</span>
            <span className="text-slate-500">Frame #15720</span>
          </div>
        </div>
      </div>

      {/* Card 4: Road Signboard */}
      <div className="group overflow-hidden rounded-2xl border border-slate-200 bg-[#F7FAFC] shadow-sm transition-all duration-300 hover:-translate-y-1.5 hover:border-slate-300 hover:shadow-lg">
        <div className="relative aspect-[4/3] overflow-hidden bg-slate-900">
          <img
            src={SAMPLE_DEFECT_IMAGES.damaged_signboard}
            alt="Road Traffic Signboard"
            referrerPolicy="no-referrer"
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
          />

          {/* Simulated Bounding Box */}
          <div className="absolute left-[34%] top-[16%] h-[52%] w-[38%] border-2 border-[#16C7D9] bg-[#16C7D9]/15">
            <div className="absolute -top-6 left-0 rounded-sm bg-[#07131D] px-1.5 py-0.5 font-mono text-[9px] font-bold text-[#16C7D9] shadow-sm">
              TRAFFIC SIGN 93%
            </div>
          </div>

          <div className="absolute right-3 top-3 rounded-full bg-cyan-600 px-2.5 py-1 font-mono text-[10px] font-bold text-white shadow-sm">
            INSPECTED
          </div>

          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
        </div>

        <div className="space-y-2 p-4 text-left">
          <h3 className="font-heading text-sm font-bold text-slate-900">
            Road Traffic Signboard
          </h3>

          <p className="text-xs text-slate-500">
            Corridor Regulatory Sign • KM 21+400
          </p>

          <div className="flex items-center justify-between border-t border-slate-200 pt-2.5 font-mono text-[11px] font-semibold text-[#087EA4]">
            <span>Confidence: 93.2%</span>
            <span className="text-slate-500">Frame #18360</span>
          </div>
        </div>
      </div>

    </div>
  </div>
</section>

{/* 5. CURRENT PRIORITY SCOPE & EXPANSION ROADMAP (Section 16) */}
<section className="border-b border-slate-200 bg-[#EEF5F8]/60 py-16 lg:py-20">
  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

    <div className="grid grid-cols-1 items-stretch gap-6 lg:grid-cols-2 lg:gap-8">

      {/* Left: Active Priority Detections */}
      <div className="group rounded-3xl border border-slate-200 bg-white p-7 text-left shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-slate-300 hover:shadow-lg lg:p-8">
        <div className="mb-4 flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-[#087EA4]">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </span>
          <span>Active Production Detection Scope</span>
        </div>

        <h3 className="mb-5 font-heading text-xl font-bold tracking-tight text-slate-900">
          Core Roadway Models Currently Implemented
        </h3>

        <ul className="space-y-3.5 text-xs leading-relaxed text-slate-600">
          <li className="flex items-start gap-3 rounded-xl p-2 transition-colors duration-200 hover:bg-[#F7FAFC]">
            <div className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#087EA4]" />
            <span>
              <strong className="text-slate-800">Asphalt Potholes & Rutting:</strong> Volumetric defect detection with depth severity classification.
            </span>
          </li>

          <li className="flex items-start gap-3 rounded-xl p-2 transition-colors duration-200 hover:bg-[#F7FAFC]">
            <div className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#087EA4]" />
            <span>
              <strong className="text-slate-800">Open / Dislodged Manhole Grates:</strong> Immediate high-priority hazard flagging for two-wheelers.
            </span>
          </li>

          <li className="flex items-start gap-3 rounded-xl p-2 transition-colors duration-200 hover:bg-[#F7FAFC]">
            <div className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#087EA4]" />
            <span>
              <strong className="text-slate-800">Pedestrian Zebra Crossings:</strong> Crosswalk visibility & pedestrian safety compliance in school and arterial zones.
            </span>
          </li>

          <li className="flex items-start gap-3 rounded-xl p-2 transition-colors duration-200 hover:bg-[#F7FAFC]">
            <div className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#087EA4]" />
            <span>
              <strong className="text-slate-800">Traffic Signages & Directional Boards:</strong> Regulatory speed & directional visibility assessment.
            </span>
          </li>

          <li className="flex items-start gap-3 rounded-xl p-2 transition-colors duration-200 hover:bg-[#F7FAFC]">
            <div className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#087EA4]" />
            <span>
              <strong className="text-slate-800">Traffic Density Counting:</strong> Vehicle flux measurement to detect roadway bottlenecks.
            </span>
          </li>
        </ul>
      </div>

      {/* Right: Expansion Roadmap */}
      <div className="group rounded-3xl border border-[#132A35] bg-[#07131D] p-7 text-left text-white shadow-lg transition-all duration-300 hover:-translate-y-1 hover:border-[#1B3A48] hover:shadow-xl lg:p-8">
        <div className="mb-4 flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-amber-400">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-400/10">
            <Flame className="h-4 w-4 text-amber-400" />
          </span>
          <span>Expansion Roadmap (Future Development)</span>
        </div>

        <h3 className="mb-5 font-heading text-xl font-bold tracking-tight text-white">
          Upcoming AI Multi-Sensor Enhancements
        </h3>

        <ul className="space-y-3.5 text-xs leading-relaxed text-slate-300">
          <li className="flex items-start gap-3 rounded-xl p-2 transition-colors duration-200 hover:bg-white/[0.03]">
            <div className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
            <span>
              <strong className="text-slate-100">LiDAR Point-Cloud Depth Fusion:</strong> Sub-millimeter pavement crack profiling and 3D terrain roughness.
            </span>
          </li>

          <li className="flex items-start gap-3 rounded-xl p-2 transition-colors duration-200 hover:bg-white/[0.03]">
            <div className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
            <span>
              <strong className="text-slate-100">Thermal Infrared Nighttime Auditing:</strong> Subsurface water seepage and void detection beneath asphalt.
            </span>
          </li>

          <li className="flex items-start gap-3 rounded-xl p-2 transition-colors duration-200 hover:bg-white/[0.03]">
            <div className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
            <span>
              <strong className="text-slate-100">Automatic Number Plate Recognition (ANPR):</strong> Heavy-vehicle weight limit lane compliance.
            </span>
          </li>

          <li className="flex items-start gap-3 rounded-xl p-2 transition-colors duration-200 hover:bg-white/[0.03]">
            <div className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
            <span>
              <strong className="text-slate-100">Municipal ERP Webhook Integrations:</strong> Bi-directional sync with SAP/Oracle municipal public works systems.
            </span>
          </li>
        </ul>
      </div>

    </div>
  </div>
</section>

      {/* 6. PLATFORM CAPABILITIES (Section 17: Six Spacious Cards) */}
      <section className="border-b border-slate-200 bg-white py-20 lg:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-left">

          <div className="mb-12 max-w-2xl space-y-3 lg:mb-14">
            <span className="inline-flex rounded-full border border-[#087EA4]/20 bg-[#EEF5F8] px-3 py-1 font-mono text-xs font-bold uppercase tracking-widest text-[#087EA4] shadow-sm">
              System Architecture
            </span>
            <h2 className="font-heading text-3xl font-extrabold tracking-tight text-[#07131D] sm:text-4xl">
              ENGINEERED FOR ACTIONABLE URBAN ACCOUNTABILITY
            </h2>
            <p className="text-sm leading-relaxed text-slate-600">
              Six synchronized modules bridge computer vision analysis with municipal field operations.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3 lg:gap-6">
            {[
              {
                icon: <Cpu className="h-6 w-6" />,
                iconClass: "bg-blue-50 text-[#087EA4]",
                accent: "bg-[#087EA4]/30 group-hover:bg-[#087EA4]",
                title: "AI-Powered Inspection",
                description: "Processes high-definition road dashcam videos, runs frame-by-frame defect inference, and isolates potholes, manholes, zebra crossings, and road signages with statistical confidence."
              },
              {
                icon: <MapPin className="h-6 w-6" />,
                iconClass: "bg-cyan-50 text-[#0EA5C6]",
                accent: "bg-[#0EA5C6]/30 group-hover:bg-[#0EA5C6]",
                title: "Location Intelligence",
                description: "Synchronizes video timestamps with NMEA GPS tracks and road chainage markers, ensuring every defect is pinned with geographical accuracy down to meter resolution."
              },
              {
                icon: <Layers className="h-6 w-6" />,
                iconClass: "bg-emerald-50 text-emerald-600",
                accent: "bg-emerald-500/30 group-hover:bg-emerald-500",
                title: "GIS Visualization",
                description: "Interactive spatial layers render inspection trajectories, severity heatmaps, and clustered defect pins for rapid corridor assessment by urban planners."
              },
              {
                icon: <ShieldCheck className="h-6 w-6" />,
                iconClass: "bg-amber-50 text-amber-600",
                accent: "bg-amber-500/30 group-hover:bg-amber-500",
                title: "Automated Work Orders",
                description: "Converts validated visual detections into structured municipal work orders with contractor area assignment, severity SLAs (12h, 24h, 48h), and photographic evidence."
              },
              {
                icon: <AlertTriangle className="h-6 w-6" />,
                iconClass: "bg-orange-50 text-orange-600",
                accent: "bg-orange-500/30 group-hover:bg-orange-500",
                title: "Escalation Engine",
                description: "Monitors real-time contractor progress against deadlines. If an emergency SLA is breached, automatic escalation alerts trigger directly to the Zonal Chief Engineer."
              },
              {
                icon: <BarChart3 className="h-6 w-6" />,
                iconClass: "bg-blue-50 text-[#087EA4]",
                accent: "bg-[#087EA4]/30 group-hover:bg-[#087EA4]",
                title: "Performance Tracking",
                description: "Objective rating system and contractor leaderboard based on speed of resolution, rework rate, and verified before-and-after photographic evidence."
              }
            ].map((capability) => (
              <div
                key={capability.title}
                className="group rounded-3xl border border-slate-200/90 bg-[#F7FAFC] p-7 shadow-sm transition-all duration-300 hover:-translate-y-1.5 hover:border-slate-300 hover:bg-white hover:shadow-lg lg:p-8"
              >
                <div className={`flex h-12 w-12 items-center justify-center rounded-2xl shadow-sm transition-all duration-300 group-hover:scale-105 group-hover:shadow-md ${capability.iconClass}`}>
                  {capability.icon}
                </div>
                <h3 className="mt-5 font-heading text-lg font-bold tracking-tight text-slate-900">
                  {capability.title}
                </h3>
                <p className="mt-3 text-xs leading-relaxed text-slate-600">
                  {capability.description}
                </p>
                <div className={`mt-5 h-px w-10 transition-all duration-300 group-hover:w-16 ${capability.accent}`} />
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* 7. COMMAND CENTER PREVIEW (Section 18) */}
      <section className="border-b border-[#132A35] bg-[#07131D] py-20 text-white lg:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
            <div className="space-y-2 text-left">
              <span className="font-mono text-xs font-bold tracking-widest text-[#16C7D9] uppercase bg-[#0D202B] px-3 py-1 rounded-full border border-[#16C7D9]/30">
                Command Center Overview
              </span>
              <h2 className="font-heading text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
                MUNICIPAL AUTHORITY COMMAND HUB
              </h2>
              <p className="text-sm text-slate-400 max-w-xl">
                Real-time oversight for municipal commissioners, engineers, and quality audit inspectors.
              </p>
            </div>

            <Link
              to="/authority"
              className="group inline-flex shrink-0 items-center gap-2.5 rounded-full bg-gradient-to-r from-[#087EA4] to-[#16C7D9] px-6 py-3 text-xs font-bold text-white shadow-lg transition-all duration-300 hover:-translate-y-0.5 hover:from-[#076c8c] hover:to-[#087EA4] hover:shadow-xl"
            >
              <span>OPEN AUTHORITY HUB →</span>
            </Link>
          </div>

          {/* Interactive Preview Dashboard Mockup */}
          <div className="rounded-3xl bg-[#0D202B] border border-[#132A35] p-6 lg:p-8 shadow-2xl space-y-6 text-left">
            
            {/* Top Stat Pills */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
              <div className="p-3.5 rounded-xl bg-[#07131D] border border-[#132A35]">
                <span className="text-slate-400 font-mono text-[10px] block">TOTAL ISSUES</span>
                <span className="text-xl font-bold font-mono text-white mt-1 block">3,842</span>
              </div>
              <div className="p-3.5 rounded-xl bg-[#07131D] border border-[#132A35]">
                <span className="text-amber-400 font-mono text-[10px] block">PENDING</span>
                <span className="text-xl font-bold font-mono text-amber-400 mt-1 block">418</span>
              </div>
              <div className="p-3.5 rounded-xl bg-[#07131D] border border-[#132A35]">
                <span className="text-[#16C7D9] font-mono text-[10px] block">IN PROGRESS</span>
                <span className="text-xl font-bold font-mono text-[#16C7D9] mt-1 block">508</span>
              </div>
              <div className="p-3.5 rounded-xl bg-[#07131D] border border-[#132A35]">
                <span className="text-emerald-400 font-mono text-[10px] block">COMPLETED</span>
                <span className="text-xl font-bold font-mono text-emerald-400 mt-1 block">2,916</span>
              </div>
              <div className="p-3.5 rounded-xl bg-red-950/40 border border-red-500/30">
                <span className="text-red-400 font-mono text-[10px] block">ESCALATED</span>
                <span className="text-xl font-bold font-mono text-red-400 mt-1 block">12</span>
              </div>
            </div>

            {/* Preview Work Order Row */}
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-[#132A35] text-slate-400 font-mono uppercase tracking-wider text-[10px]">
                    <th className="pb-3">ORDER ID</th>
                    <th className="pb-3">ROUTE & CHAINAGE</th>
                    <th className="pb-3">DEFECT TYPE</th>
                    <th className="pb-3">ASSIGNED CONTRACTOR</th>
                    <th className="pb-3">SLA STATUS</th>
                    <th className="pb-3 text-right">ACTION</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#132A35]/60 text-slate-300">
                  <tr>
                    <td className="py-3.5 font-mono text-[#16C7D9] font-bold">WO-4091</td>
                    <td className="py-3.5">Outer Ring Road (Westbound) • KM 14+320</td>
                    <td className="py-3.5"><span className="text-red-400 font-bold">Pothole (Critical)</span></td>
                    <td className="py-3.5">Apex Highway Infrastructure</td>
                    <td className="py-3.5"><span className="px-2 py-0.5 rounded bg-blue-950 text-[#16C7D9] border border-blue-500/30 font-mono">IN PROGRESS (6h left)</span></td>
                    <td className="py-3.5 text-right"><Link to="/authority" className="text-[#16C7D9] hover:underline">Manage</Link></td>
                  </tr>
                  <tr>
                    <td className="py-3.5 font-mono text-[#16C7D9] font-bold">WO-4092</td>
                    <td className="py-3.5">Outer Ring Road (Junction Ramp) • KM 16+150</td>
                    <td className="py-3.5"><span className="text-red-400 font-bold">Open Manhole</span></td>
                    <td className="py-3.5">Metro Urban Drainage</td>
                    <td className="py-3.5"><span className="px-2 py-0.5 rounded bg-red-950 text-red-400 border border-red-500/30 font-mono">ESCALATED TO CHIEF ENG</span></td>
                    <td className="py-3.5 text-right"><Link to="/authority" className="text-[#16C7D9] hover:underline">Audit</Link></td>
                  </tr>
                </tbody>
              </table>
            </div>

          </div>

        </div>
      </section>

      {/* 8. ACCOUNTABILITY SECTION (Section 19) */}
      <section className="border-b border-slate-200 bg-white py-20 lg:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          
          <div className="max-w-2xl mx-auto mb-14 space-y-2">
            <span className="font-mono text-xs font-bold tracking-widest text-[#087EA4] uppercase bg-[#EEF5F8] px-3 py-1 rounded-full border border-[#087EA4]/20">
              Accountability Framework
            </span>
            <h2 className="font-heading text-3xl sm:text-4xl font-extrabold text-[#07131D] tracking-tight">
              DETECTION IS ONLY THE BEGINNING
            </h2>
            <p className="text-sm text-slate-600">
              Turn visual evidence into accountable, measurable action.
            </p>
          </div>

          {/* Connected Flow Diagram: DETECT -> LOCATE -> ASSIGN -> FIX -> ESCALATE -> MEASURE */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {[
              { label: 'DETECT', desc: 'Computer vision identifies defect', color: 'bg-[#EEF5F8] text-[#087EA4] border-[#087EA4]/30' },
              { label: 'LOCATE', desc: 'GPS NMEA ties spatial coordinates', color: 'bg-cyan-50 text-[#0EA5C6] border-[#0EA5C6]/30' },
              { label: 'ASSIGN', desc: 'Work order dispatched with SLA', color: 'bg-blue-50 text-blue-700 border-blue-200' },
              { label: 'FIX', desc: 'Contractor conducts remediation', color: 'bg-emerald-50 text-emerald-700 border-emerald-300' },
              { label: 'ESCALATE', desc: 'Breached deadlines trigger penalty', color: 'bg-amber-50 text-amber-700 border-amber-300' },
              { label: 'MEASURE', desc: 'Performance ranks on Leaderboard', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
            ].map((step, idx) => (
              <div 
                key={step.label}
                className={`p-5 rounded-2xl border text-left flex flex-col justify-between h-36 ${step.color} shadow-2xs`}
              >
                <div>
                  <span className="font-mono text-[10px] font-bold opacity-60">
                    STAGE 0{idx + 1}
                  </span>
                  <h4 className="font-heading font-extrabold text-base tracking-tight mt-1">
                    {step.label}
                  </h4>
                </div>
                <p className="text-[11px] leading-snug opacity-90">
                  {step.desc}
                </p>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* 9. FINAL HOME CTA (Section 20) */}
      <section className="relative overflow-hidden bg-[#07131D] py-20 text-white lg:py-24">
        <div aria-hidden="true" className="pointer-events-none absolute -right-40 -top-40 h-96 w-96 rounded-full bg-[#16C7D9]/[0.06] blur-3xl" />
        <div aria-hidden="true" className="pointer-events-none absolute -bottom-40 -left-40 h-96 w-96 rounded-full bg-[#087EA4]/[0.05] blur-3xl" />

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
          
          <span className="font-mono text-xs font-bold tracking-widest text-[#16C7D9] uppercase bg-[#0D202B] px-3 py-1 rounded-full border border-[#16C7D9]/30">
            Get Started
          </span>

          <h2 className="font-heading text-3xl sm:text-5xl font-extrabold text-white tracking-tight leading-tight">
            DETECT THE PROBLEM. LOCATE IT. ASSIGN IT. FIX IT. TRACK IT.
          </h2>

          <p className="text-base text-slate-400 max-w-xl mx-auto">
            Turn ordinary road footage into actionable urban intelligence.
          </p>

          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/upload"
              className="group flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#087EA4] to-[#16C7D9] px-8 py-4 text-sm font-bold text-white shadow-xl transition-all duration-300 hover:-translate-y-0.5 hover:from-[#076c8c] hover:to-[#087EA4] hover:shadow-2xl sm:w-auto"
            >
              <span>UPLOAD ROAD VIDEO →</span>
            </Link>
            <Link
              to="/map"
              className="group flex w-full items-center justify-center gap-2 rounded-full border border-[#132A35] bg-[#0D202B] px-8 py-4 text-sm font-bold text-slate-200 transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#132A35] hover:text-white sm:w-auto"
            >
              <span>VIEW GIS MAP →</span>
            </Link>
          </div>

        </div>
      </section>

    </div>
  );
};
