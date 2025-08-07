import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
  colors: string[];
}

export function ColorPicker({ value, onChange, colors }: ColorPickerProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {colors.map((color) => (
        <button
          key={color}
          type="button"
          className={cn(
            "w-8 h-8 rounded-full border-2 border-transparent flex items-center justify-center transition-all hover:scale-110",
            value === color && "border-ring"
          )}
          style={{ backgroundColor: color }}
          onClick={() => onChange(color)}
        >
          {value === color && <Check className="h-4 w-4 text-white" />}
        </button>
      ))}
    </div>
  );
}