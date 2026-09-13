//Importaciones:
import React, { useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Button, Text, useTheme } from "react-native-paper";
import { useAuth } from "../../contexts/AuthContext";
import { createInvitation, getAllUsers } from "../../services/firestoreService";
import { sendPushNotifications } from "../../services/pushNotifications";
import { SLOT_TYPES, getTwoWeekDays, slotId } from "../../utils/dateUtils";
import ScreenHeader from "../../components/ScreenHeader";
import { RADIUS, SPACING } from "../../theme";

//JS:
export default function CreateInvitationScreen({ navigation }) {
  const theme = useTheme();
  const { user, profile } = useAuth();
  const days = getTwoWeekDays();
  const [selected, setSelected] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  function toggle(id) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]));
  }

  async function handleSend() {
    setError(null);
    setSubmitting(true);
    try {
      const slots = selected
        .map((id) => {
          const [dateISO, slotType] = [id.slice(0, 10), id.slice(11)];
          const day = days.find((d) => d.dateISO === dateISO);
          return day ? { id, dateISO, dayLabel: day.dayLabel, shortDate: day.shortDate, slotType } : null;
        })
        .filter(Boolean);

      const invitationId = await createInvitation({ createdBy: user.uid, slots });

      const allUsers = await getAllUsers();
      const tokens = allUsers.filter((u) => u.uid !== user.uid).map((u) => u.expoPushToken).filter(Boolean);
      sendPushNotifications(
        tokens,
        "📅 Nueva invitación para juntarse",
        `${profile.playerName} propuso días para la próxima juntada. ¡Marcá tu disponibilidad!`,
        { type: "invitation", invitationId }
      );

      navigation.replace("InvitationDetail", { invitationId });
    } catch (e) {
      setError(e.message || "No pudimos crear la invitación.");
    } finally {
      setSubmitting(false);
    }
  }

  const weeks = [days.slice(0, 7), days.slice(7, 14)];

  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.colors.background }} contentContainerStyle={{ padding: SPACING.l }}>
      <ScreenHeader title="Nueva invitación" onBack={() => navigation.goBack()} />
      <Text variant="titleMedium" style={{ marginBottom: SPACING.xs, color: theme.colors.onBackground }}>¿Cuándo podés?</Text>
      <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: SPACING.l }}>
        Marcá los días y franjas que te sirven. Se los vamos a mandar a todos para que voten.
      </Text>

      {weeks.map((week, weekIdx) => (
        <View key={weekIdx} style={{ marginBottom: SPACING.l }}>
          <Text variant="titleSmall" style={{ marginBottom: SPACING.s, color: theme.colors.onSurfaceVariant }}>
            {weekIdx === 0 ? "Esta semana" : "La semana que viene"}
          </Text>
          {week.map((day) => (
            <View key={day.dateISO} style={styles.dayRow}>
              <Text style={[styles.dayLabel, { color: theme.colors.onSurface }]}>{day.dayLabel} {day.shortDate}</Text>
              <View style={{ flexDirection: "row" }}>
                {SLOT_TYPES.map((slot) => {
                  const id = slotId(day.dateISO, slot.id);
                  const active = selected.includes(id);
                  return (
                    <Pressable key={slot.id} onPress={() => toggle(id)} style={styles.slotChipWrap}>
                      <View
                        style={[
                          styles.slotChip,
                          { borderColor: theme.colors.outline, backgroundColor: theme.colors.surface },
                          active && { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
                        ]}
                      >
                        <Text style={{ fontSize: 12, fontWeight: "700", color: active ? theme.colors.onPrimary : theme.colors.onSurfaceVariant }}>
                          {slot.label}
                        </Text>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ))}
        </View>
      ))}

      {error && <Text style={{ color: theme.colors.error, marginBottom: SPACING.s }}>{error}</Text>}

      <Button
        mode="contained"
        disabled={selected.length === 0}
        loading={submitting}
        style={{ borderRadius: RADIUS.pill }}
        contentStyle={{ paddingVertical: SPACING.xs }}
        onPress={handleSend}
      >
        Enviar ({selected.length})
      </Button>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  dayRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: SPACING.s },
  dayLabel: { flex: 1 },
  slotChipWrap: { marginLeft: SPACING.s },
  slotChip: { paddingHorizontal: SPACING.m, paddingVertical: SPACING.xs, borderRadius: RADIUS.pill, borderWidth: 1.5 },
});
