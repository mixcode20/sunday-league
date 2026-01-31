"use client";

import { createContext, useContext, useState } from "react";
import Modal from "@/components/Modal";

type OrganiserContextValue = {
  isOrganiser: boolean;
  organiserPin: string;
  requestEnable: () => void;
  disable: () => void;
};

const OrganiserContext = createContext<OrganiserContextValue | null>(null);

export const useOrganiserMode = () => {
  const context = useContext(OrganiserContext);
  if (!context) {
    throw new Error("OrganiserModeProvider is missing.");
  }
  return context;
};

export default function OrganiserModeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isOrganiser, setIsOrganiser] = useState(false);
  const [organiserPin, setOrganiserPin] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [message, setMessage] = useState("");

  const requestEnable = () => {
    if (isOrganiser) return;
    setModalOpen(true);
    setPinInput("");
    setMessage("");
  };

  const disable = () => {
    setIsOrganiser(false);
    setOrganiserPin("");
  };

  const verifyPin = async () => {
    setMessage("");
    const response = await fetch("/api/organiser/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin: pinInput }),
    });
    const data = await response.json();
    if (!response.ok || !data.ok) {
      setMessage("Incorrect PIN.");
      return;
    }
    setIsOrganiser(true);
    setOrganiserPin(pinInput);
    setModalOpen(false);
  };

  return (
    <OrganiserContext.Provider
      value={{ isOrganiser, organiserPin, requestEnable, disable }}
    >
      {children}
      <Modal isOpen={modalOpen} title="Enter PIN" onClose={() => setModalOpen(false)}>
        <label className="text-sm font-medium text-slate-600">PIN</label>
        <input
          type="password"
          value={pinInput}
          onChange={(event) => setPinInput(event.target.value)}
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
    </OrganiserContext.Provider>
  );
}
