# SIHPS124 — Model Training Guide

## Overview

This directory contains scripts to train and evaluate a custom YOLOv8 road-defect
detection model. The stock `yolov8n.pt` (COCO 80-class model) **cannot** detect
potholes, open manholes, road cracks, or any SIHPS124-specific classes.
You must train (or download) a custom model.

---

## Step 1 — Install dependencies

```bash
cd Backend
pip install ultralytics opencv-python-headless pyyaml
```

---

## Step 2 — Download a real road-defect dataset

### Option A — RDD2022 (Recommended, CC BY 4.0)

The Road Damage Dataset 2022 contains ~47,000 images from Japan, India, Czech
Republic, Norway, USA, and China with labels for:
- **D00** Longitudinal Crack
- **D10** Transverse Crack  
- **D20** Alligator Crack
- **D40** Pothole

Download:
```
https://github.com/sekilab/RoadDamageDetector
https://zenodo.org/record/7999875  (RDD2022)
```

After downloading, run the conversion script:
```bash
python training/convert_rdd2022.py \
  --rdd_dir /path/to/RDD2022 \
  --out_dir Backend/dataset
```
(See convert_rdd2022.py for details.)

### Option B — Roboflow Pothole Dataset (CC BY 4.0)

```
https://universe.roboflow.com/joseph-nelson/pothole
```

Download in **YOLOv8 format** and extract to `Backend/dataset/`.

### Option C — Combined dataset (recommended for best coverage)

Merge RDD2022 + Roboflow pothole + open manhole datasets into:
```
Backend/dataset/
├── data.yaml
├── images/
│   ├── train/   (≥5,000 images)
│   ├── val/     (≥1,000 images)
│   └── test/    (≥500 images)
└── labels/
    ├── train/
    ├── val/
    └── test/
```

Each label file = one `.txt` per image in YOLO format:
```
<class_id> <cx> <cy> <w> <h>
```
All coordinates normalized 0.0–1.0.

---

## Step 3 — Update dataset/data.yaml

Edit `Backend/dataset/data.yaml` to match your actual class names and counts.
The current file contains an MVP 5-class example.

---

## Step 4 — Train

```bash
cd Backend

# Quick test (CPU, few epochs — to verify pipeline works)
python training/train.py --epochs 5 --batch 4 --device cpu

# Real training (GPU)
python training/train.py \
  --base yolov8s.pt \
  --epochs 100 \
  --batch 16 \
  --imgsz 640 \
  --device 0

# Apple Silicon
python training/train.py --device mps --batch 8
```

After training, `best.pt` is copied to `Backend/models/best.pt` automatically.

---

## Step 5 — Evaluate

```bash
cd Backend
python training/evaluate.py

# On test split
python training/evaluate.py --split test
```

Do NOT claim model accuracy without running this.

---

## Step 6 — Enable production mode

Edit `Backend/ai_ml/config/config.yaml`:
```yaml
model:
  model_mode: production   # was: generic_test
  weights: "models/best.pt"
```

Restart the backend:
```bash
uvicorn main:app --reload
```

---

## Inference test (verify your model before deploying)

```bash
cd Backend
python training/infer_test.py --image path/to/road_frame.jpg
```

Output example (real detections only — no fabrication):
```
Model classes: ['pothole', 'road_crack', 'open_manhole', 'damaged_surface']

Frame: road_frame.jpg
Detection:
  class      = pothole
  confidence = 0.87
  bbox       = [142, 388, 276, 451]
Annotated output: ai_ml/outputs/thumbs/road_frame_pothole.jpg
```

If the model produces zero detections on a frame — that is correct and honest.

---

## Class definitions (MVP set)

| Class ID | Name | Description |
|----------|------|-------------|
| 0 | pothole | Hole/depression in road surface |
| 1 | road_crack | Longitudinal, transverse, or alligator cracks |
| 2 | open_manhole | Missing or displaced manhole cover |
| 3 | damaged_surface | Distressed road surface |
| 4 | damaged_signboard | Damaged or illegible road sign |

Add more classes only when you have sufficient labelled training data for them.

---

## Known limitations

- **No headlight defect detection**: Requires specialized vehicle-level datasets not currently available. Architecture stub is provided in `ai_ml/detection/headlight_classifier.py`.
- **Zebra crossing fading**: Can be added if sufficient labelled data is sourced (CARLA synthetic or real highway surveys).
- **Traffic signal state**: Requires separate classifier architecture — not included in MVP.
- **GPS coordinates**: Only available if video contains embedded GPS or user provides a .gpx file.

---

## Recommended GPU requirements

| Model base | Min VRAM | Expected mAP (RDD2022) |
|------------|----------|------------------------|
| YOLOv8n    | 4 GB     | ~0.45 mAP@50 |
| YOLOv8s    | 6 GB     | ~0.52 mAP@50 |
| YOLOv8m    | 8 GB     | ~0.57 mAP@50 |

*Estimates based on public benchmarks — actual results depend on dataset quality.*
