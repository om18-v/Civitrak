import React, { createContext, useContext, useState, useEffect } from 'react';
import { Contractor, Detection, PublicStats, UserRole, VideoUpload, WorkOrder, WorkOrderStatus } from '../types';
import { INITIAL_CONTRACTORS, INITIAL_DETECTIONS, INITIAL_PUBLIC_STATS, INITIAL_VIDEOS, INITIAL_WORK_ORDERS } from '../mocks/mockData';
import { apiClient } from '../api/client';

interface AppContextType {
  // Stats
  stats: PublicStats;
  
  // Videos
  videos: VideoUpload[];
  activeVideo: VideoUpload | null;
  setActiveVideo: (video: VideoUpload | null) => void;
  uploadNewVideo: (file: File | null, routeName: string, gpsFile?: File | null) => Promise<string>;
  
  // Detections
  detections: Detection[];
  selectedDetection: Detection | null;
  setSelectedDetection: (detection: Detection | null) => void;
  
  // Work Orders
  workOrders: WorkOrder[];
  updateWorkOrderStatus: (id: string, status: WorkOrderStatus, note?: string) => void;
  createWorkOrderFromDetection: (detectionId: string, contractorId?: string) => WorkOrder;
  
  // Contractors
  contractors: Contractor[];
  
  // Auth
  currentRole: UserRole;
  currentUserId: string;
  currentUserName: string;
  loginAs: (role: 'AUTHORITY' | 'CONTRACTOR', contractorId?: string) => void;
  logout: () => void;
  
  // Feedback toast
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
  
  // Auth
  const [currentRole, setCurrentRole] = useState<UserRole>('GUEST');
  const [currentUserId, setCurrentUserId] = useState<string>('guest');
  const [currentUserName, setCurrentUserName] = useState<string>('Guest Inspector');

  // Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(prev => (prev === msg ? null : prev));
    }, 4000);
  };

  const uploadNewVideo = async (file: File | null, routeName: string, _gpsFile?: File | null): Promise<string> => {
    const formData = new FormData();
    if (file) formData.append('video', file);
    formData.append('route_name', routeName);
    
    const { video_id, upload } = await apiClient.uploadVideo(formData);
    setVideos(prev => [upload, ...prev]);
    setActiveVideo(upload);
    showToast(`Video "${upload.filename}" uploaded successfully. Initiating frame pipeline.`);
    return video_id;
  };

  const updateWorkOrderStatus = (id: string, status: WorkOrderStatus, note?: string) => {
    setWorkOrders(prev =>
      prev.map(wo => {
        if (wo.id === id) {
          const isCompleted = status === 'COMPLETED';
          const isEscalated = status === 'ESCALATED';
          const newHistory = [
            ...wo.history,
            {
              stage: status,
              timestamp: new Date().toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
              note: note || `Status transitioned to ${status}`,
              updated_by: currentUserName,
            },
          ];
          return {
            ...wo,
            status,
            is_escalated: isEscalated ? true : isCompleted ? false : wo.is_escalated,
            history: newHistory,
          };
        }
        return wo;
      })
    );

    // Update contractor stats if completed
    if (status === 'COMPLETED') {
      const order = workOrders.find(w => w.id === id);
      if (order) {
        setContractors(prev =>
          prev.map(c => {
            if (c.id === order.assigned_contractor_id) {
              const newCompleted = c.completed_orders + 1;
              const newActive = Math.max(0, c.active_orders - 1);
              const total = newCompleted + newActive + c.overdue_orders;
              const rate = +( (newCompleted / total) * 100 ).toFixed(1);
              return {
                ...c,
                completed_orders: newCompleted,
                active_orders: newActive,
                completion_rate: rate,
              };
            }
            return c;
          })
        );
      }
      setStats(prev => ({
        ...prev,
        critical_issues_resolved: prev.critical_issues_resolved + 1,
      }));
      showToast(`Work Order ${id} marked as COMPLETED.`);
    } else if (status === 'ESCALATED') {
      showToast(`Work Order ${id} has been ESCALATED to Chief Municipal Engineer.`);
    } else {
      showToast(`Work Order ${id} status updated to ${status}.`);
    }

    apiClient.updateWorkOrderStatus(id, status, note);
  };

  const createWorkOrderFromDetection = (detectionId: string, contractorId?: string): WorkOrder => {
    const det = detections.find(d => d.id === detectionId);
    if (!det) throw new Error('Detection not found');

    const assignedContractor = contractors.find(c => c.id === contractorId) || contractors[0];
    const newWoId = `WO-${4100 + workOrders.length}`;
    
    const newOrder: WorkOrder = {
      id: newWoId,
      detection_id: det.id,
      defect_type: det.defect_type,
      defect_label: `${det.defect_label} (${det.chainage})`,
      route: det.road_name,
      chainage: det.chainage,
      severity: det.severity,
      assigned_contractor_id: assignedContractor.id,
      contractor_name: assignedContractor.name,
      contractor_area: assignedContractor.assigned_area,
      created_at: 'Just now',
      deadline: '48 Hours',
      status: 'SENT',
      thumbnail_url: det.annotated_thumbnail_path,
      sla_hours: det.severity === 'CRITICAL' ? 24 : 48,
      hours_remaining: det.severity === 'CRITICAL' ? 24 : 48,
      is_escalated: false,
      history: [
        {
          stage: 'SENT',
          timestamp: 'Just now',
          note: `Auto-dispatched from AI inspection evidence to ${assignedContractor.name}`,
          updated_by: currentUserName,
        },
      ],
    };

    setWorkOrders(prev => [newOrder, ...prev]);
    setDetections(prev =>
      prev.map(d => (d.id === detectionId ? { ...d, work_order_id: newWoId } : d))
    );
    setStats(prev => ({
      ...prev,
      work_orders_generated: prev.work_orders_generated + 1,
    }));
    showToast(`Work Order ${newWoId} dispatched to ${assignedContractor.name}`);
    return newOrder;
  };

  const loginAs = (role: 'AUTHORITY' | 'CONTRACTOR', contractorId?: string) => {
    setCurrentRole(role);
    if (role === 'AUTHORITY') {
      setCurrentUserId('AUTH-USR-01');
      setCurrentUserName('Er. Rajesh Sharma (Zonal Chief)');
      showToast('Signed in as Municipal Authority (Full Command Access)');
    } else {
      const contractor = contractors.find(c => c.id === contractorId) || contractors[0];
      setCurrentUserId(contractor.id);
      setCurrentUserName(contractor.name);
      showToast(`Signed in as Contractor: ${contractor.name}`);
    }
  };

  const logout = () => {
    setCurrentRole('GUEST');
    setCurrentUserId('guest');
    setCurrentUserName('Guest Inspector');
    showToast('Logged out to public inspection view');
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
        workOrders,
        updateWorkOrderStatus,
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
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-[#07131D] border border-[#0EA5C6]/40 text-white px-5 py-3.5 rounded-xl shadow-2xl animate-fade-in text-sm font-medium">
          <div className="w-2.5 h-2.5 rounded-full bg-[#16C7D9] animate-pulse" />
          <span>{toastMessage}</span>
          <button 
            onClick={() => setToastMessage(null)} 
            className="ml-2 text-gray-400 hover:text-white transition-colors"
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
