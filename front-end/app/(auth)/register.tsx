import clsx from "clsx";
import { Link, useRouter } from "expo-router";
import { Lock, Mail, User } from "lucide-react-native";
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

export default function RegisterScreen() {
    const [fullName, setFullName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [role, setRole] = useState<"attendee" | "organizer">("attendee");

    const { register } = useAuth();
    const router = useRouter();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleRegister = async () => {
        if (!fullName || !email || !password) {
            Alert.alert("Error", "Please fill in all fields");
            return;
        }

        setIsSubmitting(true);
        try {
            await register(fullName, email, password, role);
            // Assuming successful registration logs the user in
            if (role === 'organizer') {
                router.replace("/(organizer)");
            } else {
                router.replace("/(attendee)");
            }
        } catch (error: any) {
            Alert.alert("Registration Failed", error.response?.data?.message || "Something went wrong");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <View className="flex-1 bg-white justify-center px-6">
            <View className="items-center mb-8">
                <Text className="text-3xl font-bold text-pastel-pink mb-2">Create Account</Text>
                <Text className="text-gray-500 text-base">Join us and start exploring!</Text>
            </View>

            <View className="space-y-4">
                {/* Role Selection */}
                <View className="flex-row bg-gray-100 rounded-full p-1 mb-2">
                    <TouchableOpacity
                        className={clsx("flex-1 py-2 rounded-full items-center", role === "attendee" ? "bg-white shadow-sm" : "")}
                        onPress={() => setRole("attendee")}
                    >
                        <Text className={clsx("font-semibold", role === "attendee" ? "text-pastel-blue" : "text-gray-500")}>Attendee</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        className={clsx("flex-1 py-2 rounded-full items-center", role === "organizer" ? "bg-white shadow-sm" : "")}
                        onPress={() => setRole("organizer")}
                    >
                        <Text className={clsx("font-semibold", role === "organizer" ? "text-pastel-pink" : "text-gray-500")}>Organizer</Text>
                    </TouchableOpacity>
                </View>

                <View className="flex-row items-center border border-gray-200 rounded-full px-4 py-3 bg-gray-50 focus:border-pastel-blue">
                    <User color="#9CA3AF" size={20} />
                    <TextInput
                        className="flex-1 ml-3 text-gray-700"
                        placeholder="Full Name"
                        placeholderTextColor="#9CA3AF"
                        value={fullName}
                        onChangeText={setFullName}
                    />
                </View>

                <View className="flex-row items-center border border-gray-200 rounded-full px-4 py-3 bg-gray-50 focus:border-pastel-blue">
                    <Mail color="#9CA3AF" size={20} />
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

                <View className="flex-row items-center border border-gray-200 rounded-full px-4 py-3 bg-gray-50 focus:border-pastel-pink">
                    <Lock color="#9CA3AF" size={20} />
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
                    className="bg-pastel-pink rounded-full py-4 items-center shadow-md active:opacity-90 mt-4"
                    onPress={handleRegister}
                    disabled={isSubmitting}
                >
                    {isSubmitting ? (
                        <ActivityIndicator color="white" />
                    ) : (
                        <Text className="text-white font-bold text-lg">Sign Up</Text>
                    )}
                </TouchableOpacity>

                <View className="flex-row justify-center mt-6">
                    <Text className="text-gray-500">Already have an account? </Text>
                    <Link href="/login" asChild>
                        <TouchableOpacity>
                            <Text className="text-pastel-blue font-bold">Sign In</Text>
                        </TouchableOpacity>
                    </Link>
                </View>
            </View>
        </View>
    );
}
