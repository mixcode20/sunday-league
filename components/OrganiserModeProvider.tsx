"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import Modal from "@/components/Modal";

type OrganiserContextValue = {
  isUnlocked: boolean;
  organiserPin: string;
  unlockedAt: number | null;
  expiresAt: number | null;
  requestUnlock: () => void;
  lock: () => void;
};

const OrganiserContext = createContext<OrganiserContextValue | null>(null);

const SESSION_KEY = "organiserModeSession";
const LOCK_TIMEOUT_MS = 15 * 60 * 1000;

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
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [organiserPin, setOrganiserPin] = useState("");
  const [unlockedAt, setUnlockedAt] = useState<number | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [message, setMessage] = useState("");

  const expiresAt = useMemo(
    () => (unlockedAt ? unlockedAt + LOCK_TIMEOUT_MS : null),
    [unlockedAt]
  );

  const lock = useCallback(() => {
    setIsUnlocked(false);
    setOrganiserPin("");
    setUnlockedAt(null);
    setModalOpen(false);
    if (typeof window !== "undefined") {
      sessionStorage.removeItem(SESSION_KEY);
    }
  }, []);

  const requestUnlock = useCallback(() => {
    if (isUnlocked) return;
    setModalOpen(true);
    setPinInput("");
    setMessage("");
  }, [isUnlocked]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = sessionStorage.getItem(SESSION_KEY);
    if (!stored) return;
    try {
      const parsed = JSON.parse(stored) as { pin?: string; unlockedAt?: number };
      if (typeof parsed.unlockedAt !== "number" || typeof parsed.pin !== "string") {
        sessionStorage.removeItem(SESSION_KEY);
        return;
      }
      const expiry = parsed.unlockedAt + LOCK_TIMEOUT_MS;
      if (Date.now() >= expiry) {
        sessionStorage.removeItem(SESSION_KEY);
        return;
      }
      setIsUnlocked(true);
      setOrganiserPin(parsed.pin);
      setUnlockedAt(parsed.unlockedAt);
    } catch {
      sessionStorage.removeItem(SESSION_KEY);
    }
  }, []);

  useEffect(() => {
    if (!isUnlocked || !unlockedAt) return;
    const remaining = unlockedAt + LOCK_TIMEOUT_MS - Date.now();
    if (remaining <= 0) {
      lock();
      return;
    }
    const timeoutId = window.setTimeout(() => {
      lock();
    }, remaining);
    return () => window.clearTimeout(timeoutId);
  }, [isUnlocked, unlockedAt, lock]);

  const verifyPin = async () => {
    setMessage("");
    const response = await fetch("/api/organiser/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin: pinInput }),
    });
    const data = await response.json();
    if (!response.ok || !data.ok) {
      setMessage(data?.error ?? "Incorrect PIN.");
      return;
    }
    const unlockedTime = Date.now();
    setIsUnlocked(true);
    setOrganiserPin(pinInput);
    setUnlockedAt(unlockedTime);
    setModalOpen(false);
    if (typeof window !== "undefined") {
      sessionStorage.setItem(
        SESSION_KEY,
        JSON.stringify({ pin: pinInput, unlockedAt: unlockedTime })
      );
    }
  };

  return (
    <OrganiserContext.Provider
      value={{ isUnlocked, organiserPin, unlockedAt, expiresAt, requestUnlock, lock }}
    >
      {children}
      <Modal
        isOpen={modalOpen}
        title="Unlock organiser mode"
        onClose={() => setModalOpen(false)}
        position="top"
      >
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
          Unlock
        </button>
        {message ? (
          <p className="mt-2 text-sm text-rose-500">{message}</p>
        ) : null}
      </Modal>
    </OrganiserContext.Provider>
  );
}
