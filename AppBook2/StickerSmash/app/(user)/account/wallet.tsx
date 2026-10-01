import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { BackHeader } from "@/components/back-header";
import { getWallet } from "@/lib/account-api";

export default function WalletScreen() {
  const [balance, setBalance] = React.useState<string | number>(0);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let active = true;
    getWallet()
      .then((data) => {
        if (active) setBalance(data.wallet.balance);
      })
      .catch((error) => console.warn("wallet fetch failed", error))
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.content}>
        <BackHeader title="Ví tài khoản" />
        <View style={styles.balance}>
          <Text style={styles.label}>Số dư hiện tại</Text>
          <Text style={styles.amount}>
            {loading
              ? "Đang tải..."
              : `${Number(balance).toLocaleString("vi-VN")} đ`}
          </Text>
        </View>
        <Pressable style={styles.primary}>
          <Text style={styles.primaryText}>Nạp tiền</Text>
        </Pressable>
        <Pressable style={styles.secondary}>
          <Text style={styles.secondaryText}>Rút doanh thu</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F6F7FB" },
  content: { flex: 1, padding: 20, gap: 14, backgroundColor: "#F6F7FB" },
  title: { color: "#111827", fontSize: 28, fontWeight: "700", marginBottom: 8 },
  balance: { padding: 22, borderRadius: 18, backgroundColor: "#0F766E" },
  label: { color: "#D1FAE5", fontSize: 14 },
  amount: { color: "#FFFFFF", fontSize: 30, fontWeight: "700", marginTop: 10 },
  primary: {
    alignItems: "center",
    paddingVertical: 16,
    borderRadius: 14,
    backgroundColor: "#0F766E",
  },
  primaryText: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
  secondary: {
    alignItems: "center",
    paddingVertical: 16,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
  },
  secondaryText: { color: "#0F766E", fontSize: 16, fontWeight: "700" },
});
