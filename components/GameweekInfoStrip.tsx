"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { formatGameweekDate } from "@/lib/utils";
import { buildEntryPositionMap, getSlotCounts } from "@/lib/slots";
import { useOrganiserMode } from "@/components/OrganiserModeProvider";
import Modal from "@/components/Modal";

type GameweekInfoStripProps = {
  gameweekId?: string | null;
  gameDate?: string | null;
  time?: string | null;
  location?: string | null;
  mainCount?: number;
  subsCount?: number;
  onRefresh?: () => void;
};

export default function GameweekInfoStrip({
  gameweekId,
  gameDate,
  time,
  location,
  mainCount = 0,
  subsCount = 0,
  onRefresh,
}: GameweekInfoStripProps) {
  const router = useRouter();
  const { isUnlocked, organiserPin } = useOrganiserMode();
  const [counts, setCounts] = useState({ main: mainCount, subs: subsCount });
  const [editOpen, setEditOpen] = useState(false);
  const [editDate, setEditDate] = useState(gameDate ?? "");
  const [editTime, setEditTime] = useState("");
  const [editLocation, setEditLocation] = useState(location ?? "");
  const [message, setMessage] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState("");

  useEffect(() => {
    setCounts({ main: mainCount, subs: subsCount });
  }, [mainCount, subsCount]);

  useEffect(() => {
    setEditDate(gameDate ?? "");
    setEditTime("");
    setEditLocation(location ?? "");
  }, [gameDate, location]);

  useEffect(() => {
    if (!gameweekId) return;
    const interval = setInterval(async () => {
      const response = await fetch(`/api/gameweeks/${gameweekId}/entries`);
      if (!response.ok) return;
      const data = await response.json();
      if (Array.isArray(data.entries)) {
        const { positionMap } = buildEntryPositionMap(data.entries);
        const { main, subs } = getSlotCounts(positionMap);
        setCounts({
          main,
          subs,
        });
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [gameweekId]);

  if (!gameDate) {
    return (
      <div className="mt-[5px] w-full border-b border-slate-200 bg-white">
        <div className="mx-auto w-full max-w-5xl px-4 py-[5px] text-sm text-slate-500">
          No gameweek scheduled yet.
        </div>
      </div>
    );
  }

  const formatTimeFromInput = (value: string) => {
    if (!value) return "";
    const [hoursRaw, minutesRaw] = value.split(":");
    if (!hoursRaw || !minutesRaw) return "";
    const hoursNumber = Number(hoursRaw);
    if (Number.isNaN(hoursNumber)) return "";
    const period = hoursNumber >= 12 ? "pm" : "am";
    const hours12 = hoursNumber % 12 || 12;
    const minutes = minutesRaw.padStart(2, "0").slice(0, 2);
    return `${hours12}:${minutes}${period}`;
  };

  const timeForInput = useMemo(() => {
    if (!time) return "";
    const match = time.trim().match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)$/i);
    if (!match) return "";
    const hours = Number(match[1]);
    const minutes = Number(match[2] ?? "0");
    if (Number.isNaN(hours) || Number.isNaN(minutes)) return "";
    let adjusted = hours % 12;
    if (match[3].toLowerCase() === "pm") {
      adjusted += 12;
    }
    const hoursStr = String(adjusted).padStart(2, "0");
    const minutesStr = String(minutes).padStart(2, "0");
    return `${hoursStr}:${minutesStr}`;
  }, [time]);

  const openEdit = () => {
    setMessage("");
    setDeleteConfirm("");
    setEditDate(gameDate ?? "");
    setEditTime(timeForInput);
    setEditLocation(location ?? "");
    setEditOpen(true);
  };

  const handleSave = async () => {
    if (!gameweekId || !organiserPin) return;
    if (!editDate) {
      setMessage("Date is required.");
      return;
    }
    setMessage("");
    const formattedTime = formatTimeFromInput(editTime) || (time ?? "9:15am");
    const response = await fetch(`/api/gameweeks/${gameweekId}/update`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date: editDate,
        time: formattedTime,
        location: editLocation,
        pin: organiserPin,
      }),
    });
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      const errorMessage =
        data?.error?.message ?? data?.error ?? "Failed to update gameweek.";
      setMessage(errorMessage);
      return;
    }
    setEditOpen(false);
    onRefresh?.();
    router.refresh();
  };

  const handleDelete = async () => {
    if (!gameweekId || !organiserPin) return;
    if (deleteConfirm !== "DELETE") {
      setMessage("Type DELETE to confirm.");
      return;
    }
    setMessage("");
    const response = await fetch(`/api/gameweeks/${gameweekId}/delete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin: organiserPin }),
    });
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      const errorMessage =
        data?.error?.message ?? data?.error ?? "Failed to delete gameweek.";
      setMessage(errorMessage);
      return;
    }
    setEditOpen(false);
    onRefresh?.();
    router.refresh();
  };

  const displayLocation =
    location === "MH" || !location ? "Mill Hill" : location;

  return (
    <div className="mt-[5px] w-full border-b border-slate-200 bg-white">
      <div className="mx-auto w-full max-w-5xl px-4 py-[5px] text-sm text-slate-600">
        <div className="flex items-center justify-between">
          <div className="font-semibold text-slate-900">
            {formatGameweekDate(gameDate)}
          </div>
          {isUnlocked ? (
            <button
              type="button"
              onClick={openEdit}
              className="rounded-full border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-600"
              disabled={!gameweekId}
            >
              Edit
            </button>
          ) : null}
        </div>
        <div className="flex items-center justify-between">
          <div>
            {time ?? "9:15am"} · {displayLocation}
          </div>
          <div>
            {counts.main}/14 · Subs: {counts.subs}
          </div>
        </div>
      </div>

      <Modal
        isOpen={editOpen}
        title="Edit gameweek"
        onClose={() => setEditOpen(false)}
        position="top"
      >
        <label className="text-sm font-medium text-slate-600">Date</label>
        <input
          type="date"
          value={editDate}
          onChange={(event) => setEditDate(event.target.value)}
          className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-base"
          autoFocus
        />
        <label className="mt-3 text-sm font-medium text-slate-600">Time</label>
        <input
          type="time"
          value={editTime}
          onChange={(event) => setEditTime(event.target.value)}
          className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-base"
        />
        <label className="mt-3 text-sm font-medium text-slate-600">
          Location
        </label>
        <input
          type="text"
          value={editLocation}
          onChange={(event) => setEditLocation(event.target.value)}
          className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-base"
        />
        <button
          type="button"
          onClick={handleSave}
          className="mt-4 w-full rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
        >
          Save changes
        </button>

        <div className="mt-6 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
          <p className="font-semibold text-rose-700">Delete gameweek</p>
          <p className="mt-1 text-xs text-rose-600">
            Type DELETE to remove {formatGameweekDate(gameDate)} and all signups.
          </p>
          <input
            type="text"
            value={deleteConfirm}
            onChange={(event) => setDeleteConfirm(event.target.value)}
            className="mt-2 w-full rounded-xl border border-rose-200 px-3 py-2 text-base text-rose-700"
            placeholder="DELETE"
          />
          <button
            type="button"
            onClick={handleDelete}
            className="mt-3 w-full rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            disabled={deleteConfirm !== "DELETE"}
          >
            Delete gameweek
          </button>
        </div>

        {message ? (
          <p className="mt-2 text-sm text-rose-500">{message}</p>
        ) : null}
      </Modal>
    </div>
  );
}
