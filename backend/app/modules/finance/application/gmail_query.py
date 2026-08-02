"""Utilidades para componer queries Gmail a partir de una o más etiquetas."""

from __future__ import annotations

import re

# label:Nombre  |  label:"Nombre con espacios"
_LABEL_RE = re.compile(
    r'label:(?:"([^"]+)"|([^\s}\)]+))',
    re.IGNORECASE,
)


def parse_gmail_labels(query: str | None) -> list[str]:
    """Extrae nombres de etiqueta desde una query Gmail efectiva."""
    if not query or not query.strip():
        return []

    labels: list[str] = []
    seen: set[str] = set()
    for match in _LABEL_RE.finditer(query):
        label = (match.group(1) or match.group(2) or "").strip()
        if not label:
            continue
        key = label.lower()
        if key in seen:
            continue
        seen.add(key)
        labels.append(label)
    return labels


def normalize_label_name(raw: str) -> str:
    value = raw.strip()
    if value.lower().startswith("label:"):
        value = value[6:].strip()
    if value.startswith('"') and value.endswith('"') and len(value) >= 2:
        value = value[1:-1].strip()
    return value


def build_gmail_query_from_labels(labels: list[str]) -> str:
    """Construye query Gmail: una etiqueta o {label:A OR label:B}."""
    cleaned: list[str] = []
    seen: set[str] = set()
    for item in labels:
        label = normalize_label_name(item)
        if not label:
            continue
        key = label.lower()
        if key in seen:
            continue
        seen.add(key)
        cleaned.append(label)

    if not cleaned:
        return ""
    if len(cleaned) == 1:
        label = cleaned[0]
        if " " in label or "/" not in label and any(c in label for c in "(){}"):
            return f'label:"{label}"'
        return f"label:{label}"

    parts: list[str] = []
    for label in cleaned:
        if " " in label:
            parts.append(f'label:"{label}"')
        else:
            parts.append(f"label:{label}")
    return "{" + " OR ".join(parts) + "}"
