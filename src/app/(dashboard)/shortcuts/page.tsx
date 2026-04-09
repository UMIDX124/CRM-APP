"use client";

import { Command } from "lucide-react";

const shortcuts = [
  { category: "Navigation", items: [
    { keys: ["Ctrl", "K"], desc: "Open command palette — search everything" },
    { keys: ["Esc"], desc: "Close modal / palette / chat" },
  ]},
  { category: "Actions", items: [
    { keys: ["↑", "↓"], desc: "Navigate through command palette results" },
    { keys: ["Enter"], desc: "Select item in command palette" },
  ]},
  { category: "Quick Access", items: [
    { keys: ["Ctrl", "K"], desc: "Then type 'clients' → jump to Clients page" },
    { keys: ["Ctrl", "K"], desc: "Then type any name → find employee/client/task" },
  ]},
];

export default function ShortcutsPage() {
  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="text-center">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-[#FF6B00]/10 flex items-center justify-center mb-4">
          <Command className="w-8 h-8 text-[#FF6B00]" />
        </div>
        <h2 className="text-xl font-semibold text-white">Keyboard Shortcuts</h2>
        <p className="text-white/40 text-sm mt-1">Master these to navigate like a pro</p>
      </div>

      {shortcuts.map((group) => (
        <div key={group.category}>
          <h3 className="text-sm font-medium text-white/50 mb-3 uppercase tracking-wider">{group.category}</h3>
          <div className="space-y-2">
            {group.items.map((item, i) => (
              <div key={i} className="flex items-center justify-between p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                <p className="text-sm text-white/70">{item.desc}</p>
                <div className="flex items-center gap-1.5">
                  {item.keys.map((key, j) => (
                    <span key={j}>
                      <kbd className="px-2.5 py-1.5 rounded-lg bg-white/[0.06] border border-white/[0.1] text-xs text-white/60 font-mono font-medium min-w-[28px] text-center inline-block">{key}</kbd>
                      {j < item.keys.length - 1 && <span className="text-white/20 mx-1">+</span>}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      <div className="p-5 rounded-2xl bg-[#FF6B00]/5 border border-[#FF6B00]/10 text-center">
        <p className="text-sm text-[#FF6B00]/80">Pro tip: Press <kbd className="px-2 py-1 rounded bg-[#FF6B00]/10 text-[#FF6B00] text-xs font-mono mx-1">Ctrl+K</kbd> from anywhere to instantly search and navigate!</p>
      </div>
    </div>
  );
}
