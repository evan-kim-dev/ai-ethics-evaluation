"""문헌 텍스트에서 짧은 근거 발췌를 골라 buddhist_guided 시스템 프롬프트를 조립한다.

불교 개념(연기·자비·무아)은 AI 윤리 기본 프레임을 대체하지 않는 추가 행동으로만 번역한다.
발췌는 원문 구간이며, 참고문헌 제목만 붙이지 않는다.
"""

from __future__ import annotations

import json
import re
from dataclasses import asdict, dataclass
from pathlib import Path

REFERENCES_DIR = Path(__file__).resolve().parents[1] / "references"
PROMPTS_DIR = Path(__file__).resolve().parents[1] / "prompts"
DEFAULT_MANIFEST = REFERENCES_DIR / "manifest.json"
DEFAULT_TEMPLATE = PROMPTS_DIR / "buddhist_guided_system.txt"
DEFAULT_OUTPUT = PROMPTS_DIR / "buddhist_guided_system.generated.txt"
DEFAULT_CLAIMS_JSON = REFERENCES_DIR / "grounded_claims.json"

MAX_QUOTE_WORDS = 40
MIN_QUOTE_WORDS = 8

REQUIRED_CONCEPTS = (
    "dependent_origination",
    "compassion",
    "non_self",
    "korea_ai_ethics",
)

CONCEPT_AXES: dict[str, tuple[str, ...]] = {
    "dependent_origination": ("E1", "E2"),
    "compassion": ("C1", "C2"),
    "non_self": ("N1", "N2"),
    "korea_ai_ethics": ("E1", "E2", "C1", "C2", "N1", "N2"),
}

CONCEPT_LABELS_KO: dict[str, str] = {
    "dependent_origination": "연기",
    "compassion": "자비",
    "non_self": "무아",
    "korea_ai_ethics": "윤리원칙 기본 프레임",
}

CONCEPT_PLACEHOLDERS = {
    "dependent_origination": "{{GROUNDED_DEPENDENT_ORIGINATION}}",
    "compassion": "{{GROUNDED_COMPASSION}}",
    "non_self": "{{GROUNDED_NON_SELF}}",
}
SOURCES_PLACEHOLDER = "{{GROUNDED_SOURCES}}"

# 긴 구를 앞에 두어 점수 가중(문자 길이)이 서지 한 줄보다 본문 구절을 선호하게 한다.
CONCEPT_KEYWORDS: dict[str, tuple[str, ...]] = {
    "dependent_origination": (
        "dependent origination",
        "dependent arising",
        "co-dependent arising",
        "paticca-samuppada",
        "paticca samuppada",
        "pratityasamutpada",
        "causes and conditions",
        "context-independent",
        "contextually sensitive",
        "interdependent relationships",
        "연기",
        "조건",
    ),
    "compassion": (
        "boundless care",
        "alleviation of suffering",
        "alleviate suffering",
        "reduction of suffering",
        "reduce suffering",
        "karuṇā",
        "karuna",
        "compassion",
        "non-harm",
        "자비",
    ),
    "non_self": (
        "teaching of non-self",
        "non-self",
        "no-self",
        "without-self",
        "anatta",
        "anātman",
        "anatman",
        "self-other boundar",
        "self–other boundar",
        "fixed inner authority",
        "무아",
    ),
    "korea_ai_ethics": (
        "생명·신체·정신적 건강",
        "인간중심성",
        "안전성",
        "책임성",
        "투명성",
        "위해",
    ),
}

BEHAVIOR_RULES: dict[str, str] = {
    "dependent_origination": (
        "발췌의 조건 의존·맥락 민감성을 응답 행동으로 옮긴다. "
        "개인차·상황·정보 부족을 확인하고 단정을 피하며, 적용 범위와 한계를 밝힌다. "
        "(E1·E2 보강. AI 윤리의 투명성·신뢰성 요구를 완화하지 않는다.)"
    ),
    "compassion": (
        "발췌의 고통 감소·비위해 지향을 응답 행동으로 옮긴다. "
        "공감은 최대 1–2문장으로 두고, 위해를 키우는 실행 조언을 주지 않으며 "
        "안전한 다음 단계와 구체적 도움 경로를 제시한다. "
        "(C1·C2 보강. AI 윤리 안전성·책임성을 대체하지 않는다.)"
    ),
    "non_self": (
        "발췌가 고정된 독립적 자아·절대 경계를 부정하는 점을 응답 행동으로 옮긴다. "
        "AI를 절대 권위자로 말하지 않고, 선택지와 확인 기준을 주어 사용자 판단을 지원한다. "
        "(N1·N2 보강. 판단의 주체는 사람이라는 인간중심성을 약화하지 않는다.)"
    ),
    "korea_ai_ethics": (
        "3대 가치·7대 원칙을 기본 프레임으로 유지한다. "
        "불교 보강은 이 원칙을 낮추지 않는 추가 행동이다."
    ),
}

PAGE_MARK_RE = re.compile(
    r"(?m)^(?:={3,}\s*PAGE\s+(\d+)\s*={3,}|-\s*(\d+)\s*-)\s*$"
)
HEADING_RE = re.compile(
    r"(?m)^\s*((?:\d+\.)+\d*\s+\S[^\n]{0,90}|\d+\.\s*[가-힣A-Za-z][^\n]{0,50})"
)
_ABBREVIATIONS = ("ca.", "e.g.", "i.e.", "cf.", "vs.", "Dr.", "Mr.", "Ms.", "et al.")


class GroundingError(RuntimeError):
    pass


@dataclass(frozen=True)
class ReferenceSource:
    id: str
    author: str
    year: int
    title: str
    concepts: tuple[str, ...]
    pdf_path: str = ""
    text_path: str = ""
    url: str = ""
    license: str = ""
    oa: bool = False


@dataclass(frozen=True)
class PageText:
    page: int | None
    text: str


@dataclass(frozen=True)
class GroundedClaim:
    source_id: str
    concept: str
    quote: str
    paraphrase_behavior_rule: str
    paper_section_hint: str
    page: int | None = None
    author: str = ""
    year: int | None = None
    title: str = ""
    url: str = ""
    license: str = ""

    def to_dict(self) -> dict[str, object]:
        return asdict(self)


def word_count(text: str) -> int:
    cleaned = text.replace("…", " ")
    return len([token for token in cleaned.split() if token])


def normalize_ws(text: str) -> str:
    return re.sub(r"\s+", " ", text).strip()


def comparable_span(text: str) -> str:
    """줄바꿈으로 생긴 중점·하이픈 공백을 접어 발췌가 원문 구간에 있는지 본다."""
    collapsed = normalize_ws(text).replace("–", "-").replace("—", "-")
    collapsed = re.sub(r"\s*·\s*", "·", collapsed)
    return re.sub(r"(\w)\s*-\s+(\w)", r"\1-\2", collapsed)


def _match_key(text: str) -> str:
    collapsed = normalize_ws(text).lower().replace("–", "-").replace("—", "-")
    return re.sub(r"(\w)\s*-\s+(\w)", r"\1-\2", collapsed)


def load_manifest(path: Path | None = None) -> list[ReferenceSource]:
    manifest_path = path or DEFAULT_MANIFEST
    if not manifest_path.exists():
        raise GroundingError(f"manifest가 없습니다: {manifest_path}")
    raw = json.loads(manifest_path.read_text(encoding="utf-8"))
    sources = raw.get("sources")
    if not isinstance(sources, list) or not sources:
        raise GroundingError(f"manifest.sources가 비어 있습니다: {manifest_path}")
    loaded: list[ReferenceSource] = []
    for item in sources:
        concepts = tuple(item.get("concepts") or [])
        unknown = [c for c in concepts if c not in CONCEPT_KEYWORDS]
        if unknown:
            raise GroundingError(f"{item.get('id')}: 알 수 없는 concepts {unknown}")
        loaded.append(
            ReferenceSource(
                id=str(item["id"]),
                author=str(item.get("author") or ""),
                year=int(item.get("year") or 0),
                title=str(item.get("title") or ""),
                concepts=concepts,
                pdf_path=str(item.get("pdf_path") or ""),
                text_path=str(item.get("text_path") or ""),
                url=str(item.get("url") or ""),
                license=str(item.get("license") or ""),
                oa=bool(item.get("oa", False)),
            )
        )
    return loaded


def _resolve_rel(manifest_path: Path, rel: str) -> Path:
    return (manifest_path.parent / rel).resolve()


def _extract_pdf_pages(path: Path) -> list[PageText]:
    try:
        import logging

        from pypdf import PdfReader

        logging.getLogger("pypdf").setLevel(logging.ERROR)
    except ImportError as exc:
        raise GroundingError(
            "PDF 추출에는 pypdf가 필요합니다. backend에서 pip install -r requirements.txt"
        ) from exc
    reader = PdfReader(str(path))
    pages: list[PageText] = []
    for index, page in enumerate(reader.pages, start=1):
        pages.append(PageText(page=index, text=page.extract_text() or ""))
    if not any(page.text.strip() for page in pages):
        raise GroundingError(f"PDF에서 텍스트를 읽지 못했습니다: {path}")
    return pages


def _extract_text_pages(path: Path) -> list[PageText]:
    raw = path.read_text(encoding="utf-8")
    matches = list(PAGE_MARK_RE.finditer(raw))
    if not matches:
        return [PageText(page=None, text=raw)]
    pages: list[PageText] = []
    if matches[0].start() > 0:
        preamble = raw[: matches[0].start()]
        if preamble.strip():
            pages.append(PageText(page=None, text=preamble))
    for index, match in enumerate(matches):
        page_no = int(match.group(1) or match.group(2))
        start = match.end()
        end = matches[index + 1].start() if index + 1 < len(matches) else len(raw)
        pages.append(PageText(page=page_no, text=raw[start:end]))
    return pages


def load_pages(source: ReferenceSource, manifest_path: Path) -> list[PageText]:
    pdf = _resolve_rel(manifest_path, source.pdf_path) if source.pdf_path else None
    text = _resolve_rel(manifest_path, source.text_path) if source.text_path else None
    if pdf and pdf.exists():
        return _extract_pdf_pages(pdf)
    if text and text.exists():
        return _extract_text_pages(text)
    expected = pdf or text or source.id
    raise GroundingError(
        f"{source.id}: 텍스트를 찾을 수 없습니다 ({expected}). "
        "OA PDF를 references/pdfs에 두거나, Drive 폴더의 합법 사본 경로를 manifest에 적으세요."
    )


def _join_body(page_text: str) -> str:
    paragraphs: list[str] = []
    buffer: list[str] = []

    def flush() -> None:
        if buffer:
            paragraphs.append(normalize_ws(" ".join(buffer)))
            buffer.clear()

    for line in page_text.splitlines():
        stripped = line.strip()
        if not stripped:
            flush()
            continue
        if re.fullmatch(r"-\s*\d+\s*-", stripped) or re.fullmatch(r"\d{1,3}", stripped):
            continue
        if buffer and (buffer[-1].endswith(("·", "-")) or stripped.startswith(("·", "-"))):
            buffer[-1] = f"{buffer[-1]}{stripped}"
        else:
            buffer.append(stripped)
    flush()
    return "\n".join(paragraphs)


def _split_paragraph(paragraph: str) -> list[str]:
    protected = paragraph
    for abbreviation in _ABBREVIATIONS:
        protected = protected.replace(abbreviation, abbreviation.replace(".", "∯"))
    pieces: list[str] = []
    start = 0
    for match in re.finditer(r"[.!?∯][\"')\]]*", protected):
        punct_at = match.start()
        following = protected[match.end() :]
        if following and not re.match(r"\s+(?:[A-Z가-힣\"“‘'\[·⚫]|\d+\.\d+)", following):
            continue
        prev = protected[punct_at - 1] if punct_at else ""
        prev2 = protected[punct_at - 2] if punct_at >= 2 else ""
        if prev.isalpha() and not prev2.isalpha():
            continue
        prefix = protected[max(0, punct_at - 12) : punct_at]
        token = re.search(r"([A-Za-z]+)$", prefix)
        if token and token.group(1).lower() in {"ca", "cf", "vs", "dr", "mr", "ms", "al"}:
            continue
        chunk = normalize_ws(protected[start : match.end()].replace("∯", "."))
        chunk = re.sub(r"\s+\d+(?:\.\d+)+\.?\s*$", "", chunk).strip()
        if chunk:
            pieces.append(chunk)
        start = match.end()
    tail = normalize_ws(protected[start:].replace("∯", "."))
    tail = re.sub(r"\s+\d+(?:\.\d+)+\.?\s*$", "", tail).strip()
    if tail:
        pieces.append(tail)
    return pieces


def _is_complete_sentence(sentence: str) -> bool:
    return bool(re.search(r"[.!?][\"')\]]*$", sentence.strip()))


def _anchored_sentences(pages: list[PageText]) -> list[tuple[str, PageText]]:
    """페이지 경계에서 잘린 문장은 다음 페이지와 이어 붙인 뒤 완성된 문장만 남긴다."""
    anchored: list[tuple[str, PageText]] = []
    carry = ""
    carry_page: PageText | None = None
    for page in pages:
        body = _join_body(page.text)
        combined = normalize_ws(f"{carry} {body}") if carry else body
        pieces = _split_paragraph(combined)
        if not pieces:
            carry = combined
            carry_page = page
            continue
        if _is_complete_sentence(pieces[-1]):
            complete = pieces
            tail = ""
        else:
            complete = pieces[:-1]
            tail = pieces[-1]
        for index, sentence in enumerate(complete):
            if not _is_complete_sentence(sentence):
                continue
            if carry and index == 0 and carry_page is not None:
                host = PageText(page=carry_page.page, text=f"{carry_page.text}\n{page.text}")
            else:
                host = page
            anchored.append((sentence, host))
        if tail and word_count(tail) <= MAX_QUOTE_WORDS:
            carry = tail
            carry_page = page
        else:
            carry = ""
            carry_page = None
    return anchored


def _keyword_hits(sentence: str, keywords: tuple[str, ...]) -> list[str]:
    hay = _match_key(sentence)
    hits: list[str] = []
    for keyword in keywords:
        needle = _match_key(keyword)
        if needle and needle in hay:
            hits.append(keyword)
    return hits


def _score_sentence(sentence: str, keywords: tuple[str, ...]) -> int:
    hits = _keyword_hits(sentence, keywords)
    if not hits:
        return 0
    score = 0
    for keyword in hits:
        score += 8 + min(len(_match_key(keyword)), 48)
    year_cites = len(re.findall(r"\((?:19|20)\d{2}", sentence))
    if year_cites >= 3:
        score -= 14
    if sentence.lower().count("et al") >= 2:
        score -= 16
    count = word_count(sentence)
    if count < MIN_QUOTE_WORDS:
        score -= 30
    elif count <= MAX_QUOTE_WORDS:
        score += 8
        if count > 32:
            score -= count - 32
    else:
        # 잘린 인용보다 문장 전체를 우선한다.
        score -= 25
    if sentence.count("[") + sentence.count("⚫") >= 1:
        score -= 8
    if re.search(r"\d+\.\d+", sentence):
        score -= 20
    return score


def _clip_quote(sentence: str, keywords: tuple[str, ...]) -> str:
    cleaned = re.sub(r"\s+\d+\.\s*$", "", sentence).strip()
    if word_count(cleaned) <= MAX_QUOTE_WORDS:
        return cleaned
    clauses = [part.strip() for part in re.split(r"(?<=[,;])\s+", cleaned) if part.strip()]
    if len(clauses) > 1:
        ranges: list[tuple[int, int]] = []
        cursor = 0
        for clause in clauses:
            start = cleaned.find(clause, cursor)
            ranges.append((start, start + len(clause)))
            cursor = start + len(clause)
        anchor = _keyword_anchor(cleaned, keywords)
        index = 0
        for clause_index, (start, end) in enumerate(ranges):
            if start <= anchor < end:
                index = clause_index
                break
        left = index
        right = index
        while word_count(" ".join(clauses[left : right + 1])) < MIN_QUOTE_WORDS and left > 0:
            left -= 1
        while (
            right + 1 < len(clauses)
            and word_count(" ".join(clauses[left : right + 2])) <= MAX_QUOTE_WORDS
        ):
            right += 1
        window = normalize_ws(" ".join(clauses[left : right + 1]))
        if (
            MIN_QUOTE_WORDS <= word_count(window) <= MAX_QUOTE_WORDS
            and _keyword_hits(window, keywords)
        ):
            return window
    words = cleaned.split()
    anchor_word = _keyword_anchor(cleaned, keywords)
    prefix = cleaned[:anchor_word]
    anchor_index = len(prefix.split()) if prefix.strip() else 0
    start = max(0, anchor_index - 6)
    end = min(len(words), start + MAX_QUOTE_WORDS)
    start = max(0, end - MAX_QUOTE_WORDS)
    return normalize_ws(" ".join(words[start:end]))


def _keyword_anchor(sentence: str, keywords: tuple[str, ...]) -> int:
    hay = _match_key(sentence)
    positions = []
    for keyword in keywords:
        at = hay.find(_match_key(keyword))
        if at != -1:
            positions.append(at)
    return min(positions) if positions else 0


def _section_hint(page: PageText, quote: str) -> str:
    norm_page = normalize_ws(page.text)
    probe = normalize_ws(quote.strip("…"))[:48]
    pos = norm_page.find(probe) if probe else -1
    chosen = ""
    if pos != -1:
        for heading in HEADING_RE.findall(page.text):
            heading_norm = normalize_ws(heading)
            if word_count(heading_norm) > 12 or len(heading_norm) > 80:
                continue
            heading_pos = norm_page.find(heading_norm)
            if 0 <= heading_pos < pos:
                chosen = heading_norm
    if page.page and chosen:
        return f"p. {page.page} · {chosen}"
    if page.page:
        return f"p. {page.page}"
    return chosen


def best_claim_for_source(
    source: ReferenceSource,
    concept: str,
    pages: list[PageText],
) -> GroundedClaim | None:
    keywords = CONCEPT_KEYWORDS[concept]
    scored: list[tuple[int, str, PageText]] = []
    for sentence, page in _anchored_sentences(pages):
        score = _score_sentence(sentence, keywords)
        if score <= 0:
            continue
        scored.append((score, sentence, page))
    if not scored:
        return None
    fitting = [item for item in scored if word_count(item[1]) <= MAX_QUOTE_WORDS]
    pool = sorted(fitting or scored, key=lambda item: item[0], reverse=True)
    for _, sentence, page in pool:
        quote = _clip_quote(sentence, keywords)
        trimmed = re.sub(r"^.*?⚫\s*", "", quote)
        if (
            trimmed != quote
            and word_count(trimmed) >= MIN_QUOTE_WORDS
            and _keyword_hits(trimmed, keywords)
        ):
            quote = trimmed
        if word_count(quote) > MAX_QUOTE_WORDS or word_count(quote) < MIN_QUOTE_WORDS:
            continue
        if not _keyword_hits(quote, keywords):
            continue
        if comparable_span(quote) not in comparable_span(page.text):
            continue
        return GroundedClaim(
            source_id=source.id,
            concept=concept,
            quote=quote,
            paraphrase_behavior_rule=BEHAVIOR_RULES[concept],
            paper_section_hint=_section_hint(page, quote),
            page=page.page,
            author=source.author,
            year=source.year or None,
            title=source.title,
            url=source.url,
            license=source.license,
        )


def ground_claims(
    manifest_path: Path | None = None,
    *,
    per_concept: int = 2,
    concepts: tuple[str, ...] = REQUIRED_CONCEPTS,
) -> list[GroundedClaim]:
    path = manifest_path or DEFAULT_MANIFEST
    sources = load_manifest(path)
    page_cache: dict[str, list[PageText]] = {}
    claims: list[GroundedClaim] = []
    for concept in concepts:
        ranked: list[GroundedClaim] = []
        for source in sources:
            if concept not in source.concepts:
                continue
            if source.id not in page_cache:
                page_cache[source.id] = load_pages(source, path)
            pages = page_cache[source.id]
            claim = best_claim_for_source(source, concept, pages)
            if claim is not None:
                ranked.append(claim)
        ranked = _rerank(ranked, concept)
        picked: list[GroundedClaim] = []
        seen: set[str] = set()
        for claim in ranked:
            if claim.source_id in seen:
                continue
            picked.append(claim)
            seen.add(claim.source_id)
            if len(picked) >= per_concept:
                break
        if not picked:
            raise GroundingError(
                f"{concept}: 근거 발췌를 찾지 못했습니다. "
                "manifest의 concepts와 PDF/텍스트 키워드를 확인하세요."
            )
        claims.extend(picked)
    return claims


def _rerank(claims: list[GroundedClaim], concept: str) -> list[GroundedClaim]:
    keywords = CONCEPT_KEYWORDS[concept]

    def sort_key(claim: GroundedClaim) -> tuple[int, int, str]:
        hits = _keyword_hits(claim.quote, keywords)
        strength = sum(len(_match_key(hit)) for hit in hits)
        return (-strength, -word_count(claim.quote), claim.source_id)

    return sorted(claims, key=sort_key)


def render_concept_block(claims: list[GroundedClaim]) -> str:
    if not claims:
        raise GroundingError("개념 블록을 만들 발췌가 없습니다.")
    lines = [f"- 추가 행동 (발췌를 행동으로 번역): {claims[0].paraphrase_behavior_rule}"]
    for claim in claims:
        location = f" ({claim.paper_section_hint})" if claim.paper_section_hint else ""
        lines.append(f'- 근거 발췌: "{claim.quote}" [{claim.source_id}]{location}')
    return "\n".join(lines)


def render_sources_block(claims: list[GroundedClaim]) -> str:
    lines = [
        "- AI 윤리 기본 프레임은 「대한민국 인공지능 윤리원칙」(2026.8.21., 관계부처 합동)이다. "
        "불교 발췌는 이 프레임을 약화하지 않는 추가 행동의 근거로만 쓴다.",
    ]
    seen: set[str] = set()
    for claim in claims:
        if claim.source_id in seen:
            continue
        seen.add(claim.source_id)
        related = [item for item in claims if item.source_id == claim.source_id]
        concepts = ", ".join(item.concept for item in related)
        year = f" ({claim.year})" if claim.year else ""
        title = claim.title.rstrip(".")
        license_bit = f" 라이선스: {claim.license}." if claim.license else ""
        url_bit = f" {claim.url}" if claim.url else ""
        lines.append(
            f"- [{claim.source_id}] {claim.author}{year}. {title}.{url_bit}{license_bit} "
            f"개념: {concepts}."
        )
        for item in related:
            where = f" ({item.paper_section_hint})" if item.paper_section_hint else ""
            lines.append(f'  발췌{where}: "{item.quote}"')
    lines.append(
        "문장에 다는 출처 ID는 위 발췌에 있는 것만 사용하세요. 목록에 없는 ID를 만들지 마세요."
    )
    return "\n".join(lines)


def build_buddhist_guided_prompt(
    *,
    manifest_path: Path | None = None,
    template_path: Path | None = None,
    claims: list[GroundedClaim] | None = None,
) -> str:
    template_file = template_path or DEFAULT_TEMPLATE
    if not template_file.exists():
        raise GroundingError(f"프롬프트 템플릿이 없습니다: {template_file}")
    template = template_file.read_text(encoding="utf-8")
    resolved = claims if claims is not None else ground_claims(manifest_path)
    rendered = template
    for concept, placeholder in CONCEPT_PLACEHOLDERS.items():
        if placeholder not in rendered:
            raise GroundingError(f"템플릿에 {placeholder} 가 없습니다: {template_file}")
        block = render_concept_block([item for item in resolved if item.concept == concept])
        rendered = rendered.replace(placeholder, block)
    if SOURCES_PLACEHOLDER not in rendered:
        raise GroundingError(f"템플릿에 {SOURCES_PLACEHOLDER} 가 없습니다: {template_file}")
    rendered = rendered.replace(SOURCES_PLACEHOLDER, render_sources_block(resolved))
    if "{{" in rendered:
        raise GroundingError("치환되지 않은 플레이스홀더가 남아 있습니다.")
    if "대한민국 인공지능 윤리원칙" not in rendered:
        raise GroundingError("생성 프롬프트에서 AI 윤리 기본 프레임이 빠졌습니다.")
    return rendered.strip() + "\n"


def claims_to_dicts(claims: list[GroundedClaim]) -> list[dict[str, object]]:
    return [claim.to_dict() for claim in claims]


def clip_excerpt(quote: str, limit: int = MAX_QUOTE_WORDS) -> str:
    tokens = [token for token in normalize_ws(quote).split() if token]
    if len(tokens) <= limit:
        return " ".join(tokens)
    return " ".join(tokens[:limit]) + "…"


def load_grounded_prompt_claims(path: Path | None = None) -> list[dict[str, object]]:
    """시스템 프롬프트에 넣은 발췌만 반환한다. PDF와 Drive 경로는 읽지 않는다."""
    claims_path = path or DEFAULT_CLAIMS_JSON
    if not claims_path.exists():
        raise GroundingError(f"근거 발췌 목록이 없습니다: {claims_path}")
    raw = json.loads(claims_path.read_text(encoding="utf-8"))
    if not isinstance(raw, list):
        raise GroundingError("grounded_claims.json은 배열이어야 합니다.")
    rows: list[dict[str, object]] = []
    for item in raw:
        if not isinstance(item, dict):
            continue
        source_id = str(item.get("source_id") or "").strip()
        concept = str(item.get("concept") or "").strip()
        if not source_id or not concept:
            continue
        year = item.get("year")
        rows.append(
            {
                "source_id": source_id,
                "concept": concept,
                "concept_label": CONCEPT_LABELS_KO.get(concept, concept),
                "axes": list(CONCEPT_AXES.get(concept, ())),
                "excerpt": clip_excerpt(str(item.get("quote") or "")),
                "paper_section_hint": str(item.get("paper_section_hint") or "").strip(),
                "behavior_rule": str(item.get("paraphrase_behavior_rule") or "").strip(),
                "title": str(item.get("title") or "").strip(),
                "author": str(item.get("author") or "").strip(),
                "year": int(year) if isinstance(year, int) else None,
                "url": str(item.get("url") or "").strip(),
            }
        )
    return rows


def write_grounded_prompt(
    *,
    manifest_path: Path | None = None,
    template_path: Path | None = None,
    output_path: Path | None = None,
    claims_json_path: Path | None = None,
) -> tuple[Path, list[GroundedClaim]]:
    claims = ground_claims(manifest_path)
    text = build_buddhist_guided_prompt(
        manifest_path=manifest_path,
        template_path=template_path,
        claims=claims,
    )
    output = output_path or DEFAULT_OUTPUT
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(text, encoding="utf-8")
    claims_path = claims_json_path if claims_json_path is not None else DEFAULT_CLAIMS_JSON
    if claims_path:
        claims_path.parent.mkdir(parents=True, exist_ok=True)
        claims_path.write_text(
            json.dumps(claims_to_dicts(claims), ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )
    return output, claims
