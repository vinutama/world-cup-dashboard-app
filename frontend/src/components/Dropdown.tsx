import { useState, useRef, useEffect } from 'react';

interface Option {
  value: string;
  label: string;
}

interface DropdownProps {
  label: string;
  options: Option[];
  value: string;
  onChange: (value: string) => void;
}

export default function Dropdown({ label, options, value, onChange }: DropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selected = options.find((o) => o.value === value);
  const selectedLabel = selected?.label ?? label;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="group flex min-h-[44px] items-center gap-2 rounded-xl border border-slate-700/60 bg-slate-800/80 px-4 py-2 text-sm text-slate-200 outline-none transition-all duration-200 hover:border-blue-500/40 hover:shadow-lg hover:shadow-blue-500/5 focus:border-blue-500/60 focus:shadow-lg focus:shadow-blue-500/10"
      >
        <span className="text-xs font-medium uppercase tracking-wider text-slate-500">
          {label}
        </span>
        <span className="ml-1 rounded-md bg-blue-500/10 px-2 py-0.5 text-sm font-semibold text-blue-400">
          {value ? selectedLabel : 'All'}
        </span>
        <svg
          className={`ml-auto h-4 w-4 text-slate-400 transition-all duration-200 ${
            open ? 'rotate-180 text-blue-400' : ''
          }`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown panel with glass-morphism + scale/fade animation */}
      <div
        className={`absolute right-0 z-50 mt-2 w-52 origin-top-right overflow-hidden transition-all duration-200 ${
          open
            ? 'pointer-events-auto scale-y-100 opacity-100'
            : 'pointer-events-none scale-y-95 opacity-0'
        }`}
      >
        <div className="max-h-60 overflow-y-auto rounded-xl border border-slate-700/50 bg-slate-800/95 px-1 py-1 shadow-xl shadow-black/30 backdrop-blur-lg [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-600 [&::-webkit-scrollbar-track]:bg-transparent">
          {/* All Years option */}
          <button
            onClick={() => {
              onChange('');
              setOpen(false);
            }}
            className={`flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md ${
              value === ''
                ? 'border-l-2 border-blue-500 bg-blue-500/10 pl-[10px] font-medium text-blue-400'
                : 'border-l-2 border-transparent pl-[10px] text-slate-400 hover:bg-slate-700/60 hover:text-slate-200'
            }`}
          >
            <svg
              className="h-3.5 w-3.5 shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
              />
            </svg>
            All Years
          </button>

          {/* Options divider */}
          <div className="mx-2 my-1 border-t border-slate-700/40" />

          {options.map((opt) => (
            <button
              key={opt.value}
              onClick={() => {
                onChange(opt.value);
                setOpen(false);
              }}
              className={`flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md ${
                value === opt.value
                  ? 'border-l-2 border-blue-500 bg-blue-500/10 pl-[10px] font-medium text-blue-400'
                  : 'border-l-2 border-transparent pl-[10px] text-slate-300 hover:bg-slate-700/60 hover:text-white'
              }`}
            >
              {value === opt.value && (
                <svg
                  className="h-3.5 w-3.5 shrink-0 text-blue-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              )}
              <span className={value !== opt.value ? 'ml-5' : ''}>{opt.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
