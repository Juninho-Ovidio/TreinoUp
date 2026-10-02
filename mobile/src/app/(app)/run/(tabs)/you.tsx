import { StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { MapPin } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { Avatar, Button, Card, SectionTitle, Skeleton, Text, useTheme } from "@/design-system";
import { profileLabel } from "@/features/profile/domain/profile";
import { useMyProfile } from "@/features/profile/presentation/useProfile";
import { TabScreen } from "@/features/navigation/TabScreen";
import { LocalActivityList } from "@/features/record/presentation/LocalActivityList";

export default function YouScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { data: profile, isPending } = useMyProfile();
  const name = profileLabel(profile);

  return (
    <TabScreen title={t("you.title")}>
      <Card style={styles.profile}>
        {isPending || !profile ? (
          <View style={styles.row}>
            <Skeleton width={72} height={72} rounded={36} />
            <View style={styles.info}>
              <Skeleton width="60%" height={20} />
              <Skeleton width="40%" height={14} />
            </View>
          </View>
        ) : (
          <>
            <View style={styles.row}>
              <Avatar uri={profile.avatar_url} name={name} size={72} ring accessibilityLabel={t("profile.avatarLabel", { name })} />
              <View style={styles.info}>
                <Text variant="heading" numberOfLines={1} accessibilityRole="header">
                  {profile.name ?? name}
                </Text>
                {profile.username ? (
                  <Text variant="body" color="muted" numberOfLines={1}>
                    @{profile.username}
                  </Text>
                ) : null}
                {profile.city ? (
                  <View style={styles.city}>
                    <MapPin size={14} color={colors.muted} />
                    <Text variant="caption" color="muted" numberOfLines={1}>
                      {profile.city}
                    </Text>
                  </View>
                ) : null}
              </View>
            </View>
            {profile.bio ? <Text variant="body">{profile.bio}</Text> : null}
            <Button variant="secondary" block label={t("you.editProfile")} onPress={() => router.push("/edit-profile")} />
          </>
        )}
      </Card>

      <SectionTitle>{t("you.activitiesTitle")}</SectionTitle>
      <LocalActivityList />
    </TabScreen>
  );
}

const styles = StyleSheet.create({
  profile: { gap: 16 },
  row: { flexDirection: "row", alignItems: "center", gap: 16 },
  info: { flex: 1, gap: 4 },
  city: { flexDirection: "row", alignItems: "center", gap: 4 },
});
