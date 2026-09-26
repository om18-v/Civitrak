import logging
from pathlib import Path

import cv2
import torch
from ultralytics import YOLO

_KNOWN_PRETRAINED_PREFIXES = (
    "yolov8",
    "yolo11",
    "yolov5",
    "yolov9",
    "yolov10",
)


class YOLODetector:
    def __init__(self, weights, device, conf_thresh, enabled_classes):
        weights_path = Path(weights)
        if not weights_path.is_absolute():
            weights_path = Path(__file__).resolve().parents[2] / weights_path

        is_known_pretrained = str(weights).lower().startswith(
            _KNOWN_PRETRAINED_PREFIXES
        )

        if not weights_path.is_file() and not is_known_pretrained:
            raise FileNotFoundError(
                f"Model weights not found: '{weights}'. "
                "Place the trained .pt file in Backend/models/ and update "
                "Backend/ai_ml/config/config.yaml."
            )

        self.model = YOLO(str(weights) if is_known_pretrained else str(weights_path))

        if device == "auto":
            device = "cuda" if torch.cuda.is_available() else "cpu"
        elif device == "cuda" and not torch.cuda.is_available():
            logging.warning(
                "CUDA requested but no GPU is available; using CPU instead."
            )
            device = "cpu"

        self.device = device
        self.conf_thresh = conf_thresh
        self.enabled_classes = set(enabled_classes or [])

    def run_inference(self, frame):
        results = self.model.predict(
            frame,
            device=self.device,
            conf=self.conf_thresh,
            verbose=False,
        )
        detections = []

        for result in results:
            for box in result.boxes:
                class_id = int(box.cls)
                class_name = self.model.names[class_id]
                if class_name in self.enabled_classes:
                    detections.append(
                        {
                            "class_name": class_name,
                            "confidence": float(box.conf),
                            "bbox": box.xyxy[0].tolist(),
                        }
                    )
        return detections

    def save_thumbnail(self, frame, det, thumb_dir, frame_idx):
        thumb_dir = Path(thumb_dir)
        thumb_dir.mkdir(parents=True, exist_ok=True)

        annotated = frame.copy()
        x1, y1, x2, y2 = map(int, det["bbox"])
        cv2.rectangle(annotated, (x1, y1), (x2, y2), (0, 255, 0), 2)
        cv2.putText(
            annotated,
            f"{det['class_name']} {det['confidence']:.2f}",
            (x1, max(20, y1 - 10)),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.5,
            (0, 255, 0),
            2,
        )

        safe_name = str(det["class_name"]).replace(" ", "_")
        filename = (
            f"frame_{frame_idx}_{safe_name}_"
            f"{int(det['confidence'] * 1000)}.jpg"
        )
        path = thumb_dir / filename
        cv2.imwrite(str(path), annotated)
        return path
