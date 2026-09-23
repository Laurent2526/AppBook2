import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const transactions = [
  {
    label: "Nạp tiền vào ví",
    amount: "+100.000 đ",
    date: "Hôm nay",
    positive: true,
  },
  {
    label: "Mua chương 10",
    amount: "-500 đ",
    date: "Hôm qua",
    positive: false,
  },
];

export default function TransactionsScreen() {
  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Lịch sử giao dịch</Text>
        {transactions.map((transaction) => (
          <View
            key={`${transaction.label}-${transaction.date}`}
            style={styles.row}
          >
            <View>
              <Text style={styles.label}>{transaction.label}</Text>
              <Text style={styles.date}>{transaction.date}</Text>
            </View>
            <Text
              style={[styles.amount, transaction.positive && styles.positive]}
            >
              {transaction.amount}
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
});
