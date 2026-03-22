import axios from "axios";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, Text, TouchableOpacity, View } from "react-native";
import { io } from "socket.io-client";
import { API_URL, useAuth } from "../../../context/AuthContext";

type QueueStatus = {
    eventId: string;
    inQueue: boolean;
    position: number | null;
    estimatedWaitSeconds: number;
    totalInQueue: number;
};

export default function QueueScreen() {
    const { id } = useLocalSearchParams<{ id?: string | string[] }>();
    const eventId = Array.isArray(id) ? id[0] : id;
    const router = useRouter();
    const { token } = useAuth();

    const [loading, setLoading] = useState(true);
    const [status, setStatus] = useState<QueueStatus | null>(null);

    const loadStatus = useCallback(async () => {
        if (!eventId) return;
        try {
            const response = await axios.get(`${API_URL}/queue/status/${eventId}`);
            setStatus(response.data);
        } catch {
            Alert.alert("Error", "Could not load queue status.");
        } finally {
            setLoading(false);
        }
    }, [eventId]);

    useEffect(() => {
        const joinQueue = async () => {
            if (!eventId) return;
            try {
                await axios.post(`${API_URL}/queue/join/${eventId}`);
                await loadStatus();
            } catch (error: any) {
                Alert.alert("Queue", error?.response?.data?.message || "Could not join queue.");
                setLoading(false);
            }
        };

        joinQueue();
    }, [eventId, loadStatus]);

    useEffect(() => {
        if (!token || !eventId) return;

        const socketBaseUrl = API_URL.replace(/\/api\/?$/, "");
        const socket = io(socketBaseUrl, {
            auth: { token },
        });

        socket.on("queue:status", (payload: QueueStatus) => {
            if (payload?.eventId !== eventId) return;
            setStatus(payload);
        });

        socket.on("queue:ready", (payload: { eventId?: string }) => {
            if (payload?.eventId !== eventId) return;
            Alert.alert("Your turn", "You can proceed to booking now.", [
                { text: "Go to booking", onPress: () => router.replace({ pathname: "/(attendee)/book/[id]", params: { id: eventId } }) },
            ]);
        });

        return () => {
            socket.disconnect();
        };
    }, [token, eventId, router]);

    const leaveQueue = async () => {
        if (!eventId) return;
        try {
            await axios.post(`${API_URL}/queue/leave/${eventId}`);
            router.back();
        } catch {
            Alert.alert("Queue", "Could not leave queue.");
        }
    };

    if (loading) {
        return (
            <View className="flex-1 bg-white justify-center items-center">
                <ActivityIndicator size="large" color="#FB96BB" />
            </View>
        );
    }

    return (
        <View className="flex-1 bg-gray-50 px-6 pt-12">
            <View className="flex-row items-center mb-6">
                <TouchableOpacity onPress={() => router.back()} className="mr-3 p-2 rounded-full bg-white border border-gray-200">
                    <ArrowLeft color="#FB96BB" size={20} />
                </TouchableOpacity>
                <Text className="text-xl font-bold text-gray-900">Virtual Queue</Text>
            </View>

            <View className="bg-white rounded-2xl border border-gray-100 p-5">
                <Text className="text-gray-500 text-sm">Your position</Text>
                <Text className="text-5xl text-gray-900 font-extrabold mt-2">{status?.position ?? "-"}</Text>

                <Text className="text-gray-500 text-sm mt-5">Estimated wait</Text>
                <Text className="text-2xl text-pink-600 font-bold mt-1">
                    {Math.ceil((status?.estimatedWaitSeconds || 0) / 60)} min
                </Text>

                <Text className="text-gray-500 text-sm mt-5">People in queue</Text>
                <Text className="text-xl text-gray-900 font-bold mt-1">{status?.totalInQueue || 0}</Text>
            </View>

            <TouchableOpacity className="mt-5 py-3 rounded-xl border border-gray-300 bg-white" onPress={leaveQueue}>
                <Text className="text-center text-gray-700 font-semibold">Leave queue</Text>
            </TouchableOpacity>
        </View>
    );
}
