import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Redirect, useRouter } from "expo-router";
import { useState } from "react";
import { Text, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/src/auth/auth-context";
import { Button, Field, TextField } from "@/src/components/ui";
import { useToast } from "@/src/components/toast";
import { makeStyles } from "@/src/theme";
import { fonts } from "@/src/typography";

const HERO =
  "https://images.unsplash.com/photo-1713952160156-bb59cac789a9?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA1NzB8MHwxfHNlYXJjaHwxfHxhZ3JpY3VsdHVyYWwlMjBkcm9uZSUyMGZpZWxkJTIwcGhvdG98ZW58MHx8fHwxNzg5MTExOTQyfDA&ixlib=rb-4.1.0&q=85";

export default function LoginScreen() {
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const toast = useToast();
  const { user, login, register } = useAuth();

  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  if (user) return <Redirect href="/dashboard" />;

  const submit = async () => {
    if (!email.trim() || !password) {
      toast("Email dan password wajib diisi", "error");
      return;
    }
    if (mode === "register" && !name.trim()) {
      toast("Nama wajib diisi", "error");
      return;
    }
    setLoading(true);
    try {
      if (mode === "login") await login(email.trim(), password);
      else await register(name.trim(), email.trim(), password);
      router.replace("/dashboard");
    } catch (e: any) {
      toast(e.message || "Gagal masuk", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.root}>
      <View style={styles.hero}>
        <Image source={{ uri: HERO }} style={styles.heroImg} contentFit="cover" />
        <LinearGradient
          colors={["rgba(17,24,39,0.2)", "rgba(17,24,39,0.95)"]}
          style={styles.scrim}
        />
        <View style={[styles.heroText, { paddingTop: insets.top + 16 }]}>
          <Text style={styles.brand}>QC ESTATE AUDIT</Text>
          <Text style={styles.tagline}>Quality Control Perkebunan</Text>
        </View>
      </View>

      <KeyboardAwareScrollView
        style={styles.form}
        contentContainerStyle={styles.formContent}
        bottomOffset={24}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.formTitle}>{mode === "login" ? "MASUK" : "DAFTAR AKUN"}</Text>

        {mode === "register" ? (
          <Field label="Nama Lengkap">
            <TextField testID="name-input" value={name} onChangeText={setName} placeholder="Nama pemeriksa" autoCapitalize="words" />
          </Field>
        ) : null}

        <Field label="Email">
          <TextField
            testID="email-input"
            value={email}
            onChangeText={setEmail}
            placeholder="email@perusahaan.com"
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </Field>

        <Field label="Password">
          <TextField
            testID="password-input"
            value={password}
            onChangeText={setPassword}
            placeholder="Minimal 6 karakter"
            secureTextEntry
            autoCapitalize="none"
          />
        </Field>

        <View style={{ height: 8 }} />
        <Button
          testID="submit-auth"
          title={mode === "login" ? "MASUK" : "DAFTAR"}
          onPress={submit}
          loading={loading}
        />

        <Text
          testID="toggle-mode"
          style={styles.toggle}
          onPress={() => setMode(mode === "login" ? "register" : "login")}
        >
          {mode === "login" ? "Belum punya akun? DAFTAR" : "Sudah punya akun? MASUK"}
        </Text>
      </KeyboardAwareScrollView>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  root: { flex: 1, backgroundColor: colors.surface },
  hero: { height: "38%", backgroundColor: colors.surfaceInverse },
  heroImg: { width: "100%", height: "100%" },
  scrim: { position: "absolute", left: 0, right: 0, top: 0, bottom: 0 },
  heroText: { position: "absolute", left: 0, right: 0, bottom: 0, padding: 20 },
  brand: { color: "#FFFFFF", fontFamily: fonts.display, fontSize: 26, letterSpacing: 1 },
  tagline: { color: "#DCFCE7", fontFamily: fonts.body, fontSize: 13, marginTop: 4 },
  form: { flex: 1, backgroundColor: colors.surface },
  formContent: { padding: 20, paddingTop: 24 },
  formTitle: { color: colors.onSurface, fontFamily: fonts.display, fontSize: 20, marginBottom: 20 },
  toggle: { color: colors.brandPrimary, fontFamily: fonts.bodyBold, fontSize: 12, textAlign: "center", marginTop: 20, letterSpacing: 0.5 },
}));
