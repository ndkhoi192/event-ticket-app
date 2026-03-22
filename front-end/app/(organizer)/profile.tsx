import { useRouter } from "expo-router";
import { ChevronRight } from "lucide-react-native";
import { Image, Text, TouchableOpacity, View } from "react-native";
import { useAuth } from "../../context/AuthContext";

export default function ProfileScreen() {
    const { user, logout } = useAuth();
    const router = useRouter();

    const onLogout = async () => {
        await logout();
        router.replace("/(auth)/login");
    };

    const renderMenuItem = (label: string, onPress: () => void, isLast = false) => (
        <TouchableOpacity
            key={label}
            onPress={onPress}
            className={`flex-row items-center justify-between px-4 py-3 ${isLast ? "" : "border-b border-gray-200"}`}
        >
            <View className="flex-row items-center">
                <Text className="text-gray-700 text-base mr-3">◇</Text>
                <Text className="text-gray-800 font-medium text-[15px]">{label}</Text>
            </View>
            <ChevronRight size={18} color="#FB96BB" />
        </TouchableOpacity>
    );

    return (
        <View className="flex-1 bg-gray-100 pt-12 px-4 pb-8">
            <View className="bg-white rounded-3xl p-4 flex-row items-center mb-6 border border-pink-200">
                <View className="h-20 w-20 bg-pink-500 rounded-full items-center justify-center mr-4">
                    {user?.avatar_url ? (
                        <Image source={{ uri: user.avatar_url }} className="w-20 h-20 rounded-full" />
                    ) : (
                        <Text className="text-3xl font-bold text-white">
                            {user?.full_name?.charAt(0).toUpperCase() || "O"}
                        </Text>
                    )}
                </View>
                <View className="flex-1">
                    <Text className="text-xl font-bold text-gray-900" numberOfLines={1}>
                        {user?.full_name || "Event Admin"}
                    </Text>
                    <Text className="text-gray-700 mt-1" numberOfLines={1}>{user?.email}</Text>
                    <Text className="text-gray-600 mt-1 capitalize">{user?.role || "Organizer"}</Text>
                </View>
            </View>

            <Text className="text-gray-900 font-bold text-xl mb-3">Settings</Text>
            <View className="bg-white rounded-2xl border border-gray-300 mb-5 overflow-hidden">
                {renderMenuItem("Update Profile", () => router.push("/(organizer)/edit-profile"))}
                {renderMenuItem("Change Password", () => router.push("/(organizer)/change-password"))}
                {renderMenuItem("My Events", () => router.push("/(organizer)/dashboard"))}
            </View>

            <Text className="text-gray-900 font-bold text-xl mb-3">Support</Text>
            <View className="bg-white rounded-2xl border border-gray-300 mb-8 overflow-hidden">
                {renderMenuItem("Help Center", () => router.push({ pathname: "/support/[slug]", params: { slug: "help-center", from: "organizer-profile" } }))}
                {renderMenuItem("Terms of Service", () => router.push({ pathname: "/support/[slug]", params: { slug: "terms-of-service", from: "organizer-profile" } }))}
                {renderMenuItem("Privacy Policy", () => router.push({ pathname: "/support/[slug]", params: { slug: "privacy-policy", from: "organizer-profile" } }))}
                {renderMenuItem("About", () => router.push({ pathname: "/support/[slug]", params: { slug: "about", from: "organizer-profile" } }), true)}
            </View>

            <TouchableOpacity
                onPress={onLogout}
                className="mt-auto py-3 rounded-full border-2 border-pink-300 bg-white"
            >
                <Text className="text-center text-pink-600 font-bold text-lg">Log out</Text>
            </TouchableOpacity>
        </View>
    );
}
