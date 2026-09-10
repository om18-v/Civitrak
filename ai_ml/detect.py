import logging
from pathlib import Path
from ai_ml.config import config_loader
from ai_ml.video.frame_extractor import FrameExtractor
from ai_ml.detection.yolo_detector import YOLODetector
from ai_ml.ocr.ocr_engine import OCREngine
from ai_ml.utils.paths import ensure_dir

def process_video(video_path: str) -> list[dict]:
    cfg = config_loader.load_config()
    results = []

    logging.info("AI pipeline started")

    extractor = FrameExtractor(video_path, cfg["processing"]["target_fps"])
    frames = extractor.extract_frames()

    detector = YOLODetector(cfg["model"]["weights"],
                            cfg["model"]["device"],
                            cfg["inference"]["confidence_threshold"],
                            cfg["classes"]["enabled"])

    ocr_engine = OCREngine(cfg["ocr"]) if cfg["ocr"]["enabled"] else None

    thumb_dir = Path(cfg["output"]["thumbnail_dir"])
    ensure_dir(thumb_dir)

    for frame_data in frames:
        detections = detector.run_inference(frame_data["frame"])
        for det in detections:
            annotated_path = detector.save_thumbnail(frame_data["frame"], det, thumb_dir, frame_data["index"])
            detection_obj = {
                "defect_type": det["class_name"],
                "confidence": det["confidence"],
                "timestamp_in_video": frame_data["timestamp"],
                "annotated_thumbnail_path": str(annotated_path)
            }
            results.append(detection_obj)

            if ocr_engine and det["class_name"] == "license_plate":
                ocr_engine.run(det, frame_data["frame"])

    logging.info("AI pipeline completed")
    return results
