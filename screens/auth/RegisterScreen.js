//Importaciones:
import React, { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Avatar, Button, Text, TextInput, useTheme } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useAuth } from "../../contexts/AuthContext";
import { RADIUS, SPACING } from "../../theme";

//JS:
export default function RegisterScreen({ navigation }) {
  const theme = useTheme();
  const { register } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [playerName, setPlayerName] = useState("");
  const [photoUri, setPhotoUri] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  async function pickImage() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled) {
      setPhotoUri(result.assets[0].uri);
    }
  }

  async function handleRegister() {
    setError(null);
    if (!email || !password || !playerName) {
      setError("Completá mail, contraseña y nombre de jugador.");
      return;
    }
    setLoading(true);
    try {
      await register({ email: email.trim(), password, playerName: playerName.trim(), photoUri });
    } catch (e) {
      console.log("Error de registro:", e.code, e.message);
      setError(`${e.code || "Error"}: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text variant="headlineMedium" style={[styles.title, { color: theme.colors.onBackground }]}>Crear cuenta</Text>
        <Text variant="bodyMedium" style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>
          Sumate al grupo y empezá a registrar tus torneos
        </Text>

        <View style={styles.avatarWrap}>
          <View style={[styles.avatarRing, { borderColor: theme.colors.primary }]}>
            {photoUri ? (
              <Avatar.Image size={100} source={{ uri: photoUri }} />
            ) : (
              <Avatar.Icon size={100} icon="account" style={{ backgroundColor: theme.colors.surfaceVariant }} />
            )}
            <Pressable
              onPress={pickImage}
              style={[styles.editPhotoBtn, { backgroundColor: theme.colors.primary, borderColor: theme.colors.background }]}
            >
              <MaterialCommunityIcons name="camera" size={16} color={theme.colors.onPrimary} />
            </Pressable>
          </View>
        </View>

        <TextInput
          mode="outlined"
          label="Nombre de jugador"
          value={playerName}
          onChangeText={setPlayerName}
          left={<TextInput.Icon icon="account-outline" />}
          outlineStyle={styles.inputOutline}
          style={styles.input}
        />
        <TextInput
          mode="outlined"
          label="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          left={<TextInput.Icon icon="email-outline" />}
          outlineStyle={styles.inputOutline}
          style={styles.input}
        />
        <TextInput
          mode="outlined"
          label="Contraseña"
          value={password}
          onChangeText={setPassword}
          secureTextEntry={!showPassword}
          left={<TextInput.Icon icon="lock-outline" />}
          right={
            <TextInput.Icon
              icon={showPassword ? "eye-off-outline" : "eye-outline"}
              onPress={() => setShowPassword((v) => !v)}
            />
          }
          outlineStyle={styles.inputOutline}
          style={styles.input}
        />

        {error && <Text style={{ color: theme.colors.error, marginBottom: SPACING.s }}>{error}</Text>}

        <View style={[styles.buttonGlowWrap, { shadowColor: theme.colors.primary }]}>
          <Button
            mode="contained"
            onPress={handleRegister}
            loading={loading}
            style={styles.button}
            contentStyle={styles.buttonContent}
            labelStyle={styles.buttonLabel}
          >
            Crear cuenta
          </Button>
        </View>

        <Button mode="text" onPress={() => navigation.navigate("Login")} style={{ marginTop: SPACING.xs }}>
          Ya tengo cuenta
        </Button>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: SPACING.xxl, paddingTop: SPACING.xxl, paddingBottom: SPACING.xxxl },
  title: { textAlign: "center" },
  subtitle: { textAlign: "center", marginTop: SPACING.xs, marginBottom: SPACING.xl },
  avatarWrap: { alignItems: "center", marginBottom: SPACING.xl },
  avatarRing: { position: "relative", borderWidth: 2, borderRadius: RADIUS.pill, padding: 3 },
  editPhotoBtn: {
    position: "absolute", bottom: 0, right: 0,
    width: 30, height: 30, borderRadius: RADIUS.pill,
    alignItems: "center", justifyContent: "center", borderWidth: 3,
  },
  input: { marginBottom: SPACING.m, fontSize: 16 },
  inputOutline: { borderRadius: RADIUS.md },
  buttonGlowWrap: {
    marginTop: SPACING.s,
    borderRadius: RADIUS.pill,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  button: { borderRadius: RADIUS.pill },
  buttonContent: { paddingVertical: SPACING.m },
  buttonLabel: { fontSize: 16, fontWeight: "700" },
});