import { Link, useRouter } from "expo-router";
import { Lock, Mail } from "lucide-react-native";
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
import { useAuth } from "../../context/AuthContext";

export default function LoginScreen() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const { login } = useAuth();
    const router = useRouter();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const isValidEmail = (value: string) => /\S+@\S+\.\S+/.test(value);

    const handleLogin = async () => {
        const normalizedEmail = email.trim().toLowerCase();

        if (!normalizedEmail || !password) {
            Alert.alert("Error", "Please fill in all fields");
            return;
        }

        if (!isValidEmail(normalizedEmail)) {
            Alert.alert("Error", "Please enter a valid email address");
            return;
        }

        setIsSubmitting(true);
        try {
            const user = await login(normalizedEmail, password);

            if (user.role === "organizer") {
                router.replace("/(organizer)/dashboard");
            } else if (user.role === "admin") {
                router.replace("/(admin)/admin-overview");
            } else {
                router.replace("/(attendee)/home");
            }
        } catch (error: any) {
            const apiMessage = error?.response?.data?.message;
            if (apiMessage === "Invalid credentials") {
                Alert.alert("Login Failed", "Incorrect email or password");
            } else {
                Alert.alert("Login Failed", apiMessage || error?.message || "Something went wrong");
            }
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
                <View className="items-center mb-10">
                    <Text className="text-4xl font-bold text-pastel-blue mb-2">Welcome Back!</Text>
                    <Text className="text-gray-500 text-base">Sign in to continue</Text>
                </View>

                <View className="space-y-4">
                    <View className="flex-row items-center border border-pastel-blue rounded-full px-4 py-3 bg-pink-50 mb-3">
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

                    <View className="flex-row items-center border border-pastel-pink rounded-full px-4 py-3 bg-pink-50">
                        <Lock color="#FB96BB" size={20} />
                        <TextInput
                            className="flex-1 ml-3 text-gray-700"
                            placeholder="Password"
                            placeholderTextColor="#FB96BB"
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry
                        />
                    </View>

                    <View className="items-end mt-2">
                        <Link href="/(auth)/forgot-password" asChild>
                            <TouchableOpacity>
                                <Text className="text-pastel-blue font-semibold">Forgot password?</Text>
                            </TouchableOpacity>
                        </Link>
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
                        <Text className="text-gray-500">Don&apos;t have an account? </Text>
                        <Link href="/(auth)/register" asChild>
                            <TouchableOpacity>
                                <Text className="text-pastel-pink font-bold">Sign Up</Text>
                            </TouchableOpacity>
                        </Link>
                    </View>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

