from __future__ import annotations

class ChatPromptTemplate:
    def __init__(self, messages):
        self.messages = messages
    @classmethod
    def from_messages(cls, messages):
        return cls(messages)
    def format_messages(self, **kwargs):
        res = []
        for role, text in self.messages:
            content = text
            for k, v in kwargs.items():
                content = content.replace('{' + k + '}', str(v))
            res.append({'role': role, 'content': content})
        return res
class ChatPromptTemplate:
    def __init__(self, messages):
        self.messages = messages
    @classmethod
    def from_messages(cls, messages):
        return cls(messages)
    def format_messages(self, **kwargs):
        res = []
        for role, text in self.messages:
            content = text
            for k, v in kwargs.items():
                content = content.replace('{' + k + '}', str(v))
            res.append({'role': role, 'content': content})
        return res

"""Constrained system prompt and message construction for the generation step."""


FALLBACK_MESSAGE = (
    "I don't have verified clinical guidance on this topic. "
    "Please speak directly with a healthcare provider at your nearest health clinic."
)

PRESCRIPTION_REFUSAL = (
    "I can't recommend medicines or dosages, and I can't diagnose conditions. "
    "Please speak to a doctor, midwife or pharmacist at your nearest health clinic. "
    "They can check your health and give you safe advice."
)

DANGER_ADVICE = (
    "Some of what you describe can be a danger sign in pregnancy or after birth. "
    "Please consult a midwife or doctor at a health facility right away. "
    "If it is severe or getting worse, go to the nearest hospital or call 112."
)

SYSTEM_PROMPT = (
    "You are MamaCare Assistant, an empathetic educational maternal health guide.\n"
    "\n"
    "Follow these boundaries strictly:\n"
    "Boundary 1 - Grounding: Answer ONLY from the CONTEXT provided below. Do not use outside "
    "knowledge and do not guess.\n"
    "Boundary 2 - No medical practice: NEVER diagnose, prescribe, or recommend dosages "
    "(mg/ml) or specific medicines for the user. You may repeat general educational "
    "statements that appear in the context.\n"
    "Boundary 3 - Danger signs: If the user describes symptoms that could be a danger sign, "
    "always instruct them to consult a midwife or doctor, and to go to a hospital "
    "immediately if it is severe.\n"
    "Boundary 4 - Unknown: If the context does not contain the answer, respond exactly with: "
    '"' + FALLBACK_MESSAGE + '"\n'
    "\n"
    "Style: warm, calm, short and simple sentences. Reply in the language requested "
    "({language}). The user's stage, if known: {stage}.\n"
    "\n"
    "CONTEXT:\n"
    "{context}"
)

_PROMPT = ChatPromptTemplate.from_messages([("system", SYSTEM_PROMPT), ("human", "{question}")])


def build_messages(question: str, context: str, language: str, stage: str | None) -> list[dict[str, str]]:
    """Render the prompt as OpenAI-style chat messages."""
    rendered = _PROMPT.format_messages(
        question=question,
        context=context,
        language={"en": "English", "ha": "Hausa", "pcm": "Nigerian Pidgin"}.get(language, "English"),
        stage=stage or "unknown",
    )
    role_map = {"system": "system", "human": "user", "ai": "assistant"}
    return [{"role": role_map.get(m.type, "user"), "content": str(m.content)} for m in rendered]


DISCLAIMERS = {
    "en": (
        "MamaCare AI is an educational tool and does not replace advice from a qualified "
        "midwife or doctor. In an emergency, go to the nearest hospital or call 112."
    ),
    # Draft translations - need review by native speakers / clinicians.
    "ha": (
        "MamaCare AI kayan koyo ne kawai, ba ya maye gurbin shawarar ungozoma ko likita. "
        "Idan akwai gaggawa, je asibiti mafi kusa ko ka kira 112."
    ),
    "pcm": (
        "MamaCare AI na tool wey dey teach only, e no fit replace advice from midwife or doctor. "
        "If emergency dey, go the nearest hospital or call 112."
    ),
}