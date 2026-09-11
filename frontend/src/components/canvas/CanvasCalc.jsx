import DocGenerator from "./DocGenerator.jsx";

export default function CanvasCalc() {
  return (
    <DocGenerator
      format="docx"
      placeholder="e.g. Write a technical note on relief valve sizing methodology for Tank-114, covering the fire-case scenario, relieving pressure calculation, and orifice selection basis."
    />
  );
}
