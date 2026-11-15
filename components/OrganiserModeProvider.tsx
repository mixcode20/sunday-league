"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
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
const SESSION_EVENT = "organiser-mode-session-change";

type OrganiserSession = {
  isUnlocked: boolean;
  organiserPin: string;
  unlockedAt: number | null;
};

const LOCKED: OrganiserSession = {
  isUnlocked: false,
  organiserPin: "",
  unlockedAt: null,
};

// sessionStorage is an external store. Reading it during the first render would
// make the client disagree with the server (which always renders locked), and
// `isUnlocked` gates rendered output across the app. useSyncExternalStore uses
// the server snapshot for the hydration render, then re-renders with the real
// value, so the markup always matches.
const subscribeToSession = (onStoreChange: () => void) => {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener(SESSION_EVENT, onStoreChange);
  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(SESSION_EVENT, onStoreChange);
  };
};

const getSessionSnapshot = () => window.sessionStorage.getItem(SESSION_KEY);
const getServerSessionSnapshot = () => null;

const writeStoredSession = (value: string | null) => {
  if (value === null) window.sessionStorage.removeItem(SESSION_KEY);
  else window.sessionStorage.setItem(SESSION_KEY, value);
  window.dispatchEvent(new Event(SESSION_EVENT));
};

const parseStoredSession = (raw: string | null): OrganiserSession => {
  if (!raw) return LOCKED;
  try {
    const parsed = JSON.parse(raw) as { pin?: string; unlockedAt?: number };
    if (typeof parsed.unlockedAt !== "number" || typeof parsed.pin !== "string") {
      return LOCKED;
    }
    if (Date.now() >= parsed.unlockedAt + LOCK_TIMEOUT_MS) return LOCKED;
    return {
      isUnlocked: true,
      organiserPin: parsed.pin,
      unlockedAt: parsed.unlockedAt,
    };
  } catch {
    return LOCKED;
  }
};

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
  const storedSession = useSyncExternalStore(
    subscribeToSession,
    getSessionSnapshot,
    getServerSessionSnapshot
  );
  const session = useMemo(() => parseStoredSession(storedSession), [storedSession]);
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
    writeStoredSession(null);
    setModalOpen(false);
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
    writeStoredSession(
      JSON.stringify({ pin: pinInput, unlockedAt: unlockedTime })
    );
    setModalOpen(false);
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
