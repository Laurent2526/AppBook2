import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import React from "react";
import {
    ActivityIndicator,
    PanResponder,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";

import { DiscoverBook, DiscoverGenre } from "@/lib/discover-api";

type Props = {
  books: DiscoverBook[];
  genres: DiscoverGenre[];
  selectedGenres: string[];
  onToggleGenre: (genreId: string) => void;
  onRefresh: () => void;
  loading: boolean;
  error: string | null;
  showGenrePicker: boolean;
};

function Cover({
  book,
  large = false,
}: {
  book: DiscoverBook;
  large?: boolean;
}) {
  return book.coverUrl ? (
    <Image
      source={book.coverUrl}
      style={large ? styles.largeCover : styles.cover}
      contentFit="cover"
    />
  ) : (
    <View
      style={[large ? styles.largeCover : styles.cover, styles.coverFallback]}
    >
      <Text style={styles.coverInitials}>
        {book.title.slice(0, 2).toUpperCase()}
      </Text>
    </View>
  );
}

function BookLink({
  book,
  children,
}: {
  book: DiscoverBook;
  children: React.ReactNode;
}) {
  const router = useRouter();
  return (
    <Pressable
      onPress={() =>
        router.push({ pathname: "/book-detail", params: { id: book.id } })
      }
    >
      {children}
    </Pressable>
  );
}

function BookList({ books }: { books: DiscoverBook[] }) {
  return (
    <View>
      {books.map((book) => (
        <BookLink book={book} key={book.id}>
          <View style={styles.listCard}>
            <Cover book={book} large />
            <View style={styles.listCopy}>
              <Text style={styles.listTitle} numberOfLines={2}>
                {book.title}
              </Text>
              <Text style={styles.listDescription} numberOfLines={3}>
                {book.description || "Chưa có mô tả cho truyện này."}
              </Text>
              <Text style={styles.listMeta}>
                {book.author || book.category || "Đang cập nhật"}
              </Text>
            </View>
            <MaterialIcons name="chevron-right" size={24} color="#9CA3AF" />
          </View>
        </BookLink>
      ))}
    </View>
  );
}

export function RecommendationsFeed({
  books,
  genres,
  selectedGenres,
  onToggleGenre,
  onRefresh,
  loading,
  error,
  showGenrePicker,
}: Props) {
  const [selectedIndex, setSelectedIndex] = React.useState(0);
  const visibleBooks = books.slice(0, 5);
  const safeSelectedIndex = visibleBooks.length
    ? Math.min(selectedIndex, visibleBooks.length - 1)
    : 0;
  const selectedBook = visibleBooks[safeSelectedIndex];
  const shelf = books.slice(5);
  const swipeResponder = PanResponder.create({
    onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dx) > 12,
    onPanResponderRelease: (_, gesture) => {
      if (visibleBooks.length === 0) return;
      if (gesture.dx < -40)
        setSelectedIndex((index) => (index + 1) % visibleBooks.length);
      if (gesture.dx > 40)
        setSelectedIndex(
          (index) => (index - 1 + visibleBooks.length) % visibleBooks.length,
        );
    },
  });

  if (showGenrePicker) {
    return (
      <View>
        <Text style={styles.title}>Bạn quan tâm tới thể loại nào?</Text>
        <Text style={styles.subtitle}>
          Chọn ít nhất một thể loại để nhận gợi ý phù hợp.
        </Text>
        <View style={styles.genreGrid}>
          {genres.map((genre) => {
            const selected = selectedGenres.includes(genre.id);
            return (
              <Pressable
                key={genre.id}
                onPress={() => onToggleGenre(genre.id)}
                style={[styles.genreChip, selected && styles.genreChipSelected]}
              >
                <Text
                  style={[
                    styles.genreText,
                    selected && styles.genreTextSelected,
                  ]}
                >
                  {genre.name}
                </Text>
                {selected && (
                  <MaterialIcons name="check" size={16} color="#FFFFFF" />
                )}
              </Pressable>
            );
          })}
        </View>
        {selectedGenres.length === 0 && (
          <Text style={styles.validation}>
            Vui lòng chọn ít nhất một thể loại.
          </Text>
        )}
        <Text style={styles.hint}>
          Các gợi ý sẽ được cập nhật theo lựa chọn và dữ liệu truyện mới.
        </Text>
      </View>
    );
  }

  if (loading)
    return (
      <View style={styles.state}>
        <ActivityIndicator color="#168A83" />
        <Text style={styles.stateText}>Đang cập nhật dữ liệu...</Text>
      </View>
    );
  if (error)
    return (
      <View style={styles.state}>
        <Text style={styles.errorText}>{error}</Text>
        <Pressable onPress={onRefresh}>
          <Text style={styles.retry}>Thử lại</Text>
        </Pressable>
      </View>
    );

  return (
    <View>
      <View style={styles.headingRow}>
        <Text style={styles.title}>Gợi ý dành riêng cho bạn</Text>
        <Pressable accessibilityLabel="Tải thêm đề xuất" onPress={onRefresh}>
          <MaterialIcons name="autorenew" size={26} color="#168A83" />
        </Pressable>
      </View>
      {selectedBook ? (
        <View {...swipeResponder.panHandlers} style={styles.featureCard}>
          <BookLink book={selectedBook}>
            <View style={styles.featureCopy}>
              <Text style={styles.featureTitle} numberOfLines={2}>
                {selectedBook.title}
              </Text>
              <Text style={styles.featureDescription} numberOfLines={4}>
                {selectedBook.description || "Đang cập nhật mô tả truyện."}
              </Text>
              <Text style={styles.readMore}>Mở chi tiết →</Text>
            </View>
            <Cover book={selectedBook} />
          </BookLink>
        </View>
      ) : (
        <Text style={styles.emptyText}>Chưa có dữ liệu đề xuất phù hợp.</Text>
      )}
      <Text style={styles.title}>Khám phá thêm</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.arc}
      >
        {visibleBooks.map((book, index) => (
          <BookLink book={book} key={book.id}>
            <View
              style={[
                styles.arcItem,
                { transform: [{ translateY: Math.abs(index - 2) * 18 }] },
              ]}
            >
              <View
                style={[
                  styles.arcCircle,
                  safeSelectedIndex === index && styles.arcCircleActive,
                ]}
              >
                <Cover book={book} />
              </View>
              <Text style={styles.arcTitle} numberOfLines={1}>
                {book.title}
              </Text>
            </View>
          </BookLink>
        ))}
      </ScrollView>
      <Text style={styles.title}>Danh sách mới cập nhật</Text>
      {shelf.length ? (
        <BookList books={shelf} />
      ) : (
        <Text style={styles.emptyText}>Chưa có truyện mới cập nhật.</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  title: {
    color: "#263B3A",
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 14,
  },
  subtitle: { color: "#647674", lineHeight: 22, marginBottom: 22 },
  headingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  genreGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  genreChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: "#B7D4D0",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: "#FFFFFF",
  },
  genreChipSelected: { backgroundColor: "#168A83", borderColor: "#168A83" },
  genreText: { color: "#496360", fontWeight: "600" },
  genreTextSelected: { color: "#FFFFFF" },
  validation: { color: "#B44D4D", marginTop: 18 },
  hint: { color: "#78908D", fontSize: 12, lineHeight: 18, marginTop: 22 },
  featureCard: {
    minHeight: 190,
    borderRadius: 22,
    backgroundColor: "#D9EFEC",
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 28,
  },
  featureCopy: { flex: 1, paddingRight: 14 },
  featureTitle: {
    color: "#193B39",
    fontSize: 19,
    fontWeight: "800",
    lineHeight: 25,
  },
  featureDescription: {
    color: "#58706E",
    fontSize: 13,
    lineHeight: 19,
    marginTop: 9,
  },
  readMore: { color: "#168A83", fontWeight: "800", marginTop: 12 },
  cover: { width: 92, height: 138, borderRadius: 10 },
  largeCover: { width: 76, height: 108, borderRadius: 10 },
  coverFallback: {
    backgroundColor: "#79B8AF",
    alignItems: "center",
    justifyContent: "center",
    padding: 8,
  },
  coverInitials: {
    color: "#FFF",
    fontSize: 22,
    fontWeight: "800",
    textAlign: "center",
  },
  arc: { gap: 14, paddingVertical: 4, paddingHorizontal: 6, marginBottom: 28 },
  arcItem: { width: 96, alignItems: "center" },
  arcCircle: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: "#FFF",
    padding: 5,
    elevation: 2,
  },
  arcCircleActive: { borderWidth: 3, borderColor: "#168A83" },
  arcTitle: { color: "#405452", fontSize: 11, marginTop: 6 },
  listCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    borderRadius: 18,
    padding: 12,
    marginBottom: 12,
    elevation: 1,
  },
  listCopy: { flex: 1, paddingHorizontal: 12 },
  listTitle: { color: "#263B3A", fontWeight: "800", fontSize: 16 },
  listDescription: {
    color: "#647674",
    fontSize: 12,
    lineHeight: 17,
    marginTop: 5,
  },
  listMeta: { color: "#168A83", fontSize: 12, marginTop: 7 },
  state: { alignItems: "center", paddingVertical: 80, gap: 12 },
  stateText: { color: "#647674" },
  errorText: { color: "#B44D4D", textAlign: "center" },
  retry: { color: "#168A83", fontWeight: "800" },
  emptyText: { color: "#6B7E7B", lineHeight: 22, marginBottom: 22 },
});
