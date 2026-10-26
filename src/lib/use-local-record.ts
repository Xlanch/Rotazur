"use client";

import { useEffect, useRef, useState } from "react";
import { LOCAL_RECORD_EVENT, readLocalRecord, writeLocalRecord } from "./local-record";

/** Writes are explicit and atomic. Mounting or switching trips never writes old state into a new key. */
export function useLocalRecord<T>(key: string, initial: () => T, validate: (value: unknown) => value is T, legacyKey?: string) {
  const options = useRef({ initial, validate });
  options.current = { initial, validate };
  const [state, setState] = useState({ key: "", value: initial(), legacyAvailable: false });
  const [error, setError] = useState("");
  useEffect(() => {
    const refresh = () => {
      try {
        const { initial, validate } = options.current;
        const value = readLocalRecord(key, initial, validate);
        const legacyAvailable = !!legacyKey && localStorage.getItem(key) === null && localStorage.getItem(legacyKey) !== null;
        setState({ key, value, legacyAvailable });
        setError("");
      } catch (err) {
        setState({ key, value: options.current.initial(), legacyAvailable: false });
        setError(err instanceof Error ? err.message : "Kayıt okunamadı.");
      }
    };
    const onStorage = (event: StorageEvent) => { if (event.key === key || event.key === legacyKey || event.key === null) refresh(); };
    const onLocal = (event: Event) => { if ((event as CustomEvent).detail === key) refresh(); };
    refresh();
    window.addEventListener("storage", onStorage);
    window.addEventListener(LOCAL_RECORD_EVENT, onLocal);
    return () => { window.removeEventListener("storage", onStorage); window.removeEventListener(LOCAL_RECORD_EVENT, onLocal); };
  }, [key, legacyKey]);

  const update = (change: (previous: T) => T): boolean => {
    try {
      const { initial, validate } = options.current;
      const next = change(readLocalRecord(key, initial, validate));
      if (!validate(next)) throw new Error("Değişiklik geçersiz. İsimleri ve tutarları kontrol edin.");
      writeLocalRecord(key, next);
      setState({ key, value: next, legacyAvailable: false });
      setError("");
      return true;
    } catch (err) { setError(err instanceof Error ? err.message : "Değişiklik kaydedilemedi."); return false; }
  };
  const importLegacy = () => update((current) => {
    if (!legacyKey || localStorage.getItem(key) !== null) return current;
    return readLocalRecord(legacyKey, options.current.initial, options.current.validate);
  });
  return { value: state.key === key ? state.value : initial(), update, error,
    legacyAvailable: state.key === key && state.legacyAvailable, importLegacy };
}
