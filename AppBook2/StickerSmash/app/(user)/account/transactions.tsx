import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { BackHeader } from "@/components/back-header";
import { getWalletEntries } from "@/lib/account-api";

export default function TransactionsScreen() {
  const [transactions, setTransactions] = React.useState<any[]>([]);

  React.useEffect(() => {
    getWalletEntries()
      .then((data) => setTransactions(data.rows))
      .catch((error) => console.warn("transactions fetch failed", error));
  }, []);

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <BackHeader title="Lịch sử giao dịch" />
        {transactions.length === 0 && (
          <Text style={styles.empty}>Chưa có giao dịch.</Text>
        )}
        {transactions.map((transaction) => (
          <View key={transaction.id} style={styles.row}>
            <View>
              <Text style={styles.label}>
                {transaction.reason || transaction.note || "Biến động số dư"}
              </Text>
              <Text style={styles.date}>{transaction.created_at || ""}</Text>
            </View>
            <Text
              style={[
                styles.amount,
                transaction.direction === "credit" && styles.positive,
              ]}
            >
              {transaction.direction === "credit" ? "+" : "-"}
              {Number(transaction.amount).toLocaleString("vi-VN")} đ
            </Text>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F6F7FB" },
  content: { padding: 20, gap: 10, backgroundColor: "#F6F7FB", flexGrow: 1 },
  title: { color: "#111827", fontSize: 28, fontWeight: "700", marginBottom: 8 },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
  },
  label: { color: "#111827", fontSize: 15, fontWeight: "600" },
  date: { color: "#6B7280", fontSize: 12, marginTop: 4 },
  amount: { color: "#DC2626", fontSize: 14, fontWeight: "700" },
  positive: { color: "#0F766E" },
  empty: { color: "#6B7280", textAlign: "center", padding: 28 },
});
