import { Text, View } from "react-native";
import { Link } from 'expo-router'

export default function Index() {
  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <Text>Greek Geek App out now</Text>

      <Link href="/profile">Profile</Link>
    </View>
  );
}
