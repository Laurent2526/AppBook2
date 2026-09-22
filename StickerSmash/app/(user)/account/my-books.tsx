import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const books = [
  { title: "Theo Bố Đi Ở Rể", chapters: 24, readers: 1280 },
  { title: "Nữ Phụ Không Muốn Kết Cục Buồn", chapters: 18, readers: 864 },
];

export default function MyBooksScreen() {
  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Quản lý truyện</Text>
        {books.map((book) => (
          <Pressable key={book.title} style={styles.book}>
            <View style={styles.cover} />
            <View style={styles.info}>
              <Text style={styles.bookTitle}>{book.title}</Text>
              <Text style={styles.meta}>
                {book.chapters} chương · {book.readers} lượt đọc
              </Text>
              <Text style={styles.link}>Quản lý chương ›</Text>
            </View>
          </Pressable>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F6F7FB" },
  content: { padding: 20, gap: 14, backgroundColor: "#F6F7FB", flexGrow: 1 },
  title: { color: "#111827", fontSize: 28, fontWeight: "700", marginBottom: 8 },
  book: {
    flexDirection: "row",
    gap: 14,
    padding: 14,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
  },
  cover: {
    width: 62,
    height: 86,
    borderRadius: 10,
    backgroundColor: "#D7795D",
  },
  info: { flex: 1, justifyContent: "center", gap: 7 },
  bookTitle: { color: "#111827", fontSize: 16, fontWeight: "700" },
  meta: { color: "#6B7280", fontSize: 13 },
  link: { color: "#0F766E", fontSize: 13, fontWeight: "600" },
});
