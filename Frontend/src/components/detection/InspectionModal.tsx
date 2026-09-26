import React from 'react';
import { Detection } from '../../types';
import { 
  X, 
  MapPin, 
  Clock, 
  CheckCircle2, 
  Send, 
  ShieldAlert, 
  Layers, 
  Compass 
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useNavigate } from 'react-router-dom';

interface InspectionModalProps {
  detection: Detection | null;
  onClose: () => void;
}

export const InspectionModal: React.FC<InspectionModalProps> = ({ detection, onClose }) => {
  const { createWorkOrderFromDetection, contractors } = useApp();
  const navigate = useNavigate();

  if (!detection) return null;

  const handleDispatchWorkOrder = () => {
    createWorkOrderFromDetection(detection.id);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#07131D]/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-white w-full max-w-4xl rounded-3xl overflow-hidden shadow-2xl border border-slate-200 flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <span className="font-mono text-xs font-bold text-[#087EA4] bg-[#EEF5F8] px-2.5 py-1 rounded-md border border-[#087EA4]/20">
              {detection.id}
            </span>
            <h2 className="font-heading text-lg font-bold text-slate-900">
              {detection.defect_label}
            </h2>
            <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded-full border ${
              detection.severity === 'CRITICAL' ? 'bg-red-50 text-red-700 border-red-200' :
              detection.severity === 'HIGH' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-yellow-50 text-yellow-700 border-yellow-200'
            }`}>
              {detection.severity}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          
          {/* Main Visual with Bounding Box Overlay */}
          <div className="relative aspect-video rounded-2xl overflow-hidden bg-slate-950 border border-slate-200 shadow-inner group">
            <img
              src={detection.annotated_thumbnail_path}
              alt={detection.defect_label}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
            
            {/* YOLO Bounding Box */}
            <div
              className="absolute border-2 border-[#16C7D9] bg-[#16C7D9]/20 shadow-md"
              style={{
                left: `${detection.bounding_box.x}%`,
                top: `${detection.bounding_box.y}%`,
                width: `${detection.bounding_box.width}%`,
                height: `${detection.bounding_box.height}%`,
              }}
            >
              <div className="absolute -top-7 left-0 bg-[#07131D] text-[#16C7D9] text-[11px] font-mono font-bold px-2 py-0.5 rounded-sm flex items-center gap-1.5 shadow-md">
                <span>{detection.defect_type.toUpperCase()}</span>
                <span className="text-white">{(detection.confidence * 100).toFixed(1)}%</span>
              </div>
            </div>

            {/* In-Frame Telemetry Badge */}
            <div className="absolute bottom-3 left-3 bg-[#07131D]/80 backdrop-blur-md px-3 py-1.5 rounded-xl text-white text-xs font-mono flex items-center gap-4">
              <span className="flex items-center gap-1 text-[#16C7D9]">
                <Clock className="w-3.5 h-3.5" /> {detection.timestamp_in_video}
              </span>
              <span className="text-slate-400">Frame #{detection.frame_number}</span>
              <span className="text-slate-300">{detection.chainage}</span>
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Left Col: Diagnostics */}
            <div className="space-y-4">
              <div>
                <h4 className="text-xs font-mono uppercase tracking-wider text-slate-500 font-bold mb-1.5 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-[#087EA4]" />
                  Defect Description & Diagnostic
                </h4>
                <p className="text-sm text-slate-700 leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
                  {detection.description}
                </p>
              </div>

              <div>
                <h4 className="text-xs font-mono uppercase tracking-wider text-slate-500 font-bold mb-1.5 flex items-center gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5 text-amber-500" />
                  Engineering Suggested Action
                </h4>
                <p className="text-sm text-slate-700 leading-relaxed bg-amber-50/60 p-3.5 rounded-xl border border-amber-200/60">
                  {detection.suggested_action}
                </p>
              </div>
            </div>

            {/* Right Col: Location & Workflow */}
            <div className="space-y-4">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2.5 text-xs">
                <h4 className="font-mono uppercase tracking-wider text-slate-500 font-bold flex items-center gap-1.5 mb-2">
                  <Compass className="w-3.5 h-3.5 text-[#087EA4]" />
                  GIS Spatial Telemetry
                </h4>
                <div className="flex justify-between py-1 border-b border-slate-200">
                  <span className="text-slate-500">Corridor / Road:</span>
                  <span className="font-semibold text-slate-800">{detection.road_name}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200">
                  <span className="text-slate-500">Chainage Marker:</span>
                  <span className="font-mono font-semibold text-slate-800">{detection.chainage}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200">
                  <span className="text-slate-500">GPS Coordinates:</span>
                  <span className="font-mono font-semibold text-[#087EA4]">
                    {detection.latitude.toFixed(4)}° N, {detection.longitude.toFixed(4)}° E
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-500">Inference Confidence:</span>
                  <span className="font-mono font-bold text-emerald-600">
                    {(detection.confidence * 100).toFixed(2)}%
                  </span>
                </div>
              </div>

              {/* Work Order State */}
              <div className="bg-[#07131D] text-white p-4 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono uppercase tracking-wider text-slate-400 font-bold">
                    Action Accountability
                  </span>
                  {detection.work_order_id ? (
                    <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-500/30">
                      DISPATCHED
                    </span>
                  ) : (
                    <span className="text-xs font-mono font-bold text-amber-400 bg-amber-950/80 px-2 py-0.5 rounded border border-amber-500/30">
                      ACTION REQUIRED
                    </span>
                  )}
                </div>

                {detection.work_order_id ? (
                  <div className="text-xs space-y-2">
                    <p className="text-slate-300">
                      Assigned as Work Order <strong className="text-white font-mono">{detection.work_order_id}</strong> to zonal infrastructure contractor.
                    </p>
                    <button
                      onClick={() => { onClose(); navigate('/authority'); }}
                      className="w-full py-2 rounded-lg bg-[#132A35] hover:bg-[#1a3847] text-[#16C7D9] font-semibold text-xs transition-colors flex items-center justify-center gap-1.5"
                    >
                      <span>Track in Authority Hub</span>
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-xs text-slate-300">
                      Convert this visual evidence directly into an official contractor work order with SLA tracking.
                    </p>
                    <button
                      onClick={handleDispatchWorkOrder}
                      className="w-full py-2.5 rounded-lg bg-gradient-to-r from-[#087EA4] to-[#16C7D9] hover:from-[#076c8c] hover:to-[#087EA4] text-white font-semibold text-xs transition-all shadow-md flex items-center justify-center gap-2"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Dispatch Work Order to {contractors[0]?.name.split(' ')[0]}</span>
                    </button>
                  </div>
                )}
              </div>

            </div>

          </div>

        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <button
            onClick={() => { onClose(); navigate('/map'); }}
            className="flex items-center gap-1.5 text-xs font-semibold text-[#087EA4] hover:underline"
          >
            <MapPin className="w-4 h-4" />
            <span>Open in GIS Map View →</span>
          </button>

          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-semibold bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 transition-colors"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
