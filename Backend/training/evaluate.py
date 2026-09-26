#!/usr/bin/env python3
"""
SIHPS124 — Model Evaluation Script

Evaluates a trained model on the validation (or test) split.

Usage:
  cd Backend
  python training/evaluate.py                          # Evaluate best.pt on val split
  python training/evaluate.py --weights models/best.pt --split test
  python training/evaluate.py --weights runs/detect/sihps_20250912/weights/best.pt

Outputs (printed + saved to runs/val/sihps_val_*/metrics.json):
  - mAP@50
  - mAP@50-95
  - Precision
  - Recall
  - Per-class metrics
  - Confusion matrix image

Do NOT claim accuracy without actually running this script on real data.
"""

import argparse
import json
import logging
from pathlib import Path

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s: %(message)s")
logger = logging.getLogger("sihps.evaluate")

BACKEND_DIR  = Path(__file__).parent.parent
DATASET_YAML = BACKEND_DIR / "dataset" / "data.yaml"
DEFAULT_WEIGHTS = BACKEND_DIR / "models" / "best.pt"


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description="Evaluate SIHPS124 road-defect model")
    p.add_argument("--weights", default=str(DEFAULT_WEIGHTS),
                   help="Path to model weights (.pt file)")
    p.add_argument("--split",  default="val", choices=["val", "test"],
                   help="Dataset split to evaluate on")
    p.add_argument("--imgsz",  type=int, default=640)
    p.add_argument("--batch",  type=int, default=8)
    p.add_argument("--device", default="cpu")
    p.add_argument("--conf",   type=float, default=0.40,
                   help="Confidence threshold for predictions")
    p.add_argument("--iou",    type=float, default=0.45,
                   help="IoU threshold for NMS")
    return p.parse_args()


def main() -> None:
    args = parse_args()

    weights = Path(args.weights)
    if not weights.exists():
        logger.error(
            f"Model weights not found: {weights}\n"
            "Train the model first with: python training/train.py"
        )
        raise SystemExit(1)

    if not DATASET_YAML.exists():
        logger.error(
            f"Dataset YAML not found: {DATASET_YAML}\n"
            "Please follow training/README.md"
        )
        raise SystemExit(1)

    try:
        from ultralytics import YOLO
    except ImportError:
        logger.error("ultralytics not installed. Run: pip install ultralytics")
        raise SystemExit(1)

    logger.info(f"Loading model: {weights}")
    model = YOLO(str(weights))

    logger.info(f"Model classes: {list(model.names.values())}")
    logger.info(f"Evaluating on split: {args.split}")

    metrics = model.val(
        data    = str(DATASET_YAML),
        split   = args.split,
        imgsz   = args.imgsz,
        batch   = args.batch,
        device  = args.device,
        conf    = args.conf,
        iou     = args.iou,
        plots   = True,
        save_json = True,
    )

    # Print summary
    print("\n" + "=" * 60)
    print("EVALUATION RESULTS")
    print("=" * 60)
    print(f"Model     : {weights}")
    print(f"Split     : {args.split}")
    print(f"Classes   : {list(model.names.values())}")
    print("")
    print(f"mAP@50    : {metrics.box.map50:.4f}")
    print(f"mAP@50-95 : {metrics.box.map:.4f}")
    print(f"Precision : {metrics.box.mp:.4f}")
    print(f"Recall    : {metrics.box.mr:.4f}")
    print("")
    print("Per-class AP@50:")
    for i, cls_name in model.names.items():
        ap50 = metrics.box.ap50[i] if i < len(metrics.box.ap50) else float("nan")
        print(f"  {cls_name:<30} {ap50:.4f}")
    print("=" * 60)
    print("IMPORTANT: These are AI-assessed metrics on the validation split.")
    print("They do not constitute a certified engineering measurement.")
    print("=" * 60 + "\n")

    logger.info(
        "Evaluation complete. Confusion matrix and curve plots saved in "
        "the Ultralytics val run directory."
    )


if __name__ == "__main__":
    main()
