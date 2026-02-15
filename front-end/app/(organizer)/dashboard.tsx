import { Text, View } from "react-native";

export default function DashboardScreen() {
    return (
        <View className="flex-1 justify-center items-center bg-white">
            <Text className="text-pastel-pink text-2xl font-bold">Organizer Dashboard</Text>
            <Text className="text-gray-500">Manage Your Events Here</Text>
        </View>
    );
}
