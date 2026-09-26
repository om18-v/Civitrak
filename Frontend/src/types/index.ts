export type DefectType = 
  | 'pothole'
  | 'open_manhole'
  | 'faded_zebra_crossing'
  | 'damaged_signboard'
  | 'traffic_density_spike'
  | 'edge_crack';

export type SeverityLevel = 'CRITICAL' | 'HIGH' | 'MODERATE' | 'LOW';

export type WorkOrderStatus = 'SENT' | 'ACKNOWLEDGED' | 'IN_PROGRESS' | 'SUBMITTED' | 'COMPLETED' | 'ESCALATED' | 'REJECTED';

export type UserRole = 'USER' | 'AUTHORITY' | 'CONTRACTOR' | 'GUEST';

export interface BoundingBox {
  x: number; // percentage 0 - 100
  y: number; // percentage 0 - 100
  width: number; // percentage 0 - 100
  height: number; // percentage 0 - 100
}

export interface Detection {
  id: string;
  video_id: string;
  defect_type: DefectType;
  defect_label: string;
  confidence: number; // 0 to 1
  severity: SeverityLevel;
  timestamp_in_video: string; // e.g. "00:04:12"
  frame_number: number;
  latitude: number;
  longitude: number;
  road_name: string;
  chainage: string; // e.g. "KM 14+320"
  annotated_thumbnail_path: string;
  bounding_box: BoundingBox;
  work_order_id?: string;
  description: string;
  suggested_action: string;
  detected_at: string;
}

export interface VideoUpload {
  id: string;
  filename: string;
  file_size_mb: number;
  duration_seconds: number;
  route_name: string;
  inspection_date: string;
  status: 'UPLOADED' | 'EXTRACTING_FRAMES' | 'ANALYZING_AI' | 'MATCHING_GIS' | 'COMPLETED' | 'FAILED';
  progress: number;
  fps: number;
  total_frames: number;
  extracted_frames: number;
  analyzed_frames: number;
  detections_count: number;
  gps_track_available: boolean;
  uploaded_at: string;
}

export interface WorkOrder {
  id: string;
  detection_id: string;
  defect_type: DefectType;
  defect_label: string;
  route: string;
  chainage: string;
  severity: SeverityLevel;
  assigned_contractor_id: string;
  contractor_name: string;
  contractor_area: string;
  created_at: string;
  deadline: string;
  status: WorkOrderStatus;
  thumbnail_url: string;
  sla_hours: number;
  hours_remaining: number;
  is_escalated: boolean;
  escalation_reason?: string;
  citizen_visible?: boolean;
  citizen_rating?: number;
  citizen_rating_comment?: string;
  history: {
    stage: WorkOrderStatus;
    timestamp: string;
    note: string;
    updated_by: string;
  }[];
}

export interface Contractor {
  id: string;
  name: string;
  assigned_area: string;
  contact_person: string;
  phone: string;
  email: string;
  rating: number; // 0 to 5
  rating_count?: number;
  active_orders: number;
  completed_orders: number;
  overdue_orders: number;
  completion_rate: number; // percentage
  avg_response_hours: number;
}

export interface PublicStats {
  road_videos_analyzed: number;
  detection_types: number;
  issues_located: number;
  work_orders_generated: number;
  critical_issues_resolved: number;
  avg_resolution_hours: number;
  active_contractors: number;
}

export interface ContractorRating {
  id: string;
  work_order_id: string;
  contractor_id: string;
  contractor_name: string;
  rating: number;
  comment: string;
  citizen_name: string;
  created_at: string;
}

export interface EdgeAnalytics {
  mode: string;
  status: string;
  message: string;
  source_frames_processed: number;
  evidence_frames: number;
  alerts: number;
  estimated_bandwidth_reduction_percent: number;
  basis: string;
}

export interface RouteAnalytics {
  route: string;
  issues: number;
  critical: number;
  high: number;
  resolved: number;
  assigned: number;
  coordinates: [number, number][];
}

export interface HeatPoint {
  lat: number;
  lng: number;
  weight: number;
  severity: string;
  defect_type: string;
  route: string;
}

export interface AnalyticsOverview {
  edge_ai: EdgeAnalytics;
  route_analytics: RouteAnalytics[];
  heat_points: HeatPoint[];
  workflow: {
    detected: number;
    verified: number;
    assigned: number;
    repairing: number;
    resolved: number;
    work_orders: number;
  };
}
