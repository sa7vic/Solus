import DocGenerator from "./DocGenerator.jsx";

export default function CanvasAdvisory() {
  return (
    <DocGenerator
      format="docx"
      placeholder="e.g. Draft a safety advisory for a near-miss: a hand tool fell ~6m from a scaffold platform during maintenance, no injury, drop zone was barricaded. Recommend a corrective action."
    />
  );
}
