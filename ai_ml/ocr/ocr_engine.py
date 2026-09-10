import logging

class OCREngine:
    def __init__(self, cfg):
        self.cfg = cfg

    def run(self, det, frame):
        logging.info("OCR triggered for detection")
        # Placeholder: integrate Tesseract or EasyOCR here
        return None
