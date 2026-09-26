from pathlib import Path
import yaml

CONFIG_DIR = Path(__file__).resolve().parent
BACKEND_DIR = CONFIG_DIR.parents[1]


def load_config() -> dict:
    config_path = CONFIG_DIR / "config.yaml"
    with config_path.open("r", encoding="utf-8") as f:
        config = yaml.safe_load(f) or {}

    output_dir = Path(config.get("output", {}).get("thumbnail_dir", "ai_ml/outputs/thumbs"))
    if not output_dir.is_absolute():
        output_dir = BACKEND_DIR / output_dir

    config.setdefault("output", {})["thumbnail_dir"] = str(output_dir)
    return config
