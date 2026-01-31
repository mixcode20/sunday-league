"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Modal from "@/components/Modal";
import SettingsButton from "@/components/SettingsButton";
import { getNextSundayISO } from "@/lib/utils";

export default function CreateGameweek() {
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);
  const [pin, setPin] = useState("");
  const [organiserPin, setOrganiserPin] = useState("");
  const [date, setDate] = useState(getNextSundayISO());
  const [time, setTime] = useState("9:15am");
  const [location, setLocation] = useState("MH");
  const [message, setMessage] = useState("");

  const openModal = () => {
    setModalOpen(true);
    setPin("");
    setDate(getNextSundayISO());
    setTime("9:15am");
    setLocation("MH");
    setMessage("");
  };

  const verifyPin = async () => {
    setMessage("");
    const response = await fetch("/api/organiser/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin }),
    });
    const data = await response.json();
    if (!response.ok || !data.ok) {
      setMessage("Incorrect PIN.");
      return;
    }
    setOrganiserPin(pin);
    setModalOpen(false);
  };

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
      <SettingsButton onClick={openModal} label="Enter PIN" />
      <Modal isOpen={modalOpen} title="Enter PIN" onClose={() => setModalOpen(false)}>
        <label className="text-sm font-medium text-slate-600">PIN</label>
        <input
          type="password"
          value={pin}
          onChange={(event) => setPin(event.target.value)}
          className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-base"
          placeholder="****"
        />
        <button
          type="button"
          onClick={verifyPin}
          className="mt-4 w-full rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
        >
          Submit
        </button>
        {message ? (
          <p className="mt-2 text-sm text-rose-500">{message}</p>
        ) : null}
      </Modal>

      {organiserPin ? (
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
