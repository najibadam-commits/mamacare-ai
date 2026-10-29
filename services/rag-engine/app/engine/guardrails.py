"""Input and output safety guardrails.

These are deliberately simple, transparent pattern checks. They are a safety net, not a
replacement for the model-side boundaries in ``prompts.py`` and not a clinical triage tool
(the web app's deterministic triage engine remains authoritative for danger signs).
"""
from __future__ import annotations

import re

from app.engine.text import normalize

# --- Input: is the user asking us to prescribe / dose / diagnose? -----------------------
_PRESCRIPTION_PATTERNS = [
    r"\bdos(e|es|age|ages|ing)\b",
    r"\b\d+\s?(mg|mcg|ml|iu|tablets?|pills?|capsules?)\b",
    r"\b(mg|milligrams?|millilitres?|milliliters?)\b",
    r"\bhow (much|many)\b.*\b(take|taking|drink|swallow|use|inject|tablets?|pills?|capsules?|drops?|spoons?)\b",
    r"\bwhat (medicine|medication|drug|tablet|pill|antibiotic|painkiller)s?\b.*\b(take|use|buy|should)\b",
    r"\b(prescribe|prescription)\b",
    r"\bwhich (medicine|medication|drug|tablet|pill|antibiotic|painkiller)s?\b",
    r"\b(paracetamol|acetaminophen|ibuprofen|aspirin|diclofenac|amoxicillin|artemether|lumefantrine"
    r"|chloroquine|quinine|misoprostol|oxytocin|sulfadoxine|pyrimethamine|metronidazole|tramadol|codeine)\b",
    r"\bdo i have (malaria|preeclampsia|pre-eclampsia|diabetes|anaemia|anemia|hiv|an infection)\b",
    r"\bdiagnos(e|is)\b",
    r"\bcan i (take|use|drink)\b.*\b(medicine|drug|tablet|pill|herb|herbal)\b",
    # Hausa / Pidgin: dose, medicine, tablets
    r"\b(adadin|kashi|magani)\b.*\b(sha|ɗauka|daukar|dauka|zan)\b",
    r"\bhow many (tablet|pill|drug|medicine)\b",
    r"\bwetin (i|make i) (go )?(take|drink)\b",
]
_PRESCRIPTION_RE = re.compile("|".join(f"(?:{p})" for p in _PRESCRIPTION_PATTERNS), re.IGNORECASE)

# --- Input: possible danger symptoms (Boundary 3) ---------------------------------------
_DANGER_PATTERNS = [
    r"\b(heavy|much|lot of|too much|severe)\s+bleeding\b",
    r"\bbleed(ing)?\b",
    r"\b(fit|fits|convulsion|convulsions|seizure|seizures)\b",
    r"\bsevere\s+(headache|pain|abdominal|belly|stomach)\b",
    r"\bblurr?(ed|y)\s+(vision|sight)\b",
    r"\b(baby|pikin)\b.*\b(not moving|stopped moving|no movement|dey no move|no dey move)\b",
    r"\bnot (feeling|feel) (the )?baby\b",
    r"\b(difficulty|trouble|hard to)\s+breath",
    r"\bcan'?t breathe\b",
    r"\b(fever|high temperature|chills)\b",
    r"\bswollen\s+(face|hands|feet|legs?)\b",
    r"\bwater (has |don )?(broke|break)\b",
    r"\bleaking (fluid|water)\b",
    r"\b(faint|fainted|fainting|unconscious|collapse[d]?)\b",
    r"\bfoul[- ]smelling\b",
    r"\bthoughts? of (harming|hurting|killing)\b",
    # Hausa
    r"\b(zubar da jini|zubar jini|zubar jinin|jini mai yawa|kamuwa|suma|zazzabi mai tsanani)\b",
    r"\bciwon kai mai tsanani\b",
]
_DANGER_RE = re.compile("|".join(f"(?:{p})" for p in _DANGER_PATTERNS), re.IGNORECASE)


def is_prescription_request(query: str) -> bool:
    return bool(_PRESCRIPTION_RE.search(normalize(query)))


def has_danger_sign(query: str) -> bool:
    return bool(_DANGER_RE.search(normalize(query)))


# --- Output: forbidden prescription terms -----------------------------------------------
_FORBIDDEN_OUTPUT_PATTERNS = [
    r"\b\d+(\.\d+)?\s?(mg|mcg|µg|ug|ml|iu|g)\b",  # any numeric dose
    r"\bdosage\b",
    r"\b(milligrams?|micrograms?|millilitres?|milliliters?)\b",
    r"\b(take|swallow|use|give|inject)\s+(\d+|one|two|three|four|five|six)\s+(tablets?|pills?|capsules?|drops?|spoons?|teaspoons?|tablespoons?)\b",
    r"\b(you should|you must|i recommend|i advise|i suggest|i prescribe)\s+(take|taking|use|using|start|try)\b",
    r"\bprescri(be|bed|ption|bing)\b",
    r"\b(paracetamol|acetaminophen|ibuprofen|aspirin|diclofenac|amoxicillin|artemether|lumefantrine"
    r"|chloroquine|quinine|misoprostol|oxytocin|sulfadoxine|pyrimethamine|metronidazole|tramadol|codeine)\b",
]
_FORBIDDEN_RE = re.compile("|".join(f"(?:{p})" for p in _FORBIDDEN_OUTPUT_PATTERNS), re.IGNORECASE)


def find_forbidden_terms(text: str) -> list[str]:
    """Return the offending fragments (empty list means the text is clean)."""
    return [m.group(0) for m in _FORBIDDEN_RE.finditer(text)]


def is_output_safe(text: str) -> bool:
    return not find_forbidden_terms(text)
