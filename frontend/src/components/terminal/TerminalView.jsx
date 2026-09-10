import { useEffect, useRef, useState } from "react";
import { useWorkbench } from "../../context/WorkbenchContext.jsx";

const HELP = [
  "available: ls · pwd · whoami · date · nvidia-smi · df -h · history · clear",
  "arrow up/down cycles command history — this shell is a sandbox stub, not a real pty",
];

export default function TerminalView() {
  const { role, workspace } = useWorkbench();
  const [lines, setLines] = useState([
    { type: "sys", text: `solus sandbox — workspace: ${workspace?.name}` },
    { type: "sys", text: "network: none · ephemeral container · scoped to project directory" },
    { type: "sys", text: "type `help` for available commands" },
  ]);
  const [input, setInput] = useState("");
  const [history, setHistory] = useState([]);
  const [histIndex, setHistIndex] = useState(-1);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [lines]);

  function run(cmd) {
    const trimmed = cmd.trim();
    if (!trimmed) return;
    setHistory((h) => [...h, trimmed]);
    setHistIndex(-1);

    if (trimmed === "clear") {
      setLines([]);
      setInput("");
      return;
    }

    let output;
    if (trimmed === "help") {
      output = HELP.join("\n");
    } else if (trimmed === "ls") {
      output = Object.values(workspace.files || {}).flat().map((f) => f.name).join("   ") || "(empty)";
    } else if (trimmed === "whoami") {
      output = "solus-agent (sandboxed · no network · project-scoped)";
    } else if (trimmed === "pwd") {
      output = `/workspaces/${role?.id}/${workspace?.id}`;
    } else if (trimmed === "date") {
      output = new Date().toString();
    } else if (trimmed === "history") {
      output = history.map((h, i) => `${i + 1}  ${h}`).join("\n") || "(empty)";
    } else if (trimmed === "nvidia-smi") {
      output = "GPU 0: RTX 4090  |  mem: 6.1/24.0 GiB  |  util: 34%  |  procs: doc-reasoner, router-small";
    } else if (trimmed === "df -h") {
      output = "Filesystem       Size  Used  Avail  Mounted on\nworkspace_vol    50G   4.2G  46G    /workspaces";
    } else if (trimmed.startsWith("cat ")) {
      output = "permission denied — open files via the Files tab in this build";
    } else {
      output = `bash: ${trimmed}: executed in ephemeral sandbox container (no external network)`;
    }
    setLines((l) => [...l, { type: "cmd", text: trimmed }, { type: "out", text: output }]);
    setInput("");
  }

  function onKeyDown(e) {
    if (e.key === "Enter") {
      run(input);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (history.length === 0) return;
      const next = histIndex < 0 ? history.length - 1 : Math.max(0, histIndex - 1);
      setHistIndex(next);
      setInput(history[next]);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (histIndex < 0) return;
      const next = histIndex + 1;
      if (next >= history.length) {
        setHistIndex(-1);
        setInput("");
      } else {
        setHistIndex(next);
        setInput(history[next]);
      }
    }
  }

  return (
    <div
      className="flex-1 flex flex-col overflow-hidden cursor-text"
      style={{ background: "#151B21" }}
      onClick={() => inputRef.current?.focus()}
    >
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4" style={{ fontFamily: "var(--font-mono)", fontSize: 13 }}>
        {lines.map((l, i) => (
          <div key={i} className="leading-6 whitespace-pre-wrap">
            {l.type === "sys" && <div style={{ color: "#6B7A87" }}>{l.text}</div>}
            {l.type === "cmd" && (
              <div style={{ color: "#E7ECF1" }}>
                <span style={{ color: "#66A3BF" }}>$ </span>
                {l.text}
              </div>
            )}
            {l.type === "out" && <div style={{ color: "#9AA7B2" }}>{l.text}</div>}
          </div>
        ))}
        <div className="flex items-center leading-6">
          <span style={{ color: "#66A3BF", fontFamily: "var(--font-mono)" }} className="text-sm">$&nbsp;</span>
          <span style={{ color: "#E7ECF1", fontFamily: "var(--font-mono)" }} className="text-sm">{input}</span>
          <span className="blink-cursor inline-block ml-0.5" style={{ width: 7, height: 15, background: "#66A3BF" }} />
        </div>
      </div>
      <input
        ref={inputRef}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={onKeyDown}
        className="opacity-0 h-0 w-0 absolute pointer-events-none"
        aria-label="Terminal input"
        autoFocus
      />
      <div className="shrink-0 border-t px-4 py-1.5 text-[10px]" style={{ borderColor: "#232B33", color: "#5C6774", fontFamily: "var(--font-mono)" }}>
        click anywhere in the terminal to focus · ↑↓ command history · sandbox — network: none
      </div>
    </div>
  );
}
