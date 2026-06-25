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
        className="flex items-center gap-2 rounded-lg border border-slate-600 bg-slate-800 px-3 py-1.5 text-sm text-white outline-none transition-colors hover:border-slate-500 focus:border-blue-500"
      >
        <span className="text-slate-400">{label}:</span>
        <span>{value ? selectedLabel : 'All'}</span>
        <svg
          className={`h-4 w-4 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute left-0 z-50 mt-1 max-h-60 w-48 overflow-y-auto rounded-lg border border-slate-600 bg-slate-800 py-1 shadow-lg">
          <button
            onClick={() => {
              onChange('');
              setOpen(false);
            }}
            className={`w-full px-3 py-2 text-left text-sm transition-colors hover:bg-slate-700 ${
              value === '' ? 'text-blue-400' : 'text-slate-300'
            }`}
          >
            All Years
          </button>
          {options.map((opt) => (
            <button
              key={opt.value}
              onClick={() => {
                onChange(opt.value);
                setOpen(false);
              }}
              className={`w-full px-3 py-2 text-left text-sm transition-colors hover:bg-slate-700 ${
                value === opt.value ? 'text-blue-400' : 'text-slate-300'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
