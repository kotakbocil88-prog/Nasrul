import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Plus, Trash } from "phosphor-react-native";
import { useMemo, useState } from "react";
import { Linking, Modal, Platform, Pressable, Text, View } from "react-native";
import { KeyboardAwareScrollView, KeyboardStickyView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQueryClient } from "@tanstack/react-query";

import { api, uploadBase64, uploadPhoto } from "@/src/api/client";
import { useToast } from "@/src/components/toast";
import {
  Button,
  DateField,
  Field,
  PhotoThumb,
  PickerField,
  ScreenHeader,
  SegmentedControl,
  TextField,
} from "@/src/components/ui";
import { SignaturePad } from "@/src/components/signature-pad";
import { getForm, Item, JALUR_OPTIONS } from "@/src/config/forms";
import { makeStyles, useTheme } from "@/src/theme";
import { fonts } from "@/src/typography";

type PhotoState = { uri?: string; path?: string; uploading?: boolean };
type Sample = {
  id: string;
  jalur: number | null;
  titik: number | null;
  values: Record<string, string>;
  dates: Record<string, string>;
  keterangan: Record<string, string>;
  photos: Record<string, PhotoState>;
};

let counter = 0;
const newSample = (): Sample => ({
  id: `s_${Date.now()}_${counter++}`,
  jalur: null,
  titik: null,
  values: {},
  dates: {},
  keterangan: {},
  photos: {},
});

export default function NewInspection() {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const toast = useToast();
  const queryClient = useQueryClient();
  const { formType } = useLocalSearchParams<{ formType: string }>();
  const form = getForm(String(formType));

  const [step, setStep] = useState<"header" | "samples" | "signature">("header");
  const [header, setHeader] = useState<Record<string, string>>({});
  const [samples, setSamples] = useState<Sample[]>([newSample()]);
  const [sigPemeriksa, setSigPemeriksa] = useState<string | null>(null);
  const [sigMengetahui, setSigMengetahui] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [pending, setPending] = useState<{ sampleId: string; itemKey: string } | null>(null);

  const stepLabel = useMemo(
    () => (step === "header" ? "1/3 · Data" : step === "samples" ? "2/3 · Sampel" : "3/3 · Tanda Tangan"),
    [step],
  );

  if (!form) {
    return (
      <View style={styles.root}>
        <ScreenHeader title="Form tidak ditemukan" onBack />
      </View>
    );
  }

  const setHeaderField = (k: string, v: string) => setHeader((h) => ({ ...h, [k]: v }));
  const updateSample = (id: string, patch: Partial<Sample>) =>
    setSamples((list) => list.map((s) => (s.id === id ? { ...s, ...patch } : s)));

  const setItemValue = (id: string, key: string, v: string) =>
    setSamples((list) => list.map((s) => (s.id === id ? { ...s, values: { ...s.values, [key]: v } } : s)));
  const setItemDate = (id: string, key: string, v: string) =>
    setSamples((list) => list.map((s) => (s.id === id ? { ...s, dates: { ...s.dates, [key]: v } } : s)));
  const setItemNote = (id: string, key: string, v: string) =>
    setSamples((list) => list.map((s) => (s.id === id ? { ...s, keterangan: { ...s.keterangan, [key]: v } } : s)));
  const setPhoto = (id: string, key: string, p: PhotoState) =>
    setSamples((list) => list.map((s) => (s.id === id ? { ...s, photos: { ...s.photos, [key]: p } } : s)));

  // ---- Photo picking ----
  const doPick = async (source: "camera" | "gallery") => {
    if (!pending) return;
    const { sampleId, itemKey } = pending;
    setPending(null);
    try {
      let perm;
      if (source === "camera") perm = await ImagePicker.requestCameraPermissionsAsync();
      else perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        if (!perm.canAskAgain) {
          toast("Izin ditolak. Buka Pengaturan untuk mengaktifkan.", "error");
          Linking.openSettings();
        } else {
          toast("Izin diperlukan untuk mengambil foto", "error");
        }
        return;
      }
      const result =
        source === "camera"
          ? await ImagePicker.launchCameraAsync({ quality: 0.5, mediaTypes: ["images"] })
          : await ImagePicker.launchImageLibraryAsync({ quality: 0.5, mediaTypes: ["images"] });
      if (result.canceled || !result.assets?.[0]) return;
      const uri = result.assets[0].uri;
      setPhoto(sampleId, itemKey, { uri, uploading: true });
      const { path } = await uploadPhoto(uri);
      setPhoto(sampleId, itemKey, { uri, path, uploading: false });
    } catch (e: any) {
      toast(e.message || "Gagal memproses foto", "error");
    }
  };

  // ---- Navigation between steps ----
  const goSamples = () => {
    if (!header.kebun?.trim() || !header.blok?.trim()) {
      toast("Isi minimal Kebun dan Blok", "error");
      return;
    }
    setStep("samples");
  };

  const goSignature = () => {
    const valid = samples.filter((s) => s.jalur !== null && s.titik !== null);
    if (valid.length === 0) {
      toast("Tambahkan minimal 1 sampel dengan Jalur & Titik", "error");
      return;
    }
    setStep("signature");
  };

  const submit = async () => {
    setSubmitting(true);
    try {
      let pPath: string | null = null;
      let mPath: string | null = null;
      if (sigPemeriksa) pPath = (await uploadBase64(sigPemeriksa)).path;
      if (sigMengetahui) mPath = (await uploadBase64(sigMengetahui)).path;

      const payloadSamples = samples
        .filter((s) => s.jalur !== null && s.titik !== null)
        .map((s) => {
          const photos: Record<string, string> = {};
          Object.entries(s.photos).forEach(([k, v]) => {
            if (v.path) photos[k] = v.path;
          });
          return {
            jalur: s.jalur,
            titik: s.titik,
            values: s.values,
            dates: s.dates,
            keterangan: s.keterangan,
            photos,
          };
        });

      await api("/inspections", {
        method: "POST",
        body: {
          form_type: form.key,
          form_title: form.title,
          header,
          samples: payloadSamples,
          signature_pemeriksa: pPath,
          signature_mengetahui: mPath,
        },
      });
      await queryClient.invalidateQueries({ queryKey: ["inspections"] });
      toast("Inspeksi tersimpan", "success");
      router.replace("/dashboard");
    } catch (e: any) {
      toast(e.message || "Gagal menyimpan", "error");
    } finally {
      setSubmitting(false);
    }
  };

  // ---- Renderers ----
  const renderItem = (sample: Sample, item: Item) => {
    const photo = sample.photos[item.key];
    return (
      <View key={item.key} style={styles.item}>
        <Text style={styles.itemLabel}>{item.label}</Text>
        <SegmentedControl
          testID={`seg-${sample.id}-${item.key}`}
          options={item.options}
          value={sample.values[item.key] ?? null}
          onChange={(v) => setItemValue(sample.id, item.key, v)}
        />
        {item.hasDate ? (
          <View style={{ marginTop: 8 }}>
            <Text style={styles.subLabel}>TANGGAL APLIKASI</Text>
            <DateField
              testID={`date-${sample.id}-${item.key}`}
              value={sample.dates[item.key] ?? null}
              onChange={(v) => setItemDate(sample.id, item.key, v)}
            />
          </View>
        ) : null}
        {item.hasNote ? (
          <View style={{ marginTop: 8 }}>
            <Text style={styles.subLabel}>KETERANGAN</Text>
            <TextField
              testID={`note-${sample.id}-${item.key}`}
              value={sample.keterangan[item.key] ?? ""}
              onChangeText={(v) => setItemNote(sample.id, item.key, v)}
              placeholder="Catatan tambahan"
            />
          </View>
        ) : null}
        <View style={styles.photoRow}>
          <PhotoThumb
            testID={`photo-${sample.id}-${item.key}`}
            uri={photo?.uri}
            loading={photo?.uploading}
            onPress={() => setPending({ sampleId: sample.id, itemKey: item.key })}
            onRemove={photo?.uri ? () => setPhoto(sample.id, item.key, {}) : undefined}
          />
        </View>
      </View>
    );
  };

  return (
    <View style={styles.root}>
      <ScreenHeader title={form.short} subtitle={stepLabel} onBack />

      <KeyboardAwareScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 120 }]}
        bottomOffset={90}
        keyboardShouldPersistTaps="handled"
      >
        {step === "header" ? (
          <>
            {form.headerFields.map((f) => (
              <Field key={f.key} label={f.label}>
                {f.type === "date" ? (
                  <DateField
                    testID={`header-${f.key}`}
                    value={header[f.key] ?? null}
                    onChange={(v) => setHeaderField(f.key, v)}
                  />
                ) : (
                  <TextField
                    testID={`header-${f.key}`}
                    value={header[f.key] ?? ""}
                    onChangeText={(v) => setHeaderField(f.key, v)}
                    keyboardType={f.type === "number" ? "numeric" : "default"}
                    placeholder={f.label}
                  />
                )}
              </Field>
            ))}
          </>
        ) : null}

        {step === "samples" ? (
          <>
            {samples.map((sample, idx) => (
              <View key={sample.id} style={styles.sampleCard} testID={`sample-${idx}`}>
                <View style={styles.sampleHead}>
                  <Text style={styles.sampleTitle}>SAMPEL #{idx + 1}</Text>
                  {samples.length > 1 ? (
                    <Pressable
                      testID={`remove-sample-${idx}`}
                      onPress={() => setSamples((l) => l.filter((s) => s.id !== sample.id))}
                      hitSlop={8}
                    >
                      <Trash size={18} color={colors.error} weight="bold" />
                    </Pressable>
                  ) : null}
                </View>
                <View style={styles.sampleRow}>
                  <View style={styles.half}>
                    <Text style={styles.subLabel}>JALUR SAMPEL</Text>
                    <PickerField
                      testID={`jalur-${idx}`}
                      value={sample.jalur}
                      options={JALUR_OPTIONS}
                      placeholder="Jalur"
                      onChange={(v) => updateSample(sample.id, { jalur: Number(v) })}
                    />
                  </View>
                  <View style={styles.half}>
                    <Text style={styles.subLabel}>TITIK SAMPEL</Text>
                    <PickerField
                      testID={`titik-${idx}`}
                      value={sample.titik}
                      options={form.titikOptions}
                      placeholder="Titik"
                      onChange={(v) => updateSample(sample.id, { titik: Number(v) })}
                    />
                  </View>
                </View>
                {form.items.map((item) => renderItem(sample, item))}
              </View>
            ))}
            <Button
              testID="add-sample"
              title="TAMBAH SAMPEL"
              variant="secondary"
              icon={<Plus size={16} color={colors.onBrandSecondary} weight="bold" />}
              onPress={() => setSamples((l) => [...l, newSample()])}
            />
          </>
        ) : null}

        {step === "signature" ? (
          <>
            <SignaturePad testID="sig-pemeriksa" label="Tanda Tangan Pemeriksa" value={sigPemeriksa} onChange={setSigPemeriksa} />
            <SignaturePad testID="sig-mengetahui" label="Tanda Tangan Mengetahui" value={sigMengetahui} onChange={setSigMengetahui} />
          </>
        ) : null}
      </KeyboardAwareScrollView>

      <KeyboardStickyView>
        <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
          {step === "header" ? (
            <Button testID="next-samples" title="LANJUT KE SAMPEL" onPress={goSamples} />
          ) : step === "samples" ? (
            <View style={styles.footerRow}>
              <View style={{ flex: 1 }}>
                <Button testID="back-header" title="KEMBALI" variant="outline" onPress={() => setStep("header")} />
              </View>
              <View style={{ flex: 1 }}>
                <Button testID="next-signature" title="LANJUT" onPress={goSignature} />
              </View>
            </View>
          ) : (
            <View style={styles.footerRow}>
              <View style={{ flex: 1 }}>
                <Button testID="back-samples" title="KEMBALI" variant="outline" onPress={() => setStep("samples")} />
              </View>
              <View style={{ flex: 1.4 }}>
                <Button testID="submit-inspection" title="SIMPAN & KIRIM" onPress={submit} loading={submitting} />
              </View>
            </View>
          )}
        </View>
      </KeyboardStickyView>

      <Modal visible={!!pending} transparent animationType="fade" onRequestClose={() => setPending(null)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setPending(null)}>
          <View style={styles.photoSheet}>
            <Text style={styles.photoSheetTitle}>AMBIL FOTO</Text>
            {Platform.OS !== "web" ? (
              <Button testID="pick-camera" title="KAMERA" onPress={() => doPick("camera")} />
            ) : null}
            <View style={{ height: 10 }} />
            <Button testID="pick-gallery" title="GALERI" variant="secondary" onPress={() => doPick("gallery")} />
            <View style={{ height: 10 }} />
            <Button testID="pick-cancel" title="BATAL" variant="outline" onPress={() => setPending(null)} />
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  root: { flex: 1, backgroundColor: colors.surface },
  scroll: { flex: 1 },
  scrollContent: { padding: 16 },
  item: { marginBottom: 18, borderTopWidth: 1, borderTopColor: colors.divider, paddingTop: 14 },
  itemLabel: { color: colors.onSurface, fontFamily: fonts.bodyBold, fontSize: 13, marginBottom: 8 },
  subLabel: { color: colors.onSurfaceTertiary, fontFamily: fonts.bodyMedium, fontSize: 10, letterSpacing: 0.5, marginBottom: 6 },
  photoRow: { flexDirection: "row", alignItems: "center", marginTop: 10 },
  sampleCard: { borderWidth: 2, borderColor: colors.borderStrong, padding: 14, marginBottom: 16, backgroundColor: colors.surface },
  sampleHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  sampleTitle: { color: colors.onSurface, fontFamily: fonts.display, fontSize: 15 },
  sampleRow: { flexDirection: "row", gap: 12 },
  half: { flex: 1 },
  footer: {
    padding: 12,
    paddingTop: 12,
    backgroundColor: colors.surface,
    borderTopWidth: 2,
    borderTopColor: colors.borderStrong,
  },
  footerRow: { flexDirection: "row", gap: 10 },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.55)", justifyContent: "flex-end" },
  photoSheet: { backgroundColor: colors.surface, borderTopWidth: 2, borderTopColor: colors.borderStrong, padding: 20, paddingBottom: 32 },
  photoSheetTitle: { color: colors.onSurface, fontFamily: fonts.display, fontSize: 16, marginBottom: 16 },
}));
