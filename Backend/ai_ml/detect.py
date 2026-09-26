"""CiviTrak hybrid road-inspection pipeline.

Priority:
  1. User-trained multi-class model (Backend/models/best.pt), when present.
  2. Dedicated pothole YOLO model (Backend/models/pothole_best.pt), when present.
  3. OpenCV road-surface screening fallback when no defect model is installed.

The fallback is deliberately labelled as a screening layer. It improves prototype
usability without pretending classical vision can guarantee perfect detection.
"""
from __future__ import annotations

import logging, math, os, time, uuid
from pathlib import Path
from typing import Any, Callable, Dict, List, Optional, Tuple
import cv2
import numpy as np
import yaml

logger=logging.getLogger("civitrak.detect")
CFG_PATH=Path(__file__).parent/"config"/"config.yaml"

def _cfg():
    with open(CFG_PATH, encoding="utf-8") as f: return yaml.safe_load(f)


def compute_severity(defect_class, confidence, bbox, frame_w, frame_h):
    rules=_cfg()["severity"]["rules"]
    if defect_class in set(rules.get("critical_classes", [])): return "critical"
    x1,y1,x2,y2=bbox; area=max(0,x2-x1)*max(0,y2-y1); ratio=area/max(1,frame_w*frame_h)
    if ratio>=float(rules.get("critical_area_ratio_threshold",.12)): return "critical"
    if ratio>=float(rules.get("high_area_ratio_threshold",.045)) or confidence>=float(rules.get("high_confidence_threshold",.72)): return "high"
    if confidence>=.45: return "medium"
    return "low"


def _iou(a,b):
    ax1,ay1,ax2,ay2=a; bx1,by1,bx2,by2=b
    ix1=max(ax1,bx1); iy1=max(ay1,by1); ix2=min(ax2,bx2); iy2=min(ay2,by2)
    inter=max(0,ix2-ix1)*max(0,iy2-iy1)
    if not inter:return 0.0
    ua=max(0,ax2-ax1)*max(0,ay2-ay1); ub=max(0,bx2-bx1)*max(0,by2-by1)
    return inter/max(1e-6,ua+ub-inter)


def _center_distance_ratio(a,b,w,h):
    ac=((a[0]+a[2])/2,(a[1]+a[3])/2); bc=((b[0]+b[2])/2,(b[1]+b[3])/2)
    return math.hypot(ac[0]-bc[0],ac[1]-bc[1])/math.hypot(w,h)


class IssueTracker:
    def __init__(self,iou_threshold=.25,max_frame_gap=24,min_frames_to_confirm=1,center_distance_ratio=.18):
        self.iou_threshold=iou_threshold; self.max_frame_gap=max_frame_gap; self.min_frames_to_confirm=min_frames_to_confirm; self.center_distance_ratio=center_distance_ratio; self._issues=[]
    def update(self,frame_idx,defect_class,confidence,bbox,frame_w,frame_h,timestamp,annotated_path,raw_path=None):
        best=None; best_score=-1
        for issue in self._issues:
            if issue['defect_class']!=defect_class: continue
            gap=frame_idx-issue['last_seen_frame']
            if gap<0 or gap>self.max_frame_gap: continue
            iou=_iou(bbox,issue['best_bbox']); dist=_center_distance_ratio(bbox,issue['best_bbox'],frame_w,frame_h)
            score=max(iou, 1.0-dist/self.center_distance_ratio if dist<=self.center_distance_ratio else 0)
            if (iou>=self.iou_threshold or dist<=self.center_distance_ratio) and score>best_score:
                best_score=score; best=issue
        if best:
            best['frame_count']+=1; best['last_seen_frame']=frame_idx; best['last_timestamp']=timestamp
            if confidence>best['best_confidence']:
                best.update(best_confidence=confidence,best_bbox=bbox,best_frame_idx=frame_idx,best_timestamp=timestamp,best_annotated=annotated_path,best_raw=raw_path,severity=compute_severity(defect_class,confidence,bbox,frame_w,frame_h))
            if len(best['evidence_frames'])<8:
                best['evidence_frames'].append({'frame_idx':frame_idx,'confidence':confidence,'bbox':bbox,'annotated_path':annotated_path,'raw_path':raw_path,'timestamp':timestamp})
        else:
            self._issues.append({'issue_id':uuid.uuid4().hex[:10],'defect_class':defect_class,'best_confidence':confidence,'best_bbox':bbox,'best_frame_idx':frame_idx,'best_timestamp':timestamp,'best_annotated':annotated_path,'best_raw':raw_path,'first_seen_frame':frame_idx,'last_seen_frame':frame_idx,'first_timestamp':timestamp,'last_timestamp':timestamp,'frame_count':1,'severity':compute_severity(defect_class,confidence,bbox,frame_w,frame_h),'frame_w':frame_w,'frame_h':frame_h,'evidence_frames':[{'frame_idx':frame_idx,'confidence':confidence,'bbox':bbox,'annotated_path':annotated_path,'raw_path':raw_path,'timestamp':timestamp}]})
    def confirmed_issues(self):
        return [x for x in self._issues if x['frame_count']>=self.min_frames_to_confirm or x['best_confidence']>=.60]
    def all_issues(self): return list(self._issues)


def _enhance(frame):
    lab=cv2.cvtColor(frame,cv2.COLOR_BGR2LAB); l,a,b=cv2.split(lab); clahe=cv2.createCLAHE(clipLimit=2.2,tileGridSize=(8,8)); l=clahe.apply(l); out=cv2.cvtColor(cv2.merge((l,a,b)),cv2.COLOR_LAB2BGR)
    # mild unsharp mask helps motion-soft road edges without inventing large features
    blur=cv2.GaussianBlur(out,(0,0),1.2); return cv2.addWeighted(out,1.25,blur,-0.25,0)


def _save_image(frame,out_dir,frame_idx,prefix="evidence"):
    out_dir.mkdir(parents=True,exist_ok=True); p=out_dir/f"{prefix}_{frame_idx:06d}.jpg"; cv2.imwrite(str(p),frame,[cv2.IMWRITE_JPEG_QUALITY,92]); return str(p)


def _annotate(frame,bbox,label,conf,out_dir,frame_idx):
    img=frame.copy(); x1,y1,x2,y2=map(int,bbox); cv2.rectangle(img,(x1,y1),(x2,y2),(20,215,190),3)
    text=f"{label.upper()} {conf:.0%}"; (tw,th),_=cv2.getTextSize(text,cv2.FONT_HERSHEY_SIMPLEX,.65,2); yy=max(0,y1-th-12); cv2.rectangle(img,(x1,yy),(min(img.shape[1]-1,x1+tw+12),y1),(8,35,48),-1); cv2.putText(img,text,(x1+6,max(18,y1-7)),cv2.FONT_HERSHEY_SIMPLEX,.65,(255,255,255),2,cv2.LINE_AA)
    return _save_image(img,out_dir,frame_idx,"annotated")


def _road_mask(h,w):
    m=np.zeros((h,w),np.uint8)
    pts=np.array([[(int(.28*w),int(.36*h)),(int(.73*w),int(.36*h)),(int(.995*w),int(.88*h)),(int(.005*w),int(.88*h))]],np.int32)
    cv2.fillPoly(m,pts,255); return m


def _heuristic_candidates(frame):
    """Road-surface screening for prototype operation when no defect model exists."""
    h,w=frame.shape[:2]; enhanced=_enhance(frame); gray=cv2.cvtColor(enhanced,cv2.COLOR_BGR2GRAY); road=_road_mask(h,w)
    # Local-darkness + texture anomaly; use two scales for blurry and sharp defects.
    base=cv2.GaussianBlur(gray,(5,5),0); bg=cv2.GaussianBlur(base,(0,0),sigmaX=23); dark=np.clip(bg.astype(np.float32)-base.astype(np.float32),0,255)
    edges=cv2.Canny(gray,45,120); texture=cv2.GaussianBlur(edges.astype(np.float32),(0,0),5)
    score=(dark*.72+texture*.18)
    mask=((score>17)&(road>0)).astype(np.uint8)*255
    mask=cv2.morphologyEx(mask,cv2.MORPH_CLOSE,cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(13,13)))
    mask=cv2.morphologyEx(mask,cv2.MORPH_OPEN,cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(5,5)))
    n,lab,stats,_=cv2.connectedComponentsWithStats(mask)
    out=[]
    for i in range(1,n):
        x,y,ww,hh,area=map(int,stats[i]);
        if area<500 or area>26000 or ww<28 or hh<18: continue
        ar=ww/max(1,hh)
        if ar>5.5 or ar<.18: continue
        if x<=3 or y<=int(.34*h) or x+ww>=w-3: continue
        region=gray[y:y+hh,x:x+ww]; local=dark[y:y+hh,x:x+ww]
        mean=float(region.mean()) if region.size else 255; contrast=float(local.mean()) if local.size else 0
        if mean>175 and contrast<24: continue
        # Perspective-aware size: tiny distant candidates are allowed, but large sky/vegetation blobs are excluded by road mask.
        conf=min(.88,max(.34,.34+min(contrast/55,.9)*.32+min(area/7000,.9)*.22+(0.10 if .45<=ar<=3.5 else 0)))
        out.append(("pothole",conf,(x,y,x+ww,y+hh)))
    # Keep strongest local candidates to prevent a textured road from exploding into hundreds of cards.
    out.sort(key=lambda t:t[1],reverse=True); return out[:12]


def _model_candidates(model,frame,enhanced=True):
    frames=[frame]
    if enhanced: frames.append(_enhance(frame))
    found=[]
    for img in frames:
        try: results=model.predict(img,conf=float(CFG['inference']['confidence_threshold']),iou=float(CFG['inference']['nms_iou_threshold']),imgsz=int(CFG['inference'].get('imgsz',960)),verbose=False,augment=False)
        except Exception as exc: logger.warning('Model inference pass failed: %s',exc); continue
        for r in results:
            names=r.names
            if r.boxes is None: continue
            for b in r.boxes:
                cls=int(b.cls[0]); conf=float(b.conf[0]); label=str(names.get(cls,cls)).lower().replace(' ','_')
                if 'pothole' not in label and label not in set(CFG['classes']['enabled']): continue
                if 'pothole' in label: label='pothole'
                xy=b.xyxy[0].tolist(); found.append((label,conf,tuple(xy)))
    # NMS-ish merge duplicate enhanced/original boxes
    merged=[]
    for item in sorted(found,key=lambda x:x[1],reverse=True):
        if any(item[0]==m[0] and _iou(item[2],m[2])>.55 for m in merged): continue
        merged.append(item)
    return merged


def process_video(video_path,route_label=None,gps_track=None,progress_callback=None):
    cfg=_cfg(); warnings=[]; backend=Path(__file__).parent.parent
    best=backend/cfg['model']['weights']; pothole=backend/cfg['model']['pothole_weights']; generic=backend/cfg['model']['fallback_weights']
    model=None; model_mode='hybrid_opencv'; model_classes=[]
    try:
        from ultralytics import YOLO
        if best.exists(): model=YOLO(str(best)); model_mode='custom_multiclass'; model_classes=list(model.names.values())
        elif pothole.exists(): model=YOLO(str(pothole)); model_mode='dedicated_pothole'; model_classes=list(model.names.values())
    except Exception as exc:
        warnings.append(f'YOLO model unavailable; using road-surface screening fallback: {exc}')
    if model is None:
        warnings.append('No road-defect weights are installed. Hybrid OpenCV screening is active. For highest recall, run Backend/scripts/download_pothole_model.py and/or add Backend/models/best.pt.')
    cap=cv2.VideoCapture(video_path)
    if not cap.isOpened(): return {'issues':[],'total_frames':0,'frames_processed':0,'model_mode':model_mode,'model_classes':model_classes,'warnings':warnings,'error':'Could not open uploaded video.'}
    total=int(cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0); fps=float(cap.get(cv2.CAP_PROP_FPS) or 30); width=int(cap.get(cv2.CAP_PROP_FRAME_WIDTH) or 0); height=int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT) or 0)
    duration=total/fps if fps else 0
    target=float(cfg['processing'].get('target_fps',4)); stride=max(1,int(round(fps/max(target,.5))))
    max_frames=int(cfg['processing'].get('max_frames',6000)); out_dir=backend/cfg['output']['thumbs_dir']; tracker=IssueTracker(float(cfg['deduplication']['iou_overlap_threshold']),int(cfg['deduplication']['max_frame_gap']),int(cfg['deduplication']['min_frames_to_confirm']),float(cfg['deduplication'].get('center_distance_ratio',.18)))
    idx=0; processed=0
    while processed<max_frames:
        ok,frame=cap.read()
        if not ok: break
        if idx%stride!=0: idx+=1; continue
        processed+=1; ts=idx/fps if fps else 0
        candidates=_model_candidates(model,frame,True) if model else _heuristic_candidates(frame)
        for label,conf,bbox in candidates:
            # Save only candidate evidence; raw frame is useful for a clean inspection view.
            raw_path=_save_image(frame,out_dir,idx,"raw")
            ann_path=_annotate(frame,bbox,label,conf,out_dir,idx)
            tracker.update(idx,label,float(conf),bbox,width,height,ts,ann_path,raw_path)
        if progress_callback: progress_callback(processed,max(1,math.ceil(total/stride)),len(tracker.confirmed_issues()))
        idx+=1
    cap.release()
    issues=tracker.confirmed_issues()
    # Attach GPS if present.
    for issue in issues:
        issue['latitude']=None; issue['longitude']=None; issue['location_source']='route_label'
        if gps_track:
            nearest=min(gps_track,key=lambda p:abs(float(p.get('ts',0))-float(issue['best_timestamp'] or 0)))
            issue['latitude']=nearest.get('lat'); issue['longitude']=nearest.get('lng'); issue['location_source']='gpx_file'
    return {'issues':issues,'total_frames':total,'frames_processed':processed,'model_mode':model_mode,'model_classes':model_classes,'warnings':warnings,'error':None,'fps':fps,'width':width,'height':height,'duration_seconds':duration}
