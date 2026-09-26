# CiviTrak road-defect models

The application automatically uses:
1. `best.pt` — your own multi-class road model (highest priority).
2. `pothole_best.pt` — the prototype pothole model downloaded by `python scripts/download_pothole_model.py`.
3. OpenCV hybrid road-surface screening when no model is present.

The dedicated pothole model referenced by the setup script is the Apache-2.0 `peterhdd/pothole-detection-yolov8` model. Validate it on your own footage before production use.

The OpenCV fallback is a screening mechanism, not a guarantee of detecting every pothole, especially in severe blur, darkness, rain, occlusion, or unusual camera angles.
