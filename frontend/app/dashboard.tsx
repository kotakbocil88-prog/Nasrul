import { Image } from "expo-image";
import { useQuery } from "@tanstack/react-query";
import { useFocusEffect, useRouter } from "expo-router";
import { CaretRight, Drop, Leaf, MagnifyingGlass, Plant, SignOut, Tree } from "phosphor-react-native";
import { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/src/auth/auth-context";
import { api } from "@/src/api/client";
import { ScreenHeader, TextField } from "@/src/components/ui";
import { FORMS } from "@/src/config/forms";
import { draftMap } from "@/src/utils/draft";
import { makeStyles, useTheme } from "@/src/theme";
import { fonts } from "@/src/typography";

const EMPTY_IMG =
  "https://images.unsplash.com/photo-1568847811512-803314424fdc?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjY2NzV8MHwxfHNlYXJjaHwxfHxlbXB0eSUyMHN0YXRlJTIwaWxsdXN0cmF0aW9uJTIwY2xpcGJvYXJkfGVufDB8fHx8MTc4OTExMTk0Nnww&ixlib=rb-4.1.0&q=85";

const ICONS: Record<string, any> = { land_clearing: Tree, land_preparation: Drop, tanam: Plant, kesehatan: Leaf };

type Score = { standar: number; total: number; percent: number | null };
type Inspection = {
  id: string;
  form_type: string;
  form_title: string;
  header: Record<string, any>;
  created_at: string;
  score: Score;
};
type Stats = {
  total_inspections: number;
  overall_percent: number | null;
  estates: { estate: string; inspections: number; percent: number | null; samples: number }[];
};

const FILTERS = [{ key: "all", label: "SEMUA" }, ...FORMS.map((f) => ({ key: f.key, label: f.short }))];

function formatDate(iso: string) {
  try {
    const d = new Date(iso);
    return (
      d.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" }) +
      " " +
      d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })
    );
  } catch {
    return iso;
  }
}

function ScoreBadge({ percent, testID }: { percent: number | null; testID?: string }) {
  const styles = useStyles();
  const { colors } = useTheme();
  if (percent === null) return null;
  const bg = percent >= 80 ? colors.success : percent >= 50 ? colors.warning : colors.error;
  return (
    <View testID={testID} style={[styles.badge, { backgroundColor: bg }]}>
      <Text style={styles.badgeText}>{percent}%</Text>
    </View>
  );
}

export default function Dashboard() {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, logout } = useAuth();

  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [drafts, setDrafts] = useState<Record<string, boolean>>({});

  const { data, isLoading, refetch, isRefetching } = useQuery<Inspection[]>({
    queryKey: ["inspections"],
    queryFn: () => api("/inspections"),
  });
  const { data: stats, refetch: refetchStats } = useQuery<Stats>({
    queryKey: ["stats"],
    queryFn: () => api("/stats"),
  });

  useFocusEffect(
    useCallback(() => {
      draftMap(FORMS.map((f) => f.key)).then(setDrafts);
      refetch();
      refetchStats();
    }, [refetch, refetchStats]),
  );

  const filtered = useMemo(() => {
    if (!data) return [];
    const q = search.trim().toLowerCase();
    return data.filter((it) => {
      if (filter !== "all" && it.form_type !== filter) return false;
      if (!q) return true;
      const blok = String(it.header?.blok || "").toLowerCase();
      const kebun = String(it.header?.kebun || "").toLowerCase();
      const estate = String(it.header?.estate || "").toLowerCase();
      return blok.includes(q) || kebun.includes(q) || estate.includes(q);
    });
  }, [data, filter, search]);

  return (
    <View style={styles.root}>
      <ScreenHeader
        title="QC ESTATE AUDIT"
        subtitle={user?.name}
        right={
          <Pressable testID="logout-btn" onPress={logout} hitSlop={10}>
            <SignOut size={20} color={colors.onSurface} weight="bold" />
          </Pressable>
        }
      />

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.brandPrimary} />}
      >
        <Text style={styles.sectionLabel}>PILIH FORM INSPEKSI</Text>
        <View style={styles.grid}>
          {FORMS.map((f) => {
            const Icon = ICONS[f.key] ?? Leaf;
            return (
              <Pressable
                key={f.key}
                testID={`form-${f.key}`}
                style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
                onPress={() => router.push(`/inspection/new?formType=${f.key}`)}
              >
                {drafts[f.key] ? (
                  <View style={styles.draftTag} testID={`draft-tag-${f.key}`}>
                    <Text style={styles.draftTagText}>DRAFT</Text>
                  </View>
                ) : null}
                <Icon size={28} color={colors.onBrandSecondary} weight="bold" />
                <Text style={styles.cardText}>{f.short}</Text>
              </Pressable>
            );
          })}
        </View>

        {stats && stats.estates.length > 0 ? (
          <>
            <View style={styles.recapHead}>
              <Text style={styles.sectionLabel}>REKAP KUALITAS PER ESTATE</Text>
              {stats.overall_percent !== null ? (
                <Text style={styles.overall}>Total {stats.overall_percent}% Standar</Text>
              ) : null}
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.recapRow}>
              {stats.estates.map((e) => (
                <View key={e.estate} style={styles.recapCard} testID={`recap-${e.estate}`}>
                  <Text style={styles.recapEstate} numberOfLines={1}>{e.estate}</Text>
                  <Text style={styles.recapPercent}>{e.percent === null ? "-" : `${e.percent}%`}</Text>
                  <Text style={styles.recapMeta}>{e.inspections} inspeksi · {e.samples} sampel</Text>
                </View>
              ))}
            </ScrollView>
          </>
        ) : null}

        <Text style={[styles.sectionLabel, { marginTop: 24 }]}>RIWAYAT INSPEKSI</Text>

        <View style={styles.searchWrap}>
          <MagnifyingGlass size={16} color={colors.muted} weight="bold" />
          <View style={{ flex: 1 }}>
            <TextField testID="search-input" value={search} onChangeText={setSearch} placeholder="Cari Blok / Kebun / Estate" autoCapitalize="none" />
          </View>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow} style={styles.chipsScroll}>
          {FILTERS.map((c) => {
            const active = filter === c.key;
            return (
              <Pressable
                key={c.key}
                testID={`chip-${c.key}`}
                onPress={() => setFilter(c.key)}
                style={[styles.chip, active && styles.chipActive]}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{c.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {isLoading ? (
          <ActivityIndicator style={{ marginTop: 24 }} color={colors.brandPrimary} />
        ) : filtered.length === 0 ? (
          <View style={styles.empty} testID="empty-history">
            <Image source={{ uri: EMPTY_IMG }} style={styles.emptyImg} contentFit="cover" />
            <Text style={styles.emptyTitle}>
              {data && data.length > 0 ? "Tidak ada hasil" : "Belum ada data inspeksi"}
            </Text>
            <Text style={styles.emptySub}>
              {data && data.length > 0 ? "Ubah filter atau kata kunci pencarian." : "Pilih salah satu form di atas untuk mulai memeriksa."}
            </Text>
          </View>
        ) : (
          <View style={styles.list}>
            {filtered.map((it) => (
              <Pressable
                key={it.id}
                testID={`history-row-${it.id}`}
                style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
                onPress={() => router.push(`/inspection/${it.id}`)}
              >
                <View style={styles.rowLeft}>
                  <Text style={styles.rowTitle} numberOfLines={1}>{it.form_title}</Text>
                  <Text style={styles.rowMeta}>{it.header?.kebun || "-"} · Blok {it.header?.blok || "-"}</Text>
                  <Text style={styles.rowDate}>{formatDate(it.created_at)}</Text>
                </View>
                <ScoreBadge percent={it.score?.percent ?? null} testID={`score-${it.id}`} />
                <CaretRight size={18} color={colors.muted} weight="bold" />
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  root: { flex: 1, backgroundColor: colors.surface },
  content: { padding: 16 },
  sectionLabel: { color: colors.onSurfaceTertiary, fontFamily: fonts.bodyBold, fontSize: 11, letterSpacing: 1, marginBottom: 12 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  card: {
    width: "47.5%",
    aspectRatio: 1.35,
    backgroundColor: colors.brandSecondary,
    borderWidth: 2,
    borderColor: colors.borderStrong,
    padding: 14,
    justifyContent: "space-between",
  },
  cardPressed: { opacity: 0.8 },
  cardText: { color: colors.onBrandSecondary, fontFamily: fonts.display, fontSize: 14 },
  draftTag: { position: "absolute", top: 0, right: 0, backgroundColor: colors.warning, paddingHorizontal: 6, paddingVertical: 2 },
  draftTagText: { color: colors.onWarning, fontFamily: fonts.bodyBold, fontSize: 9, letterSpacing: 0.5 },

  recapHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 28 },
  overall: { color: colors.brandPrimary, fontFamily: fonts.bodyBold, fontSize: 11 },
  recapRow: { gap: 10, paddingVertical: 2, paddingRight: 8 },
  recapCard: { width: 140, borderWidth: 2, borderColor: colors.borderStrong, padding: 12, backgroundColor: colors.surface },
  recapEstate: { color: colors.onSurfaceSecondary, fontFamily: fonts.bodyMedium, fontSize: 11 },
  recapPercent: { color: colors.onSurface, fontFamily: fonts.display, fontSize: 26, marginVertical: 2 },
  recapMeta: { color: colors.muted, fontFamily: fonts.body, fontSize: 9 },

  searchWrap: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 },

  chipsScroll: { marginBottom: 16 },
  chipsRow: { gap: 8, paddingRight: 16 },
  chip: {
    height: 36,
    flexShrink: 0,
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
  },
  chipActive: { backgroundColor: colors.brandPrimary },
  chipText: { color: colors.onSurface, fontFamily: fonts.bodyMedium, fontSize: 11, letterSpacing: 0.5 },
  chipTextActive: { color: colors.onBrandPrimary, fontFamily: fonts.bodyBold },

  empty: { alignItems: "center", paddingVertical: 24 },
  emptyImg: { width: 120, height: 120, borderWidth: 2, borderColor: colors.borderStrong, marginBottom: 16 },
  emptyTitle: { color: colors.onSurface, fontFamily: fonts.displayMedium, fontSize: 15 },
  emptySub: { color: colors.muted, fontFamily: fonts.body, fontSize: 12, textAlign: "center", marginTop: 6, paddingHorizontal: 24 },
  list: { gap: 0 },
  row: { flexDirection: "row", alignItems: "center", paddingVertical: 14, borderBottomWidth: 2, borderBottomColor: colors.divider },
  rowPressed: { backgroundColor: colors.surfaceSecondary },
  rowLeft: { flex: 1, paddingRight: 8 },
  rowTitle: { color: colors.onSurface, fontFamily: fonts.bodyBold, fontSize: 13 },
  rowMeta: { color: colors.onSurfaceSecondary, fontFamily: fonts.body, fontSize: 11, marginTop: 3 },
  rowDate: { color: colors.muted, fontFamily: fonts.body, fontSize: 10, marginTop: 3 },
  badge: { paddingHorizontal: 8, paddingVertical: 4, marginRight: 8, borderWidth: 2, borderColor: colors.borderStrong },
  badgeText: { color: "#FFFFFF", fontFamily: fonts.bodyBold, fontSize: 11 },
}));
