import axios from "axios";
import { useRouter } from "expo-router";
import { ArrowLeft, Save } from "lucide-react-native";
import React, { useState } from "react";
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";
import { API_URL, useAuth } from "../../context/AuthContext";

export default function EditProfileScreen() {
    const { user, token, refreshUser } = useAuth();
    const router = useRouter();

    const [fullName, setFullName] = useState(user?.full_name || "");
    const [loading, setLoading] = useState(false);

    const handleSave = async () => {
        if (!fullName.trim()) {
            Alert.alert("Error", "Name is required.");
            return;
        }

        setLoading(true);
        try {
            await axios.put(`${API_URL}/users/${user?._id}`, {
                full_name: fullName,
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            await refreshUser();
            Alert.alert("Success", "Profile updated.", [
                { text: "OK", onPress: () => router.back() }
            ]);
        } catch (error) {
            console.error("Profile update failed:", error);
            Alert.alert("Error", "Could not update profile.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            className="flex-1 bg-white"
            behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
            <View className="pt-12 pb-4 px-6 flex-row items-center border-b border-gray-100 mb-6">
                <TouchableOpacity onPress={() => router.back()} className="mr-4 p-2 bg-gray-50 rounded-full">
                    <ArrowLeft color="#FB96BB" size={24} />
                </TouchableOpacity>
                <Text className="text-xl font-bold text-gray-900">Edit Profile</Text>
            </View>

            <ScrollView className="flex-1" keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }}>
                <Text className="text-gray-700 font-bold mb-2">Full name</Text>
                <TextInput
                    className="border border-gray-200 rounded-xl px-4 py-4 bg-gray-50 text-gray-800 text-base mb-4 focus:border-pastel-pink"
                    value={fullName}
                    onChangeText={setFullName}
                    placeholder="Enter full name"
                />

                <Text className="text-gray-700 font-bold mb-2">Email (read-only)</Text>
                <TextInput
                    className="border border-gray-200 rounded-xl px-4 py-4 bg-gray-100 text-gray-500 text-base mb-8"
                    value={user?.email}
                    editable={false}
                />

                <TouchableOpacity
                    className="bg-pastel-pink py-4 rounded-xl flex-row justify-center items-center shadow-sm"
                    onPress={handleSave}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color="white" />
                    ) : (
                        <>
                            <Save color="white" size={20} />
                            <Text className="text-white font-bold text-lg ml-2">Save Changes</Text>
                        </>
                    )}
                </TouchableOpacity>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

