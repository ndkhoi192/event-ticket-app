import { useRouter } from "expo-router";
import { ChevronRight } from "lucide-react-native";
import { Alert, Text, TouchableOpacity, View } from "react-native";
import { useAuth } from "../../context/AuthContext";

export default function ProfileScreen() {
    const { user, logout } = useAuth();
    const router = useRouter();

    const openPlaceholder = (title: string) => {
        Alert.alert(title, "This section is coming soon.");
    };

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
                    <Text className="text-3xl font-bold text-white">
                        {user?.full_name?.charAt(0).toUpperCase() || "U"}
                    </Text>
                </View>
                <View className="flex-1">
                    <Text className="text-xl font-bold text-gray-900" numberOfLines={1}>
                        {user?.full_name || "User Name"}
                    </Text>
                    <Text className="text-gray-700 mt-1" numberOfLines={1}>{user?.email}</Text>
                    <Text className="text-gray-600 mt-1 capitalize">{user?.role || "Attendee"}</Text>
                </View>
            </View>

            <Text className="text-gray-900 font-bold text-xl mb-3">Settings</Text>
            <View className="bg-white rounded-2xl border border-gray-300 mb-5 overflow-hidden">
                {renderMenuItem("Update Profile", () => router.push("/(attendee)/edit-profile"))}
                {renderMenuItem("Change Password", () => openPlaceholder("Change Password"))}
                {renderMenuItem("Saved Events", () => router.push("/(attendee)/saved-events"))}
                {renderMenuItem("Subscription Center", () => openPlaceholder("Subscription Center"))}
                {renderMenuItem("Payment & Invoices", () => openPlaceholder("Payment & Invoices"), true)}
            </View>

            <Text className="text-gray-900 font-bold text-xl mb-3">Support</Text>
            <View className="bg-white rounded-2xl border border-gray-300 mb-8 overflow-hidden">
                {renderMenuItem("Help Center", () => router.push({ pathname: "/support/help-center", params: { from: "attendee-profile" } }))}
                {renderMenuItem("Terms of Service", () => router.push({ pathname: "/support/terms-of-service", params: { from: "attendee-profile" } }))}
                {renderMenuItem("Privacy Policy", () => router.push({ pathname: "/support/privacy-policy", params: { from: "attendee-profile" } }))}
                {renderMenuItem("About", () => router.push({ pathname: "/support/about", params: { from: "attendee-profile" } }), true)}
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
