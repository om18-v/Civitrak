import logging
from ultralytics import YOLO
import cv2
from pathlib import Path

class YOLODetector:
    def __init__(self, weights, device, conf_thresh, enabled_classes):
        self.model = YOLO(weights)
        self.device = device
        self.conf_thresh = conf_thresh
        self.enabled_classes = enabled_classes

    def run_inference(self, frame):
        results = self.model.predict(frame, device=self.device, conf=self.conf_thresh)
        detections = []
        for r in results:
            for box in r.boxes:
                cls_name = self.model.names[int(box.cls)]
                if cls_name in self.enabled_classes:
                    detections.append({
                        "class_name": cls_name,
                        "confidence": float(box.conf),
                        "bbox": box.xyxy[0].tolist()
                    })
        return detections

    def save_thumbnail(self, frame, det, thumb_dir, frame_idx):
        x1, y1, x2, y2 = map(int, det["bbox"])
        cv2.rectangle(frame, (x1, y1), (x2, y2), (0,255,0), 2)
        cv2.putText(frame, f"{det['class_name']} {det['confidence']:.2f}",
                    (x1, y1-10), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0,255,0), 2)
        path = Path(thumb_dir) / f"frame_{frame_idx}.jpg"
        cv2.imwrite(str(path), frame)
        return path
