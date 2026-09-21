"""
DocAgent: Drafts specific technical findings grounded strictly in retrieved SOP evidence.
Explicitly instructed to tag with [CITED] or [UNCITED].
"""
import re
from lib.ollama import chat

async def draft_finding(model: str, finding_text: str, evidence: dict | None) -> dict:
    if evidence:
        evidence_block = f"Retrieved source [{evidence.get('source')}]:\n{evidence.get('snippet')}"
    else:
        evidence_block = "No relevant standard or SOP retrieved."

    prompt = (
        "You are an industrial compliance drafter writing for a technical approval note. "
        "Write exactly ONE factual, concise sentence addressing the finding. "
        "If evidence states a specific applicable numeric threshold/allowance and the finding complies, "
        "state that compliance and end with '[CITED]'. "
        "If no evidence is provided or it lacks a specific numeric threshold, "
        "state the finding objectively without asserting compliance, and end with '[UNCITED]'. "
        "End with ONLY [CITED] or [UNCITED]."
    )

    user_msg = f"Finding: {finding_text}\n\n{evidence_block}"

    content = await chat(
        model=model,
        messages=[
            {"role": "system", "content": prompt},
            {"role": "user", "content": user_msg}
        ],
        temperature=0.1
    )

    cited = bool(re.search(r"\[CITED\]", content, re.IGNORECASE))
    clean_text = re.sub(r"\[CITED\]|\[UNCITED\]", "", content, flags=re.IGNORECASE).strip()

    return {
        "text": clean_text,
        "cited": cited,
        "source": evidence.get("source") if cited and evidence else None
    }

