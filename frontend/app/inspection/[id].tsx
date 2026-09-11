import { Image } from "expo-image";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { useQuery } from "@tanstack/react-query";
import { useLocalSearchParams } from "expo-router";
import { FileArrowDown, FileXls, WhatsappLogo } from "phosphor-react-native";
import { useEffect, useState } from "react";
import { ActivityIndicator, Linking, Platform, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { api, exportUrl, getToken } from "@/src/api/client";
import { ScreenHeader } from "@/src/components/ui";
import { useToast } from "@/src/components/toast";
import { getForm } from "@/src/config/forms";
import { makeStyles, useTheme } from "@/src/theme";
import { fonts } from "@/src/typography";

const BASE = process.env.EXPO_PUBLIC_BACKEND_URL;

type Sample = {
  jalur: number;
  titik: number;
  values: Record<string, string>;
  dates: Record<string, string>;
  keterangan: Record<string, string>;
  photos: Record<string, string>;
};
type Inspection = {
  id: string;
  form_type: string;
  form_title: string;
  header: Record<string, any>;
  samples: Sample[];
  signature_pemeriksa: string | null;
  signature_mengetahui: string | null;
  user_name: string;
  created_at: string;
  score: { standar: number; total: number; percent: number | null };
};

export default function InspectionDetail() {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [token, setTok] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getToken().then(setTok);
  }, []);

  const { data, isLoading } = useQuery<Inspection>({
    queryKey: ["inspection", id],
    queryFn: () => api(`/inspections/${id}`),
  });

  const fileUri = (path: string) => `${BASE}/api/files/${path}?token=${token}`;
  const form = data ? getForm(data.form_type) : undefined;
  const itemLabel = (key: string) => form?.items.find((i) => i.key === key)?.label ?? key;

  const doExport = async (fmt: "pdf" | "excel", forWhatsapp = false) => {
    if (!data) return;
    setBusy(true);
    try {
      const url = await exportUrl(data.id, fmt);
      if (Platform.OS === "web") {
        Linking.openURL(url);
        return;
      }
      const ext = fmt === "excel" ? "xlsx" : "pdf";
      const safe = (data.form_title || "inspeksi").replace(/[^a-zA-Z0-9]/g, "_");
      const dest = `${FileSystem.cacheDirectory}${safe}.${ext}`;
      const res = await FileSystem.downloadAsync(url, dest);
      const available = await Sharing.isAvailableAsync();
      if (!available) {
        toast("Berbagi tidak tersedia di perangkat ini", "error");
        return;
      }
      await Sharing.shareAsync(res.uri, {
        mimeType:
          fmt === "excel"
            ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            : "application/pdf",
        dialogTitle: forWhatsapp ? "Bagikan ke WhatsApp" : "Ekspor Inspeksi",
        UTI: fmt === "excel" ? "com.microsoft.excel.xlsx" : "com.adobe.pdf",
      });
    } catch (e: any) {
      toast(e.message || "Gagal mengekspor", "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.root}>
      <ScreenHeader title="DETAIL INSPEKSI" subtitle={data?.form_title} onBack />

      {isLoading || !data ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={colors.brandPrimary} />
      ) : (
        <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]}>
          {data.score?.percent !== null && data.score?.percent !== undefined ? (
            <View
              testID="detail-score"
              style={[
                styles.scoreBanner,
                {
                  backgroundColor:
                    data.score.percent >= 80 ? colors.success : data.score.percent >= 50 ? colors.warning : colors.error,
                },
              ]}
            >
              <Text style={styles.scoreBig}>{data.score.percent}%</Text>
              <Text style={styles.scoreLabel}>STANDAR ({data.score.standar}/{data.score.total} ITEM)</Text>
            </View>
          ) : null}

          <Text style={styles.sectionLabel}>DATA PEMERIKSAAN</Text>
          <View style={styles.metaBox}>
            {Object.entries(data.header).map(([k, v]) => (
              <View key={k} style={styles.metaRow}>
                <Text style={styles.metaKey}>{k.replace(/_/g, " ").toUpperCase()}</Text>
                <Text style={styles.metaVal}>{String(v || "-")}</Text>
              </View>
            ))}
            <View style={styles.metaRow}>
              <Text style={styles.metaKey}>PEMERIKSA</Text>
              <Text style={styles.metaVal}>{data.user_name}</Text>
            </View>
          </View>

          <Text style={[styles.sectionLabel, { marginTop: 24 }]}>
            HASIL SAMPEL ({data.samples.length})
          </Text>
          {data.samples.map((s, i) => (
            <View key={i} style={styles.sampleBox} testID={`detail-sample-${i}`}>
              <Text style={styles.sampleTitle}>
                JALUR {s.jalur} · TITIK {s.titik}
              </Text>
              {Object.entries(s.values).map(([k, v]) => (
                <View key={k} style={styles.valRow}>
                  <Text style={styles.valKey}>{itemLabel(k)}</Text>
                  <Text style={styles.valVal}>{v}</Text>
                </View>
              ))}
              {Object.entries(s.keterangan || {}).filter(([, v]) => v).map(([k, v]) => (
                <Text key={k} style={styles.note}>* {itemLabel(k)}: {v}</Text>
              ))}
              {Object.keys(s.photos || {}).length > 0 && token ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoStrip}>
                  {Object.entries(s.photos).map(([k, path]) => (
                    <View key={k} style={styles.photoItem}>
                      <Image source={{ uri: fileUri(path) }} style={styles.photo} contentFit="cover" />
                      <Text style={styles.photoLabel} numberOfLines={1}>{itemLabel(k)}</Text>
                    </View>
                  ))}
                </ScrollView>
              ) : null}
            </View>
          ))}

          {(data.signature_pemeriksa || data.signature_mengetahui) && token ? (
            <>
              <Text style={[styles.sectionLabel, { marginTop: 24 }]}>TANDA TANGAN</Text>
              <View style={styles.sigRow}>
                <View style={styles.sigCol}>
                  <Text style={styles.sigLabel}>PEMERIKSA</Text>
                  {data.signature_pemeriksa ? (
                    <Image source={{ uri: fileUri(data.signature_pemeriksa) }} style={styles.sig} contentFit="contain" />
                  ) : (
                    <View style={styles.sigEmpty} />
                  )}
                </View>
                <View style={styles.sigCol}>
                  <Text style={styles.sigLabel}>MENGETAHUI</Text>
                  {data.signature_mengetahui ? (
                    <Image source={{ uri: fileUri(data.signature_mengetahui) }} style={styles.sig} contentFit="contain" />
                  ) : (
                    <View style={styles.sigEmpty} />
                  )}
                </View>
              </View>
            </>
          ) : null}
        </ScrollView>
      )}

      {data ? (
        <View style={[styles.exportBar, { paddingBottom: insets.bottom + 12 }]}>
          <ExportBtn testID="export-pdf" icon={<FileArrowDown size={20} color={colors.onSurface} weight="bold" />} label="PDF" onPress={() => doExport("pdf")} disabled={busy} />
          <View style={styles.exportDivider} />
          <ExportBtn testID="export-excel" icon={<FileXls size={20} color={colors.onSurface} weight="bold" />} label="EXCEL" onPress={() => doExport("excel")} disabled={busy} />
          <View style={styles.exportDivider} />
          <ExportBtn testID="export-wa" icon={<WhatsappLogo size={20} color={colors.brandPrimary} weight="bold" />} label="SHARE WA" onPress={() => doExport("pdf", true)} disabled={busy} />
        </View>
      ) : null}
    </View>
  );
}

function ExportBtn({ icon, label, onPress, disabled, testID }: { icon: React.ReactNode; label: string; onPress: () => void; disabled?: boolean; testID?: string }) {
  const styles = useStyles();
  return (
    <Pressable testID={testID} style={({ pressed }) => [styles.exportBtn, pressed && { opacity: 0.6 }]} onPress={onPress} disabled={disabled}>
      {icon}
      <Text style={styles.exportLabel}>{label}</Text>
    </Pressable>
  );
}

const useStyles = makeStyles((colors) => ({
  root: { flex: 1, backgroundColor: colors.surface },
  content: { padding: 16 },
  scoreBanner: { padding: 16, borderWidth: 2, borderColor: colors.borderStrong, marginBottom: 20, flexDirection: "row", alignItems: "baseline", gap: 10 },
  scoreBig: { color: "#FFFFFF", fontFamily: fonts.display, fontSize: 34 },
  scoreLabel: { color: "#FFFFFF", fontFamily: fonts.bodyBold, fontSize: 11, letterSpacing: 0.5 },
  sectionLabel: { color: colors.onSurfaceTertiary, fontFamily: fonts.bodyBold, fontSize: 11, letterSpacing: 1, marginBottom: 10 },
  metaBox: { borderWidth: 2, borderColor: colors.borderStrong },
  metaRow: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: colors.divider },
  metaKey: { flex: 1, color: colors.onSurfaceSecondary, fontFamily: fonts.bodyMedium, fontSize: 11, padding: 10, backgroundColor: colors.surfaceSecondary },
  metaVal: { flex: 1.3, color: colors.onSurface, fontFamily: fonts.body, fontSize: 12, padding: 10 },
  sampleBox: { borderWidth: 2, borderColor: colors.borderStrong, padding: 12, marginBottom: 12 },
  sampleTitle: { color: colors.onSurface, fontFamily: fonts.display, fontSize: 14, marginBottom: 8 },
  valRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: colors.divider },
  valKey: { flex: 1, color: colors.onSurfaceSecondary, fontFamily: fonts.body, fontSize: 11, paddingRight: 8 },
  valVal: { color: colors.onSurface, fontFamily: fonts.bodyBold, fontSize: 11 },
  note: { color: colors.muted, fontFamily: fonts.body, fontSize: 11, marginTop: 6 },
  photoStrip: { marginTop: 10 },
  photoItem: { marginRight: 8, width: 70 },
  photo: { width: 70, height: 70, borderWidth: 2, borderColor: colors.borderStrong },
  photoLabel: { color: colors.muted, fontFamily: fonts.body, fontSize: 9, marginTop: 3 },
  sigRow: { flexDirection: "row", gap: 12 },
  sigCol: { flex: 1 },
  sigLabel: { color: colors.onSurfaceTertiary, fontFamily: fonts.bodyMedium, fontSize: 10, marginBottom: 6 },
  sig: { height: 90, borderWidth: 2, borderColor: colors.borderStrong, backgroundColor: colors.surface },
  sigEmpty: { height: 90, borderWidth: 2, borderStyle: "dashed", borderColor: colors.border },
  exportBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderTopWidth: 2,
    borderTopColor: colors.borderStrong,
    paddingTop: 8,
  },
  exportBtn: { flex: 1, alignItems: "center", justifyContent: "center", gap: 4, paddingVertical: 8 },
  exportDivider: { width: 2, backgroundColor: colors.borderStrong },
  exportLabel: { color: colors.onSurface, fontFamily: fonts.bodyBold, fontSize: 11, letterSpacing: 0.5 },
}));
