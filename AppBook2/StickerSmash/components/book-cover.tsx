import { Image } from "expo-image";
import React from "react";
import {
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from "react-native";

type Props = {
  uri?: string | null;
  title: string;
  style: StyleProp<ViewStyle>;
  fallbackColor?: string;
};

export function BookCover({
  uri,
  title,
  style,
  fallbackColor = "#79B8AF",
}: Props) {
  const [failedUri, setFailedUri] = React.useState<string | null>(null);
  const showImage = Boolean(uri) && uri !== failedUri;

  return (
    <View style={[styles.container, { backgroundColor: fallbackColor }, style]}>
      {showImage ? (
        <Image
          source={{ uri: uri || "" }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          transition={150}
          onError={() => setFailedUri(uri || null)}
          accessibilityLabel={`Ảnh bìa ${title}`}
        />
      ) : (
        <Text style={styles.fallbackText} numberOfLines={2}>
          {title.slice(0, 2).toUpperCase()}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  fallbackText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "800",
    textAlign: "center",
  },
});
