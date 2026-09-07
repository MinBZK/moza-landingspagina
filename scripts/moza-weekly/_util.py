"""Gedeelde helpers voor de moza-weekly-scripts (anonymize.py, render.py)."""

from __future__ import annotations

import os
import re
from collections.abc import Iterable
from pathlib import Path
from typing import Any

import yaml


def load_dotenv(path: Path) -> None:
    """Minimale .env-loader. Negeert lege regels, comments, en lege values."""
    if not path.exists():
        return
    for line in path.read_text(encoding="utf-8").splitlines():
        s = line.strip()
        if not s or s.startswith("#") or "=" not in s:
            continue
        key, _, value = s.partition("=")
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        if key and value and key not in os.environ:
            os.environ[key] = value

# @mention: @naam, eventueel met punt of streep (bijv. @jan.jansen).
MENTION_RE = re.compile(r"(?<![\w])@([a-zA-Z][\w]*(?:[.\-][\w]+)*)")


def load_yaml(path: Path, required_keys: Iterable[str] = ()) -> dict[str, Any]:
    """Laad een YAML-bestand als dict. Controleert optioneel verplichte sleutels."""
    if not path.exists():
        raise FileNotFoundError(f"YAML-input bestaat niet: {path}")
    try:
        with path.open("r", encoding="utf-8") as f:
            data = yaml.safe_load(f)
    except yaml.YAMLError as e:
        raise ValueError(f"YAML-parse-fout in {path}: {e}") from e
    if not isinstance(data, dict):
        raise ValueError(f"YAML-root is geen object in {path}")
    for key in required_keys:
        if key not in data:
            raise ValueError(f"YAML mist verplichte sleutel '{key}' in {path}")
    return data
