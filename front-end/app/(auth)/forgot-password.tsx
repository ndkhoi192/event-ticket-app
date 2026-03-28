import axios from "axios";
import { Link, useRouter } from "expo-router";
import { ArrowLeft, Mail } from "lucide-react-native";
import React, { useState } from "react";
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
import { API_URL } from "../../context/AuthContext";

export default function ForgotPasswordScreen() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const isValidEmail = (value: string) => /\S+@\S+\.\S+/.test(value);

    const handleForgotPassword = async () => {
        const normalizedEmail = email.trim().toLowerCase();

        if (!normalizedEmail) {
            Alert.alert("Error", "Please enter your email");
            return;
        }

        if (!isValidEmail(normalizedEmail)) {
            Alert.alert("Error", "Please enter a valid email address");
            return;
        }

        setIsSubmitting(true);
        try {
            const response = await axios.post(`${API_URL}/auth/forgot-password`, {
                email: normalizedEmail,
            });

            const message = response?.data?.message || "If an account exists, a new password has been sent to email.";
            Alert.alert("Request Sent", message, [{ text: "OK", onPress: () => router.push("/(auth)/login") }]);
        } catch (error: any) {
            Alert.alert("Error", error?.response?.data?.message || "Could not process forgot password request");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            className="flex-1 bg-white"
        >
            <ScrollView
                contentContainerStyle={{ flexGrow: 1, justifyContent: "center", paddingHorizontal: 24 }}
                keyboardShouldPersistTaps="handled"
            >
                <TouchableOpacity
                    className="w-10 h-10 items-center justify-center rounded-full bg-gray-100 mb-6"
                    onPress={() => router.push("/(auth)/login")}
                >
                    <ArrowLeft size={20} color="#111827" />
                </TouchableOpacity>

                <View className="items-center mb-10">
                    <Text className="text-3xl font-bold text-pastel-blue mb-2">Forgot Password</Text>
                    <Text className="text-gray-500 text-base text-center">Enter your email to receive a new temporary password</Text>
                </View>

                <View className="space-y-4">
                    <View className="flex-row items-center border border-pastel-blue rounded-full px-4 py-3 bg-pink-50">
                        <Mail color="#FB96BB" size={20} />
                        <TextInput
                            className="flex-1 ml-3 text-gray-700"
                            placeholder="Email Address"
                            placeholderTextColor="#FB96BB"
                            value={email}
                            onChangeText={setEmail}
                            autoCapitalize="none"
                            keyboardType="email-address"
                        />
                    </View>

                    <TouchableOpacity
                        className="bg-pastel-blue rounded-full py-4 items-center shadow-md active:opacity-90 mt-4"
                        onPress={handleForgotPassword}
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? (
                            <ActivityIndicator color="white" />
                        ) : (
                            <Text className="text-white font-bold text-lg">Send New Password</Text>
                        )}
                    </TouchableOpacity>

                    <View className="flex-row justify-center mt-6">
                        <Text className="text-gray-500">Remembered password? </Text>
                        <Link href="/(auth)/login" asChild>
                            <TouchableOpacity>
                                <Text className="text-pastel-pink font-bold">Back to Login</Text>
                            </TouchableOpacity>
                        </Link>
                    </View>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}
