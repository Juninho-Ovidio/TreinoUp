import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useUserId } from "@/features/auth/presentation/useSession";
import {
  completeOnboarding,
  getOrCreateMyProfile,
  updateProfile,
  updateUnits,
  uploadAvatar,
  type PickedImage,
} from "../data/profileRepository";
import type { OnboardingInput, Profile, ProfileFormInput, Units } from "../domain/profile";

export const profileKey = (userId: string | null) => ["profile", userId] as const;

export function useMyProfile() {
  const userId = useUserId();
  return useQuery({
    queryKey: profileKey(userId),
    queryFn: () => getOrCreateMyProfile(userId!),
    enabled: !!userId,
  });
}

/** Mutação que grava o perfil retornado direto no cache (sem nova busca). */
function useProfileMutation<TInput>(fn: (userId: string, input: TInput) => Promise<Profile>) {
  const userId = useUserId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: TInput) => {
      if (!userId) throw new Error("sem sessão");
      return fn(userId, input);
    },
    onSuccess: (profile) => qc.setQueryData(profileKey(profile.id), profile),
  });
}

export const useCompleteOnboarding = () => useProfileMutation<OnboardingInput>(completeOnboarding);
export const useUpdateProfile = () => useProfileMutation<ProfileFormInput>(updateProfile);
export const useUpdateUnits = () => useProfileMutation<Units>(updateUnits);
export const useUploadAvatar = () => useProfileMutation<PickedImage>(uploadAvatar);
