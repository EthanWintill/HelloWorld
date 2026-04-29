import { Image, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Link, router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { API_URL, images } from "@/constants";

const featureChips = [
  { icon: "location-outline", label: "Verified areas" },
  { icon: "stats-chart-outline", label: "Live progress" },
  { icon: "trophy-outline", label: "Chapter ranks" },
] as const;

export default function Index() {
  return (
    <SafeAreaView className="bg-gg-bg flex-1">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 44 }}
      >
        <View className="flex-1 px-5 pt-2">
          <View className="flex-row items-center justify-between mb-4">
            <View className="flex-row items-center">
              <View className="h-11 w-11 rounded-2xl bg-gg-surface border border-gg-outlineVariant items-center justify-center">
                <Image
                  source={images.logoSmall}
                  className="h-8 w-8"
                  resizeMode="contain"
                />
              </View>
              <View className="ml-3">
                <Text className="font-psemibold text-gg-text text-[17px] leading-6">
                  GreekGeek
                </Text>
                <Text className="font-pregular text-gg-muted text-xs">
                  Study accountability
                </Text>
              </View>
            </View>
            <TouchableOpacity
              activeOpacity={0.86}
              onPress={() => router.push("/sign-in")}
              className="h-10 w-10 rounded-full bg-gg-surface border border-gg-outlineVariant items-center justify-center"
            >
              <Ionicons name="person-outline" size={19} color="#006b2c" />
            </TouchableOpacity>
          </View>

          <View className="bg-gg-primary rounded-[28px] overflow-hidden">
            <View className="px-4 pt-4 pb-3">
              <View className="self-start flex-row items-center rounded-full bg-white/15 px-3 py-1.5 mb-4">
                <Ionicons name="shield-checkmark-outline" size={15} color="#ffffff" />
                <Text className="font-pmedium text-white text-xs ml-1.5">
                  GPS verified study time
                </Text>
              </View>

              <Text className="font-psemibold text-white text-[29px] leading-9">
                Keep your chapter on track.
              </Text>
              <Text className="font-pregular text-white/85 text-sm leading-5 mt-2.5">
                Clock in at approved study areas, see requirement progress, and keep
                every member accountable from one clean dashboard.
              </Text>
            </View>

            <View className="mx-3 mb-3 rounded-[24px] bg-gg-surface p-3 border border-white/25">
              <View className="flex-row items-start justify-between">
                <View>
                  <Text className="font-pmedium text-gg-muted text-xs uppercase">
                    Current period
                  </Text>
                  <Text className="font-psemibold text-gg-text text-xl mt-1">
                    18.5 / 24 hrs
                  </Text>
                </View>
                <View className="rounded-full bg-gg-surfaceLow px-3 py-1 border border-gg-outlineVariant">
                  <Text className="font-pmedium text-gg-primary text-xs">On pace</Text>
                </View>
              </View>

              <View className="h-2.5 rounded-full bg-gg-surfaceHighest mt-3 overflow-hidden">
                <View className="h-full w-[77%] rounded-full bg-gg-primary" />
              </View>

              <View className="flex-row mt-3">
                <View className="flex-1 rounded-2xl bg-gg-surfaceLow border border-gg-outlineVariant p-3 mr-2">
                  <Ionicons name="map-outline" size={18} color="#006b2c" />
                  <Text className="font-psemibold text-gg-text text-sm mt-2">
                    Library
                  </Text>
                  <Text className="font-pregular text-gg-muted text-xs mt-0.5">
                    Active area
                  </Text>
                </View>
                <View className="flex-1 rounded-2xl bg-gg-surfaceLow border border-gg-outlineVariant p-3 ml-2">
                  <Ionicons name="people-outline" size={18} color="#006b2c" />
                  <Text className="font-psemibold text-gg-text text-sm mt-2">
                    42 members
                  </Text>
                  <Text className="font-pregular text-gg-muted text-xs mt-0.5">
                    Tracking hours
                  </Text>
                </View>
              </View>
            </View>
          </View>

          <View className="flex-row flex-wrap mt-3">
            {featureChips.map((chip) => (
              <View
                key={chip.label}
                className="flex-row items-center rounded-full bg-gg-surface border border-gg-outlineVariant px-3 py-2 mr-2 mb-2"
              >
                <Ionicons name={chip.icon} size={15} color="#006b2c" />
                <Text className="font-pmedium text-gg-muted text-xs ml-1.5">
                  {chip.label}
                </Text>
              </View>
            ))}
          </View>

          <View className="mt-5">
            <TouchableOpacity
              activeOpacity={0.88}
              onPress={() => router.push("/sign-up")}
              className="h-[52px] rounded-2xl bg-gg-primary flex-row items-center justify-center"
            >
              <Ionicons name="key-outline" size={19} color="#ffffff" />
              <Text className="font-psemibold text-white text-base ml-2">
                Register with Code
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.88}
              onPress={() => router.push("/sign-in")}
              className="h-[52px] rounded-2xl bg-gg-surface border border-gg-outlineVariant flex-row items-center justify-center mt-3"
            >
              <Text className="font-psemibold text-gg-primary text-base">
                Sign In
              </Text>
            </TouchableOpacity>

            <Link href={`${API_URL}register/`} className="mt-3 self-center">
              <Text className="font-pmedium text-gg-secondary text-sm">
                Register your organization
              </Text>
            </Link>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
