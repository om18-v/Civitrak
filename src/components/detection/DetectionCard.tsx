import React from 'react';
import { Detection } from '../../types';
import { MapPin, Clock, AlertTriangle, CheckCircle, ArrowRight, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface DetectionCardProps {
  detection: Detection;
  onInspect: (detection: Detection) => void;
}

export const DetectionCard: React.FC<DetectionCardProps> = ({ detection, onInspect }) => {
  const navigate = useNavigate();

  const getSeverityBadge = (sev: string) => {
    switch (sev) {
      case 'CRITICAL':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'HIGH':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'MODERATE':
        return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      default:
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden flex flex-col group">
      
      {/* Video Frame Preview with Bounding Box Overlay */}
      <div className="relative aspect-[16/10] bg-slate-900 overflow-hidden cursor-pointer" onClick={() => onInspect(detection)}>
        <img
          src={detection.annotated_thumbnail_path}
          alt={detection.defect_label}
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-90 group-hover:opacity-100"
        />

        {/* AI Bounding Box Overlay */}
        <div
          className="absolute border-2 border-[#16C7D9] bg-[#16C7D9]/15 shadow-sm transition-all duration-300 pointer-events-none"
          style={{
            left: `${detection.bounding_box.x}%`,
            top: `${detection.bounding_box.y}%`,
            width: `${detection.bounding_box.width}%`,
            height: `${detection.bounding_box.height}%`,
          }}
        >
          {/* Tag header */}
          <div className="absolute -top-6 left-0 bg-[#07131D] text-[#16C7D9] text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-sm flex items-center gap-1 shadow-sm whitespace-nowrap">
            <span>{detection.defect_type.replace(/_/g, ' ').toUpperCase()}</span>
            <span className="text-white">{(detection.confidence * 100).toFixed(0)}%</span>
          </div>
        </div>

        {/* Top Badges */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none">
          <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border shadow-xs ${getSeverityBadge(detection.severity)}`}>
            {detection.severity}
          </span>
          <div className="flex items-center gap-1 text-[10px] font-mono text-white bg-[#07131D]/80 backdrop-blur-xs px-2 py-0.5 rounded-full">
            <Clock className="w-3 h-3 text-[#16C7D9]" />
            <span>{detection.timestamp_in_video}</span>
          </div>
        </div>

        {/* Inspect Prompt Overlay on Hover */}
        <div className="absolute inset-0 bg-[#07131D]/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 text-white text-xs font-semibold">
          <Eye className="w-4 h-4 text-[#16C7D9]" />
          <span>Click to Inspect Frame</span>
        </div>
      </div>

      {/* Content */}
      <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
        <div>
          <div className="flex items-center justify-between gap-2 mb-1">
            <h3 className="font-heading font-bold text-slate-900 text-base leading-snug group-hover:text-[#087EA4] transition-colors">
              {detection.defect_label}
            </h3>
            <span className="text-xs font-mono font-bold text-[#087EA4] bg-[#EEF5F8] px-2 py-0.5 rounded-md shrink-0">
              {(detection.confidence * 100).toFixed(1)}% AI
            </span>
          </div>

          <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
            {detection.description}
          </p>
        </div>

        {/* Location & Road Meta */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
          <div className="flex items-center gap-1.5 truncate max-w-[190px]">
            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="truncate font-medium">{detection.road_name}</span>
          </div>
          <span className="font-mono text-[11px] font-semibold text-slate-500 shrink-0">
            {detection.chainage}
          </span>
        </div>

        {/* Actions Footer */}
        <div className="pt-2 flex items-center justify-between gap-2">
          {detection.work_order_id ? (
            <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
              <CheckCircle className="w-3.5 h-3.5" />
              <span>Work Order: {detection.work_order_id}</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-200 font-medium">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Awaiting Work Order</span>
            </div>
          )}

          <div className="flex items-center gap-1">
            <button
              onClick={() => onInspect(detection)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 hover:text-[#087EA4] hover:bg-slate-100 transition-colors"
            >
              Details
            </button>
            <button
              onClick={() => navigate('/map')}
              title="Locate on GIS Map"
              className="p-1.5 rounded-lg text-slate-500 hover:text-[#087EA4] hover:bg-slate-100 transition-colors"
            >
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
