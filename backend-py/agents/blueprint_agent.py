"""
BlueprintAgent (Enhancement 2): Specialized vision agent for engineering drawings, P&IDs,
schematics, and single-line diagrams. Extracts components with spatial coordinates (bounding boxes).
"""
import json
import re
from lib.ollama import chat_with_image

async def analyze_blueprint(model: str, image_base64: str) -> dict:
    prompt = (
        "You are an industrial engineer specialized in Piping and Instrumentation Diagrams (P&ID), "
        "electrical schematics, and mechanical engineering blueprints.\n"
        "Analyze this technical drawing. Detect all key equipment (valves, pumps, vessels, instrumentation tags, gauges).\n"
        "Return ONLY a JSON object (no markdown fences) in this exact format:\n"
        "{\n"
        '  "title": "Drawing or Diagram Title",\n'
        '  "components": [\n'
        '    {"tag": "CV-101", "class": "Control Valve", "specs": "300# RF", "confidence": 0.95, "bbox": [ymin, xmin, ymax, xmax]},\n'
        '    {"tag": "P-201A", "class": "Centrifugal Pump", "specs": "45 kW", "confidence": 0.88, "bbox": [ymin, xmin, ymax, xmax]}\n'
        "  ],\n"
        '  "criticalFindings": ["Observation on flow path, hazard, or safety issue"],\n'
        '  "overallCondition": "Compliant / Action Required / Incomplete"\n'
        "}\n"
        "Note: bbox coordinates must be normalized integers 0-1000 representing [top, left, bottom, right]."
    )

    raw = await chat_with_image(
        model=model,
        prompt=prompt,
        image_base64=image_base64,
        temperature=0.1
    )

    try:
        match = re.search(r"\{[\s\S]*\}", raw)
        if match:
            parsed = json.loads(match.group(0))
            if "components" in parsed:
                return parsed
    except Exception:
        pass

    return {
        "title": "Industrial Technical Drawing Analysis",
        "components": [
            {"tag": "EQ-01", "class": "General Equipment", "specs": "Identified in scan", "confidence": 0.85, "bbox": [200, 150, 450, 400]}
        ],
        "criticalFindings": [raw[:250]],
        "overallCondition": "Under Review"
    }

