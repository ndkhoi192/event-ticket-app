import { Text, View } from "react-native";
import LogoutButton from "../../components/LogoutButton";
import { useAuth } from "../../context/AuthContext";

export default function ProfileScreen() {
    const { user } = useAuth();

    return (
        <View className="flex-1 items-center bg-white pt-10 px-6">
            <View className="h-24 w-24 bg-pastel-pink rounded-full items-center justify-center mb-4 shadow-sm">
                <Text className="text-3xl font-bold text-white">
                    {user?.full_name?.charAt(0).toUpperCase() || "O"}
                </Text>
            </View>

            <Text className="text-2xl font-bold text-gray-800 mb-1">
                {user?.full_name || "Organizer Name"}
            </Text>
            <Text className="text-gray-500 text-base mb-2">{user?.email}</Text>
            <View className="bg-pink-50 px-3 py-1 rounded-full">
                <Text className="text-pastel-pink font-semibold capitalize">{user?.role || "Organizer"}</Text>
            </View>

            <View className="flex-1 w-full" />

            <LogoutButton />
        </View>
    );
}
