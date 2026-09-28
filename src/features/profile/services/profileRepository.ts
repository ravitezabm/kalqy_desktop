import { PROFILES } from "../../../types/profile";
import type { Profile } from "../../../types/profile";

export interface ProfileRepository {
  listProfiles(): Promise<Profile[]>;
  getProfile(profileId: string): Promise<Profile | null>;
}

/**
 * Reads the same PROFILES source the profile-selection orbit uses, so the
 * avatar/name mapping exists in exactly one place. Swap for an
 * ApiProfileRepository later without touching callers.
 */
export const localProfileRepository: ProfileRepository = {
  async listProfiles() {
    return PROFILES;
  },
  async getProfile(profileId) {
    return PROFILES.find((profile) => profile.id === profileId) ?? null;
  },
};

export const profileRepository: ProfileRepository = localProfileRepository;
