import { AlertTriangle } from "lucide-react";
import { useWorkbench } from "../../context/WorkbenchContext.jsx";

// If the current role needs a model that isn't installed yet, say so loudly
// instead of letting a demo silently fall back to text-only behaviour.
export default function ModelMissingBanner({ onOpenModels }) {
  const { role, models } = useWorkbench();
  if (!role?.requiredModels) return null;
  const missing = role.requiredModels
    .map((name) => models.find((m) => m.name === name))
    .filter((m) => m && !m.installed);

  if (missing.length === 0) return null;

  return (
    <div className="flex items-center gap-2.5 px-4 py-2 text-xs border-b shrink-0" style={{ borderColor: "var(--tier2)44", background: "var(--tier2)14", color: "var(--tier2)" }}>
      <AlertTriangle size={13} className="shrink-0" />
      <span className="flex-1">
        {missing.map((m) => m.name).join(", ")} {missing.length === 1 ? "is" : "are"} not installed —
        required for {missing.some((m) => m.tags?.includes("vision")) ? "OCR / drawing" : "some"} tasks in this workbench.
      </span>
      <button onClick={onOpenModels} className="underline decoration-dotted shrink-0">Download now</button>
    </div>
  );
}
