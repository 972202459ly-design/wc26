"use client";

import { useState } from "react";
import { teams } from "@/lib/data";

const sortedTeams = [...teams].sort((a, b) => a.name.localeCompare(b.name));

export default function FavoriteTeamForm({ current }: { current: string | null }) {
  const [selected, setSelected] = useState(current ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const currentTeam = teams.find((t) => t.id === current);

  async function handleSave() {
    if (!selected) return;
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      const res = await fetch("/api/account/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamId: selected }),
      });
      if (!res.ok) throw new Error("Failed");
      setSaved(true);
    } catch {
      setError("Failed to save. Try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-2">
      {currentTeam && (
        <div className="flex items-center gap-2 text-sm text-[#ccc]">
          <img
            src={`https://flagcdn.com/20x15/${getFlagCode(currentTeam.id)}.png`}
            alt={currentTeam.name}
            width={20}
            height={15}
            className="rounded-sm"
          />
          <span>Supporting <b className="text-white">{currentTeam.name}</b></span>
        </div>
      )}
      <div className="flex gap-2">
        <select
          value={selected}
          onChange={(e) => { setSelected(e.target.value); setSaved(false); }}
          className="flex-1 rounded-md border border-[#333] bg-[#1a1a1a] px-3 py-2 text-sm text-white focus:border-[#f0a500] focus:outline-none"
        >
          <option value="">— Pick your team —</option>
          {sortedTeams.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
        <button
          onClick={handleSave}
          disabled={saving || !selected || selected === current}
          className="rounded-md bg-[#f0a500] px-4 py-2 text-sm font-semibold text-black hover:opacity-90 disabled:opacity-40"
        >
          {saving ? "..." : saved ? "Saved ✓" : "Save"}
        </button>
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}

const flagCodes: Record<string, string> = {
  alg:"dz",arg:"ar",aus:"au",aut:"at",bel:"be",bih:"ba",bra:"br",can:"ca",
  civ:"ci",cod:"cd",col:"co",cpv:"cv",cro:"hr",cuw:"cw",cze:"cz",ecu:"ec",
  egy:"eg",eng:"gb",esp:"es",fra:"fr",ger:"de",gha:"gh",hai:"ht",irn:"ir",
  irq:"iq",jor:"jo",jpn:"jp",kor:"kr",ksa:"sa",mar:"ma",mex:"mx",ned:"nl",
  nor:"no",nzl:"nz",pan:"pa",par:"py",por:"pt",qat:"qa",rsa:"za",sco:"gb",
  sen:"sn",sui:"ch",swe:"se",tun:"tn",tur:"tr",ury:"uy",usa:"us",uzb:"uz",
};
function getFlagCode(id: string) { return flagCodes[id] ?? "un"; }
