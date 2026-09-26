import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircle2,
  Cpu,
  ArrowRight,
  Clock,
  AlertTriangle,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { apiClient } from '../../api/client';

export const ProcessingPage: React.FC = () => {
  const navigate = useNavigate();
  const { activeVideo, loadVideoDetections, showToast } = useApp();

  const [currentStage, setCurrentStage] = useState(1);
  const [status, setStatus] = useState('processing');
  const [error, setError] = useState<string | null>(null);
  const [detectionsFound, setDetectionsFound] = useState(0);
  const [analytics, setAnalytics] = useState<Awaited<ReturnType<typeof apiClient.getAnalyticsOverview>>>(null);

  const PIPELINE_STAGES = [
    { id: 1, title: 'VIDEO RECEIVED', desc: 'Validating the uploaded inspection file' },
    { id: 2, title: 'FRAME EXTRACTION', desc: 'Extracting keyframes for computer vision' },
    { id: 3, title: 'AI ANALYSIS', desc: 'Running the configured YOLO model' },
    { id: 4, title: 'DETECTION', desc: 'Filtering detections by confidence and class' },
    { id: 5, title: 'LOCATION MATCHING', desc: 'Associating detections with route/GPS metadata' },
    { id: 6, title: 'RESULTS', desc: 'Saving inspection evidence to PostgreSQL' },
  ];

  useEffect(() => {
    if (!activeVideo?.id) {
      setError('No active inspection was found. Please upload a video first.');
      return;
    }

    // Reset everything for this run — otherwise a stale error/stage from a
    // previous video (or a previous failed attempt) keeps showing forever.
    setError(null);
    setCurrentStage(1);
    setStatus('processing');
    setDetectionsFound(0);

    let cancelled = false;
    let pollTimer: number | undefined;

    const poll = async () => {
      try {
        const result = await apiClient.getVideoStatus(activeVideo.id);
        if (cancelled) return;

        setStatus(result.status);
        setError(null); // clear any stale error the moment we get a fresh response

        if (result.status === 'processing' || result.status === 'queued') {
          setCurrentStage((stage) => (stage < 5 ? stage + 1 : 5));
          pollTimer = window.setTimeout(poll, 1500);
          return;
        }

        if (result.status === 'completed' || result.status === 'done') {
          setCurrentStage(6);
          const realDetections = await loadVideoDetections(activeVideo.id);
          if (!cancelled) {
            setDetectionsFound(realDetections.length);
            showToast(`Inspection complete. ${realDetections.length} detection(s) found.`);
          }
          return;
        }

        if (result.status === 'failed' || result.status === 'error') {
          setError('The backend reported that video processing failed.');
          setCurrentStage(1);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Could not reach the backend.');
        }
      }
    };

    apiClient.getAnalyticsOverview().then(setAnalytics);
    poll();

    return () => {
      cancelled = true;
      if (pollTimer) window.clearTimeout(pollTimer);
    };
  }, [activeVideo?.id]);

  const completed = status === 'completed' || status === 'done';

  return (
    <div className="civi-page-shell min-h-[calc(100vh-72px)] w-full px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl space-y-8 text-left">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#087EA4]/20 bg-[#EEF5F8] px-3 py-1 text-xs font-mono font-bold text-[#087EA4]">
            <span className="h-2 w-2 animate-pulse rounded-full bg-[#16C7D9]" />
            PAGE 03: COMPUTER VISION INFERENCE PIPELINE
          </div>
          <h1 className="font-heading text-3xl font-extrabold tracking-tight text-[#07131D] sm:text-4xl">
            Processing Road Inspection Footage
          </h1>
          <p className="max-w-2xl text-sm leading-6 text-slate-600">
            This screen now follows the real backend processing status instead of a fake timer.
          </p>
        </div>

        {error && (
          <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <strong>Processing error</strong>
              <p className="mt-1">{error}</p>
              <p className="mt-2 text-xs">
                Make sure PostgreSQL and the FastAPI backend are running, then retry the upload.
              </p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500">Backend status</span>
            <div className="mt-2 font-mono text-2xl font-extrabold text-[#087EA4]">
              {status.toUpperCase()}
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500">Detections</span>
            <div className="mt-2 font-mono text-2xl font-extrabold text-[#07131D]">{detectionsFound}</div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500">Inspection route</span>
            <div className="mt-2 truncate text-sm font-bold text-slate-800">
              {activeVideo?.route_name || 'Not selected'}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-[#087EA4]/20 bg-[#EEF5F8] p-5">
            <div className="flex items-center gap-2 text-[#087EA4]"><Cpu className="h-4 w-4" /><span className="text-[10px] font-mono font-bold uppercase tracking-wider">Edge AI</span></div>
            <p className="mt-2 text-sm font-bold text-[#07131D]">Local inference before transmission</p>
            <p className="mt-1 text-xs leading-5 text-slate-600">The pipeline processes video locally and exposes only issue evidence and alerts to downstream dashboards.</p>
          </div>
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-5">
            <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-700">Estimated bandwidth reduction</div>
            <p className="mt-2 font-mono text-2xl font-extrabold text-emerald-800">{analytics?.edge_ai.estimated_bandwidth_reduction_percent ?? 0}%</p>
            <p className="mt-1 text-xs leading-5 text-emerald-900/70">Estimated from processed frames versus evidence frames + alerts; not a measured network transfer rate.</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500">Evidence-only output</div>
            <p className="mt-2 font-mono text-2xl font-extrabold text-[#07131D]">{analytics?.edge_ai.evidence_frames ?? 0}</p>
            <p className="mt-1 text-xs leading-5 text-slate-500">Annotated evidence frames available for GIS and authority review.</p>
          </div>
        </div>

        <div className="space-y-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2.5">
              <Cpu className="h-5 w-5 text-[#087EA4]" />
              <span className="font-heading text-base font-bold text-slate-900">Pipeline Execution Sequence</span>
            </div>
            <span className="rounded-full bg-[#EEF5F8] px-2.5 py-1 text-xs font-mono font-bold text-[#087EA4]">
              STAGE {currentStage} OF 6
            </span>
          </div>

          <div className="space-y-4">
            {PIPELINE_STAGES.map((stage) => {
              const isPast = completed ? true : currentStage > stage.id;
              const isCurrent = !completed && currentStage === stage.id;

              return (
                <div
                  key={stage.id}
                  className={`flex items-center justify-between rounded-2xl border p-4 ${
                    isPast
                      ? 'border-emerald-200 bg-emerald-50/50'
                      : isCurrent
                        ? 'border-[#087EA4] bg-[#EEF5F8]'
                        : 'border-slate-200 bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`flex h-9 w-9 items-center justify-center rounded-xl font-mono text-xs font-bold ${
                      isPast ? 'bg-emerald-600 text-white' : isCurrent ? 'bg-[#087EA4] text-white' : 'bg-slate-200 text-slate-500'
                    }`}>
                      {isPast ? <CheckCircle2 className="h-5 w-5" /> : `0${stage.id}`}
                    </div>
                    <div>
                      <h4 className="font-heading text-sm font-bold">{stage.title}</h4>
                      <p className="mt-0.5 text-xs text-slate-500">{stage.desc}</p>
                    </div>
                  </div>
                  <span className="font-mono text-xs font-semibold">
                    {isPast ? <span className="text-emerald-700">COMPLETED</span> :
                     isCurrent ? <span className="animate-pulse text-[#087EA4]">RUNNING...</span> :
                     <span className="text-slate-400">QUEUED</span>}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between border-t border-slate-100 pt-4">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Clock className="h-3.5 w-3.5 text-[#087EA4]" />
              <span>{completed ? 'AI processing finished.' : 'Waiting for the backend worker...'}</span>
            </div>
            <button
              disabled={!completed}
              onClick={() => navigate('/results')}
              className="flex items-center gap-2 rounded-full bg-gradient-to-r from-[#087EA4] to-[#16C7D9] px-6 py-2.5 text-xs font-bold text-white shadow-sm transition hover:shadow-md disabled:cursor-not-allowed disabled:opacity-40"
            >
              VIEW RESULTS
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
