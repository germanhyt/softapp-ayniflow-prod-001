"""Diagnóstico: clasifica correos Gmail según resultado del parser BCP."""
from __future__ import annotations

import json
import sys
from collections import Counter, defaultdict
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.core.config import settings
from app.core.database import SessionLocal
from app.modules.finance.infrastructure.bcp_email_parser import parse_bcp_email
from app.modules.finance.infrastructure.gmail_client import GmailClient
from app.modules.finance.infrastructure.repositories import FinanceRepository


def failure_reason(parsed) -> str:
    if parsed.banco == "PENDIENTE_MAPEO":
        return "PENDIENTE_MAPEO"
    if parsed.movimiento in ("N/A", ""):
        return "sin_movimiento"
    if parsed.num_operacion in ("N/A", "", None):
        return "sin_num_operacion"
    if parsed.monto <= 0:
        return "monto_cero"
    if not parsed.fecha:
        return "sin_fecha"
    return "otro"


def main() -> None:
    db = SessionLocal()
    repo = FinanceRepository(db)
    refresh_token = repo.get_gmail_refresh_token()
    query = settings.gmail_query_label.strip()

    message_ids = GmailClient.list_message_ids(query=query, refresh_token=refresh_token)
    print(f"Total correos en query '{query}': {len(message_ids)}")

    by_reason: Counter[str] = Counter()
    by_subject: Counter[str] = Counter()
    pending_subjects: Counter[str] = Counter()
    samples: dict[str, list[dict]] = defaultdict(list)

    for i, mid in enumerate(message_ids):
        email = GmailClient.get_message(mid, refresh_token=refresh_token)
        parsed = parse_bcp_email(
            subject=email["subject"],
            body=email["text"],
            raw_date=email["date"],
            use_body_datetime=True,
        )
        reason = failure_reason(parsed)
        subj = (email["subject"] or "(sin asunto)")[:120]

        if not parsed.is_importable():
            by_reason[reason] += 1
            by_subject[subj] += 1
            if reason == "PENDIENTE_MAPEO":
                pending_subjects[subj] += 1
            if len(samples[reason]) < 3:
                samples[reason].append(
                    {
                        "subject": email["subject"],
                        "body_preview": (email["text"] or "")[:500],
                        "parsed": {
                            "banco": parsed.banco,
                            "tipo": parsed.tipo,
                            "monto": parsed.monto,
                            "num_operacion": parsed.num_operacion,
                            "fecha": parsed.fecha,
                        },
                    }
                )

        if (i + 1) % 100 == 0:
            print(f"  ... {i + 1}/{len(message_ids)}", flush=True)

    print("\n=== Por motivo de fallo ===")
    for reason, cnt in by_reason.most_common():
        print(f"  {reason}: {cnt}")

    print("\n=== Top asuntos PENDIENTE_MAPEO ===")
    for subj, cnt in pending_subjects.most_common(20):
        print(f"  [{cnt}] {subj}")

    print("\n=== Top asuntos no importables (todos) ===")
    for subj, cnt in by_subject.most_common(15):
        print(f"  [{cnt}] {subj}")

    out = Path(__file__).parent / "diagnose_gmail_parser_output.json"
    out.write_text(json.dumps(samples, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"\nMuestras guardadas en {out}")
    db.close()


if __name__ == "__main__":
    main()
