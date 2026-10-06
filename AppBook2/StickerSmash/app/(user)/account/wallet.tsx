import React from "react";
import { useFocusEffect } from "expo-router";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { BackHeader } from "@/components/back-header";
import {
  createDemoTopup,
  getWallet,
  getWalletEntries,
  Wallet,
  WalletEntry,
} from "@/lib/account-api";

const topupAmounts = ["50000", "100000", "200000", "500000", "1000000"];
const formatVnd = (amount: string | number) =>
  `${Number(amount).toLocaleString("vi-VN")} đ`;
const entryLabels: Record<string, string> = {
  topup: "Nạp tiền",
  purchase: "Mua chương",
  earning: "Tiền bán truyện",
  platform_fee: "Phí nền tảng",
  withdraw_hold: "Yêu cầu rút tiền",
  withdraw_done: "Hoàn tất rút tiền",
  withdraw_refund: "Hoàn tiền rút",
  refund_in: "Hoàn tiền mua hàng",
  refund_clawback: "Thu hồi doanh thu",
  admin_adjust: "Điều chỉnh số dư",
};

export default function WalletScreen() {
  const [wallet, setWallet] = React.useState<Wallet | null>(null);
  const [entries, setEntries] = React.useState<WalletEntry[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState("");
  const [entriesError, setEntriesError] = React.useState("");
  const [selectedAmount, setSelectedAmount] = React.useState("100000");
  const [customAmount, setCustomAmount] = React.useState("");
  const [topupLoading, setTopupLoading] = React.useState(false);
  const amountToTopup = customAmount || selectedAmount;

  useFocusEffect(
    React.useCallback(() => {
      let active = true;
      setLoading(true);
      setLoadError("");
      setEntriesError("");

      Promise.allSettled([getWallet(), getWalletEntries()])
        .then(([walletResult, entriesResult]) => {
          if (!active) return;
          if (walletResult.status === "fulfilled") {
            setWallet(walletResult.value.wallet);
          } else {
            setLoadError(
              walletResult.reason instanceof Error
                ? walletResult.reason.message
                : "Không tải được số dư ví.",
            );
          }
          if (entriesResult.status === "fulfilled") {
            setEntries(entriesResult.value.rows.slice(0, 10));
          } else {
            setEntriesError(
              entriesResult.reason instanceof Error
                ? entriesResult.reason.message
                : "Không tải được lịch sử giao dịch.",
            );
          }
        })
        .finally(() => {
          if (active) setLoading(false);
        });

      return () => {
        active = false;
      };
    }, []),
  );

  const handleDemoTopup = async () => {
    if (topupLoading) return;
    if (!/^\d+$/.test(amountToTopup) || Number(amountToTopup) <= 0) {
      Alert.alert("Số tiền không hợp lệ", "Nhập số tiền nguyên lớn hơn 0.");
      return;
    }
    setTopupLoading(true);
    try {
      const result = await createDemoTopup(amountToTopup);
      setWallet((current) =>
        current ? { ...current, balance: result.balance } : current,
      );
      const updatedEntries = await getWalletEntries();
      setEntries(updatedEntries.rows.slice(0, 10));
      Alert.alert(
        "Nạp tiền thành công",
        `Ví đã được cộng ${formatVnd(result.amount)}.`,
      );
    } catch (error) {
      Alert.alert(
        "Không thể nạp tiền",
        error instanceof Error ? error.message : "Vui lòng thử lại.",
      );
    } finally {
      setTopupLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <BackHeader title="Ví tài khoản" />
        <View style={styles.balance}>
          <Text style={styles.label}>Số dư hiện tại</Text>
          <Text style={styles.amount}>
            {loading
              ? "Đang tải..."
              : wallet
                ? formatVnd(wallet.balance)
                : "—"}
          </Text>
          {loadError ? <Text style={styles.error}>{loadError}</Text> : null}
        </View>
        {wallet ? (
          <View style={styles.summary}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Tổng đã nạp</Text>
              <Text style={styles.summaryValue}>
                {formatVnd(wallet.total_topup ?? 0)}
              </Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Tổng thu nhập</Text>
              <Text style={styles.summaryValue}>
                {formatVnd(wallet.total_earned ?? 0)}
              </Text>
            </View>
          </View>
        ) : null}
        <Text style={styles.sectionTitle}>Nhập số tiền muốn nạp</Text>
        <TextInput
          accessibilityLabel="Số tiền muốn nạp"
          style={styles.amountInput}
          value={customAmount}
          onChangeText={(value) => {
            setCustomAmount(value.replace(/\D/g, ""));
          }}
          placeholder="Nhập số tiền (VND)"
          keyboardType="number-pad"
          returnKeyType="done"
        />
        <Text style={styles.customAmountHint}>
          Nhập số tiền nguyên bằng VND, không giới hạn mức nạp.
        </Text>
        <Text style={styles.sectionTitle}>Hoặc chọn nhanh</Text>
        <View style={styles.amountGrid}>
          {topupAmounts.map((amount) => {
            const selected = !customAmount && amount === selectedAmount;
            return (
              <Pressable
                key={amount}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                style={[styles.amountOption, selected && styles.amountSelected]}
                onPress={() => {
                  setSelectedAmount(amount);
                  setCustomAmount("");
                }}
              >
                <Text
                  style={[
                    styles.amountText,
                    selected && styles.amountTextSelected,
                  ]}
                >
                  {formatVnd(amount)}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <Text style={styles.demoNote}>
          Chế độ demo: tiền được cộng trực tiếp vào ví, chưa phát sinh thanh
          toán thật.
        </Text>
        <Pressable
          style={[styles.primary, topupLoading && styles.disabled]}
          onPress={() => void handleDemoTopup()}
          disabled={topupLoading}
        >
          <Text style={styles.primaryText}>
            {topupLoading ? "Đang nạp..." : `Nạp ${formatVnd(amountToTopup)}`}
          </Text>
        </Pressable>
        <Text style={styles.sectionTitle}>Lịch sử giao dịch</Text>
        {entriesError ? (
          <Text style={styles.error}>{entriesError}</Text>
        ) : entries.length === 0 ? (
          <Text style={styles.emptyHistory}>
            {loading ? "Đang tải giao dịch..." : "Chưa có giao dịch."}
          </Text>
        ) : (
          <View style={styles.history}>
            {entries.map((entry) => (
              <View key={entry.id} style={styles.historyRow}>
                <View style={styles.historyCopy}>
                  <Text style={styles.historyTitle}>
                    {entry.reason
                      ? (entryLabels[entry.reason] ?? entry.reason)
                      : "Giao dịch"}
                  </Text>
                  <Text style={styles.historyDate}>
                    {new Date(entry.created_at ?? "").toLocaleString("vi-VN")}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.historyAmount,
                    entry.direction === "credit"
                      ? styles.credit
                      : styles.debit,
                  ]}
                >
                  {entry.direction === "credit" ? "+" : "-"}
                  {formatVnd(entry.amount)}
                </Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F6F7FB" },
  content: {
    flexGrow: 1,
    padding: 20,
    gap: 14,
    backgroundColor: "#F6F7FB",
  },
  title: { color: "#111827", fontSize: 28, fontWeight: "700", marginBottom: 8 },
  balance: { padding: 22, borderRadius: 12, backgroundColor: "#0F766E" },
  label: { color: "#D1FAE5", fontSize: 14 },
  amount: { color: "#FFFFFF", fontSize: 30, fontWeight: "700", marginTop: 10 },
  sectionTitle: {
    color: "#111827",
    fontSize: 16,
    fontWeight: "700",
    marginTop: 10,
  },
  amountGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  amountOption: {
    minWidth: "30%",
    flexGrow: 1,
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: "center",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    backgroundColor: "#FFFFFF",
  },
  amountSelected: { borderColor: "#0F766E", backgroundColor: "#E8F5F2" },
  amountInput: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    backgroundColor: "#FFFFFF",
    color: "#111827",
    fontSize: 18,
  },
  customAmountHint: { color: "#6B7280", fontSize: 12, lineHeight: 18 },
  amountText: { color: "#374151", fontSize: 14, fontWeight: "600" },
  amountTextSelected: { color: "#0F766E" },
  demoNote: { color: "#6B7280", fontSize: 12, lineHeight: 18 },
  summary: {
    flexDirection: "row",
    gap: 12,
  },
  summaryItem: {
    flex: 1,
    padding: 14,
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
  },
  summaryLabel: { color: "#6B7280", fontSize: 12 },
  summaryValue: {
    color: "#111827",
    fontSize: 16,
    fontWeight: "700",
    marginTop: 6,
  },
  primary: {
    alignItems: "center",
    paddingVertical: 16,
    borderRadius: 14,
    backgroundColor: "#0F766E",
  },
  primaryText: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
  disabled: { opacity: 0.6 },
  error: { color: "#FECACA", fontSize: 12, marginTop: 8 },
  emptyHistory: { color: "#6B7280", fontSize: 14 },
  history: {
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
  },
  historyRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E5E7EB",
  },
  historyCopy: { flex: 1, gap: 4 },
  historyTitle: { color: "#111827", fontSize: 14, fontWeight: "600" },
  historyDate: { color: "#6B7280", fontSize: 11 },
  historyAmount: { fontSize: 14, fontWeight: "700" },
  credit: { color: "#047857" },
  debit: { color: "#B91C1C" },
});
