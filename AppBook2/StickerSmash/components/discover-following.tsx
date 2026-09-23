import { Image } from "expo-image";
import { useRouter } from "expo-router";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { DiscoverBook, FollowingUser } from "@/lib/discover-api";

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
          <View style={styles.bookRow}>
            <View style={styles.cover}>
              <Text style={styles.coverText}>
                {book.title.slice(0, 2).toUpperCase()}
              </Text>
            </View>
            <View style={styles.bookCopy}>
              <Text style={styles.bookTitle} numberOfLines={2}>
                {book.title}
              </Text>
              <Text style={styles.bookMeta} numberOfLines={2}>
                {book.description || book.author || "Đang cập nhật"}
              </Text>
            </View>
            <Text style={styles.arrow}>›</Text>
          </View>
        </BookLink>
      ))}
    </View>
  );
}

export function FollowingFeed({
  users,
  saved,
}: {
  users: FollowingUser[];
  saved: DiscoverBook[];
}) {
  return (
    <View>
      <Text style={styles.title}>Người bạn đang theo dõi</Text>
      {users.length === 0 ? (
        <Text style={styles.empty}>Bạn chưa theo dõi người dùng nào.</Text>
      ) : (
        users.map((person) => (
          <View key={person.id} style={styles.personRow}>
            {person.avatarUrl ? (
              <Image source={person.avatarUrl} style={styles.avatar} />
            ) : (
              <View style={styles.avatarFallback}>
                <Text style={styles.avatarText}>
                  {person.name.slice(0, 1).toUpperCase()}
                </Text>
              </View>
            )}
            <View style={styles.personCopy}>
              <Text style={styles.personName}>{person.name}</Text>
              <Text style={styles.personMeta}>
                {person.latestBook?.title || "Chưa có truyện mới"}
              </Text>
            </View>
          </View>
        ))
      )}
      <Text style={[styles.title, styles.savedTitle]}>
        Truyện đã lưu và tủ truyện
      </Text>
      {saved.length === 0 ? (
        <Text style={styles.empty}>Tủ truyện của bạn đang trống.</Text>
      ) : (
        <BookList books={saved} />
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
  savedTitle: { marginTop: 22 },
  empty: { color: "#6B7E7B", lineHeight: 22, marginBottom: 22 },
  personRow: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  avatar: { width: 48, height: 48, borderRadius: 24 },
  avatarFallback: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#B8DDD8",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: "#166B67", fontSize: 20, fontWeight: "800" },
  personCopy: { paddingLeft: 12 },
  personName: { color: "#263B3A", fontWeight: "800" },
  personMeta: { color: "#6B7E7B", fontSize: 12, marginTop: 4 },
  bookRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    borderRadius: 18,
    padding: 12,
    marginBottom: 12,
    elevation: 1,
  },
  cover: {
    width: 62,
    height: 86,
    borderRadius: 10,
    backgroundColor: "#79B8AF",
    alignItems: "center",
    justifyContent: "center",
  },
  coverText: { color: "#FFF", fontSize: 18, fontWeight: "800" },
  bookCopy: { flex: 1, paddingHorizontal: 12 },
  bookTitle: { color: "#263B3A", fontWeight: "800", fontSize: 16 },
  bookMeta: { color: "#647674", fontSize: 12, lineHeight: 17, marginTop: 5 },
  arrow: { color: "#9CA3AF", fontSize: 28 },
});
