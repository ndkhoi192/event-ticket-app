import { Link, useRouter } from "expo-router";
import { Lock, Mail } from "lucide-react-native";
import React, { useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { useAuth } from "../../context/AuthContext";

export default function LoginScreen() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const { login } = useAuth();
    const router = useRouter();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleLogin = async () => {
        if (!email || !password) {
            Alert.alert("Error", "Please fill in all fields");
            return;
        }

        setIsSubmitting(true);
        try {
            console.log("Attempting login with:", email);
            // login needs to return the user OR we need to fetch it
            // I am updating AuthContext to return the user data from login function
            // But since I cannot edit AuthContext and LoginScreen atomically in one 'write_to_file',
            // I will assume AuthContext will be updated to return the user.
            // IF NOT, I will have to rely on 'user' from useAuth, but that might be stale here.
            // Let's rely on the result of the promise if I change AuthContext.
            // Actually, I'll update LoginScreen to expect the user object returned from login().

            const user = await login(email, password);
            console.log("Login successful, user:", user);

            if (user) {
                if (user.role === 'organizer') {
                    router.replace("/(organizer)/dashboard");
                } else if (user.role === 'admin') {
                    router.replace("/(admin)/admin-overview");
                } else {
                    router.replace("/(attendee)/home");
                }
            } else {
                // Fallback if login didn't return user but didn't throw (shouldn't happen with current logic)
                router.replace("/(attendee)/home");
            }

        } catch (error: any) {
            console.error("Login error details:", error);
            Alert.alert("Login Failed", error.response?.data?.message || error.message || "Something went wrong");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <View className="flex-1 bg-white justify-center px-6">
            <View className="items-center mb-10">
                <Text className="text-4xl font-bold text-pastel-blue mb-2">Welcome Back!</Text>
                <Text className="text-gray-500 text-base">Sign in to continue</Text>
            </View>

            <View className="space-y-4">
                <View className="flex-row items-center border border-pastel-blue rounded-full px-4 py-3 bg-blue-50">
                    <Mail color="#A7C7E7" size={20} />
                    <TextInput
                        className="flex-1 ml-3 text-gray-700"
                        placeholder="Email Address"
                        placeholderTextColor="#9CA3AF"
                        value={email}
                        onChangeText={setEmail}
                        autoCapitalize="none"
                        keyboardType="email-address"
                    />
                </View>

                <View className="flex-row items-center border border-pastel-pink rounded-full px-4 py-3 bg-pink-50">
                    <Lock color="#FAA0A0" size={20} />
                    <TextInput
                        className="flex-1 ml-3 text-gray-700"
                        placeholder="Password"
                        placeholderTextColor="#9CA3AF"
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry
                    />
                </View>

                <TouchableOpacity
                    className="bg-pastel-blue rounded-full py-4 items-center shadow-md active:opacity-90 mt-4"
                    onPress={handleLogin}
                    disabled={isSubmitting}
                >
                    {isSubmitting ? (
                        <ActivityIndicator color="white" />
                    ) : (
                        <Text className="text-white font-bold text-lg">Log In</Text>
                    )}
                </TouchableOpacity>

                <View className="flex-row justify-center mt-6">
                    <Text className="text-gray-500">Don't have an account? </Text>
                    <Link href="/register" asChild>
                        <TouchableOpacity>
                            <Text className="text-pastel-pink font-bold">Sign Up</Text>
                        </TouchableOpacity>
                    </Link>
                </View>
            </View>
        </View>
    );
}
