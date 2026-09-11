import { Image } from "expo-image";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { CaretRight, Drop, Leaf, Plant, SignOut, Tree } from "phosphor-react-native";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/src/auth/auth-context";
import { api } from "@/src/api/client";
import { ScreenHeader } from "@/src/components/ui";
import { FORMS } from "@/src/config/forms";
import { makeStyles, useTheme } from "@/src/theme";
import { fonts } from "@/src/typography";

const EMPTY_IMG =
  "https://images.unsplash.com/photo-1568847811512-803314424fdc?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjY2NzV8MHwxfHNlYXJjaHwxfHxlbXB0eSUyMHN0YXRlJTIwaWxsdXN0cmF0aW9uJTIwY2xpcGJvYXJkfGVufDB8fHx8MTc4OTExMTk0Nnww&ixlib=rb-4.1.0&q=85";

const ICONS: Record<string, any> = { land_clearing: Tree, land_preparation: Drop, tanam: Plant, kesehatan: Leaf };

type Inspection = {
  id: string;
  form_type: string;
  form_title: string;
  header: Record<string, any>;
  created_at: string;
};

function formatDate(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" }) +
      " " + d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return iso;
  }
}

export default function Dashboard() {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, logout } = useAuth();

  const { data, isLoading, refetch, isRefetching } = useQuery<Inspection[]>({
    queryKey: ["inspections"],
    queryFn: () => api("/inspections"),
  });

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
                <Icon size={28} color={colors.onBrandSecondary} weight="bold" />
                <Text style={styles.cardText}>{f.short}</Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={[styles.sectionLabel, { marginTop: 28 }]}>RIWAYAT INSPEKSI</Text>

        {isLoading ? (
          <ActivityIndicator style={{ marginTop: 24 }} color={colors.brandPrimary} />
        ) : !data || data.length === 0 ? (
          <View style={styles.empty} testID="empty-history">
            <Image source={{ uri: EMPTY_IMG }} style={styles.emptyImg} contentFit="cover" />
            <Text style={styles.emptyTitle}>Belum ada data inspeksi</Text>
            <Text style={styles.emptySub}>Pilih salah satu form di atas untuk mulai memeriksa.</Text>
          </View>
        ) : (
          <View style={styles.list}>
            {data.map((it) => (
              <Pressable
                key={it.id}
                testID={`history-${it.id}`}
                style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
                onPress={() => router.push(`/inspection/${it.id}`)}
              >
                <View style={styles.rowLeft}>
                  <Text style={styles.rowTitle} numberOfLines={1}>{it.form_title}</Text>
                  <Text style={styles.rowMeta}>
                    {(it.header?.kebun || "-")} · Blok {it.header?.blok || "-"}
                  </Text>
                  <Text style={styles.rowDate}>{formatDate(it.created_at)}</Text>
                </View>
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
  empty: { alignItems: "center", paddingVertical: 24 },
  emptyImg: { width: 120, height: 120, borderWidth: 2, borderColor: colors.borderStrong, marginBottom: 16 },
  emptyTitle: { color: colors.onSurface, fontFamily: fonts.displayMedium, fontSize: 15 },
  emptySub: { color: colors.muted, fontFamily: fonts.body, fontSize: 12, textAlign: "center", marginTop: 6, paddingHorizontal: 24 },
  list: { gap: 0 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 2,
    borderBottomColor: colors.divider,
  },
  rowPressed: { backgroundColor: colors.surfaceSecondary },
  rowLeft: { flex: 1, paddingRight: 8 },
  rowTitle: { color: colors.onSurface, fontFamily: fonts.bodyBold, fontSize: 13 },
  rowMeta: { color: colors.onSurfaceSecondary, fontFamily: fonts.body, fontSize: 11, marginTop: 3 },
  rowDate: { color: colors.muted, fontFamily: fonts.body, fontSize: 10, marginTop: 3 },
}));
