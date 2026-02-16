import axios from "axios";
import { Link, useFocusEffect, useRouter } from "expo-router";
import { Plus } from "lucide-react-native";
import React, { useCallback, useState } from "react";
import { ActivityIndicator, FlatList, RefreshControl, Text, TouchableOpacity, View } from "react-native";
import EventCard from "../../components/EventCard";
import { API_URL, useAuth } from "../../context/AuthContext";
import { Event } from "../../types";

export default function DashboardScreen() {
    const { token, logout, isLoading: authLoading } = useAuth();
    const router = useRouter();
    const [events, setEvents] = useState<Event[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchMyEvents = async () => {
        try {
            if (!API_URL) return;

            // Security check before request
            if (!token) {
                router.replace("/(auth)/login");
                return;
            }

            // Explicitly set header to ensure it's not missing
            const headers = { Authorization: `Bearer ${token}` };
            console.log("Fetching events with token...");

            const response = await axios.get(`${API_URL}/events/my-events`, { headers });
            setEvents(response.data);
        } catch (error: any) {
            console.error("Failed to fetch events:", error.response?.data || error.message);
            // Handle 401 specifically
            if (error.response?.status === 401) {
                console.log("Session expired. Logging out.");
                await logout();
                router.replace("/(auth)/login");
            }
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            if (authLoading) return;

            if (!token) {
                router.replace("/(auth)/login");
                return;
            }

            setLoading(true);
            fetchMyEvents();
        }, [authLoading, token])
    );

    const onRefresh = () => {
        setRefreshing(true);
        fetchMyEvents();
    };

    if (loading && !refreshing && events.length === 0) {
        return (
            <View className="flex-1 justify-center items-center bg-white">
                <ActivityIndicator size="large" color="#FAA0A0" />
            </View>
        );
    }

    return (
        <View className="flex-1 bg-gray-50 px-4 pt-12">
            <View className="flex-row justify-between items-center mb-6">
                <View>
                    <Text className="text-3xl font-bold text-gray-800">My Events</Text>
                    <Text className="text-gray-500">Manage your created events</Text>
                </View>
                {/* Placeholder for future Create Event functionality */}
                <Link href="/(organizer)/events/create" asChild>
                    <TouchableOpacity className="bg-pastel-pink p-3 rounded-full shadow-md">
                        <Plus color="white" size={24} />
                    </TouchableOpacity>
                </Link>
            </View>

            <FlatList
                data={events}
                keyExtractor={(item) => item._id}
                renderItem={({ item }) => <EventCard event={item} />}
                contentContainerStyle={{ paddingBottom: 20 }}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FAA0A0" />
                }
                ListEmptyComponent={
                    <View className="items-center justify-center mt-20">
                        <Text className="text-gray-400 text-lg">No events found.</Text>
                        <Text className="text-gray-400 text-sm mt-2">Create your first event to get started!</Text>
                    </View>
                }
            />
        </View>
    );
}
