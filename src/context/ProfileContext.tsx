/* oxlint-disable react/only-export-components -- Provider and hook share one private context. */
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  blankProfile,
  demoProfile,
  type CandidateProfile,
} from "../models/profile";
import { clearProfile, loadProfile, saveProfile } from "../services/storage";

type ContextValue = {
  profile: CandidateProfile;
  update: (fn: (draft: CandidateProfile) => void) => void;
  replace: (value: CandidateProfile) => void;
  clear: () => void;
  demo: () => void;
  saved: boolean;
  hasDraft: boolean;
};
const Context = createContext<ContextValue | null>(null);
export function ProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState(loadProfile);
  const [saved, setSaved] = useState(true);
  const [hasDraft, setHasDraft] = useState(() => {
    try {
      return Boolean(localStorage.getItem("cvforge.profile.v1"));
    } catch {
      return false;
    }
  });
  const shouldSave = useRef(false);
  useEffect(() => {
    if (!shouldSave.current) return;
    setSaved(false);
    const timer = window.setTimeout(() => {
      setSaved(saveProfile(profile));
      setHasDraft(true);
    }, 400);
    return () => window.clearTimeout(timer);
  }, [profile]);
  const update = (fn: (draft: CandidateProfile) => void) => {
    shouldSave.current = true;
    setProfile((current) => {
      const next = structuredClone(current);
      fn(next);
      return next;
    });
  };
  const replace = (value: CandidateProfile) => {
    shouldSave.current = true;
    setHasDraft(true);
    setProfile(value);
  };
  const clear = () => {
    shouldSave.current = false;
    clearProfile();
    setProfile(blankProfile());
    setHasDraft(false);
    setSaved(true);
  };
  const demo = () => {
    shouldSave.current = true;
    setHasDraft(true);
    setProfile(demoProfile());
  };
  return (
    <Context.Provider
      value={{ profile, update, replace, clear, demo, saved, hasDraft }}
    >
      {children}
    </Context.Provider>
  );
}
export function useProfile() {
  const value = useContext(Context);
  if (!value) throw new Error("ProfileProvider missing");
  return value;
}
