import { useState } from "react";
import { cn } from "@/lib/utils";
import { Plus, X } from "lucide-react";

interface TagGroupProps {
  label: string;
  options: string[];
  selected: string[];
  multi?: boolean;
  onChange: (selected: string[]) => void;
}

export function TagGroup({
  label,
  options,
  selected,
  multi = true,
  onChange,
}: TagGroupProps) {
  const [customInput, setCustomInput] = useState("");
  const [showInput, setShowInput] = useState(false);
  const [customValues, setCustomValues] = useState<string[]>([]);

  const toggle = (value: string) => {
    if (multi) {
      onChange(
        selected.includes(value)
          ? selected.filter((v) => v !== value)
          : [...selected, value]
      );
    } else {
      onChange(selected.includes(value) ? [] : [value]);
    }
  };

  const handleCustomSubmit = () => {
    const trimmed = customInput.trim();
    if (!trimmed) return;
    setCustomValues((prev) => [...prev, trimmed]);
    onChange([...selected, trimmed]);
    setCustomInput("");
    setShowInput(false);
  };

  const removeCustom = (value: string) => {
    setCustomValues((prev) => prev.filter((v) => v !== value));
    onChange(selected.filter((v) => v !== value));
  };

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-gray-500">{label}</p>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => (
          <button
            key={opt}
            onClick={() => toggle(opt)}
            className={cn(
              "inline-flex h-8 items-center rounded-full border px-3 text-sm transition-all",
              selected.includes(opt)
                ? "border-[#152439] bg-[#152439] text-white"
                : "border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50"
            )}
          >
            {opt}
          </button>
        ))}

        {customValues.map((val) => (
          <button
            key={val}
            onClick={() => removeCustom(val)}
            className="inline-flex h-8 items-center gap-1 rounded-full border border-[#152439] bg-[#152439] px-3 text-sm text-white"
          >
            {val}
            <X className="h-3 w-3" />
          </button>
        ))}

        {showInput ? (
          <div className="flex items-center gap-1">
            <input
              autoFocus
              value={customInput}
              onChange={(e) => setCustomInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCustomSubmit();
                if (e.key === "Escape") setShowInput(false);
              }}
              placeholder="직접 입력 후 Enter"
              className="h-8 w-36 rounded-full border border-gray-300 px-3 text-sm outline-none focus:border-[#006ffd] focus:ring-1 focus:ring-[#006ffd]/20"
            />
            <button
              onClick={() => setShowInput(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowInput(true)}
            className="inline-flex h-8 items-center gap-1 rounded-full border border-dashed border-gray-300 bg-white px-3 text-sm text-gray-400 hover:border-gray-400 hover:text-gray-600"
          >
            <Plus className="h-3.5 w-3.5" />
            직접입력
          </button>
        )}
      </div>
    </div>
  );
}
