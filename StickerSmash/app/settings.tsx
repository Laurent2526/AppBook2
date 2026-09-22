import { Pressable, SafeAreaView, StyleSheet, Text, View } from "react-native";

export default function SettingsScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Cài đặt</Text>
        <Pressable style={styles.row}>
          <Text style={styles.label}>Thông báo</Text>
          <Text style={styles.value}>Bật</Text>
        </Pressable>
        <Pressable style={styles.row}>
          <Text style={styles.label}>Chế độ đọc</Text>
          <Text style={styles.value}>Sáng</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F7FA" },
  content: { flex: 1, padding: 24 },
  title: { color: "#111827", fontSize: 28, fontWeight: "700", marginBottom: 20 },
  row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 18, borderBottomWidth: 1, borderBottomColor: "#E5E7EB" },
  label: { color: "#111827", fontSize: 16 },
  value: { color: "#0F766E", fontSize: 16, fontWeight: "600" },
});
