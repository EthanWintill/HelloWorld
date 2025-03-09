import { Text, View, ScrollView, StyleSheet } from "react-native";
import { Link, Redirect, router } from 'expo-router'
import { SafeAreaView } from "react-native-safe-area-context";
import { images } from "@/constants";
import { Image } from "react-native";
import { StatusBar } from "expo-status-bar";
import CustomButton from "@/components/CustomButton";
import { usePushNotifications } from "@/hooks/usePushNotifications";
export default function Index() {
  const { expoPushToken, notification } = usePushNotifications();
  const data = JSON.stringify(notification, undefined, 2);
  return (
    <SafeAreaView className="bg-white h-full">
      <View style={styles.container}>
      <Text>Token: {expoPushToken?.data ?? ""}</Text>
      <Text>Notification: {data}</Text>
    </View>
      <ScrollView contentContainerStyle={{height: '100%'}}>
      <View className="w-full justify-center items-center px-4">

      
      
        <Image
          source={images.logo}  
          className="w-[250px] h-[160px]" // Increased the size of the logo
          resizeMode="contain"
        />
        </View>
      <View>
        
        <View className="w-full items-center justify-normal min-h-[85vh] px-4">
            
          

          <View className="relative mt-5 w-full">
            <Text className="text-3xl text-black font-bold text-center">
              Welcome to your chapter's
              <Text className="text-green-500"> Study Scorecard</Text>
            </Text>

          </View>

          <Text className="text-sm font-pregular text-gray-700 mt-7 text-center">Where academics meet accountability: Discover how your organization can achieve and exceed GPA requirements with GreekGeek.</Text>
          
            <View className="absolute bottom-20 items-center w-full mb-20">
            <CustomButton
            title="Register with Code"
            handlePress={() =>{router.push('/sign-up')}}
            containerStyles="w-full mt-7 mb-1"
            />
            <CustomButton
            title="Sign In"
            handlePress={() =>{router.push('/sign-in')}}
            containerStyles="w-full mt-3 mb-2"
            />
            <Link href="https://www.google.com">
            <Text className="text-m font-pregular text-blue-500 underline text-center">Register your organization</Text>
            </Link>
            </View>
       
        </View>
        
      </View>
      
      </ScrollView>
      
    </SafeAreaView>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
});