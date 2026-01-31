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
  const [date, setDate] = useState(getNextSundayISO());
  const [message, setMessage] = useState("");
  const [unlocked, setUnlocked] = useState(false);

  const openModal = () => {
    setModalOpen(true);
    setPin("");
    setDate(getNextSundayISO());
    setMessage("");
    setUnlocked(false);
  };

  const unlockMenu = () => {
    if (!pin.trim()) {
      setMessage("Enter the organiser PIN to continue.");
      return;
    }
    setMessage("");
    setUnlocked(true);
  };

  const createGameweek = async () => {
    setMessage("");
    const response = await fetch("/api/gameweeks/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date, pin }),
    });
    const data = await response.json();
    if (!response.ok) {
      setMessage(data.error ?? "Failed to create gameweek.");
      return;
    }
    setModalOpen(false);
    router.refresh();
  };

  return (
    <>
      <SettingsButton onClick={openModal} label="Organiser" />
      <Modal
        isOpen={modalOpen}
        title="Create new gameweek"
        onClose={() => setModalOpen(false)}
      >
        {!unlocked ? (
          <>
            <label className="text-sm font-medium text-slate-600">
              Organiser PIN
            </label>
            <input
              type="password"
              value={pin}
              onChange={(event) => setPin(event.target.value)}
              className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-base"
            />
            <button
              type="button"
              onClick={unlockMenu}
              className="mt-4 w-full rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
            >
              Unlock menu
            </button>
          </>
        ) : (
          <div className="space-y-3">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs uppercase tracking-wide text-slate-500">
              Organiser menu
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-3">
              <label className="text-sm font-medium text-slate-600">
                Gameweek date
              </label>
              <input
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-base"
              />
              <button
                type="button"
                onClick={createGameweek}
                className="mt-4 w-full rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
              >
                Create gameweek
              </button>
            </div>
          </div>
        )}
        <p className="mt-2 text-xs text-slate-500">
          PIN is required every time settings are opened.
        </p>
        {message ? (
          <p className="mt-2 text-sm text-rose-500">{message}</p>
        ) : null}
      </Modal>
    </>
  );
}
