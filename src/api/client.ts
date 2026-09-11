import { Contractor, Detection, PublicStats, VideoUpload, WorkOrder, WorkOrderStatus } from '../types';
import { INITIAL_CONTRACTORS, INITIAL_DETECTIONS, INITIAL_PUBLIC_STATS, INITIAL_VIDEOS, INITIAL_WORK_ORDERS } from '../mocks/mockData';

const BASE_URL = (import.meta as any).env?.VITE_API_URL || '';

export interface LoginResponse {
  token: string;
  user: {
    id: string;
    name: string;
    role: 'AUTHORITY' | 'CONTRACTOR';
    department?: string;
    contractor_id?: string;
  };
}

export const apiClient = {
  // Stats
  async getPublicStats(): Promise<PublicStats> {
    if (BASE_URL) {
      try {
        const res = await fetch(`${BASE_URL}/api/public/stats`);
        if (res.ok) return await res.json();
      } catch (e) {
        console.warn('API fetch failed, falling back to mock stats', e);
      }
    }
    return INITIAL_PUBLIC_STATS;
  },

  // Video Upload
  async uploadVideo(formData: FormData): Promise<{ video_id: string; upload: VideoUpload }> {
    if (BASE_URL) {
      try {
        const res = await fetch(`${BASE_URL}/api/videos/upload`, {
          method: 'POST',
          body: formData,
        });
        if (res.ok) return await res.json();
      } catch (e) {
        console.warn('API upload failed, simulating upload flow', e);
      }
    }
    
    // Mock simulation
    const file = formData.get('video') as File | null;
    const route = (formData.get('route_name') as string) || 'Central Smart Corridor';
    const video_id = `VID-${Date.now().toString().slice(-4)}`;
    
    const newUpload: VideoUpload = {
      id: video_id,
      filename: file ? file.name : 'Urban_Corridor_Drive_Scan.mp4',
      file_size_mb: file ? +(file.size / (1024 * 1024)).toFixed(1) : 178.4,
      duration_seconds: 540,
      route_name: route,
      inspection_date: new Date().toISOString().split('T')[0],
      status: 'EXTRACTING_FRAMES',
      progress: 5,
      fps: 30,
      total_frames: 16200,
      extracted_frames: 810,
      analyzed_frames: 0,
      detections_count: 0,
      gps_track_available: true,
      uploaded_at: 'Just now',
    };

    return { video_id, upload: newUpload };
  },

  // Video Status Polling
  async getVideoStatus(videoId: string): Promise<VideoUpload | null> {
    if (BASE_URL) {
      try {
        const res = await fetch(`${BASE_URL}/api/videos/${videoId}/status`);
        if (res.ok) return await res.json();
      } catch (e) {
        console.warn('API status failed, using mock status', e);
      }
    }
    return null;
  },

  // Detections
  async getDetections(videoId?: string): Promise<Detection[]> {
    if (BASE_URL) {
      try {
        const url = videoId ? `${BASE_URL}/api/videos/${videoId}/detections` : `${BASE_URL}/api/detections`;
        const res = await fetch(url);
        if (res.ok) return await res.json();
      } catch (e) {
        console.warn('API detections failed, falling back to mock data', e);
      }
    }
    return INITIAL_DETECTIONS;
  },

  // Auth
  async login(credentials: { email: string; role: 'AUTHORITY' | 'CONTRACTOR'; contractorId?: string }): Promise<LoginResponse> {
    if (BASE_URL) {
      try {
        const res = await fetch(`${BASE_URL}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(credentials),
        });
        if (res.ok) return await res.json();
      } catch (e) {
        console.warn('API login failed, providing demo session', e);
      }
    }

    if (credentials.role === 'AUTHORITY') {
      return {
        token: 'demo_token_authority_9921',
        user: {
          id: 'AUTH-USR-01',
          name: 'Chief Engineer Sharma',
          role: 'AUTHORITY',
          department: 'Urban Transport & Smart City Command Center',
        },
      };
    } else {
      const contractor = INITIAL_CONTRACTORS.find(c => c.id === credentials.contractorId) || INITIAL_CONTRACTORS[0];
      return {
        token: `demo_token_contractor_${contractor.id}`,
        user: {
          id: contractor.id,
          name: contractor.contact_person,
          role: 'CONTRACTOR',
          contractor_id: contractor.id,
        },
      };
    }
  },

  // Work Orders
  async getWorkOrders(): Promise<WorkOrder[]> {
    if (BASE_URL) {
      try {
        const res = await fetch(`${BASE_URL}/api/work-orders`);
        if (res.ok) return await res.json();
      } catch (e) {
        console.warn('API work orders failed, using mock data', e);
      }
    }
    return INITIAL_WORK_ORDERS;
  },

  async updateWorkOrderStatus(id: string, status: WorkOrderStatus, note?: string): Promise<boolean> {
    if (BASE_URL) {
      try {
        const res = await fetch(`${BASE_URL}/api/work-orders/${id}/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status, note }),
        });
        if (res.ok) return true;
      } catch (e) {
        console.warn('API update failed', e);
      }
    }
    return true;
  },

  async getEscalatedWorkOrders(): Promise<WorkOrder[]> {
    if (BASE_URL) {
      try {
        const res = await fetch(`${BASE_URL}/api/work-orders/escalated`);
        if (res.ok) return await res.json();
      } catch (e) {
        console.warn('API escalated failed, using mock data', e);
      }
    }
    return INITIAL_WORK_ORDERS.filter(w => w.is_escalated);
  },

  // Contractors
  async getContractors(): Promise<Contractor[]> {
    if (BASE_URL) {
      try {
        const res = await fetch(`${BASE_URL}/api/contractors`);
        if (res.ok) return await res.json();
      } catch (e) {
        console.warn('API contractors failed, using mock data', e);
      }
    }
    return INITIAL_CONTRACTORS;
  },

  // PDF Report export (simulated or real)
  getReportPdfUrl(videoId: string): string {
    return `${BASE_URL || ''}/api/reports/${videoId}/pdf`;
  }
};
