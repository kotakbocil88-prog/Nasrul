import React, { useRef, useState } from "react";
import { Platform, Pressable, Text, View } from "react-native";
import { Image } from "expo-image";
import Signature from "react-native-signature-canvas";

import { fonts } from "@/src/typography";
import { makeStyles, useTheme } from "@/src/theme";

// Controlled signature pad. Emits a base64 PNG data-uri via onChange.
export function SignaturePad({
  label,
  value,
  onChange,
  testID,
}: {
  label: string;
  value?: string | null;
  onChange: (v: string | null) => void;
  testID?: string;
}) {
  const styles = useStyles();
  const { colors } = useTheme();
  const ref = useRef<any>(null);
  const [drawing, setDrawing] = useState(false);

  const webStyle = `.m-signature-pad { box-shadow: none; border: none; margin: 0; }
    .m-signature-pad--body { border: none; }
    .m-signature-pad--footer { display: none; margin: 0; }
    body,html { width: 100%; height: 100%; }`;

  if (Platform.OS === "web") {
    // Signature canvas relies on native WebView; on web preview show a note.
    return (
      <View style={styles.container} testID={testID}>
        <Text style={styles.label}>{label.toUpperCase()}</Text>
        {value ? (
          <Image source={{ uri: value }} style={styles.preview} contentFit="contain" />
        ) : (
          <View style={styles.webNote}>
            <Text style={styles.webNoteText}>Tanda tangan tersedia di aplikasi mobile</Text>
          </View>
        )}
      </View>
    );
  }

  if (value) {
    return (
      <View style={styles.container} testID={testID}>
        <Text style={styles.label}>{label.toUpperCase()}</Text>
        <Image source={{ uri: value }} style={styles.preview} contentFit="contain" />
        <Pressable testID={`${testID}-redo`} style={styles.clearBtn} onPress={() => onChange(null)}>
          <Text style={styles.clearText}>ULANGI</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container} testID={testID}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>{label.toUpperCase()}</Text>
        <View style={styles.actions}>
          <Pressable testID={`${testID}-clear`} onPress={() => ref.current?.clearSignature()}>
            <Text style={styles.clearText}>HAPUS</Text>
          </Pressable>
          <Pressable testID={`${testID}-save`} onPress={() => ref.current?.readSignature()}>
            <Text style={[styles.clearText, { color: colors.brandPrimary }]}>SIMPAN</Text>
          </Pressable>
        </View>
      </View>
      <View style={styles.canvas}>
        <Signature
          ref={ref}
          onOK={(sig: string) => {
            setDrawing(false);
            onChange(sig);
          }}
          onEmpty={() => onChange(null)}
          onBegin={() => setDrawing(true)}
          webStyle={webStyle}
          backgroundColor="rgba(255,255,255,1)"
          penColor="#111827"
          autoClear={false}
        />
      </View>
      {!drawing ? <Text style={styles.hint}>Tanda tangan di kotak, lalu tekan SIMPAN</Text> : null}
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  container: { marginBottom: 16 },
  labelRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 6 },
  label: { color: colors.onSurfaceTertiary, fontFamily: fonts.bodyMedium, fontSize: 11, letterSpacing: 0.5 },
  actions: { flexDirection: "row", gap: 16 },
  clearText: { color: colors.error, fontFamily: fonts.bodyBold, fontSize: 11, letterSpacing: 0.5 },
  canvas: { height: 160, borderWidth: 2, borderColor: colors.borderStrong, backgroundColor: colors.surface, overflow: "hidden" },
  preview: { height: 140, borderWidth: 2, borderColor: colors.borderStrong, backgroundColor: colors.surface, marginBottom: 8 },
  hint: { color: colors.muted, fontFamily: fonts.body, fontSize: 10, marginTop: 4 },
  clearBtn: { alignSelf: "flex-start" },
  webNote: { height: 100, borderWidth: 2, borderStyle: "dashed", borderColor: colors.border, alignItems: "center", justifyContent: "center", backgroundColor: colors.surfaceSecondary },
  webNoteText: { color: colors.muted, fontFamily: fonts.body, fontSize: 12 },
}));
