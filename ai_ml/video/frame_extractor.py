import cv2
import logging

class FrameExtractor:
    def __init__(self, video_path, target_fps):
        self.video_path = video_path
        self.target_fps = target_fps

    def extract_frames(self):
        cap = cv2.VideoCapture(self.video_path)
        if not cap.isOpened():
            raise ValueError("Video cannot be opened")

        source_fps = cap.get(cv2.CAP_PROP_FPS)
        frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        step = int(source_fps / self.target_fps)

        frames = []
        idx = 0
        while True:
            ret, frame = cap.read()
            if not ret:
                break
            if idx % step == 0:
                timestamp = idx / source_fps
                frames.append({"frame": frame, "index": idx, "timestamp": timestamp})
            idx += 1

        cap.release()
        logging.info(f"Frames extracted: {len(frames)}")
        return frames
