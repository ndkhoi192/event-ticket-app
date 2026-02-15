import { Text, View } from "react-native";

export default function HomeScreen() {
    return (
        <View className="flex-1 justify-center items-center bg-white">
            <Text className="text-pastel-blue text-2xl font-bold">Attendee Home</Text>
            <Text className="text-gray-500">Discover Events Here</Text>
        </View>
    );
}
