import React from 'react';
import { Link } from 'react-router-dom';
import {
  ScanLine,
  ShieldCheck,
  MapPin,
  Database,
  Cpu,
  ArrowUpRight,
} from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="border-t border-[#132A35] bg-[#07131D] text-slate-300">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8 lg:py-16">

        {/* Main Footer Grid */}
        <div className="grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-5 lg:gap-8">

          {/* Brand */}
          <div className="space-y-5 lg:col-span-2">
            <Link
              to="/"
              className="group inline-flex items-center gap-3"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-[#087EA4] to-[#16C7D9] shadow-sm transition-transform duration-300 group-hover:-translate-y-0.5">
                <ScanLine className="h-5 w-5 text-white" />
              </div>

              <span className="font-heading text-lg font-bold tracking-tight text-white">
                SMART ROAD{' '}
                <span className="text-[#16C7D9]">INTELLIGENCE</span>
              </span>
            </Link>

            <p className="max-w-md text-sm leading-6 text-slate-400">
              Turning road inspection videos into actionable urban intelligence.
              Computer vision defect detection, GIS spatial matching,
              automated municipal work orders, and contractor accountability.
            </p>

            {/* Transparency Note */}
            <div className="max-w-md rounded-xl border border-[#18323E] bg-[#0B1D28]/80 p-4 transition-colors hover:border-[#1D4351]">
              <div className="flex items-center gap-2 text-xs font-semibold text-amber-400">
                <ShieldCheck className="h-4 w-4 shrink-0" />
                <span>Production Transparency Note</span>
              </div>

              <p className="mt-2 text-[11px] leading-5 text-slate-400">
                This system operates on pre-recorded dashcam and drone road
                inspection video footage. Defect classification (potholes,
                manholes, signs) runs via computer vision inference,
                correlated with GPS telemetry.
              </p>
            </div>
          </div>

          {/* Inspection Workflow */}
          <div>
            <h4 className="mb-5 font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
              Inspection Workflow
            </h4>

            <ul className="space-y-3">
              {[
                ['/upload', '01. Upload Video', true],
                ['/processing', '02. Frame AI Extraction', false],
                ['/results', '03. AI Inspection Results', false],
                ['/map', '04. GIS Spatial Map', false],
              ].map(([path, label, arrow]) => (
                <li key={path}>
                  <Link
                    to={path}
                    className="group inline-flex items-center gap-1.5 text-sm text-slate-400 transition-colors hover:text-[#16C7D9]"
                  >
                    <span>{label}</span>

                    {arrow && (
                      <ArrowUpRight className="h-3.5 w-3.5 text-slate-600 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-[#16C7D9]" />
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Operational Hubs */}
          <div>
            <h4 className="mb-5 font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
              Operational Hubs
            </h4>

            <ul className="space-y-3">
              {[
                ['/authority', 'Municipal Authority Hub'],
                ['/contractor', 'Contractor Field Hub'],
                ['/leaderboard', 'Contractor Leaderboard'],
                ['/login', 'Secure Portal Login'],
              ].map(([path, label]) => (
                <li key={path}>
                  <Link
                    to={path}
                    className="text-sm text-slate-400 transition-colors hover:text-[#16C7D9]"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* System Stack */}
          <div>
            <h4 className="mb-5 font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
              System Stack
            </h4>

            <div className="space-y-3">
              <div className="flex items-center gap-2.5 text-xs text-slate-400">
                <Cpu className="h-3.5 w-3.5 shrink-0 text-[#0EA5C6]" />
                <span>YOLOv8 Defect Detection</span>
              </div>

              <div className="flex items-center gap-2.5 text-xs text-slate-400">
                <MapPin className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
                <span>GPS NMEA Telemetry Sync</span>
              </div>

              <div className="flex items-center gap-2.5 text-xs text-slate-400">
                <Database className="h-3.5 w-3.5 shrink-0 text-amber-400" />
                <span>FastAPI REST API Ready</span>
              </div>
            </div>

            <div className="mt-5 border-t border-[#132A35] pt-4">
              <span className="mb-1 block text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-600">
                Target Endpoint
              </span>

              <span className="font-mono text-[10px] text-slate-400">
                VITE_API_URL /api/
              </span>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 flex flex-col gap-4 border-t border-[#132A35] pt-6 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-center sm:text-left">
            © 2026 Smart Road & Traffic Intelligence Platform. Designed for
            Urban Municipalities & Road Transport Authorities.
          </div>

          <div className="flex items-center justify-center gap-5 sm:gap-6">
            <span className="cursor-pointer transition-colors hover:text-slate-300">
              SLA Policy
            </span>

            <span className="cursor-pointer transition-colors hover:text-slate-300">
              Escalation Matrix
            </span>

            <span className="cursor-pointer transition-colors hover:text-slate-300">
              API Docs
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
};