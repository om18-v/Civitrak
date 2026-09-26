import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  UploadCloud, 
  Video, 
  FileText, 
  MapPin, 
  CheckCircle2, 
  ArrowRight, 
  AlertCircle, 
  Sparkles, 
  Layers, 
  Play 
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const UploadPage: React.FC = () => {
  const navigate = useNavigate();
  const { uploadNewVideo } = useApp();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const gpsInputRef = useRef<HTMLInputElement>(null);

  const [selectedVideo, setSelectedVideo] = useState<File | null>(null);
  const [selectedGps, setSelectedGps] = useState<File | null>(null);
  const [routeName, setRouteName] = useState<string>('Outer Ring Road (Western Sector 4)');
  const [cameraType, setCameraType] = useState<string>('4K Dashcam (Forward-Facing 60° FOV)');
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [dragActive, setDragActive] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Preset demo videos for quick evaluation
  const DEMO_PRESETS = [
    {
      name: 'Outer Ring Road (Western Sector 4)',
      filename: 'Outer_Ring_Road_Sector4_KMs12_24.mp4',
      size: '248.5 MB',
      duration: '12 min 00 sec',
      camera: '4K Dashcam 60fps',
    },
    {
      name: 'North Radial Highway (Flyover Corridor)',
      filename: 'North_Radial_Highway_Flyover_Inspection.mp4',
      size: '184.2 MB',
      duration: '08 min 00 sec',
      camera: 'Dual-Lens Mobile Dashcam',
    },
    {
      name: 'Metro Corridor Arterial (School Zones)',
      filename: 'Metro_Corridor_Arterial_Crossings.mp4',
      size: '312.0 MB',
      duration: '15 min 20 sec',
      camera: 'Survey Vehicle 4K Drone/Cam',
    },
  ];

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith('video/')) {
        setSelectedVideo(file);
        setErrorMsg(null);
      } else {
        setErrorMsg('Please upload an MP4, MOV, or AVI road video file.');
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedVideo(e.target.files[0]);
      setErrorMsg(null);
    }
  };

  const handleGpsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedGps(e.target.files[0]);
    }
  };

  const handleSelectPreset = (preset: typeof DEMO_PRESETS[0]) => {
    // Presets choose the route metadata only. A real video file is still
    // required because the backend processes the uploaded bytes.
    setRouteName(preset.name);
    setErrorMsg(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVideo) {
      setErrorMsg('Please choose a real road video file before starting the scan.');
      return;
    }

    if (!routeName.trim()) {
      setErrorMsg('Please enter a route/location label.');
      return;
    }

    setIsUploading(true);
    setErrorMsg(null);

    // Realistic upload progress simulation
    const interval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 95) {
          clearInterval(interval);
          return 95;
        }
        return prev + 15;
      });
    }, 120);

    try {
      const videoId = await uploadNewVideo(selectedVideo, routeName, selectedGps);
      setUploadProgress(100);
      setTimeout(() => {
        setIsUploading(false);
        navigate('/processing');
      }, 500);
    } catch (err: any) {
      clearInterval(interval);
      setIsUploading(false);
      setErrorMsg('Upload failed. Please try again.');
    }
  };

  return (
    <div className="civi-page-shell min-h-[calc(100vh-72px)] w-full px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
      <div className="mx-auto max-w-4xl space-y-8">

        {/* Page Header */}
        <div className="space-y-3 text-left">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#087EA4]/20 bg-[#EEF5F8] px-3 py-1 font-mono text-xs font-bold text-[#087EA4] shadow-sm">
            <span className="h-2 w-2 rounded-full bg-[#087EA4]" />
            PAGE 02: UPLOAD & SCAN
          </div>

          <h1 className="font-heading text-3xl font-extrabold tracking-tight text-[#07131D] sm:text-4xl">
            Upload Road Inspection Footage
          </h1>

          <p className="max-w-2xl text-sm leading-relaxed text-slate-600 sm:text-base">
            Submit dashcam or mobile camera video files for computer vision defect extraction. Spatial GIS coordinates will be correlated with the route path.
          </p>
        </div>

        {/* Quick Presets Selection */}
        <div className="space-y-4 rounded-3xl border border-slate-200/90 bg-white p-5 text-left shadow-sm sm:p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase text-slate-500">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#EEF5F8]">
                <Sparkles className="h-3.5 w-3.5 text-[#087EA4]" />
              </span>
              <span>Or Choose a Pre-Configured Municipal Inspection Run</span>
            </div>

            <span className="text-[11px] text-slate-400">
              One-click benchmark datasets
            </span>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {DEMO_PRESETS.map((p, idx) => {
              const isSelected = routeName === p.name;

              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelectPreset(p)}
                  className={`group rounded-2xl border p-4 text-left transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md ${
                    isSelected
                      ? 'border-[#087EA4] bg-[#EEF5F8] shadow-sm'
                      : 'border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-white'
                  }`}
                >
                  <div className="mb-1.5 flex items-center gap-2">
                    <span className={`flex h-7 w-7 items-center justify-center rounded-lg transition-colors ${
                      isSelected
                        ? 'bg-white text-[#087EA4] shadow-sm'
                        : 'bg-slate-100 text-slate-400 group-hover:bg-[#EEF5F8] group-hover:text-[#087EA4]'
                    }`}>
                      <Play className="h-3.5 w-3.5" />
                    </span>

                    <span className="truncate font-heading text-xs font-bold text-slate-800">
                      {p.name.split('(')[0]}
                    </span>
                  </div>

                  <div className="pl-9 font-mono text-[11px] text-slate-500">
                    {p.size} • {p.duration}
                  </div>

                  {isSelected && (
                    <div className="mt-3 flex items-center gap-1.5 pl-9 text-[10px] font-bold uppercase tracking-wider text-[#087EA4]">
                      <CheckCircle2 className="h-3 w-3" />
                      Selected
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Main Upload Form */}
        <form
          onSubmit={handleSubmit}
          className="space-y-7 rounded-3xl border border-slate-200/90 bg-white p-5 text-left shadow-sm sm:p-8"
        >

          {/* 1. Large Drag & Drop Video Upload Zone */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-mono font-bold uppercase tracking-wider text-slate-700">
                1. Road Video File (MP4, MOV, AVI)
              </label>

              {selectedVideo && (
                <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                  Ready
                </span>
              )}
            </div>

            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`group cursor-pointer rounded-3xl border-2 border-dashed p-8 text-center transition-all duration-300 sm:p-10 ${
                dragActive
                  ? 'border-[#087EA4] bg-[#EEF5F8] shadow-md'
                  : selectedVideo
                  ? 'border-emerald-400 bg-emerald-50/40 hover:border-emerald-500'
                  : 'border-slate-300 bg-slate-50/70 hover:border-[#087EA4] hover:bg-[#EEF5F8]/40 hover:shadow-sm'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="video/mp4,video/quicktime,video/x-msvideo"
                onChange={handleFileChange}
                className="hidden"
              />

              {selectedVideo ? (
                <div className="flex flex-col items-center space-y-2">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 shadow-sm transition-transform duration-300 group-hover:scale-105">
                    <CheckCircle2 className="h-7 w-7" />
                  </div>

                  <div className="max-w-full break-all font-heading text-base font-bold text-slate-900">
                    {selectedVideo.name}
                  </div>

                  <div className="font-mono text-xs text-slate-500">
                    {(selectedVideo.size / (1024 * 1024)).toFixed(1)} MB • Ready for inference
                  </div>

                  <span className="pt-1 text-xs font-semibold text-[#087EA4] underline underline-offset-2">
                    Click to replace file
                  </span>
                </div>
              ) : (
                <div className="flex flex-col items-center space-y-3">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#EEF5F8] text-[#087EA4] shadow-sm transition-all duration-300 group-hover:scale-105 group-hover:shadow-md">
                    <UploadCloud className="h-7 w-7" />
                  </div>

                  <div>
                    <span className="font-heading text-base font-bold text-slate-800">
                      Drag and drop your road footage here
                    </span>
                    <span className="mt-0.5 block text-xs text-slate-500">
                      or browse from your local device (dashcam, survey rig, mobile camera)
                    </span>
                  </div>

                  <span className="rounded-full bg-slate-100 px-3 py-1 font-mono text-[11px] text-slate-400">
                    Recommended: 1080p or 4K @ 30-60 FPS
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* 2. Route / Location Label */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div className="space-y-2.5">
              <label className="block text-xs font-mono font-bold uppercase tracking-wider text-slate-700">
                2. Route / Highway Corridor Label
              </label>

              <div className="relative">
                <MapPin className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  required
                  value={routeName}
                  onChange={e => setRouteName(e.target.value)}
                  placeholder="e.g. Outer Ring Road, Sector 4"
                  className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-4 text-sm font-medium text-slate-800 outline-none transition-all placeholder:text-slate-400 focus:border-[#087EA4] focus:ring-2 focus:ring-[#087EA4]/15"
                />
              </div>
            </div>

            <div className="space-y-2.5">
              <label className="block text-xs font-mono font-bold uppercase tracking-wider text-slate-700">
                Camera Rig Setup
              </label>

              <select
                value={cameraType}
                onChange={e => setCameraType(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-800 outline-none transition-all focus:border-[#087EA4] focus:ring-2 focus:ring-[#087EA4]/15"
              >
                <option>4K Dashcam (Forward-Facing 60° FOV)</option>
                <option>Survey Inspection Van Multi-Camera</option>
                <option>Mobile Smartphone Windshield Mount</option>
                <option>Low-Altitude Drone Road Survey</option>
              </select>
            </div>
          </div>

          {/* 3. Optional GPS Track */}
          <div className="space-y-2.5">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <label className="block text-xs font-mono font-bold uppercase tracking-wider text-slate-700">
                3. Optional GPS Telemetry Log (.GPX, .CSV, NMEA)
              </label>

              <span className="text-[11px] text-slate-400">
                Auto-extracted if embedded
              </span>
            </div>

            <div
              onClick={() => gpsInputRef.current?.click()}
              className="group flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50 p-3.5 transition-all duration-300 hover:border-slate-300 hover:bg-white hover:shadow-sm"
            >
              <input
                ref={gpsInputRef}
                type="file"
                accept=".gpx,.csv,.txt"
                onChange={handleGpsChange}
                className="hidden"
              />

              <div className="flex min-w-0 items-center gap-2 text-xs text-slate-600">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#EEF5F8]">
                  <FileText className="h-4 w-4 text-[#087EA4]" />
                </span>
                <span className="truncate">
                  {selectedGps
                    ? selectedGps.name
                    : 'Attach external NMEA / GPX waypoint stream (optional)'}
                </span>
              </div>

              <span className="shrink-0 rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-[#087EA4] shadow-sm transition-colors group-hover:bg-[#EEF5F8]">
                Browse
              </span>
            </div>
          </div>

          {/* Error Message */}
          {errorMsg && (
            <div className="flex items-center gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs text-red-700">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Progress bar during upload */}
          {isUploading && (
            <div className="space-y-2.5 rounded-2xl border border-[#087EA4]/15 bg-[#EEF5F8]/50 p-4">
              <div className="flex justify-between gap-4 font-mono text-xs font-bold text-slate-600">
                <span>Uploading inspection stream to inference server...</span>
                <span className="shrink-0 text-[#087EA4]">{uploadProgress}%</span>
              </div>

              <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#087EA4] to-[#16C7D9] transition-all duration-200"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Submit Action */}
          <div className="flex flex-col-reverse items-stretch justify-between gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={() => navigate('/home')}
              disabled={isUploading}
              className="rounded-xl px-5 py-2.5 text-xs font-semibold text-slate-600 transition-all duration-200 hover:bg-slate-50 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isUploading}
              className="group inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#087EA4] to-[#16C7D9] px-8 py-3.5 text-xs font-bold text-white shadow-md transition-all duration-300 hover:-translate-y-0.5 hover:from-[#076c8c] hover:to-[#087EA4] hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span>{isUploading ? 'SCANNING VIDEO...' : 'UPLOAD & SCAN'}</span>
              <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
            </button>
          </div>

        </form>

      </div>
    </div>
  );

};
