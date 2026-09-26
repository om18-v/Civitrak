# CiviTrak — Windows startup

## 1. Backend

```powershell
cd Backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python scripts\download_pothole_model.py
uvicorn main:app --reload
```

The app automatically prefers `models/best.pt`, then `models/pothole_best.pt`. If neither is available, the OpenCV road-surface screening fallback runs so the demo can still process a video.

## 2. Frontend

```powershell
cd Frontend
npm install
npm run dev
```

Open `http://localhost:3000`.

## 3. Citizen workflow

Upload video → wait for real backend scan → View Results → inspect evidence → Download Complete Report → Submit Report to Area Contractor → track the work order from the Citizen portal.

## 4. Important AI note

No computer-vision system can honestly guarantee detection of every pothole in every black, blurred, rainy, occluded or badly angled video. CiviTrak now improves recall using multi-frame sampling, contrast/sharpness enhancement, temporal deduplication, and a road-surface fallback. For stronger real-world performance, use a validated road-damage model at `Backend/models/best.pt` and evaluate it on your own footage.
