import axios from "axios";
import { useRouter } from "expo-router";
import { ArrowLeft, Lock } from "lucide-react-native";
import React, { useMemo, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { API_URL, useAuth } from "../../context/AuthContext";

export default function ChangePasswordScreen() {
    const { token } = useAuth();
    const router = useRouter();

    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [loading, setLoading] = useState(false);

    const authHeaders = useMemo(() => (token ? { Authorization: `Bearer ${token}` } : {}), [token]);

    const handleChangePassword = async () => {
        if (!currentPassword || !newPassword || !confirmPassword) {
            Alert.alert("Error", "Please fill in all fields.");
            return;
        }

        if (newPassword.length < 6) {
            Alert.alert("Error", "New password must be at least 6 characters.");
            return;
        }

        if (newPassword !== confirmPassword) {
            Alert.alert("Error", "Confirm password does not match.");
            return;
        }

        setLoading(true);
        try {
            await axios.put(
                `${API_URL}/users/change-password`,
                {
                    current_password: currentPassword,
                    new_password: newPassword,
                },
                { headers: authHeaders }
            );

            setCurrentPassword("");
            setNewPassword("");
            setConfirmPassword("");

            Alert.alert("Success", "Password changed successfully.", [{ text: "OK", onPress: () => router.back() }]);
        } catch (error: any) {
            console.error("Change password failed:", error?.response?.data || error);
            Alert.alert("Error", error?.response?.data?.message || "Could not change password.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView className="flex-1 bg-white" behavior={Platform.OS === "ios" ? "padding" : "height"}>
            <View className="pt-12 pb-4 px-6 flex-row items-center border-b border-gray-100 mb-4">
                <TouchableOpacity onPress={() => router.back()} className="mr-4 p-2 bg-gray-50 rounded-full">
                    <ArrowLeft color="#FB96BB" size={24} />
                </TouchableOpacity>
                <Text className="text-xl font-bold text-gray-900">Change Password</Text>
            </View>

            <ScrollView className="flex-1" keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }}>
                <View className="mb-4">
                    <Text className="text-gray-700 font-bold mb-2">Current password</Text>
                    <TextInput
                        className="border border-gray-200 rounded-xl px-4 py-4 bg-gray-50 text-gray-800"
                        value={currentPassword}
                        onChangeText={setCurrentPassword}
                        secureTextEntry
                    />
                </View>

                <View className="mb-4">
                    <Text className="text-gray-700 font-bold mb-2">New password</Text>
                    <TextInput
                        className="border border-gray-200 rounded-xl px-4 py-4 bg-gray-50 text-gray-800"
                        value={newPassword}
                        onChangeText={setNewPassword}
                        secureTextEntry
                    />
                </View>

                <View className="mb-8">
                    <Text className="text-gray-700 font-bold mb-2">Confirm new password</Text>
                    <TextInput
                        className="border border-gray-200 rounded-xl px-4 py-4 bg-gray-50 text-gray-800"
                        value={confirmPassword}
                        onChangeText={setConfirmPassword}
                        secureTextEntry
                    />
                </View>

                <TouchableOpacity className="bg-pastel-blue py-4 rounded-xl flex-row justify-center items-center" onPress={handleChangePassword} disabled={loading}>
                    {loading ? (
                        <ActivityIndicator color="white" />
                    ) : (
                        <>
                            <Lock color="white" size={20} />
                            <Text className="text-white font-bold text-lg ml-2">Update Password</Text>
                        </>
                    )}
                </TouchableOpacity>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}
