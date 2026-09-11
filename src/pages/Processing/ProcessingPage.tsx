import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  CheckCircle2, 
  Cpu, 
  FileVideo, 
  MapPin, 
  Sparkles, 
  Layers, 
  ArrowRight, 
  Activity, 
  Clock 
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const ProcessingPage: React.FC = () => {
  const navigate = useNavigate();
  const { activeVideo, detections } = useApp();

  const [currentStage, setCurrentStage] = useState<number>(1);
  const [framesExtracted, setFramesExtracted] = useState<number>(0);
  const [framesAnalyzed, setFramesAnalyzed] = useState<number>(0);
  const [detectionsFound, setDetectionsFound] = useState<number>(0);
  const [inferenceFps, setInferenceFps] = useState<number>(145);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);

  const totalFramesTarget = activeVideo?.total_frames || 18000;

  const PIPELINE_STAGES = [
    { id: 1, title: 'VIDEO RECEIVED', desc: 'Validating codec, duration & telemetry header' },
    { id: 2, title: 'FRAME EXTRACTION', desc: 'Splitting keyframes at 30fps for CV processing' },
    { id: 3, title: 'AI ANALYSIS', desc: 'Running YOLOv8 deep neural inference batch' },
    { id: 4, title: 'DETECTION', desc: 'Filtering bounding boxes and confidence thresholds' },
    { id: 5, title: 'LOCATION MATCHING', desc: 'Correlating timestamps with GPS NMEA track' },
    { id: 6, title: 'RESULTS', desc: 'Structuring inspection evidence & severity scores' },
  ];

  // Automated pipeline simulation
  useEffect(() => {
    // Stage 1: Video Received (0 - 1s)
    const t1 = setTimeout(() => {
      setCurrentStage(2);
    }, 1000);

    // Stage 2: Frame extraction (1s - 2.5s)
    const t2 = setTimeout(() => {
      setCurrentStage(3);
    }, 2500);

    // Stage 3: AI Analysis (2.5s - 5.5s)
    const t3 = setTimeout(() => {
      setCurrentStage(4);
    }, 4500);

    // Stage 4: Detection (5.5s - 7s)
    const t4 = setTimeout(() => {
      setCurrentStage(5);
    }, 6500);

    // Stage 5: Location Matching & Complete (8s)
    const t5 = setTimeout(() => {
      setCurrentStage(6);
      setIsCompleted(true);
    }, 8500);

    // Auto navigate after complete
    const t6 = setTimeout(() => {
      navigate('/results');
    }, 10500);

    // Frame counter simulation
    const frameInterval = setInterval(() => {
      setFramesExtracted(prev => Math.min(totalFramesTarget, prev + 1200));
      setFramesAnalyzed(prev => Math.min(totalFramesTarget, prev + 950));
      setDetectionsFound(prev => (prev < detections.length ? prev + 1 : prev));
      setInferenceFps(140 + Math.floor(Math.random() * 25));
    }, 300);

    return () => {
      clearTimeout(t1); clearTimeout(t2); clearTimeout(t3);
      clearTimeout(t4); clearTimeout(t5); clearTimeout(t6);
      clearInterval(frameInterval);
    };
  }, [navigate, totalFramesTarget, detections.length]);

  return (
    <div className="w-full min-h-[calc(100vh-72px)] bg-[#F7FAFC] py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8 text-left">
        
        {/* Header */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#EEF5F8] border border-[#087EA4]/20 text-[#087EA4] text-xs font-mono font-bold">
            <span className="w-2 h-2 rounded-full bg-[#16C7D9] animate-pulse" />
            PAGE 03: COMPUTER VISION INFERENCE PIPELINE
          </div>
          <h1 className="font-heading text-3xl sm:text-4xl font-extrabold text-[#07131D] tracking-tight">
            Processing Road Inspection Footage
          </h1>
          <p className="text-sm text-slate-600 max-w-2xl">
            Extracting video frames, running defect classification models, and synchronizing GPS chainage telemetry.
          </p>
        </div>

        {/* Live Metrics HUD */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs">
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 font-bold block mb-1">
              Frames Extracted
            </span>
            <div className="font-heading text-2xl sm:text-3xl font-extrabold text-[#07131D] font-mono">
              {framesExtracted.toLocaleString()}
            </div>
            <span className="text-[11px] text-slate-400 font-mono">
              Target: {totalFramesTarget.toLocaleString()} frames
            </span>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs">
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 font-bold block mb-1">
              Frames Analyzed
            </span>
            <div className="font-heading text-2xl sm:text-3xl font-extrabold text-[#087EA4] font-mono">
              {framesAnalyzed.toLocaleString()}
            </div>
            <span className="text-[11px] text-slate-400 font-mono">
              Progress: {Math.min(100, Math.round((framesAnalyzed / totalFramesTarget) * 100))}%
            </span>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs">
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 font-bold block mb-1">
              Detections Found
            </span>
            <div className="font-heading text-2xl sm:text-3xl font-extrabold text-amber-500 font-mono">
              {detectionsFound}
            </div>
            <span className="text-[11px] text-amber-600 font-mono">
              Confidence &gt; 85%
            </span>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs">
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 font-bold block mb-1">
              Inference Speed
            </span>
            <div className="font-heading text-2xl sm:text-3xl font-extrabold text-[#16C7D9] font-mono">
              {inferenceFps} FPS
            </div>
            <span className="text-[11px] text-slate-400 font-mono">
              GPU Hardware Accelerated
            </span>
          </div>

        </div>

        {/* 6-Stage Visual Pipeline Card */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
          
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2.5">
              <Cpu className="w-5 h-5 text-[#087EA4]" />
              <span className="font-heading font-bold text-base text-slate-900">
                Pipeline Execution Sequence
              </span>
            </div>
            <span className="text-xs font-mono font-bold text-[#087EA4] bg-[#EEF5F8] px-2.5 py-1 rounded-full">
              STAGE {currentStage} OF 6
            </span>
          </div>

          {/* Connected Step Nodes */}
          <div className="space-y-4">
            {PIPELINE_STAGES.map((stage) => {
              const isPast = currentStage > stage.id;
              const isCurrent = currentStage === stage.id;
              return (
                <div
                  key={stage.id}
                  className={`p-4 rounded-2xl border transition-all duration-300 flex items-center justify-between ${
                    isPast
                      ? 'bg-emerald-50/50 border-emerald-200 text-slate-800'
                      : isCurrent
                      ? 'bg-[#EEF5F8] border-[#087EA4] shadow-xs text-[#07131D]'
                      : 'bg-slate-50 border-slate-200/80 text-slate-400 opacity-60'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center font-mono font-bold text-xs ${
                        isPast
                          ? 'bg-emerald-600 text-white'
                          : isCurrent
                          ? 'bg-[#087EA4] text-white animate-pulse'
                          : 'bg-slate-200 text-slate-500'
                      }`}
                    >
                      {isPast ? <CheckCircle2 className="w-5 h-5" /> : `0${stage.id}`}
                    </div>
                    <div>
                      <h4 className="font-heading font-bold text-sm tracking-tight">
                        {stage.title}
                      </h4>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {stage.desc}
                      </p>
                    </div>
                  </div>

                  <div className="font-mono text-xs font-semibold">
                    {isPast && <span className="text-emerald-700">COMPLETED</span>}
                    {isCurrent && <span className="text-[#087EA4] animate-pulse">RUNNING...</span>}
                    {!isPast && !isCurrent && <span className="text-slate-400">QUEUED</span>}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Bottom Action / Skip Button */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Clock className="w-3.5 h-3.5 text-[#087EA4]" />
              <span>
                {isCompleted ? 'Pipeline finished. Transitioning to results...' : 'Estimated remaining time: ~4 seconds'}
              </span>
            </div>

            <button
              onClick={() => navigate('/results')}
              className="px-6 py-2.5 rounded-full bg-gradient-to-r from-[#087EA4] to-[#16C7D9] text-white text-xs font-bold hover:shadow-md transition-all flex items-center gap-2"
            >
              <span>{isCompleted ? 'VIEW RESULTS NOW' : 'FAST-FORWARD TO RESULTS'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

        </div>

      </div>
    </div>
  );
};
