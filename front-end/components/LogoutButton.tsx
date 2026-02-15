import { useRouter } from "expo-router";
import { LogOut } from "lucide-react-native";
import React from "react";
import { Text, TouchableOpacity } from "react-native";
import { useAuth } from "../context/AuthContext";

export default function LogoutButton() {
    const { logout } = useAuth();
    const router = useRouter();

    const handleLogout = async () => {
        try {
            await logout();
            router.replace("/(auth)/login");
        } catch (error) {
            console.error("Logout failed", error);
        }
    };

    return (
        <TouchableOpacity
            onPress={handleLogout}
            className="flex-row items-center bg-red-100 px-6 py-3 rounded-full mt-auto mb-6"
        >
            <LogOut size={20} color="#EF4444" />
            <Text className="ml-2 text-red-500 font-bold text-lg">Logout</Text>
        </TouchableOpacity>
    );
}
