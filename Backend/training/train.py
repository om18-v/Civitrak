#!/usr/bin/env python3
"""
SIHPS124 — Model Training Script

Trains a custom YOLOv8 road-defect detection model using the Ultralytics framework.

Required before running:
  1. Download and place the dataset as described in training/README.md
  2. Ensure Backend/dataset/data.yaml points to the correct image/label directories
  3. Have ultralytics installed: pip install ultralytics

Usage:
  cd Backend
  python training/train.py

  # With custom settings:
  python training/train.py --base yolov8s.pt --epochs 100 --batch 16 --imgsz 640 --device cpu
  python training/train.py --device 0          # GPU 0
  python training/train.py --device mps        # Apple Silicon

Output:
  Backend/models/best.pt    — best checkpoint (copy here after training)
  runs/detect/sihps*/       — Ultralytics run directory with all metrics
"""

import argparse
import logging
import shutil
from datetime import datetime
from pathlib import Path

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s: %(message)s")
logger = logging.getLogger("sihps.train")

BACKEND_DIR = Path(__file__).parent.parent
DATASET_YAML = BACKEND_DIR / "dataset" / "data.yaml"
MODELS_DIR   = BACKEND_DIR / "models"
MODELS_DIR.mkdir(parents=True, exist_ok=True)


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(
        description="Train a custom YOLO road-defect model for SIHPS124"
    )
    p.add_argument("--base",   default="yolov8n.pt",
                   help="Base YOLO weights to fine-tune from. Use yolov8s.pt for better accuracy.")
    p.add_argument("--epochs", type=int, default=50,
                   help="Number of training epochs. 50-100 recommended.")
    p.add_argument("--batch",  type=int, default=8,
                   help="Batch size. Reduce if you run out of memory.")
    p.add_argument("--imgsz",  type=int, default=640,
                   help="Input image size (square). 640 is standard.")
    p.add_argument("--device", default="cpu",
                   help="Training device: cpu | 0 | 0,1 | mps")
    p.add_argument("--project", default="runs/detect",
                   help="Output directory for runs.")
    p.add_argument("--name",    default=f"sihps_{datetime.now().strftime('%Y%m%d_%H%M')}",
                   help="Run name (subdirectory in project).")
    p.add_argument("--resume",  action="store_true",
                   help="Resume from last checkpoint if available.")
    return p.parse_args()


def main() -> None:
    args = parse_args()

    # Pre-flight checks
    if not DATASET_YAML.exists():
        logger.error(
            f"Dataset config not found: {DATASET_YAML}\n"
            "Please follow training/README.md to download and place the dataset."
        )
        raise SystemExit(1)

    try:
        from ultralytics import YOLO
    except ImportError:
        logger.error("ultralytics not installed. Run: pip install ultralytics")
        raise SystemExit(1)

    logger.info(f"Base model  : {args.base}")
    logger.info(f"Dataset YAML: {DATASET_YAML}")
    logger.info(f"Epochs      : {args.epochs}")
    logger.info(f"Batch       : {args.batch}")
    logger.info(f"Image size  : {args.imgsz}")
    logger.info(f"Device      : {args.device}")
    logger.info(f"Output      : {args.project}/{args.name}")

    model = YOLO(args.base)

    results = model.train(
        data      = str(DATASET_YAML),
        epochs    = args.epochs,
        batch     = args.batch,
        imgsz     = args.imgsz,
        device    = args.device,
        project   = args.project,
        name      = args.name,
        resume    = args.resume,
        save      = True,
        cache     = False,     # Set to True to cache dataset in RAM if you have enough memory
        patience  = 20,        # Early stopping patience (epochs without improvement)
        workers   = 4,
        exist_ok  = True,
        plots     = True,
        seed      = 42,
    )

    # Copy best weights to models/ directory
    run_dir = Path(args.project) / args.name
    best_pt = run_dir / "weights" / "best.pt"
    if best_pt.exists():
        dest = MODELS_DIR / "best.pt"
        shutil.copy2(best_pt, dest)
        logger.info(f"\n*** Best weights copied to: {dest} ***")
        logger.info("Update config.yaml: model_mode: production")
    else:
        logger.warning(
            f"best.pt not found at {best_pt}. "
            f"Look in the Ultralytics run directory: {run_dir}/weights/"
        )

    logger.info("Training complete.")


if __name__ == "__main__":
    main()
