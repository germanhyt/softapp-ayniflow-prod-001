import math

ALLOWED_PAGE_SIZES = {20, 50, 100, 200}


def normalize_page_size(page_size: int) -> int:
    if page_size in ALLOWED_PAGE_SIZES:
        return page_size
    return 20


def paginate_list(items: list, *, page: int, page_size: int) -> tuple[list, int, int]:
    safe_page = max(1, page)
    safe_size = normalize_page_size(page_size)
    total = len(items)
    total_pages = max(1, math.ceil(total / safe_size)) if total else 1
    if safe_page > total_pages:
        safe_page = total_pages
    start = (safe_page - 1) * safe_size
    return items[start : start + safe_size], total, total_pages


def offset_limit(page: int, page_size: int) -> tuple[int, int]:
    safe_page = max(1, page)
    safe_size = normalize_page_size(page_size)
    return (safe_page - 1) * safe_size, safe_size
