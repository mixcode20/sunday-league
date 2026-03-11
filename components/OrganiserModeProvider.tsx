"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
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
  const [session, setSession] = useState<{
    isUnlocked: boolean;
    organiserPin: string;
    unlockedAt: number | null;
  }>(() => {
    if (typeof window === "undefined") {
      return { isUnlocked: false, organiserPin: "", unlockedAt: null };
    }
    const stored = sessionStorage.getItem(SESSION_KEY);
    if (!stored) {
      return { isUnlocked: false, organiserPin: "", unlockedAt: null };
    }
    try {
      const parsed = JSON.parse(stored) as { pin?: string; unlockedAt?: number };
      if (typeof parsed.unlockedAt !== "number" || typeof parsed.pin !== "string") {
        sessionStorage.removeItem(SESSION_KEY);
        return { isUnlocked: false, organiserPin: "", unlockedAt: null };
      }
      const expiry = parsed.unlockedAt + LOCK_TIMEOUT_MS;
      if (Date.now() >= expiry) {
        sessionStorage.removeItem(SESSION_KEY);
        return { isUnlocked: false, organiserPin: "", unlockedAt: null };
      }
      return {
        isUnlocked: true,
        organiserPin: parsed.pin,
        unlockedAt: parsed.unlockedAt,
      };
    } catch {
      sessionStorage.removeItem(SESSION_KEY);
      return { isUnlocked: false, organiserPin: "", unlockedAt: null };
    }
  });
  const [modalOpen, setModalOpen] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [message, setMessage] = useState("");
  const pinInputRef = useRef<HTMLInputElement | null>(null);
  const { isUnlocked, organiserPin, unlockedAt } = session;

  const expiresAt = useMemo(
    () => (unlockedAt ? unlockedAt + LOCK_TIMEOUT_MS : null),
    [unlockedAt]
  );

  const lock = useCallback(() => {
    setSession({ isUnlocked: false, organiserPin: "", unlockedAt: null });
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
    if (!isUnlocked || !unlockedAt) return;
    const remaining = Math.max(unlockedAt + LOCK_TIMEOUT_MS - Date.now(), 0);
    const timeoutId = window.setTimeout(() => {
      lock();
    }, remaining);
    return () => window.clearTimeout(timeoutId);
  }, [isUnlocked, unlockedAt, lock]);

  useEffect(() => {
    if (!modalOpen) return;
    const frameId = window.requestAnimationFrame(() => {
      pinInputRef.current?.focus();
      pinInputRef.current?.select();
    });
    return () => window.cancelAnimationFrame(frameId);
  }, [modalOpen]);

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
    setSession({
      isUnlocked: true,
      organiserPin: pinInput,
      unlockedAt: unlockedTime,
    });
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
        <label className="ui-label">PIN</label>
        <input
          ref={pinInputRef}
          type="password"
          value={pinInput}
          onChange={(event) => setPinInput(event.target.value)}
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete="one-time-code"
          className="ui-input mt-2"
          placeholder="****"
          autoFocus
        />
        <button
          type="button"
          onClick={verifyPin}
          className="ui-btn ui-btn-primary mt-4 w-full"
        >
          Unlock
        </button>
        {message ? (
          <p className="ui-banner ui-banner-danger mt-2">{message}</p>
        ) : null}
      </Modal>
    </OrganiserContext.Provider>
  );
}
