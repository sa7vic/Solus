"""
Planner Agent: task decomposition, structure planning, and search query refinement.
"""
import re
import json
from lib.ollama import chat

async def decompose(model: str, task_description: str) -> str:
    content = await chat(
        model=model,
        messages=[
            {"role": "system", "content": "You are an industrial planning agent. Decompose the task into 3-5 concise numbered steps."},
            {"role": "user", "content": task_description}
        ],
        temperature=0.1
    )
    return content.strip()

async def plan_document(model: str, task: str) -> dict:
    prompt = (
        "You plan the structure of an industrial document/slide deck from a free-text request. "
        "Respond with ONLY a JSON object, no markdown, matching exactly:\n"
        '{"title": string, "subtitle": string, "sections": [{"heading": string, "points": [string, string]}]}\n'
        "Use 3-5 sections, each with 2-4 short bullet points."
    )
    content = await chat(
        model=model,
        messages=[
            {"role": "system", "content": prompt},
            {"role": "user", "content": task}
        ],
        temperature=0.2
    )

    try:
        match = re.search(r"\{[\s\S]*\}", content)
        if match:
            parsed = json.loads(match.group(0))
            if parsed.get("sections"):
                return parsed
    except Exception:
        pass

    return {
        "title": task[:60],
        "subtitle": "Industrial Automated Report",
        "sections": [{"heading": "Findings & Overview", "points": [task]}]
    }

async def refine_query(model: str, finding_text: str, prior_query: str, insufficient_evidence: str, gap_reason: str) -> str:
    prompt = (
        "You improve search queries for lexical & semantic retrieval over industrial SOPs and engineering standards. "
        "Given a finding and a failed prior query, write ONE concise search query (keywords, no quotes, no punctuation) "
        "likely to find the exact tolerance, allowance or numeric specification. Return ONLY the search query."
    )
    user_msg = (
        f"Finding: {finding_text}\n"
        f"Prior query: {prior_query}\n"
        f"Insufficient snippet: {insufficient_evidence}\n"
        f"Gap reason: {gap_reason}"
    )
    content = await chat(
        model=model,
        messages=[
            {"role": "system", "content": prompt},
            {"role": "user", "content": user_msg}
        ],
        temperature=0.2
    )
    line = content.strip().split("\n")[0].strip("\"' ")
    return line or finding_text

