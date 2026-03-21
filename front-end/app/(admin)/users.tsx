import axios from "axios";
import { useRouter } from "expo-router";
import { ArrowLeft, User as UserIcon } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, FlatList, RefreshControl, Text, TouchableOpacity, View } from "react-native";
import { API_URL, useAuth } from "../../context/AuthContext";
import { User } from "../../types";

export default function ManageUsersScreen() {
    const { token } = useAuth();
    const router = useRouter();
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchUsers = async () => {
        try {
            if (!token) return;
            const response = await axios.get(`${API_URL}/users`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setUsers(response.data);
        } catch (error: any) {
            console.error("Failed to fetch users:", error);
            Alert.alert("Error", "Could not load users.");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const onRefresh = () => {
        setRefreshing(true);
        fetchUsers();
    };

    const handleRoleChange = (userId: string, currentRole: string) => {
        const nextRole = currentRole === "attendee" ? "organizer" : "attendee";
        
        Alert.alert(
            "Change role",
            `Switch this user role to ${nextRole}?`,
            [
                { text: "Cancel", style: "cancel" },
                { 
                    text: "Confirm", 
                    onPress: async () => {
                        try {
                            await axios.put(`${API_URL}/users/${userId}`, { role: nextRole }, {
                                headers: { Authorization: `Bearer ${token}` }
                            });
                            Alert.alert("Success", "Role updated.");
                            fetchUsers();
                        } catch (error) {
                            Alert.alert("Error", "Could not update role.");
                        }
                    } 
                }
            ]
        );
    };

    if (loading && !refreshing) {
        return (
            <View className="flex-1 justify-center items-center bg-white">
                <ActivityIndicator size="large" color="#FB96BB" />
            </View>
        );
    }

    return (
        <View className="flex-1 bg-gray-50">
            {/* Header */}
            <View className="pt-12 pb-4 px-6 flex-row items-center bg-white border-b border-gray-100">
                <TouchableOpacity onPress={() => router.back()} className="mr-4 p-2 bg-gray-50 rounded-full">
                    <ArrowLeft color="#FB96BB" size={24} />
                </TouchableOpacity>
                <Text className="text-xl font-bold text-gray-900">Manage Users</Text>
            </View>

            <FlatList
                data={users}
                keyExtractor={(item) => item._id}
                contentContainerStyle={{ padding: 16 }}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FB96BB" />}
                renderItem={({ item }) => (
                    <View className="bg-white p-4 rounded-xl border border-gray-100 mb-3 flex-row items-center shadow-sm">
                        <View className="w-12 h-12 bg-pastel-blue rounded-full justify-center items-center mr-4">
                            <Text className="text-white font-bold text-lg">
                                {item.full_name?.charAt(0).toUpperCase() || "U"}
                            </Text>
                        </View>
                        <View className="flex-1">
                            <Text className="text-base font-bold text-gray-800">{item.full_name}</Text>
                            <Text className="text-sm text-gray-500">{item.email}</Text>
                            
                            <View className="flex-row mt-1">
                                <View className={`px-2 py-0.5 rounded-md ${
                                    item.role === 'admin' ? 'bg-red-100' : 
                                    item.role === 'organizer' ? 'bg-pink-100' : 'bg-gray-100'
                                }`}>
                                    <Text className={`text-xs font-bold ${
                                        item.role === 'admin' ? 'text-red-700' : 
                                        item.role === 'organizer' ? 'text-pink-700' : 'text-gray-600'
                                    }`}>
                                        {item.role.toUpperCase()}
                                    </Text>
                                </View>
                            </View>
                        </View>
                        
                        {item.role !== 'admin' && (
                            <TouchableOpacity 
                                className="p-2 bg-gray-50 border border-gray-200 rounded-lg"
                                onPress={() => handleRoleChange(item._id, item.role)}
                            >
                                <UserIcon size={20} color="#FB96BB" />
                            </TouchableOpacity>
                        )}
                    </View>
                )}
            />
        </View>
    );
}

