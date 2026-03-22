import axios from "axios";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { ArrowLeft, Camera, Save } from "lucide-react-native";
import React, { useMemo, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Image,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { API_URL, useAuth } from "../../context/AuthContext";

export default function EditProfileScreen() {
    const { user, token, refreshUser } = useAuth();
    const router = useRouter();

    const [fullName, setFullName] = useState(user?.full_name || "");
    const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url || "");
    const [pickedImage, setPickedImage] = useState<ImagePicker.ImagePickerAsset | null>(null);
    const [loading, setLoading] = useState(false);

    const authHeaders = useMemo(() => (token ? { Authorization: `Bearer ${token}` } : {}), [token]);

    const pickAvatar = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.85,
        });

        if (!result.canceled && result.assets?.[0]) {
            setPickedImage(result.assets[0]);
            setAvatarUrl(result.assets[0].uri);
        }
    };

    const uploadAvatarIfNeeded = async () => {
        if (!pickedImage) return avatarUrl || "";

        const formData = new FormData();

        if (Platform.OS === "web") {
            const response = await fetch(pickedImage.uri);
            const blob = await response.blob();
            formData.append("image", blob, "avatar.jpg");
        } else {
            formData.append("image", {
                uri: pickedImage.uri,
                name: pickedImage.fileName || `avatar-${Date.now()}.jpg`,
                type: pickedImage.mimeType || "image/jpeg",
            } as any);
        }

        formData.append("folder", "event-ticket-app/avatars");

        const uploadRes = await axios.post(`${API_URL}/cloudinary/test-upload`, formData, {
            headers: {
                ...authHeaders,
                "Content-Type": "multipart/form-data",
            },
        });

        const secureUrl = uploadRes?.data?.data?.secure_url;
        if (!secureUrl) {
            throw new Error("Could not upload avatar image");
        }

        return secureUrl;
    };

    const handleSave = async () => {
        if (!user?._id) {
            Alert.alert("Error", "User not found.");
            return;
        }

        if (!fullName.trim()) {
            Alert.alert("Error", "Name is required.");
            return;
        }

        setLoading(true);
        try {
            const uploadedAvatarUrl = await uploadAvatarIfNeeded();

            await axios.put(
                `${API_URL}/users/${user._id}`,
                {
                    full_name: fullName.trim(),
                    avatar_url: uploadedAvatarUrl || "",
                },
                { headers: authHeaders }
            );

            await refreshUser();
            Alert.alert("Success", "Profile updated.", [{ text: "OK", onPress: () => router.back() }]);
        } catch (error: any) {
            console.error("Profile update failed:", error?.response?.data || error);
            Alert.alert("Error", error?.response?.data?.message || "Could not update profile.");
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
                <Text className="text-xl font-bold text-gray-900">Update Profile</Text>
            </View>

            <ScrollView className="flex-1" keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }}>
                <View className="items-center mb-6">
                    {avatarUrl ? (
                        <Image source={{ uri: avatarUrl }} className="w-28 h-28 rounded-full" />
                    ) : (
                        <View className="w-28 h-28 rounded-full bg-pink-200 items-center justify-center">
                            <Text className="text-4xl font-bold text-white">{(fullName || user?.full_name || "U").charAt(0).toUpperCase()}</Text>
                        </View>
                    )}

                    <TouchableOpacity className="mt-3 px-4 py-2 rounded-full bg-pink-50 border border-pink-200 flex-row items-center" onPress={pickAvatar}>
                        <Camera size={16} color="#FB96BB" />
                        <Text className="ml-2 text-pink-500 font-semibold">Change Avatar</Text>
                    </TouchableOpacity>
                </View>

                <Text className="text-gray-700 font-bold mb-2">Full name</Text>
                <TextInput
                    className="border border-gray-200 rounded-xl px-4 py-4 bg-gray-50 text-gray-800 text-base mb-4"
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

                <TouchableOpacity className="bg-pastel-pink py-4 rounded-xl flex-row justify-center items-center" onPress={handleSave} disabled={loading}>
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
