#!/usr/bin/env python3
"""
SIHPS124 — Model Inference Test

Validates that a trained model actually produces real detections on a given frame.
Do NOT use this to fabricate output — it runs real inference and prints real results.

Usage:
  cd Backend
  python training/infer_test.py --image path/to/road_frame.jpg
  python training/infer_test.py --image path/to/road_frame.jpg --weights models/best.pt
  python training/infer_test.py --video uploads/your_video.mp4 --frame 120
"""

import argparse
import logging
from pathlib import Path

import cv2

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s: %(message)s")
logger = logging.getLogger("sihps.infer_test")

BACKEND_DIR     = Path(__file__).parent.parent
DEFAULT_WEIGHTS = BACKEND_DIR / "models" / "best.pt"
OUT_DIR         = BACKEND_DIR / "ai_ml" / "outputs" / "thumbs"
OUT_DIR.mkdir(parents=True, exist_ok=True)


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description="Test SIHPS124 model inference")
    p.add_argument("--weights", default=str(DEFAULT_WEIGHTS), help="Model weights .pt file")
    p.add_argument("--image",  default=None, help="Path to a test image")
    p.add_argument("--video",  default=None, help="Path to a video file (extracts one frame)")
    p.add_argument("--frame",  type=int, default=60, help="Frame number to extract from video")
    p.add_argument("--conf",   type=float, default=0.40, help="Confidence threshold")
    return p.parse_args()


def extract_frame(video_path: str, frame_no: int):
    cap = cv2.VideoCapture(video_path)
    cap.set(cv2.CAP_PROP_POS_FRAMES, frame_no)
    ret, frame = cap.read()
    cap.release()
    if not ret:
        logger.error(f"Could not extract frame {frame_no} from {video_path}")
        raise SystemExit(1)
    return frame


def main() -> None:
    args = parse_args()

    weights = Path(args.weights)
    if not weights.exists():
        print(f"\nERROR: Model weights not found: {weights}")
        print("Train the model first:  python training/train.py")
        print("Or set model_mode: generic_test to test the pipeline with stock YOLO.")
        raise SystemExit(1)

    try:
        from ultralytics import YOLO
    except ImportError:
        print("ERROR: ultralytics not installed. Run: pip install ultralytics")
        raise SystemExit(1)

    # Load model
    model = YOLO(str(weights))
    classes = list(model.names.values())
    print(f"\nModel loaded: {weights}")
    print(f"Model classes ({len(classes)}): {classes}")
    print("")

    # Load or extract image
    if args.image:
        frame_path = args.image
        frame      = cv2.imread(frame_path)
        if frame is None:
            print(f"ERROR: Cannot read image: {frame_path}")
            raise SystemExit(1)
        label = Path(frame_path).stem
    elif args.video:
        frame  = extract_frame(args.video, args.frame)
        label  = f"frame_{args.frame:06d}"
        # Save extracted frame so user can inspect it
        extracted_path = str(OUT_DIR / f"{label}_raw.jpg")
        cv2.imwrite(extracted_path, frame)
        print(f"Frame extracted: {extracted_path}")
    else:
        print("ERROR: Provide --image or --video")
        raise SystemExit(1)

    h, w = frame.shape[:2]
    print(f"Frame size: {w}x{h}")
    print(f"Running inference (conf>={args.conf})...\n")

    # Run inference
    results = model(frame, conf=args.conf, verbose=False)

    total = 0
    for result in results:
        boxes = result.boxes
        if boxes is None or len(boxes) == 0:
            continue
        for box in boxes:
            cls_id = int(box.cls[0])
            conf   = float(box.conf[0])
            name   = model.names.get(cls_id, str(cls_id))
            x1, y1, x2, y2 = [int(v) for v in box.xyxy[0].tolist()]
            total += 1
            print(f"Detection #{total}:")
            print(f"  class      = {name}")
            print(f"  confidence = {conf:.4f}")
            print(f"  bbox       = [{x1}, {y1}, {x2}, {y2}]")

            # Draw annotation
            cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 0, 255), 2)
            text = f"{name.upper()} {conf:.0%}"
            (tw, th), _ = cv2.getTextSize(text, cv2.FONT_HERSHEY_SIMPLEX, 0.6, 2)
            cv2.rectangle(frame, (x1, y1 - th - 8), (x1 + tw + 4, y1), (0, 0, 255), -1)
            cv2.putText(frame, text, (x1+2, y1-4), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255,255,255), 2)

    if total == 0:
        print("No detections at this confidence threshold.")
        print("This is honest — either the frame has no defects, or the model needs better training.")
    else:
        out_path = str(OUT_DIR / f"{label}_annotated.jpg")
        cv2.imwrite(out_path, frame)
        print(f"\nAnnotated output: {out_path}")

    print("\nInference test complete.")


if __name__ == "__main__":
    main()
