//Importaciones
import React, { useState } from "react";
import { StyleSheet, View } from "react-native";
import { Avatar, IconButton, Text, TextInput, useTheme } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { RADIUS, SPACING } from "../theme";

//JS:
export default function CommentsSection({ comments, onAddComment, readOnly }) {
  const theme = useTheme();
  const [text, setText] = useState("");

  const hasComments = comments.length > 0;

  if (readOnly && !hasComments) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <MaterialCommunityIcons name="chat-outline" size={18} color={theme.colors.onSurfaceVariant} />
        <Text variant="titleSmall" style={{ marginLeft: SPACING.xs, color: theme.colors.onBackground }}>
          Comentarios{hasComments ? ` (${comments.length})` : ""}
        </Text>
      </View>

      {comments.map((c) => (
        <View key={c.id} style={styles.commentRow}>
          {c.photoURL ? (
            <Avatar.Image size={36} source={{ uri: c.photoURL }} />
          ) : (
            <Avatar.Text size={36} label={c.playerName?.[0]?.toUpperCase() || "?"} />
          )}
          <View style={[styles.commentBubble, { backgroundColor: theme.colors.surfaceVariant }]}>
            <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant }}>
              {c.playerName}
            </Text>
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurface, marginTop: 2 }}>
              {c.text}
            </Text>
          </View>
        </View>
      ))}

      {!readOnly && (
        <View style={[styles.inputRow, { backgroundColor: theme.colors.surfaceVariant }]}>
          <TextInput
            mode="flat"
            placeholder="Dejá un comentario..."
            value={text}
            onChangeText={setText}
            style={styles.textInput}
            contentStyle={{ paddingLeft: 0 }}
            underlineStyle={{ display: "none" }}
            textColor={theme.colors.onSurface}
            placeholderTextColor={theme.colors.onSurfaceVariant}
            dense
          />
          <IconButton
            icon="send"
            size={18}
            mode="contained"
            containerColor={text.trim() ? theme.colors.primary : theme.colors.surfaceDisabled}
            iconColor={text.trim() ? theme.colors.onPrimary : theme.colors.onSurfaceDisabled}
            disabled={!text.trim()}
            onPress={() => {
              onAddComment(text.trim());
              setText("");
            }}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginTop: SPACING.l },
  header: { flexDirection: "row", alignItems: "center", marginBottom: SPACING.m },
  commentRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: SPACING.s,
  },
  commentBubble: {
    flex: 1,
    marginLeft: SPACING.s,
    borderRadius: RADIUS.lg,
    borderTopLeftRadius: RADIUS.sm,
    padding: SPACING.m,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: RADIUS.pill,
    paddingLeft: SPACING.m,
    paddingRight: SPACING.xs,
    marginTop: SPACING.s,
  },
  textInput: {
    flex: 1,
    backgroundColor: "transparent",
    height: 40,
  },
});