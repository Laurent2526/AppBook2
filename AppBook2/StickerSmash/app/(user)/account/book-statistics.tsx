import { useLocalSearchParams } from "expo-router";
import React from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { BackHeader } from "@/components/back-header";
import { getMyBookStatistics, MyBookStatistics } from "@/lib/account-api";

const formatVnd = (value: string | number) =>
  `${Number(value).toLocaleString("vi-VN")} đ`;

export default function BookStatisticsScreen() {
  const { bookId } = useLocalSearchParams<{ bookId?: string }>();
  const [statistics, setStatistics] = React.useState<MyBookStatistics | null>(
    null,
  );
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    if (!bookId) return;
    let active = true;
    getMyBookStatistics(String(bookId))
      .then(({ statistics: result }) => {
        if (active) setStatistics(result);
      })
      .catch((loadError) => {
        if (active)
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Không tải được thống kê.",
          );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [bookId]);

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <BackHeader title="Thống kê truyện" />
        {loading ? (
          <ActivityIndicator color="#0F766E" />
        ) : error ? (
          <Text style={styles.error}>{error}</Text>
        ) : statistics ? (
          <>
            <Text style={styles.bookTitle}>{statistics.title}</Text>
            <Text style={styles.status}>Trạng thái: {statistics.status}</Text>
            <View style={styles.grid}>
              <Metric
                label="Lượt đọc"
                value={statistics.views.toLocaleString("vi-VN")}
              />
              <Metric
                label="Chương đã bán"
                value={statistics.purchases.toLocaleString("vi-VN")}
              />
              <Metric
                label="Doanh thu người đăng"
                value={formatVnd(statistics.revenue)}
              />
              <Metric
                label="Người theo dõi"
                value={statistics.followers.toLocaleString("vi-VN")}
              />
            </View>
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F6F7FB" },
  content: { flexGrow: 1, padding: 20, gap: 12, backgroundColor: "#F6F7FB" },
  bookTitle: {
    color: "#111827",
    fontSize: 21,
    fontWeight: "800",
    marginTop: 14,
  },
  status: { color: "#6B7280", fontSize: 13 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 12 },
  metric: {
    width: "48%",
    minHeight: 112,
    justifyContent: "center",
    padding: 14,
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
  },
  metricValue: { color: "#0F766E", fontSize: 19, fontWeight: "800" },
  metricLabel: { color: "#6B7280", fontSize: 12, marginTop: 7 },
  error: { color: "#B44D4D", textAlign: "center", paddingVertical: 30 },
});
