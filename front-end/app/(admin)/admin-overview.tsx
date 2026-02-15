import { Link } from "expo-router";
import { User } from "lucide-react-native";
import { Text, TouchableOpacity, View } from "react-native";

export default function AdminScreen() {
    return (
        <View className="flex-1 justify-center items-center bg-white">
            <Text className="text-gray-800 text-2xl font-bold mb-4">Admin Dashboard</Text>
            <Text className="text-gray-500 mb-8">Manage Events & Users</Text>

            <Link href="/(admin)/profile" asChild>
                <TouchableOpacity className="flex-row items-center bg-gray-100 px-4 py-2 rounded-full">
                    <User size={20} color="#4B5563" />
                    <Text className="ml-2 text-gray-700 font-semibold">Go to Profile</Text>
                </TouchableOpacity>
            </Link>
        </View>
    );
}
