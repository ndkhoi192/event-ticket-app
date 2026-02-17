import { useRouter } from "expo-router";
import { Text, TouchableOpacity, View } from "react-native";
import LogoutButton from "../../components/LogoutButton";
import { useAuth } from "../../context/AuthContext";

export default function ProfileScreen() {
    const { user } = useAuth();
    const router = useRouter();

    return (
        <View className="flex-1 items-center bg-white pt-10 px-6">
            <View className="h-24 w-24 bg-pastel-blue rounded-full items-center justify-center mb-4 shadow-sm">
                <Text className="text-3xl font-bold text-white">
                    {user?.full_name?.charAt(0).toUpperCase() || "U"}
                </Text>
            </View>

            <Text className="text-2xl font-bold text-gray-800 mb-1">
                {user?.full_name || "User Name"}
            </Text>
            <Text className="text-gray-500 text-base mb-2">{user?.email}</Text>
            <View className="bg-blue-50 px-3 py-1 rounded-full mb-8">
                <Text className="text-pastel-blue font-semibold capitalize">{user?.role || "Attendee"}</Text>
            </View>

            <View className="w-full space-y-4">
                <TouchableOpacity
                    className="w-full bg-gray-50 p-4 rounded-xl flex-row items-center justify-between"
                    onPress={() => router.push("/(attendee)/saved-events")}
                >
                    <View className="flex-row items-center">
                        <View className="w-10 h-10 bg-white rounded-full items-center justify-center mr-3 shadow-sm">
                            <Text>❤️</Text>
                        </View>
                        <Text className="text-gray-700 font-semibold text-lg">Saved Events</Text>
                    </View>
                    <Text className="text-gray-400">→</Text>
                </TouchableOpacity>

                {/* Other profile options can go here */}
            </View>

            <View className="flex-1 w-full" />
            {/* Spacer to push logout to bottom, though LogoutButton has mt-auto */}

            <LogoutButton />
        </View>
    );
}
