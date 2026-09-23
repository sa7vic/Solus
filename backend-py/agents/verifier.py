"""
Verifier Agent: Deterministic verification & Numeric Grounding Gate.
Enforces that compliance assertions have citations and that numeric values in findings
actually exist in the source document without hallucination.
"""
import re
from lib.grounding_guard import check_grounding

def verify_finding(drafted_finding: dict, finding_text: str, source_evidence_text: str | None = None) -> dict:
    text = drafted_finding.get("text", "")
    cited = drafted_finding.get("cited", False)

    # 1. Check compliance citation requirement
    claims_compliance = bool(re.search(r"within (the )?(tolerance|allowance|threshold|limit|standard)|complies with|acceptable under", text, re.IGNORECASE))
    if claims_compliance and not cited:
        return {
            "pass": False,
            "reason": f"Finding '{finding_text[:50]}...' asserts compliance but has no cited threshold."
        }

    # 2. Check Numeric Grounding Gate (Enhancement 4)
    if source_evidence_text:
        grounding = check_grounding(text, source_evidence_text)
        if not grounding["pass"]:
            violations = grounding["violations"]
            bad_claims = ", ".join([f"'{v['claim']}'" for v in violations])
            return {
                "pass": False,
                "reason": f"Numeric Grounding Violation: value(s) {bad_claims} do not exist in the cited evidence.",
                "violations": violations
            }

    return {"pass": True}

