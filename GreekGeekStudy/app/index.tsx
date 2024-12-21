import { Text, View, ScrollView } from "react-native";
import { Link, Redirect, router } from 'expo-router'
import { SafeAreaView } from "react-native-safe-area-context";
import { images } from "@/constants";
import { Image } from "react-native";
import { StatusBar } from "expo-status-bar";
import CustomButton from "@/components/CustomButton";
export default function Index() {
  return (
    <SafeAreaView className="bg-white h-full">
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
            title="Find your Organization"
            handlePress={() =>{router.push('/sign-in')}}
            containerStyles="w-full mt-7 mb-1"
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
