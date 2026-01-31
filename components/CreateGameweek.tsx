"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getNextSundayISO } from "@/lib/utils";
import { useOrganiserMode } from "@/components/OrganiserModeProvider";

export default function CreateGameweek() {
  const router = useRouter();
  const { isOrganiser, organiserPin } = useOrganiserMode();
  const [date, setDate] = useState(getNextSundayISO());
  const [time, setTime] = useState("9:15am");
  const [location, setLocation] = useState("MH");
  const [message, setMessage] = useState("");

  const createGameweek = async () => {
    setMessage("");
    const response = await fetch("/api/gameweeks/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date,
        time,
        location,
        pin: organiserPin,
      }),
    });
    const data = await response.json();
    if (!response.ok) {
      setMessage(data.error ?? "Failed to create gameweek.");
      return;
    }
    router.refresh();
  };

  return (
    <>
      {isOrganiser ? (
        <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-xs uppercase tracking-wide text-slate-400">
            Organiser controls
          </div>
          <div className="mt-3 grid gap-3 md:grid-cols-3">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Date
              </label>
              <input
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Time
              </label>
              <input
                type="text"
                value={time}
                onChange={(event) => setTime(event.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                placeholder="9:15am"
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Location
              </label>
              <input
                type="text"
                value={location}
                className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                placeholder="MH"
                readOnly
              />
            </div>
          </div>
          <button
            type="button"
            onClick={createGameweek}
            className="mt-4 w-full rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
          >
            Create gameweek
          </button>
          {message ? (
            <p className="mt-2 text-sm text-rose-500">{message}</p>
          ) : null}
        </div>
      ) : null}
    </>
  );
}
