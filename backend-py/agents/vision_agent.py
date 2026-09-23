"""
VisionAgent: Interacts with local multimodal open-weight models (Qwen2.5-VL).
Supports photographs, scanned reports, and handwritten notes.
"""
from lib.ollama import chat_with_image

async def describe_image(model: str, image_base64: str, kind: str = "photograph") -> str:
    if kind == "handwriting":
        prompt = (
            "Transcribe any handwritten notes, margin marks, or inspection annotations visible in this image. "
            "Preserve line breaks and technical symbols. If partially illegible, mark [illegible]."
        )
    elif kind == "scan":
        prompt = (
            "This is a scanned technical document or inspection record. "
            "Extract all readable text, tables, and numeric measurements verbatim with layout preserved."
        )
    else:
        prompt = (
            "Describe what this industrial photograph shows in 2-4 sentences, focusing on equipment condition, "
            "structural integrity, corrosion, weld defects, gauge readings, or safety hazards."
        )

    content = await chat_with_image(
        model=model,
        prompt=prompt,
        image_base64=image_base64,
        temperature=0.1
    )
    return content.strip()

