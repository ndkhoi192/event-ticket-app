import { Text, View } from "react-native";
import LogoutButton from "../../components/LogoutButton";
import { useAuth } from "../../context/AuthContext";

export default function ProfileScreen() {
    const { user } = useAuth();

    return (
        <View className="flex-1 items-center bg-white pt-10 px-6">
            <View className="h-24 w-24 bg-gray-800 rounded-full items-center justify-center mb-4 shadow-sm">
                <Text className="text-3xl font-bold text-white">
                    {user?.full_name?.charAt(0).toUpperCase() || "A"}
                </Text>
            </View>

            <Text className="text-2xl font-bold text-gray-800 mb-1">
                {user?.full_name || "Admin"}
            </Text>
            <Text className="text-gray-500 text-base mb-2">{user?.email}</Text>
            <View className="bg-gray-100 px-3 py-1 rounded-full">
                <Text className="text-gray-600 font-semibold capitalize">{user?.role || "Admin"}</Text>
            </View>

            <View className="flex-1 w-full" />

            <LogoutButton />
        </View>
    );
}
