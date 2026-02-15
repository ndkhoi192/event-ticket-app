import { Text, View } from "react-native";

export default function AdminScreen() {
    return (
        <View className="flex-1 justify-center items-center bg-white">
            <Text className="text-gray-800 text-2xl font-bold">Admin Dashboard</Text>
            <Text className="text-gray-500">Manage Events & Users</Text>
        </View>
    );
}
