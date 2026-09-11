import DateTimePicker from "@react-native-community/datetimepicker";
import { CaretLeft, CaretDown, Camera, Trash, Check } from "phosphor-react-native";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import { fonts } from "@/src/typography";
import { makeStyles, useTheme } from "@/src/theme";

// ---------------------------------------------------------------------------
// Button
// ---------------------------------------------------------------------------
type ButtonProps = {
  title: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "outline" | "danger";
  disabled?: boolean;
  loading?: boolean;
  testID?: string;
  icon?: React.ReactNode;
};

export function Button({ title, onPress, variant = "primary", disabled, loading, testID, icon }: ButtonProps) {
  const styles = useStyles();
  const { colors } = useTheme();
  const isDisabled = disabled || loading;
  const bgStyle =
    variant === "primary"
      ? styles.btnPrimary
      : variant === "secondary"
        ? styles.btnSecondary
        : variant === "danger"
          ? styles.btnDanger
          : styles.btnOutline;
  const txtStyle =
    variant === "primary"
      ? styles.btnTextPrimary
      : variant === "secondary"
        ? styles.btnTextSecondary
        : variant === "danger"
          ? styles.btnTextPrimary
          : styles.btnTextOutline;

  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [styles.btn, bgStyle, pressed && styles.btnPressed, isDisabled && styles.btnDisabled]}
    >
      {loading ? (
        <ActivityIndicator color={variant === "outline" ? colors.onSurface : colors.onBrandPrimary} />
      ) : (
        <View style={styles.btnRow}>
          {icon}
          <Text style={txtStyle}>{title}</Text>
        </View>
      )}
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// Field label wrapper
// ---------------------------------------------------------------------------
export function Field({ label, children, error }: { label: string; children: React.ReactNode; error?: string }) {
  const styles = useStyles();
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label.toUpperCase()}</Text>
      {children}
      {error ? <Text style={styles.fieldError}>{error}</Text> : null}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Text input
// ---------------------------------------------------------------------------
type TextFieldProps = {
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  keyboardType?: "default" | "numeric" | "email-address";
  secureTextEntry?: boolean;
  autoCapitalize?: "none" | "sentences" | "words";
  multiline?: boolean;
  testID?: string;
  invalid?: boolean;
};

export function TextField(props: TextFieldProps) {
  const styles = useStyles();
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);
  return (
    <TextInput
      testID={props.testID}
      value={props.value}
      onChangeText={props.onChangeText}
      placeholder={props.placeholder}
      placeholderTextColor={colors.muted}
      keyboardType={props.keyboardType}
      secureTextEntry={props.secureTextEntry}
      autoCapitalize={props.autoCapitalize}
      multiline={props.multiline}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={[
        styles.input,
        focused && styles.inputFocused,
        props.invalid && styles.inputInvalid,
        props.multiline && styles.inputMultiline,
      ]}
    />
  );
}

// ---------------------------------------------------------------------------
// Segmented control (edge-to-edge, wraps for >3 options)
// ---------------------------------------------------------------------------
export function SegmentedControl({
  options,
  value,
  onChange,
  testID,
}: {
  options: string[];
  value?: string | null;
  onChange: (v: string) => void;
  testID?: string;
}) {
  const styles = useStyles();
  const wrap = options.length > 3 || options.some((o) => o.length > 10);
  return (
    <View testID={testID} style={[styles.segment, wrap && styles.segmentWrap]}>
      {options.map((opt, i) => {
        const active = value === opt;
        return (
          <Pressable
            key={opt}
            testID={`${testID}-opt-${opt}`}
            onPress={() => onChange(opt)}
            style={[
              styles.segmentItem,
              wrap ? styles.segmentItemWrap : { flex: 1 },
              i > 0 && !wrap && styles.segmentDivider,
              active && styles.segmentItemActive,
            ]}
          >
            <Text style={[styles.segmentText, active && styles.segmentTextActive]}>{opt}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Picker (modal list) — used for Jalur / Titik selection
// ---------------------------------------------------------------------------
export function PickerField({
  value,
  options,
  onChange,
  placeholder = "Pilih",
  testID,
}: {
  value?: string | number | null;
  options: (string | number)[];
  onChange: (v: any) => void;
  placeholder?: string;
  testID?: string;
}) {
  const styles = useStyles();
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);
  return (
    <>
      <Pressable testID={testID} style={styles.picker} onPress={() => setOpen(true)}>
        <Text style={[styles.pickerText, value === null || value === undefined ? styles.pickerPlaceholder : null]}>
          {value === null || value === undefined ? placeholder : String(value)}
        </Text>
        <CaretDown size={16} color={colors.onSurface} weight="bold" />
      </Pressable>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setOpen(false)}>
          <View style={styles.modalSheet}>
            <ScrollView>
              {options.map((opt) => (
                <Pressable
                  key={String(opt)}
                  testID={`${testID}-opt-${opt}`}
                  style={styles.modalRow}
                  onPress={() => {
                    onChange(opt);
                    setOpen(false);
                  }}
                >
                  <Text style={styles.modalRowText}>{String(opt)}</Text>
                  {String(value) === String(opt) ? <Check size={16} color={colors.brandPrimary} weight="bold" /> : null}
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

// ---------------------------------------------------------------------------
// Date field
// ---------------------------------------------------------------------------
export function DateField({
  value,
  onChange,
  testID,
}: {
  value?: string | null; // ISO date yyyy-mm-dd
  onChange: (v: string) => void;
  testID?: string;
}) {
  const styles = useStyles();
  const { colors } = useTheme();
  const [show, setShow] = useState(false);

  if (Platform.OS === "web") {
    return (
      <TextInput
        testID={testID}
        value={value ?? ""}
        onChangeText={onChange}
        placeholder="YYYY-MM-DD"
        placeholderTextColor={colors.muted}
        style={styles.input}
      />
    );
  }

  return (
    <>
      <Pressable testID={testID} style={styles.picker} onPress={() => setShow(true)}>
        <Text style={[styles.pickerText, !value && styles.pickerPlaceholder]}>{value || "Pilih tanggal"}</Text>
        <CaretDown size={16} color={colors.onSurface} weight="bold" />
      </Pressable>
      {show ? (
        <DateTimePicker
          value={value ? new Date(value) : new Date()}
          mode="date"
          display="default"
          onChange={(_e, d) => {
            setShow(false);
            if (d) onChange(d.toISOString().slice(0, 10));
          }}
        />
      ) : null}
    </>
  );
}

// ---------------------------------------------------------------------------
// Photo button
// ---------------------------------------------------------------------------
export function PhotoThumb({
  uri,
  onPress,
  onRemove,
  loading,
  testID,
}: {
  uri?: string | null;
  onPress: () => void;
  onRemove?: () => void;
  loading?: boolean;
  testID?: string;
}) {
  const styles = useStyles();
  const { colors } = useTheme();
  if (uri) {
    return (
      <View style={styles.photoWrap}>
        <Image source={{ uri }} style={styles.photoImg} contentFit="cover" />
        {onRemove ? (
          <Pressable testID={`${testID}-remove`} style={styles.photoRemove} onPress={onRemove}>
            <Trash size={14} color={colors.onError} weight="bold" />
          </Pressable>
        ) : null}
      </View>
    );
  }
  return (
    <Pressable testID={testID} style={styles.photoBtn} onPress={onPress} disabled={loading}>
      {loading ? (
        <ActivityIndicator color={colors.brandPrimary} />
      ) : (
        <>
          <Camera size={18} color={colors.onSurfaceSecondary} weight="bold" />
          <Text style={styles.photoBtnText}>Foto</Text>
        </>
      )}
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// Screen header (sticky)
// ---------------------------------------------------------------------------
export function ScreenHeader({
  title,
  subtitle,
  onBack,
  right,
}: {
  title: string;
  subtitle?: string;
  onBack?: boolean;
  right?: React.ReactNode;
}) {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  return (
    <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
      <View style={styles.headerRow}>
        {onBack ? (
          <Pressable testID="header-back" onPress={() => router.back()} hitSlop={10} style={styles.headerBack}>
            <CaretLeft size={22} color={colors.onSurface} weight="bold" />
          </Pressable>
        ) : (
          <View style={styles.headerBack} />
        )}
        <View style={styles.headerTitles}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {title}
          </Text>
          {subtitle ? (
            <Text style={styles.headerSubtitle} numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        <View style={styles.headerRight}>{right}</View>
      </View>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  // button
  btn: {
    minHeight: 52,
    paddingHorizontal: 20,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
  },
  btnRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  btnPrimary: { backgroundColor: colors.brandPrimary, borderColor: colors.borderStrong },
  btnSecondary: { backgroundColor: colors.brandSecondary, borderColor: colors.borderStrong },
  btnDanger: { backgroundColor: colors.error, borderColor: colors.borderStrong },
  btnOutline: { backgroundColor: colors.surface, borderColor: colors.borderStrong },
  btnPressed: { opacity: 0.8 },
  btnDisabled: { opacity: 0.5 },
  btnTextPrimary: { color: colors.onBrandPrimary, fontFamily: fonts.bodyBold, fontSize: 14, letterSpacing: 0.5 },
  btnTextSecondary: { color: colors.onBrandSecondary, fontFamily: fonts.bodyBold, fontSize: 14, letterSpacing: 0.5 },
  btnTextOutline: { color: colors.onSurface, fontFamily: fonts.bodyBold, fontSize: 14, letterSpacing: 0.5 },

  // field
  field: { marginBottom: 16 },
  fieldLabel: { color: colors.onSurfaceTertiary, fontFamily: fonts.bodyMedium, fontSize: 11, marginBottom: 6, letterSpacing: 0.5 },
  fieldError: { color: colors.error, fontFamily: fonts.body, fontSize: 11, marginTop: 4 },

  // input
  input: {
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
    minHeight: 48,
    color: colors.onSurface,
    fontFamily: fonts.body,
    fontSize: 14,
  },
  inputFocused: { borderColor: colors.borderStrong },
  inputInvalid: { borderColor: colors.error },
  inputMultiline: { minHeight: 80, paddingTop: 12, textAlignVertical: "top" },

  // segmented
  segment: { flexDirection: "row", borderWidth: 2, borderColor: colors.borderStrong },
  segmentWrap: { flexWrap: "wrap", borderWidth: 0, gap: 8 },
  segmentItem: { minHeight: 44, alignItems: "center", justifyContent: "center", paddingHorizontal: 8, backgroundColor: colors.surface },
  segmentItemWrap: { borderWidth: 2, borderColor: colors.borderStrong, flexGrow: 1, flexBasis: "30%" },
  segmentDivider: { borderLeftWidth: 2, borderLeftColor: colors.borderStrong },
  segmentItemActive: { backgroundColor: colors.brandPrimary },
  segmentText: { color: colors.onSurface, fontFamily: fonts.bodyMedium, fontSize: 12, textAlign: "center" },
  segmentTextActive: { color: colors.onBrandPrimary, fontFamily: fonts.bodyBold },

  // picker
  picker: {
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    minHeight: 48,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  pickerText: { color: colors.onSurface, fontFamily: fonts.body, fontSize: 14 },
  pickerPlaceholder: { color: colors.muted },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", padding: 24 },
  modalSheet: { backgroundColor: colors.surface, borderWidth: 2, borderColor: colors.borderStrong, maxHeight: 420 },
  modalRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  modalRowText: { color: colors.onSurface, fontFamily: fonts.bodyMedium, fontSize: 15 },

  // photo
  photoBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 2,
    borderColor: colors.border,
    borderStyle: "dashed",
    paddingHorizontal: 14,
    height: 44,
    backgroundColor: colors.surfaceSecondary,
  },
  photoBtnText: { color: colors.onSurfaceSecondary, fontFamily: fonts.bodyMedium, fontSize: 12 },
  photoWrap: { width: 56, height: 56, borderWidth: 2, borderColor: colors.borderStrong },
  photoImg: { width: "100%", height: "100%" },
  photoRemove: {
    position: "absolute",
    top: -2,
    right: -2,
    backgroundColor: colors.error,
    width: 22,
    height: 22,
    alignItems: "center",
    justifyContent: "center",
  },

  // header
  header: { backgroundColor: colors.surface, borderBottomWidth: 2, borderBottomColor: colors.borderStrong, paddingBottom: 12, paddingHorizontal: 12 },
  headerRow: { flexDirection: "row", alignItems: "center" },
  headerBack: { width: 40, height: 40, alignItems: "flex-start", justifyContent: "center" },
  headerTitles: { flex: 1, alignItems: "center" },
  headerTitle: { color: colors.onSurface, fontFamily: fonts.display, fontSize: 16 },
  headerSubtitle: { color: colors.muted, fontFamily: fonts.body, fontSize: 11, marginTop: 2 },
  headerRight: { width: 40, alignItems: "flex-end", justifyContent: "center" },
}));
