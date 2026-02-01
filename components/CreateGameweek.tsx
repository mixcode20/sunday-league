"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getNextSundayISO } from "@/lib/utils";
import { useOrganiserMode } from "@/components/OrganiserModeProvider";
import Modal from "@/components/Modal";

export default function CreateGameweek() {
  const router = useRouter();
  const { isUnlocked, organiserPin } = useOrganiserMode();
  const [date, setDate] = useState(getNextSundayISO());
  const [time, setTime] = useState("9:15am");
  const [location, setLocation] = useState("MH");
  const [message, setMessage] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  const openModal = () => {
    setMessage("");
    setIsOpen(true);
  };

  const createGameweek = async () => {
    if (!organiserPin) return;
    if (!date) {
      setMessage("Date is required.");
      return;
    }
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
    setIsOpen(false);
    router.refresh();
  };

  if (!isUnlocked) return null;

  return (
    <>
      <div className="w-full">
        <button
          type="button"
          onClick={openModal}
          className="w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-sm"
        >
          Create new game
        </button>
      </div>
      <Modal
        isOpen={isOpen}
        title="Create new game"
        onClose={() => setIsOpen(false)}
        position="top"
      >
        <label className="text-sm font-medium text-slate-600">Date</label>
        <input
          type="date"
          value={date}
          onChange={(event) => setDate(event.target.value)}
          className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-base"
        />
        <label className="mt-3 text-sm font-medium text-slate-600">Time</label>
        <input
          type="text"
          value={time}
          onChange={(event) => setTime(event.target.value)}
          className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-base"
          placeholder="9:15am"
        />
        <label className="mt-3 text-sm font-medium text-slate-600">
          Location
        </label>
        <input
          type="text"
          value={location}
          onChange={(event) => setLocation(event.target.value)}
          className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-base text-slate-700"
          placeholder="MH"
        />
        <button
          type="button"
          onClick={createGameweek}
          className="mt-4 w-full rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
        >
          Create game
        </button>
        {message ? (
          <p className="mt-2 text-sm text-rose-500">{message}</p>
        ) : null}
      </Modal>
    </>
  );
}
