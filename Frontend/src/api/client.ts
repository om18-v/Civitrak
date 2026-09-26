import {
  Contractor,
  Detection,
  PublicStats,
  VideoUpload,
  WorkOrder,
  WorkOrderStatus,
  ContractorRating,
} from '../types';
import {
  INITIAL_CONTRACTORS,
  INITIAL_DETECTIONS,
  INITIAL_PUBLIC_STATS,
  INITIAL_WORK_ORDERS,
} from '../mocks/mockData';

const BASE_URL =
  ((import.meta as ImportMeta & { env?: Record<string, string> }).env?.VITE_API_URL ||
    'http://127.0.0.1:8000').replace(/\/$/, '');

async function readError(response: Response): Promise<string> {
  try {
    const body = await response.json();
    if (typeof body?.detail === 'string') return body.detail;
    return JSON.stringify(body);
  } catch {
    return `${response.status} ${response.statusText}`;
  }
}

function makeUpload(file: File | null, videoId: number | string, route: string, status: string): VideoUpload {
  const id = String(videoId);
  return {
    id,
    filename: file?.name || `inspection-${id}.mp4`,
    file_size_mb: file ? +(file.size / (1024 * 1024)).toFixed(1) : 0,
    duration_seconds: 0,
    route_name: route,
    inspection_date: new Date().toISOString().split('T')[0],
    status:
      (status === 'done' || status === 'completed')
        ? 'COMPLETED'
        : status === 'failed'
          ? 'FAILED'
          : 'EXTRACTING_FRAMES',
    progress: (status === 'done' || status === 'completed') ? 100 : 5,
    fps: 0,
    total_frames: 0,
    extracted_frames: 0,
    analyzed_frames: 0,
    detections_count: 0,
    gps_track_available: false,
    uploaded_at: new Date().toLocaleString(),
  };
}

function mapDetection(raw: any, routeLabel: string): Detection {
  const defectType = String(raw.defect_type || 'unknown') as Detection['defect_type'];
  const confidence = Number(raw.confidence_score ?? 0);
  const severity: Detection['severity'] =
    defectType === 'open_manhole'
      ? 'CRITICAL'
      : confidence >= 0.85
        ? 'HIGH'
        : confidence >= 0.6
          ? 'MODERATE'
          : 'LOW';

  const labelMap: Record<string, string> = {
    pothole: 'Pothole',
    open_manhole: 'Open Manhole',
    faded_zebra_crossing: 'Faded Zebra Crossing',
    damaged_signboard: 'Damaged Signboard',
    traffic_density_spike: 'Traffic Density Spike',
  };

  const timestamp = Number(raw.timestamp_in_video ?? 0);
  const mins = Math.floor(timestamp / 60).toString().padStart(2, '0');
  const secs = Math.floor(timestamp % 60).toString().padStart(2, '0');

  return {
    id: String(raw.id),
    video_id: String(raw.video_id),
    defect_type: defectType,
    defect_label: labelMap[defectType] || defectType.replaceAll('_', ' '),
    confidence,
    severity,
    timestamp_in_video: `00:${mins}:${secs}`,
    frame_number: 0,
    latitude: Number(raw.latitude ?? 0),
    longitude: Number(raw.longitude ?? 0),
    road_name: routeLabel || 'Uploaded inspection route',
    chainage: `T+${timestamp.toFixed(1)}s`,
    annotated_thumbnail_path: raw.thumbnail_url ? (String(raw.thumbnail_url).startsWith('http') ? raw.thumbnail_url : `${BASE_URL}${raw.thumbnail_url}`) : (raw.annotated_image_url ? `${BASE_URL}${raw.annotated_image_url}` : ''),
    bounding_box: raw.normalized_bbox ? { x: Number(raw.normalized_bbox.x), y: Number(raw.normalized_bbox.y), width: Number(raw.normalized_bbox.width), height: Number(raw.normalized_bbox.height) } : { x: 0, y: 0, width: 0, height: 0 },
    description: `AI detected ${labelMap[defectType] || defectType} in the uploaded inspection footage.`,
    suggested_action: 'Inspect the location and create the appropriate maintenance action.',
    detected_at: new Date().toISOString(),
  };
}

function mapWorkOrder(raw: any): WorkOrder {
  const statusMap: Record<string, WorkOrderStatus> = {
    pending: 'SENT', sent: 'SENT', acknowledged: 'ACKNOWLEDGED', in_progress: 'IN_PROGRESS',
    submitted: 'SUBMITTED', completed: 'COMPLETED', escalated: 'ESCALATED', rejected: 'REJECTED',
  };
  const contractorId = raw.contractor_id != null ? `CON-${String(raw.contractor_id).padStart(2, '0')}` : 'CON-01';
  const deadline = raw.deadline_date ? new Date(raw.deadline_date).toLocaleString() : '48 Hours';
  return {
    id: `WO-${raw.id}`, detection_id: String(raw.detection_id), defect_type: String(raw.defect_type || 'pothole') as WorkOrder['defect_type'],
    defect_label: raw.defect_type ? String(raw.defect_type).replaceAll('_',' ') : 'Infrastructure issue',
    route: raw.route_label || 'Assigned civic route', chainage: 'GIS linked', severity: String(raw.severity || 'medium').toUpperCase() as WorkOrder['severity'],
    assigned_contractor_id: contractorId, contractor_name: raw.contractor_name || 'Assigned contractor', contractor_area: 'Municipal service area',
    created_at: raw.created_at ? new Date(raw.created_at).toLocaleString() : 'Just now', deadline, status: statusMap[raw.status] || 'SENT',
    thumbnail_url: raw.annotated_image_url ? (String(raw.annotated_image_url).startsWith('http') ? raw.annotated_image_url : `${BASE_URL}${raw.annotated_image_url}`) : '', sla_hours: 48, hours_remaining: 48, is_escalated: Boolean(raw.escalated),
    history: [], citizen_visible: true,
  };
}

export const apiClient = {
  async getPublicStats(): Promise<PublicStats> {
    try {
      const res = await fetch(`${BASE_URL}/api/public/stats`);
      if (!res.ok) throw new Error(await readError(res));
      const data = await res.json();
      return {
        ...INITIAL_PUBLIC_STATS,
        issues_located: Number(data.total ?? 0),
        critical_issues_resolved: Number(data.fixed ?? 0),
      };
    } catch (error) {
      console.warn('Public stats API unavailable; using demo data.', error);
      return INITIAL_PUBLIC_STATS;
    }
  },

  async uploadVideo(formData: FormData): Promise<{ video_id: string; upload: VideoUpload }> {
    const response = await fetch(`${BASE_URL}/api/videos/upload`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(await readError(response));
    }

    const data = await response.json();
    const file = formData.get('file') as File | null;
    const route = String(formData.get('route_label') || '');

    return {
      video_id: String(data.video_id),
      upload: makeUpload(file, data.video_id, route, data.status),
    };
  },

  async getVideoStatus(videoId: string): Promise<{
    video_id: string;
    status: string;
  }> {
    const response = await fetch(`${BASE_URL}/api/videos/${videoId}/status`);
    if (!response.ok) throw new Error(await readError(response));
    const data = await response.json();
    return {
      video_id: String(data.video_id),
      status: String(data.status),
    };
  },

  async getDetections(videoId?: string): Promise<Detection[]> {
    if (!videoId) return INITIAL_DETECTIONS;

    const response = await fetch(`${BASE_URL}/api/videos/${videoId}/detections`);
    if (!response.ok) throw new Error(await readError(response));

    const data = await response.json();
    return (data.detections || []).map((item: any) =>
      mapDetection(item, String(data.route_label || ''))
    );
  },

  // Authentication remains demo-only until user accounts are seeded.
  async login(_credentials: {
    email: string;
    password: string;
    role?: 'USER' | 'AUTHORITY' | 'CONTRACTOR';
    contractorId?: string;
  }) {
    const contractor = INITIAL_CONTRACTORS[0];
    return {
      token: 'demo_token',
      user: {
        id: 'AUTH-USR-01',
        name: 'Chief Engineer Sharma',
        role: 'AUTHORITY' as const,
        department: 'Urban Transport & Smart City Command Center',
        contractor_id: contractor.id,
      },
    };
  },

  async getWorkOrders(): Promise<WorkOrder[]> {
    try {
      const response = await fetch(`${BASE_URL}/api/work-orders`);
      if (!response.ok) throw new Error(await readError(response));
      const rows = await response.json();
      return rows.map((row: any) => mapWorkOrder(row));
    } catch {
      return INITIAL_WORK_ORDERS;
    }
  },

  async updateWorkOrderStatus(id: string, status: WorkOrderStatus, note?: string): Promise<boolean> {
    try {
      const numericId = Number(String(id).replace(/\D/g, ''));
      const response = await fetch(`${BASE_URL}/api/work-orders/${numericId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: status.toLowerCase(), note }),
      });
      if (!response.ok) throw new Error(await readError(response));
      return true;
    } catch {
      return false;
    }
  },

  async submitRepairProof(id: string, note?: string, image?: File | null): Promise<boolean> {
    try {
      const numericId = Number(String(id).replace(/\D/g, ''));
      const body = new FormData();
      if (note) body.append('note', note);
      if (image) body.append('image', image);
      const response = await fetch(`${BASE_URL}/api/work-orders/${numericId}/repair-proof`, { method: 'POST', body });
      if (!response.ok) throw new Error(await readError(response));
      return true;
    } catch {
      return false;
    }
  },

  async resolveWorkOrder(id: string, note?: string): Promise<boolean> {
    try {
      const numericId = Number(String(id).replace(/\D/g, ''));
      const response = await fetch(`${BASE_URL}/api/work-orders/${numericId}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'completed', note }),
      });
      if (!response.ok) throw new Error(await readError(response));
      return true;
    } catch {
      return false;
    }
  },

  async submitRating(id: string, rating: number, comment: string, citizenName: string): Promise<boolean> {
    try {
      const numericId = Number(String(id).replace(/\D/g, ''));
      const response = await fetch(`${BASE_URL}/api/work-orders/${numericId}/rating`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating, comment, citizen_name: citizenName }),
      });
      if (!response.ok) throw new Error(await readError(response));
      return true;
    } catch {
      return false;
    }
  },

  async getContractorRatings(contractorId: string): Promise<ContractorRating[]> {
    try {
      const numericId = Number(String(contractorId).replace(/\D/g, ''));
      const response = await fetch(`${BASE_URL}/api/contractors/${numericId}/ratings`);
      if (!response.ok) throw new Error(await readError(response));
      return await response.json();
    } catch {
      return [];
    }
  },

  async getEscalatedWorkOrders(): Promise<WorkOrder[]> {
    try {
      const response = await fetch(`${BASE_URL}/api/work-orders/escalated`);
      if (!response.ok) throw new Error(await readError(response));
      return (await response.json()).map((row: any) => mapWorkOrder(row));
    } catch {
      return INITIAL_WORK_ORDERS.filter((workOrder) => workOrder.is_escalated);
    }
  },

  async getContractors(): Promise<Contractor[]> {
    try {
      const response = await fetch(`${BASE_URL}/api/contractors`);
      if (!response.ok) throw new Error(await readError(response));
      const rows = await response.json();
      return rows.map((row: any) => ({ ...row, id: `CON-${String(row.id).padStart(2, '0')}`, rating_count: Number(row.rating_count || 0) }));
    } catch {
      return INITIAL_CONTRACTORS;
    }
  },

  async getInspectionSummary(videoId: string): Promise<any> {
    const response = await fetch(`${BASE_URL}/api/videos/${videoId}/inspection-summary`);
    if (!response.ok) throw new Error(await readError(response));
    return response.json();
  },

  async submitReportToContractor(videoId: string): Promise<any> {
    const response = await fetch(`${BASE_URL}/api/videos/${videoId}/submit-to-contractor`, { method: 'POST' });
    if (!response.ok) throw new Error(await readError(response));
    return response.json();
  },

  getReportPdfUrl(videoId: string): string {
    return `${BASE_URL}/api/reports/${videoId}/pdf`;
  },
};
