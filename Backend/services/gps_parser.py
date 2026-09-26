"""
SIHPS124 — GPS File Parser

Parses external GPS telemetry files (GPX, NMEA CSV) into a list of
{ts, lat, lng} waypoints. Only returns real data — never fabricated.

Supported formats:
  - GPX (standard XML GPS exchange format)
  - CSV with columns: timestamp, latitude, longitude
  - NMEA sentences in .txt files (basic $GPRMC / $GNRMC parsing)
"""

import csv
import logging
import os
from pathlib import Path
from typing import Any, Dict, List, Optional

logger = logging.getLogger("sihps.gps_parser")


def parse_gps_file(file_path: str) -> List[Dict[str, float]]:
    """
    Parses a GPS file and returns a list of waypoints:
      [{"ts": <seconds_float>, "lat": <float>, "lng": <float>}, ...]

    "ts" is seconds since start (first waypoint = 0.0).
    Returns [] if the file cannot be parsed or contains no valid fixes.
    NEVER fabricates coordinates.
    """
    path = Path(file_path)
    ext  = path.suffix.lower()

    parsers = {
        ".gpx": _parse_gpx,
        ".csv": _parse_csv,
        ".txt": _parse_nmea,
    }

    parser = parsers.get(ext)
    if parser is None:
        logger.warning(f"[GPS] Unsupported GPS file extension: {ext}")
        return []

    try:
        points = parser(str(path))
        logger.info(f"[GPS] Parsed {len(points)} waypoints from {path.name}")
        return points
    except Exception as exc:
        logger.warning(f"[GPS] Failed to parse GPS file {path.name}: {exc}")
        return []


def _parse_gpx(path: str) -> List[Dict[str, float]]:
    """Parse a .gpx file using built-in xml.etree (no external deps)."""
    import xml.etree.ElementTree as ET

    tree = ET.parse(path)
    root = tree.getroot()
    ns   = ""
    # Detect namespace
    if root.tag.startswith("{"):
        ns = root.tag.split("}")[0] + "}"

    track_points = (
        root.findall(f".//{ns}trkpt") or
        root.findall(f".//{ns}rtept") or
        root.findall(f".//{ns}wpt")
    )

    points = []
    base_time: Optional[float] = None

    for tp in track_points:
        lat = tp.get("lat")
        lon = tp.get("lon")
        time_el = tp.find(f"{ns}time")

        if lat is None or lon is None:
            continue

        try:
            lat_f = float(lat)
            lng_f = float(lon)
        except ValueError:
            continue

        # Parse timestamp
        ts_secs = 0.0
        if time_el is not None and time_el.text:
            from datetime import datetime, timezone
            try:
                dt = datetime.fromisoformat(time_el.text.replace("Z", "+00:00"))
                epoch = dt.timestamp()
                if base_time is None:
                    base_time = epoch
                ts_secs = epoch - base_time
            except Exception:
                ts_secs = float(len(points))
        else:
            ts_secs = float(len(points))

        points.append({"ts": ts_secs, "lat": lat_f, "lng": lng_f})

    return points


def _parse_csv(path: str) -> List[Dict[str, float]]:
    """
    Parse CSV with columns: timestamp (epoch or seconds), latitude, longitude.
    Also handles: time, lat, lon; ts, lat, lng; etc.
    """
    points = []
    with open(path, newline="", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        if reader.fieldnames is None:
            return []

        headers = [h.strip().lower() for h in reader.fieldnames]

        # Detect column names
        ts_col  = next((h for h in headers if h in ("timestamp", "ts", "time", "t")), None)
        lat_col = next((h for h in headers if h in ("latitude", "lat")), None)
        lng_col = next((h for h in headers if h in ("longitude", "lng", "lon", "long")), None)

        if not (ts_col and lat_col and lng_col):
            logger.warning(f"[GPS] CSV missing required columns. Found: {headers}")
            return []

        orig_headers = reader.fieldnames
        # Map lowercased to original
        col_map = {h.strip().lower(): h for h in orig_headers}
        ts_orig  = col_map[ts_col]
        lat_orig = col_map[lat_col]
        lng_orig = col_map[lng_col]

        base_ts: Optional[float] = None
        for row in reader:
            try:
                ts_val = float(row[ts_orig])
                lat_f  = float(row[lat_orig])
                lng_f  = float(row[lng_orig])
            except (ValueError, KeyError):
                continue

            if base_ts is None:
                base_ts = ts_val
            points.append({"ts": ts_val - base_ts, "lat": lat_f, "lng": lng_f})

    return points


def _parse_nmea(path: str) -> List[Dict[str, float]]:
    """
    Parse NMEA sentences from a .txt file.
    Handles $GPRMC and $GNRMC sentences.
    """
    points = []
    base_ts: Optional[float] = None

    with open(path, encoding="utf-8", errors="replace") as f:
        for line in f:
            line = line.strip()
            if not (line.startswith("$GPRMC") or line.startswith("$GNRMC")):
                continue
            try:
                parts = line.split(",")
                if len(parts) < 7:
                    continue
                status = parts[2]  # A = active, V = void
                if status != "A":
                    continue

                time_str = parts[1]   # HHMMSS.ss
                lat_raw  = parts[3]   # DDMM.mmmm
                lat_dir  = parts[4]   # N/S
                lng_raw  = parts[5]   # DDDMM.mmmm
                lng_dir  = parts[6]   # E/W

                # Convert DDMM.mmmm to decimal degrees
                lat_deg = int(float(lat_raw) // 100)
                lat_min = float(lat_raw) - lat_deg * 100
                lat_f   = lat_deg + lat_min / 60.0
                if lat_dir == "S":
                    lat_f = -lat_f

                lng_deg = int(float(lng_raw) // 100)
                lng_min = float(lng_raw) - lng_deg * 100
                lng_f   = lng_deg + lng_min / 60.0
                if lng_dir == "W":
                    lng_f = -lng_f

                # Convert time to seconds within day
                h = int(time_str[:2])
                m = int(time_str[2:4])
                s = float(time_str[4:])
                ts_secs = h * 3600 + m * 60 + s

                if base_ts is None:
                    base_ts = ts_secs

                points.append({"ts": ts_secs - base_ts, "lat": lat_f, "lng": lng_f})
            except Exception:
                continue

    return points
