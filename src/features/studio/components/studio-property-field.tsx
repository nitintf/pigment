import { cn } from "@/lib/utils";

interface StudioPropertyFieldProps {
  label: string;
  value: string | number;
  type?: "text" | "number" | "color";
  className?: string;
  labelBelow?: boolean;
  suffix?: string;
  onChange: (value: string | number) => void;
}

export function StudioPropertyField({
  label,
  value,
  type = "text",
  className,
  labelBelow = false,
  suffix,
  onChange,
}: StudioPropertyFieldProps) {
  if (type === "color") {
    return (
      <div className={cn("flex min-w-0 items-center gap-2", className)}>
        <input
          className="size-6 flex-shrink-0 cursor-pointer rounded border border-[#444] bg-transparent p-0.5"
          type="color"
          value={value as string}
          onChange={(e) => onChange(e.target.value)}
        />
        <input
          className="h-7 min-w-0 flex-1 rounded-md bg-[#252525] px-2 text-[11px] tabular-nums text-[#b0b0b0] outline-none focus:ring-1 focus:ring-[#4f8ef7]"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
    );
  }

  if (labelBelow) {
    return (
      <div className={cn("flex flex-col gap-0.5", className)}>
        <div className="relative flex items-center">
          <input
            className="h-7 min-w-0 flex-1 rounded-md bg-[#252525] px-2 text-[11px] tabular-nums text-[#b0b0b0] outline-none [appearance:textfield] focus:ring-1 focus:ring-[#4f8ef7] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            type={type}
            value={type === "number" ? Math.round(value as number) : value}
            onChange={(e) => {
              const v = type === "number" ? Number(e.target.value) : e.target.value;
              onChange(v);
            }}
          />
          {suffix && (
            <span className="pointer-events-none absolute right-2 text-[10px] text-[#555]">
              {suffix}
            </span>
          )}
        </div>
        <span className="text-center text-[9px] text-[#555]">{label}</span>
      </div>
    );
  }

  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      <span className="w-4 flex-shrink-0 text-[10px] text-[#666]">{label}</span>
      <div className="relative flex min-w-0 flex-1 items-center">
        <input
          className="h-7 min-w-0 flex-1 rounded-md bg-[#252525] px-2 text-[11px] tabular-nums text-[#b0b0b0] outline-none [appearance:textfield] focus:ring-1 focus:ring-[#4f8ef7] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          type={type}
          value={type === "number" ? Math.round(value as number) : value}
          onChange={(e) => {
            const v = type === "number" ? Number(e.target.value) : e.target.value;
            onChange(v);
          }}
        />
        {suffix && (
          <span className="pointer-events-none absolute right-2 text-[10px] text-[#555]">
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
}
