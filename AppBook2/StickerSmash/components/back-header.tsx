import { useRouter } from "expo-router";
import {
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from "react-native";

type BackHeaderProps = {
  title?: string;
  label?: string;
  style?: StyleProp<ViewStyle>;
  onBack?: () => void;
};

export function BackHeader({
  title,
  label = "Quay lại",
  style,
  onBack,
}: BackHeaderProps) {
  const router = useRouter();

  const handleBack = () => {
    if (onBack) {
      onBack();
      return;
    }
    router.back();
  };

  return (
    <View style={[styles.row, style]}>
      <Pressable onPress={handleBack} style={styles.button}>
        <Text style={styles.icon}>‹</Text>
        <Text style={styles.label}>{label}</Text>
      </Pressable>
      {title ? <Text style={styles.title}>{title}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 12,
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "#E8F7F5",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#CDEBE7",
  },
  icon: {
    color: "#0F766E",
    fontSize: 22,
    lineHeight: 22,
    fontWeight: "700",
    marginRight: 4,
  },
  label: {
    color: "#0F766E",
    fontSize: 15,
    fontWeight: "700",
  },
  title: {
    flex: 1,
    color: "#111827",
    fontSize: 22,
    fontWeight: "700",
    textAlign: "left",
  },
});
