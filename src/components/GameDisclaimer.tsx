import { Info } from "lucide-react";

export default function GameDisclaimer({ className = "" }: { className?: string }) {
  return (
    <div className={`rounded-lg border border-[#222] bg-[#0d0d0d] p-3 text-[11px] leading-relaxed text-[#777] ${className}`}>
      <div className="mb-1 flex items-center gap-1.5 font-semibold text-[#999]">
        <Info className="h-3.5 w-3.5" /> Disclaimer
      </div>
      The WC26 Live Pick&apos;em is a <b>free-to-play game for entertainment only</b>. Points are
      virtual, have <b>no monetary value</b>, cannot be purchased, and cannot be exchanged for cash or
      prizes. This is <b>not gambling</b> and involves no real-money wagering. Predictions are
      informational and for entertainment only. Players should be 18+.
    </div>
  );
}
