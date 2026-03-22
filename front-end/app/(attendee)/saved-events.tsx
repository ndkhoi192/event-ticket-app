import axios from "axios";
import { useRouter } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, FlatList, RefreshControl, Text, TouchableOpacity, View } from "react-native";
import { io } from "socket.io-client";
import StandardEventCard from "../../components/StandardEventCard";
import { API_URL, useAuth } from "../../context/AuthContext";
import { Event } from "../../types";

export default function SavedEventsScreen() {
    const { token } = useAuth();
    const router = useRouter();
    const [events, setEvents] = useState<Event[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchSavedEvents = useCallback(async () => {
        try {
            if (!token) return;
            const response = await axios.get(`${API_URL}/users/me/saved-events`);
            setEvents(response.data);
        } catch (error) {
            console.error("Failed to fetch saved events:", error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [token]);

    useEffect(() => {
        fetchSavedEvents();
    }, [fetchSavedEvents]);

    useEffect(() => {
        if (!token) return;

        const socketBaseUrl = API_URL.replace(/\/api\/?$/, "");
        const socket = io(socketBaseUrl, { auth: { token } });

        socket.on("events:public-updated", () => {
            fetchSavedEvents();
        });

        return () => {
            socket.disconnect();
        };
    }, [token, fetchSavedEvents]);

    const onRefresh = () => {
        setRefreshing(true);
        fetchSavedEvents();
    };

    if (loading && !refreshing) {
        return (
            <View className="flex-1 justify-center items-center bg-white">
                <ActivityIndicator size="large" color="#FB96BB" />
            </View>
        );
    }

    return (
        <View className="flex-1 bg-white">
            {/* Header */}
            <View className="pt-12 pb-4 px-6 flex-row items-center border-b border-gray-100">
                <TouchableOpacity
                    className="mr-4 p-2 bg-gray-50 rounded-full"
                    onPress={() => router.back()}
                >
                    <ArrowLeft color="#FB96BB" size={24} />
                </TouchableOpacity>
                <Text className="text-xl font-bold text-gray-900">Saved Events</Text>
            </View>

            <FlatList
                data={events}
                keyExtractor={(item) => item._id}
                renderItem={({ item }) => <StandardEventCard event={item} />}
                contentContainerStyle={{ padding: 24, paddingBottom: 100 }}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FB96BB" />
                }
                ListEmptyComponent={
                    <View className="flex-1 justify-center items-center mt-20">
                        <Text className="text-gray-400 text-lg mb-2">No saved events yet</Text>
                        <TouchableOpacity onPress={() => router.push("/(attendee)/discover")}>
                            <Text className="text-pastel-pink font-semibold">Explore Events</Text>
                        </TouchableOpacity>
                    </View>
                }
            />
        </View>
    );
}

