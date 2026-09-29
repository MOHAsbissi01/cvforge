import { blankProfile, type CandidateProfile } from "../models/profile";
import { parseProfile } from "./validation";

export const STORAGE_KEY = "cvforge.profile.v1";
export function loadProfile(
  storage: Pick<Storage, "getItem"> = localStorage,
): CandidateProfile {
  try {
    const raw = storage.getItem(STORAGE_KEY);
    return raw
      ? (parseProfile(JSON.parse(raw)) ?? blankProfile())
      : blankProfile();
  } catch {
    return blankProfile();
  }
}
export function saveProfile(
  profile: CandidateProfile,
  storage: Pick<Storage, "setItem"> = localStorage,
): boolean {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(profile));
    return true;
  } catch {
    return false;
  }
}
export function clearProfile(
  storage: Pick<Storage, "removeItem"> = localStorage,
): void {
  try {
    storage.removeItem(STORAGE_KEY);
  } catch {
    // Browsers can disable storage; the in-memory draft still clears.
  }
}
