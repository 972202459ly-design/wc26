"use client";

import { useEffect, useState } from "react";

export default function MatchCountdown({
  date,
  time,
}: {
  date: string;
  time: string;
}) {
  const [remaining, setRemaining] = useState("");

  useEffect(() => {
    function update() {
      const kickoff = new Date(date + "T" + time);
      const now = new Date();
      const diff = kickoff.getTime() - now.getTime();
      if (diff <= 0) {
        setRemaining("");
        return;
      }
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((diff / (1000 * 60)) % 60);
      if (days > 0) {
        setRemaining(`${days}d ${hours}h ${minutes}m`);
      } else {
        setRemaining(`${hours}h ${minutes}m`);
      }
    }
    update();
    const interval = setInterval(update, 60000);
    return () => clearInterval(interval);
  }, [date, time]);

  if (!remaining) return null;

  return (
    <span className="text-xs text-[#f0a500] font-medium">
      Kickoff in {remaining}
    </span>
  );
}
