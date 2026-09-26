import pytest
from ai_ml.detect import process_video

def test_process_video_empty(monkeypatch):
    def mock_extract(*args, **kwargs): return []
    monkeypatch.setattr("ai_ml.video.frame_extractor.FrameExtractor.extract_frames", mock_extract)
    results = process_video("fake.mp4")
    assert results == []
