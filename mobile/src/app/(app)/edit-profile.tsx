import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { router } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { Camera } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { Avatar, Button, Screen, Skeleton, Text, TextField, useTheme, useToast } from "@/design-system";
import { fieldErrors, type MessageKey } from "@/features/auth/domain/validation";
import { ProfileError } from "@/features/profile/data/profileRepository";
import { profileFormSchema, profileLabel, type Profile } from "@/features/profile/domain/profile";
import { useMyProfile, useUpdateProfile, useUploadAvatar } from "@/features/profile/presentation/useProfile";
import { UsernameField } from "@/features/profile/presentation/UsernameField";
import { useUsernameCheck } from "@/features/profile/presentation/useUsernameCheck";
import { StackTopBar } from "@/features/navigation/TopBar";

export default function EditProfileScreen() {
  const { t } = useTranslation();
  const { data: profile } = useMyProfile();
  return (
    <Screen header={<StackTopBar title={t("profile.editTitle")} />}>
      {profile ? (
        <ProfileForm profile={profile} />
      ) : (
        <View style={styles.skeleton}>
          <Skeleton width={96} height={96} rounded={48} />
          <Skeleton height={50} />
          <Skeleton height={50} />
        </View>
      )}
    </Screen>
  );
}

function ProfileForm({ profile }: { profile: Profile }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const toast = useToast();
  const update = useUpdateProfile();
  const upload = useUploadAvatar();

  const [username, setUsername] = useState(profile.username ?? "");
  const [displayName, setDisplayName] = useState(profile.name ?? "");
  const [bio, setBio] = useState(profile.bio ?? "");
  const [city, setCity] = useState(profile.city ?? "");
  const [errors, setErrors] = useState<Record<string, MessageKey>>({});
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const check = useUsernameCheck(username, profile.username);
  const name = profileLabel(profile);

  async function pickPhoto() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return toast.info(t("profile.photoPermission"));
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled || !result.assets[0]) return;
    upload.mutate(result.assets[0], {
      onSuccess: () => toast.success(t("profile.saved")),
      onError: (e) => toast.error(t(e instanceof ProfileError ? e.key : "profile.photoError")),
    });
  }

  function save() {
    setUsernameError(null);
    const parsed = profileFormSchema.safeParse({ username, displayName, bio, city });
    if (!parsed.success) return setErrors(fieldErrors(parsed.error));
    setErrors({});
    if (check.state === "taken") return;
    update.mutate(parsed.data, {
      onSuccess: () => {
        toast.success(t("profile.saved"));
        router.back();
      },
      onError: (e) => {
        if (e instanceof ProfileError && e.key === "validation.username.taken") setUsernameError(t(e.key));
        else toast.error(t("common.errorGeneric"));
      },
    });
  }

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t("profile.changePhoto")}
        onPress={pickPhoto}
        disabled={upload.isPending}
        style={styles.photo}
      >
        <View>
          <Avatar uri={profile.avatar_url} name={name} size={96} ring />
          <View style={[styles.cameraBadge, { backgroundColor: colors.brand, borderColor: colors.bg }]}>
            <Camera size={16} color={colors.onBrand} />
          </View>
        </View>
        <Text variant="bodyStrong" color="brandText">
          {upload.isPending ? t("common.loading") : t("profile.changePhoto")}
        </Text>
      </Pressable>

      <TextField
        label={t("fields.displayName")}
        value={displayName}
        onChangeText={setDisplayName}
        error={errors.displayName ? t(errors.displayName) : null}
        autoCapitalize="words"
        maxLength={60}
      />
      <UsernameField
        value={username}
        onChangeText={(v) => {
          setUsername(v);
          setUsernameError(null);
        }}
        check={check}
        submitError={usernameError ?? (errors.username ? t(errors.username) : null)}
      />
      <TextField
        label={t("fields.city")}
        value={city}
        onChangeText={setCity}
        error={errors.city ? t(errors.city) : null}
        autoComplete="postal-address-locality"
        maxLength={80}
      />
      <TextField
        label={t("fields.bio")}
        value={bio}
        onChangeText={setBio}
        error={errors.bio ? t(errors.bio) : null}
        hint={`${bio.length}/280`}
        placeholder={t("profile.bioPlaceholder")}
        multiline
        maxLength={280}
      />
      <Button
        size="lg"
        block
        label={t("common.save")}
        loading={update.isPending}
        disabled={check.state === "checking"}
        onPress={save}
      />
    </>
  );
}

const styles = StyleSheet.create({
  skeleton: { gap: 16, alignItems: "center" },
  photo: { alignItems: "center", gap: 8, alignSelf: "center", padding: 4 },
  cameraBadge: {
    position: "absolute",
    right: -2,
    bottom: -2,
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 3,
    alignItems: "center",
    justifyContent: "center",
  },
});
