import DocGenerator from "./DocGenerator.jsx";

export default function CanvasApproval() {
  return (
    <DocGenerator
      format="docx"
      placeholder="e.g. Draft an approval note for Column C-203's external inspection. Findings: coating breakdown on the north platform (0.4 m²), minor surface pitting on shell course 2, insulation ingress staining near nozzle N-4, pitting near weld W-12 (max depth 1.8mm), handrail corrosion on the access platform, nameplate legible."
    />
  );
}
