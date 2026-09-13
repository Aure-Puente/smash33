//Importaciones:
import React, { useState } from "react";
import { Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from "react-native";
import { Button, Text, TextInput, useTheme } from "react-native-paper";
import { useAuth } from "../../contexts/AuthContext";
import { RADIUS, SPACING } from "../../theme";

//JS:
export default function LoginScreen({ navigation }) {
  const theme = useTheme();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    setError(null);
    setLoading(true);
    try {
      await login({ email: email.trim(), password });
    } catch (e) {
      setError("No pudimos iniciar sesión. Revisá tu mail y contraseña.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: theme.colors.background }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.brandBlock}>
          <View style={[styles.logoGlowWrap, { shadowColor: theme.colors.primary }]}>
            <Image
              source={require("../../assets/logo.webp")}
              style={[styles.logo, { tintColor: theme.colors.primary }]}
              resizeMode="contain"
            />
          </View>
          <Text style={[styles.brandText, { color: theme.colors.onBackground }]}>
            Smash<Text style={{ color: theme.colors.primary }}>33</Text>
          </Text>
        </View>

        <View style={styles.form}>
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
              onPress={handleLogin}
              loading={loading}
              style={styles.button}
              contentStyle={styles.buttonContent}
              labelStyle={styles.buttonLabel}
            >
              Entrar
            </Button>
          </View>

          <Button mode="text" onPress={() => navigation.navigate("Register")} style={{ marginTop: SPACING.xs }}>
            ¿No tenés cuenta? Registrate
          </Button>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, paddingHorizontal: SPACING.xxl, paddingTop: SPACING.xxxl, paddingBottom: SPACING.xxxl },
  brandBlock: { alignItems: "center", marginBottom: SPACING.xxl },
  logoGlowWrap: {
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 28,
    elevation: 14,
  },
  logo: { width: 208, height: 208 },
  brandText: {
    fontFamily: "Rajdhani_700Bold",
    fontSize: 52,
    letterSpacing: 1,
    marginTop: -SPACING.m,
  },
  form: { width: "100%" },
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