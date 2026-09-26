"""Download the Apache-2.0 pothole YOLOv8 model used by the CiviTrak prototype.
Run from Backend: python scripts/download_pothole_model.py
"""
from pathlib import Path
from urllib.request import urlopen, Request

URL="https://huggingface.co/peterhdd/pothole-detection-yolov8/resolve/main/best.pt?download=true"
OUT=Path(__file__).resolve().parents[1]/"models"/"pothole_best.pt"
OUT.parent.mkdir(parents=True,exist_ok=True)
req=Request(URL,headers={"User-Agent":"CiviTrak/1.0"})
print("Downloading pothole model...")
with urlopen(req,timeout=120) as r, open(OUT,"wb") as f:
    total=0
    while True:
        chunk=r.read(1024*1024)
        if not chunk: break
        f.write(chunk); total+=len(chunk)
        print(f"\r{total/1024/1024:.1f} MB",end="",flush=True)
print(f"\nSaved: {OUT}")
