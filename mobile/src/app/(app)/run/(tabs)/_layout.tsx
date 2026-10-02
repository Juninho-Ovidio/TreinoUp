import { StyleSheet } from "react-native";
import { TabList, TabSlot, Tabs, TabTrigger } from "expo-router/ui";
import { House, Map, Play, UserRound, Users } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { Dock, DockButton, DockRecordButton } from "@/features/navigation/Dock";

/** As cinco abas do TreinoUp Run, no dock do TreinoUp; Gravar fica no meio, em destaque. */
export default function TabsLayout() {
  const { t } = useTranslation();
  return (
    <Tabs style={styles.root}>
      <TabSlot />
      <TabList asChild>
        <Dock>
          <TabTrigger name="index" href="/run" asChild>
            <DockButton icon={House} label={t("tabs.home")} />
          </TabTrigger>
          <TabTrigger name="maps" href="/run/maps" asChild>
            <DockButton icon={Map} label={t("tabs.maps")} />
          </TabTrigger>
          <TabTrigger name="record" href="/run/record" asChild>
            <DockRecordButton icon={Play} label={t("tabs.record")} />
          </TabTrigger>
          <TabTrigger name="groups" href="/run/groups" asChild>
            <DockButton icon={Users} label={t("tabs.groups")} />
          </TabTrigger>
          <TabTrigger name="you" href="/run/you" asChild>
            <DockButton icon={UserRound} label={t("tabs.you")} />
          </TabTrigger>
        </Dock>
      </TabList>
    </Tabs>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
