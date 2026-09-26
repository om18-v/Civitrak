import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  Contractor,
  Detection,
  PublicStats,
  UserRole,
  VideoUpload,
  WorkOrder,
  WorkOrderStatus,
  ContractorRating,
} from '../types';
import {
  INITIAL_CONTRACTORS,
  INITIAL_DETECTIONS,
  INITIAL_PUBLIC_STATS,
  INITIAL_VIDEOS,
  INITIAL_WORK_ORDERS,
} from '../mocks/mockData';
import { apiClient } from '../api/client';

interface AppContextType {
  stats: PublicStats;
  videos: VideoUpload[];
  activeVideo: VideoUpload | null;
  setActiveVideo: (video: VideoUpload | null) => void;
  uploadNewVideo: (file: File | null, routeName: string, gpsFile?: File | null) => Promise<string>;

  detections: Detection[];
  selectedDetection: Detection | null;
  setSelectedDetection: (detection: Detection | null) => void;
  loadVideoDetections: (videoId: string) => Promise<Detection[]>;

  workOrders: WorkOrder[];
  refreshWorkOrders: () => Promise<WorkOrder[]>;
  updateWorkOrderStatus: (id: string, status: WorkOrderStatus, note?: string) => void;
  submitRepairForReview: (id: string, note?: string) => void;
  approveRepair: (id: string, note?: string) => void;
  rejectRepair: (id: string, note?: string) => void;
  ratings: ContractorRating[];
  rateContractor: (workOrderId: string, rating: number, comment: string) => void;
  createWorkOrderFromDetection: (detectionId: string, contractorId?: string) => WorkOrder;

  contractors: Contractor[];

  currentRole: UserRole;
  currentUserId: string;
  currentUserName: string;
  loginAs: (role: 'USER' | 'AUTHORITY' | 'CONTRACTOR', contractorId?: string) => void;
  logout: () => void;

  toastMessage: string | null;
  showToast: (msg: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [stats, setStats] = useState<PublicStats>(INITIAL_PUBLIC_STATS);
  const [videos, setVideos] = useState<VideoUpload[]>(INITIAL_VIDEOS);
  const [activeVideo, setActiveVideo] = useState<VideoUpload | null>(INITIAL_VIDEOS[0]);
  const [detections, setDetections] = useState<Detection[]>(INITIAL_DETECTIONS);
  const [selectedDetection, setSelectedDetection] = useState<Detection | null>(null);
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>(INITIAL_WORK_ORDERS);
  const [contractors, setContractors] = useState<Contractor[]>(INITIAL_CONTRACTORS);
  const [ratings, setRatings] = useState<ContractorRating[]>(() => {
    try { return JSON.parse(localStorage.getItem('civitrak-ratings') || '[]'); } catch { return []; }
  });

  useEffect(() => {
    try { localStorage.setItem('civitrak-ratings', JSON.stringify(ratings)); } catch { /* storage may be unavailable */ }
  }, [ratings]);

  useEffect(() => {
    apiClient.getContractors().then((rows) => {
      if (!rows?.length) return;
      setContractors(rows.map((contractor) => {
        const local = ratings.filter((r) => r.contractor_id === contractor.id);
        if (!local.length) return contractor;
        const avg = local.reduce((sum, r) => sum + r.rating, 0) / local.length;
        return { ...contractor, rating: Number(avg.toFixed(1)), rating_count: local.length };
      }));
    }).catch(() => undefined);
  }, []);

  const [currentRole, setCurrentRole] = useState<UserRole>(() => {
    try {
      const saved = localStorage.getItem('civitrak-role');
      return saved === 'USER' || saved === 'AUTHORITY' || saved === 'CONTRACTOR' ? saved : 'GUEST';
    } catch { return 'GUEST'; }
  });
  const [currentUserId, setCurrentUserId] = useState<string>(() => {
    try { return localStorage.getItem('civitrak-user-id') || 'guest'; } catch { return 'guest'; }
  });
  const [currentUserName, setCurrentUserName] = useState<string>(() => {
    try { return localStorage.getItem('civitrak-user-name') || 'Guest Inspector'; } catch { return 'Guest Inspector'; }
  });
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Keep Citizen / Authority / Contractor work-order views synchronized with the
  // same backend records. This is the live-tracking heartbeat for the prototype.
  // The refresh is deliberately available even while signed out so that a newly
  // submitted citizen case is already in memory when the next portal opens.
  const refreshWorkOrders = async (): Promise<WorkOrder[]> => {
    try {
      const rows = await apiClient.getWorkOrders();
      if (rows.length || currentRole !== 'GUEST') setWorkOrders(rows);
      return rows;
    } catch {
      return workOrders;
    }
  };

  useEffect(() => {
    let cancelled = false;
    const refresh = async () => {
      try {
        const rows = await apiClient.getWorkOrders();
        if (!cancelled && (rows.length || currentRole !== 'GUEST')) setWorkOrders(rows);
      } catch { /* keep the last known state */ }
    };
    refresh();
    const timer = window.setInterval(refresh, 5000);
    return () => { cancelled = true; window.clearInterval(timer); };
  }, [currentRole]);


  useEffect(() => {
    apiClient.getPublicStats().then(setStats).catch(() => undefined);
  }, []);

  useEffect(() => {
    try {
      if (currentRole === 'GUEST') {
        localStorage.removeItem('civitrak-role');
        localStorage.removeItem('civitrak-user-id');
        localStorage.removeItem('civitrak-user-name');
      } else {
        localStorage.setItem('civitrak-role', currentRole);
        localStorage.setItem('civitrak-user-id', currentUserId);
        localStorage.setItem('civitrak-user-name', currentUserName);
      }
    } catch { /* storage may be unavailable */ }
  }, [currentRole, currentUserId, currentUserName]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    window.setTimeout(() => {
      setToastMessage((previous) => (previous === msg ? null : previous));
    }, 4000);
  };

  const uploadNewVideo = async (
    file: File | null,
    routeName: string,
    _gpsFile?: File | null,
  ): Promise<string> => {
    if (!file) {
      throw new Error('Please select a real video file before uploading.');
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('route_label', routeName);

    const { video_id, upload } = await apiClient.uploadVideo(formData);
    setVideos((previous) => [upload, ...previous]);
    setActiveVideo(upload);
    setDetections([]);
    showToast(`Video "${file.name}" uploaded. AI processing has started.`);
    return video_id;
  };

  const loadVideoDetections = async (videoId: string): Promise<Detection[]> => {
    const result = await apiClient.getDetections(videoId);
    setDetections(result);
    return result;
  };

  const updateWorkOrderStatus = (id: string, status: WorkOrderStatus, note?: string) => {
    setWorkOrders((previous) => previous.map((workOrder) => workOrder.id === id ? {
      ...workOrder, status, is_escalated: status === 'ESCALATED' ? true : workOrder.is_escalated,
      history: [...workOrder.history, { stage: status, timestamp: new Date().toLocaleString(), note: note || `Status transitioned to ${status}`, updated_by: currentUserName }],
    } : workOrder));
    apiClient.updateWorkOrderStatus(id, status, note).catch(() => undefined);
    showToast(`Work Order ${id} is now ${status.replaceAll('_', ' ')}.`);
  };

  const submitRepairForReview = (id: string, note?: string) => {
    apiClient.submitRepairProof(id, note).catch(() => undefined);
    setWorkOrders((previous) => previous.map((workOrder) => workOrder.id === id ? {
      ...workOrder, status: 'SUBMITTED',
      history: [...workOrder.history, { stage: 'SUBMITTED', timestamp: new Date().toLocaleString(), note: note || 'Contractor submitted repair completion evidence for authority review.', updated_by: currentUserName }],
    } : workOrder));
    showToast(`Work Order ${id} submitted for authority verification.`);
  };

  const approveRepair = (id: string, note?: string) => {
    apiClient.resolveWorkOrder(id, note).catch(() => undefined);
    setWorkOrders((previous) => previous.map((workOrder) => workOrder.id === id ? {
      ...workOrder, status: 'COMPLETED',
      history: [...workOrder.history, { stage: 'COMPLETED', timestamp: new Date().toLocaleString(), note: note || 'Authority reviewed the completion evidence and closed the work order.', updated_by: currentUserName }],
    } : workOrder));
    showToast(`Work Order ${id} verified and closed.`);
  };

  const rejectRepair = (id: string, note?: string) => {
    updateWorkOrderStatus(id, 'REJECTED', note || 'Completion evidence requires rework. Contractor must return to site.');
  };

  const rateContractor = (workOrderId: string, rating: number, comment: string) => {
    const order = workOrders.find((item) => item.id === workOrderId);
    if (!order || order.status !== 'COMPLETED') return;
    if (ratings.some((item) => item.work_order_id === workOrderId)) { showToast('This completed work has already been rated.'); return; }
    const safeRating = Math.max(0, Math.min(5, Math.round(rating * 2) / 2));
    const record: ContractorRating = {
      id: `RATING-${Date.now()}`, work_order_id: workOrderId, contractor_id: order.assigned_contractor_id,
      contractor_name: order.contractor_name, rating: safeRating, comment: comment.trim() || 'Citizen submitted a service rating.',
      citizen_name: currentUserName, created_at: new Date().toLocaleString(),
    };
    setRatings((previous) => [record, ...previous]);
    setWorkOrders((previous) => previous.map((item) => item.id === workOrderId ? { ...item, citizen_rating: safeRating, citizen_rating_comment: record.comment } : item));
    setContractors((previous) => previous.map((contractor) => {
      if (contractor.id !== order.assigned_contractor_id) return contractor;
      const existing = ratings.filter((r) => r.contractor_id === contractor.id);
      const nextAverage = [...existing, record].reduce((sum, r) => sum + r.rating, 0) / (existing.length + 1);
      return { ...contractor, rating: Number(nextAverage.toFixed(1)) };
    }));
    apiClient.submitRating(workOrderId, safeRating, record.comment, currentUserName).catch(() => undefined);
    showToast(`Rating submitted: ${safeRating}/5 for ${order.contractor_name}.`);
  };

  const createWorkOrderFromDetection = (detectionId: string, contractorId?: string): WorkOrder => {
    const detection = detections.find((item) => item.id === detectionId);
    if (!detection) throw new Error('Detection not found');

    const contractor =
      contractors.find((item) => item.id === contractorId) || contractors[0];

    const newOrder: WorkOrder = {
      id: `WO-${4100 + workOrders.length}`,
      detection_id: detection.id,
      defect_type: detection.defect_type,
      defect_label: `${detection.defect_label} (${detection.chainage})`,
      route: detection.road_name,
      chainage: detection.chainage,
      severity: detection.severity,
      assigned_contractor_id: contractor.id,
      contractor_name: contractor.name,
      contractor_area: contractor.assigned_area,
      created_at: 'Just now',
      deadline: '48 Hours',
      status: 'SENT',
      thumbnail_url: detection.annotated_thumbnail_path,
      sla_hours: detection.severity === 'CRITICAL' ? 24 : 48,
      hours_remaining: detection.severity === 'CRITICAL' ? 24 : 48,
      is_escalated: false,
      history: [
        {
          stage: 'SENT',
          timestamp: 'Just now',
          note: `Auto-dispatched from AI inspection evidence to ${contractor.name}`,
          updated_by: currentUserName,
        },
      ],
    };

    setWorkOrders((previous) => [newOrder, ...previous]);
    setStats((previous) => ({
      ...previous,
      work_orders_generated: previous.work_orders_generated + 1,
    }));
    showToast(`Work Order ${newOrder.id} dispatched to ${contractor.name}`);
    return newOrder;
  };

  const loginAs = (role: 'USER' | 'AUTHORITY' | 'CONTRACTOR', contractorId?: string) => {
    setCurrentRole(role);

    if (role === 'USER') {
      setCurrentUserId('USER-DEMO-01');
      setCurrentUserName('CiviTrak Citizen');
      showToast('Signed in as Citizen.');
    } else if (role === 'AUTHORITY') {
      setCurrentUserId('AUTH-USR-01');
      setCurrentUserName('Er. Rajesh Sharma (Zonal Chief)');
      showToast('Signed in as Municipal Authority.');
    } else {
      const contractor = contractors.find((item) => item.id === contractorId) || contractors[0];
      setCurrentUserId(contractor.id);
      setCurrentUserName(contractor.name);
      showToast(`Signed in as Contractor: ${contractor.name}`);
    }
  };

  const logout = () => {
    setCurrentRole('GUEST');
    setCurrentUserId('guest');
    setCurrentUserName('Guest Inspector');
    showToast('Signed out. Returning to CiviTrak access.');
  };

  return (
    <AppContext.Provider
      value={{
        stats,
        videos,
        activeVideo,
        setActiveVideo,
        uploadNewVideo,
        detections,
        selectedDetection,
        setSelectedDetection,
        loadVideoDetections,
        workOrders,
        refreshWorkOrders,
        updateWorkOrderStatus,
        submitRepairForReview,
        approveRepair,
        rejectRepair,
        ratings,
        rateContractor,
        createWorkOrderFromDetection,
        contractors,
        currentRole,
        currentUserId,
        currentUserName,
        loginAs,
        logout,
        toastMessage,
        showToast,
      }}
    >
      {children}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-xl border border-[#0EA5C6]/40 bg-[#07131D] px-5 py-3.5 text-sm font-medium text-white shadow-2xl">
          <div className="h-2.5 w-2.5 animate-pulse rounded-full bg-[#16C7D9]" />
          <span>{toastMessage}</span>
          <button
            onClick={() => setToastMessage(null)}
            className="ml-2 text-gray-400 transition-colors hover:text-white"
            aria-label="Close notification"
          >
            ×
          </button>
        </div>
      )}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
};
