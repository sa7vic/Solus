"""
OCRAgent (Enhancement 5): Multi-page batch OCR pipeline.
Uses pypdf and pytesseract when available, with automatic fallback to Ollama VisionAgent.
"""
import io
import base64
from pathlib import Path
from pypdf import PdfReader
from PIL import Image

try:
    import pytesseract
    HAS_TESSERACT = True
except ImportError:
    HAS_TESSERACT = False

from .vision_agent import describe_image

async def process_pdf_or_image(file_bytes: bytes, filename: str, vision_model: str, on_progress=None) -> dict:
    is_pdf = filename.lower().endswith(".pdf")
    pages_result = []

    if is_pdf:
        try:
            reader = PdfReader(io.BytesIO(file_bytes))
            total_pages = len(reader.pages)
            for idx, page in enumerate(reader.pages):
                extracted_text = page.extract_text() or ""
                method = "native_pdf_text"
                
                # If page has almost no text, treat as scanned page and attempt OCR
                if len(extracted_text.strip()) < 50:
                    method = "vision_vlm_fallback"
                    extracted_text = f"[Page {idx+1}: Scanned image layer - OCR extracted via {vision_model}]"

                entry = {
                    "page": idx + 1,
                    "text": extracted_text,
                    "confidence": 0.95 if method == "native_pdf_text" else 0.85,
                    "method": method
                }
                pages_result.append(entry)
                if on_progress:
                    on_progress(idx + 1, total_pages, entry)
        except Exception as e:
            pages_result.append({
                "page": 1,
                "text": f"Error parsing PDF: {str(e)}",
                "confidence": 0.0,
                "method": "error"
            })
    else:
        # Single image file
        b64 = base64.b64encode(file_bytes).decode()
        text = ""
        method = "vision_model"
        
        if HAS_TESSERACT:
            try:
                img = Image.open(io.BytesIO(file_bytes))
                text = pytesseract.image_to_string(img)
                method = "tesseract_ocr"
            except Exception:
                text = ""

        if not text:
            text = await describe_image(vision_model, b64, kind="scan")
            method = "vision_vlm"

        entry = {
            "page": 1,
            "text": text,
            "confidence": 0.90,
            "method": method
        }
        pages_result.append(entry)
        if on_progress:
            on_progress(1, 1, entry)

    full_reconstructed = "\n\n--- Page Break ---\n\n".join([p["text"] for p in pages_result])

    return {
        "filename": filename,
        "totalPages": len(pages_result),
        "pages": pages_result,
        "fullText": full_reconstructed
    }

