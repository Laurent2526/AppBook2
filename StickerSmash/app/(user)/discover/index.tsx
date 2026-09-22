import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useRouter } from "expo-router";
import React from "react";
import {
    Alert,
    Pressable,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";

import { useAuth } from "@/components/auth-provider";
import { FollowingFeed } from "@/components/discover-following";
import { RecommendationsFeed } from "@/components/discover-recommendations";
import {
    DiscoverBook,
    DiscoverGenre,
    FollowingUser,
    getFollowingFeed,
    getGenres,
    getRecommendations,
} from "@/lib/discover-api";

type FeedTab = "Đề xuất" | "Theo dõi";

export default function DiscoverScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = React.useState<FeedTab>("Đề xuất");
  const [genres, setGenres] = React.useState<DiscoverGenre[]>([]);
  const [selectedGenres, setSelectedGenres] = React.useState<string[]>([]);
  const [recommendations, setRecommendations] = React.useState<DiscoverBook[]>(
    [],
  );
  const [following, setFollowing] = React.useState<FollowingUser[]>([]);
  const [saved, setSaved] = React.useState<DiscoverBook[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const userId = user?.id;
  const showGenrePicker = selectedGenres.length === 0;

  const loadGenres = React.useCallback(async () => {
    try {
      const result = await getGenres();
      setGenres(result.genres);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Không thể tải thể loại truyện.",
      );
    }
  }, []);

  const loadRecommendations = React.useCallback(async () => {
    if (selectedGenres.length === 0) return;
    setLoading(true);
    setError(null);
    try {
      const result = await getRecommendations(userId, selectedGenres);
      setRecommendations(result.recommendations);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Không thể tải dữ liệu đề xuất.",
      );
    } finally {
      setLoading(false);
    }
  }, [selectedGenres, userId]);

  const loadFollowing = React.useCallback(async () => {
    if (!userId) {
      setLoading(false);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await getFollowingFeed(userId);
      setFollowing(result.following);
      setSaved(result.saved);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Không thể tải dữ liệu theo dõi.",
      );
    } finally {
      setLoading(false);
    }
  }, [userId]);

  React.useEffect(() => {
    // Synchronize the public genre catalog with the remote API.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadGenres();
  }, [loadGenres]);

  React.useEffect(() => {
    if (activeTab === "Đề xuất") {
      // Synchronize the active tab with its remote feed.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      void loadRecommendations();
    } else {
      void loadFollowing();
    }
  }, [activeTab, loadFollowing, loadRecommendations]);

  const toggleGenre = (genreId: string) => {
    setSelectedGenres((current) =>
      current.includes(genreId)
        ? current.filter((id) => id !== genreId)
        : [...current, genreId],
    );
  };

  const handleTabChange = (tab: FeedTab) => {
    if (tab === "Theo dõi" && !userId) {
      Alert.alert(
        "Yêu cầu đăng nhập",
        "Bạn cần đăng nhập để xem người dùng đang theo dõi và tủ truyện.",
        [
          { text: "Hủy", style: "cancel" },
          { text: "Đăng nhập", onPress: () => router.push("/auth") },
        ],
      );
      return;
    }
    setActiveTab(tab);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topBar}>
          <View style={styles.tabs}>
            {(["Đề xuất", "Theo dõi"] as FeedTab[]).map((tab) => (
              <Pressable
                key={tab}
                onPress={() => handleTabChange(tab)}
                style={[styles.tab, activeTab === tab && styles.activeTab]}
              >
                <Text
                  style={[
                    styles.tabText,
                    activeTab === tab && styles.activeTabText,
                  ]}
                >
                  {tab}
                </Text>
              </Pressable>
            ))}
          </View>
          <Pressable
            accessibilityLabel="Tải lại"
            style={styles.refresh}
            onPress={() =>
              activeTab === "Đề xuất"
                ? void loadRecommendations()
                : void loadFollowing()
            }
          >
            <MaterialIcons name="refresh" size={24} color="#166B67" />
          </Pressable>
        </View>
        {activeTab === "Đề xuất" ? (
          <RecommendationsFeed
            books={recommendations}
            genres={genres}
            selectedGenres={selectedGenres}
            onToggleGenre={toggleGenre}
            onRefresh={() => void loadRecommendations()}
            loading={loading}
            error={error}
            showGenrePicker={showGenrePicker}
          />
        ) : loading ? (
          <Text style={styles.state}>Đang cập nhật dữ liệu...</Text>
        ) : error ? (
          <View style={styles.state}>
            <Text style={styles.error}>{error}</Text>
            <Pressable onPress={() => void loadFollowing()}>
              <Text style={styles.retry}>Thử lại</Text>
            </Pressable>
          </View>
        ) : (
          <FollowingFeed users={following} saved={saved} />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F4F8F7" },
  content: { padding: 18, paddingBottom: 36 },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 26,
  },
  tabs: {
    flexDirection: "row",
    backgroundColor: "#E1ECEA",
    borderRadius: 24,
    padding: 4,
  },
  tab: {
    minHeight: 40,
    paddingHorizontal: 18,
    borderRadius: 20,
    justifyContent: "center",
  },
  activeTab: { backgroundColor: "#168A83" },
  tabText: { color: "#57706D", fontWeight: "700" },
  activeTabText: { color: "#FFFFFF" },
  refresh: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#D8F1EE",
    alignItems: "center",
    justifyContent: "center",
  },
  state: { color: "#647674", textAlign: "center", paddingVertical: 80 },
  error: { color: "#B44D4D", textAlign: "center" },
  retry: {
    color: "#168A83",
    fontWeight: "800",
    textAlign: "center",
    marginTop: 12,
  },
});
