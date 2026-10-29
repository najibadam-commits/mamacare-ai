"""Shared text utilities: normalisation, tokenisation, light stemming, query expansion."""
from __future__ import annotations

import re
import unicodedata

_SPECIAL = str.maketrans({"ƙ": "k", "Ƙ": "k", "ɗ": "d", "Ɗ": "d", "ɓ": "b", "Ɓ": "b", "ƴ": "y", "Ƴ": "y"})

STOPWORDS = frozenset(
    """a about after all also am an and any are as at be been before but by can could did do does
    for from get give go had has have how i if in into is it its just may me more most much my no
    not of on one or our out should so some than that the their them then there these they this
    to up us use very was we were what when where which who why will with would you your
    care take need help good make like want know tell please give told ok okay""".split()
)

_WORD = re.compile(r"[a-z0-9]+")


def normalize(text: str) -> str:
    """Lowercase, strip accents, fold Hausa hooked letters to plain ones."""
    text = text.translate(_SPECIAL)
    text = unicodedata.normalize("NFKD", text)
    text = "".join(ch for ch in text if not unicodedata.combining(ch))
    return text.lower()


def stem(word: str) -> str:
    if len(word) > 5 and word.endswith("ies"):
        return word[:-3] + "y"
    for suffix in ("ation", "ion", "ive", "ing", "ed", "es", "s"):
        if len(word) > len(suffix) + 3 and word.endswith(suffix):
            return word[: -len(suffix)]
    return word


def content_stems(text: str) -> list[str]:
    """Stemmed, stop-word-free tokens of ``text`` (order preserved, duplicates kept)."""
    return [stem(w) for w in _WORD.findall(normalize(text)) if w not in STOPWORDS and len(w) > 1]


# --- Query expansion for Hausa / Nigerian Pidgin ---------------------------------------
# The prototype corpus is English. These small glossaries add English key terms to a
# Hausa or Pidgin query so that retrieval can still find the right guideline. They are a
# retrieval aid only (never shown to the user) and need review by native speakers.
_EXPANSIONS: dict[str, dict[str, str]] = {
    "ha": {
        "zazzabin cizon sauro": "malaria mosquito fever",
        "cizon sauro": "malaria mosquito",
        "gidan sauro": "mosquito net insecticide",
        "sauro": "mosquito malaria",
        "zazzabi": "fever",
        "ciki": "pregnancy pregnant",
        "mai ciki": "pregnant pregnancy",
        "jariri": "newborn baby infant",
        "yaro": "child baby infant",
        "rigakafi": "vaccine immunization vaccination",
        "allura": "vaccine immunization injection",
        "abinci": "food nutrition eat",
        "ci": "eat",
        "karfe": "iron",
        "jini": "blood bleeding",
        "haihuwa": "birth delivery postnatal",
        "bayan haihuwa": "postnatal after birth recovery",
        "nono": "breastfeed breast milk",
        "ungozoma": "midwife",
        "likita": "doctor",
        "asibiti": "hospital clinic",
        "kwayoyi": "medicine tablets",
        "ruwa": "water",
        "kiwon lafiya": "health",
    },
    "pcm": {
        "belle": "pregnancy pregnant",
        "pikin": "baby child infant newborn",
        "new born": "newborn baby",
        "injection": "vaccine immunization",
        "chop": "eat food nutrition",
        "blood": "blood anaemia",
        "bleed": "bleeding blood",
        "mosquito": "mosquito malaria",
        "net": "net mosquito insecticide",
        "born": "birth delivery",
        "wound": "wound care",
        "sick": "illness symptoms",
        "hospital": "hospital clinic",
        "clinic": "clinic hospital",
        "midwife": "midwife",
        "breast": "breastfeed breast milk",
        "wash": "wash hygiene",
        "water": "water",
    },
}


def expand_query(query: str, language: str) -> str:
    """Append English key terms for known Hausa/Pidgin words. English is returned as-is."""
    glossary = _EXPANSIONS.get(language)
    if not glossary:
        return query
    norm = " " + " ".join(_WORD.findall(normalize(query))) + " "
    extra: list[str] = []
    for phrase, english in glossary.items():
        if f" {phrase} " in norm or f" {phrase}s " in norm:
            extra.append(english)
    return query if not extra else f"{query} {' '.join(extra)}"
