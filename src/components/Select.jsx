// Reusable Select component
import { useState, useRef, useEffect } from "react";
import { inputBase } from "../utils/ui.js";

export const Select = ({ value, onChange, options, placeholder = "Select…", className = "", icon }) => {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    function onDoc(e) {
      if (!rootRef.current?.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const current = options.find((o) => o.value === value);

  return (
    <div ref={rootRef} className={`relative w-full ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`${inputBase} flex items-center justify-between`}
      >
        <div className="flex items-center gap-2">
          {icon && (
            <div className="text-gray-600 dark:text-slate-400">
              {icon}
            </div>
          )}
          <span className={current ? "" : "text-gray-600 dark:text-slate-400"}>
            {current ? current.label : placeholder}
          </span>
        </div>
        <svg className="w-4 h-4 opacity-70" viewBox="0 0 20 20" fill="currentColor">
          <path d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z" />
        </svg>
      </button>

      {open && (
        <div className="absolute left-0 right-0 mt-2 z-[99999] rounded-xl border border-blue-400 bg-white dark:bg-slate-900 shadow-xl">
          <ul className="max-h-64 overflow-y-auto py-1">
            {options.map((opt) => (
              <li key={opt.value}>
                <button
                  type="button"
                  onClick={() => { onChange(opt.value); setOpen(false); }}
                  className={`w-full text-left px-3 py-2 hover:bg-slate-800 ${
                    opt.value === value ? "text-white" : "text-slate-200"
                  }`}
                >
                  {opt.label}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
