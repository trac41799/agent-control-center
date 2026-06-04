import { cn } from "@/lib/utils";

interface CompressionIndicatorProps {
  usagePercent: number;
}

export default function CompressionIndicator({ usagePercent }: CompressionIndicatorProps) {
  const clamped = Math.max(0, Math.min(100, usagePercent));

  let color: string;
  let pulse = false;

  if (clamped < 30) {
    color = "bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.6)]";
  } else if (clamped < 50) {
    color = "bg-yellow-400 shadow-[0_0_6px_rgba(250,204,21,0.6)]";
  } else if (clamped < 80) {
    color = "bg-orange-500 shadow-[0_0_6px_rgba(249,115,22,0.6)]";
    pulse = true;
  } else {
    color = "bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.6)]";
  }

  return (
    <div className="flex items-center gap-1.5 group" title={`Memory budget usage: ${clamped.toFixed(0)}%`}>
      <span
        className={cn(
          "w-2.5 h-2.5 rounded-full transition-all duration-300",
          color,
          pulse && "animate-pulse"
        )}
      />
      <span className="text-[10px] text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
        {clamped.toFixed(0)}%
      </span>
    </div>
  );
}
