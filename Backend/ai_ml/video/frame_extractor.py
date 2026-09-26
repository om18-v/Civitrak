import cv2
import logging


class FrameExtractor:
    def __init__(self, video_path, target_fps):
        self.video_path = video_path
        self.target_fps = max(float(target_fps or 1), 0.1)

    def extract_frames(self):
        cap = cv2.VideoCapture(self.video_path)
        if not cap.isOpened():
            raise ValueError("Video cannot be opened")

        source_fps = float(cap.get(cv2.CAP_PROP_FPS) or 0)
        if source_fps <= 0:
            source_fps = 30.0

        step = max(1, round(source_fps / self.target_fps))

        frames = []
        idx = 0
        while True:
            ret, frame = cap.read()
            if not ret:
                break

            if idx % step == 0:
                frames.append(
                    {
                        "frame": frame,
                        "index": idx,
                        "timestamp": idx / source_fps,
                    }
                )
            idx += 1

        cap.release()
        logging.info("Frames extracted: %s", len(frames))
        return frames
