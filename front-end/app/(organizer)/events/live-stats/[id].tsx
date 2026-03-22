import axios from "axios";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { io } from "socket.io-client";
import { API_URL, useAuth } from "../../../../context/AuthContext";

type LiveStatsResponse = {
    event?: { _id: string; title: string };
    eventId: string;
    totalBookings: number;
    paidBookings: number;
    pendingBookings: number;
    refundedBookings: number;
    cancelledBookings: number;
    totalRevenue: number;
    ticketsSold: number;
    ticketsCheckedIn: number;
    ticketsValid: number;
    ticketsExpired: number;
    salesPerMinute?: number;
    busiestGate?: string | null;
    busiestGateScansPer5m?: number;
    gateLoads?: { _id: string; scans: number }[];
    updatedAt: string;
};

const StatCard = ({ label, value }: { label: string; value: string | number }) => (
    <View className="bg-white rounded-2xl border border-gray-100 p-4 mb-3">
        <Text className="text-xs uppercase tracking-[0.5px] text-gray-500 font-semibold">{label}</Text>
        <Text className="text-2xl text-gray-900 font-bold mt-1">{value}</Text>
    </View>
);

export default function OrganizerLiveStatsScreen() {
    const { id } = useLocalSearchParams<{ id?: string | string[] }>();
    const eventId = Array.isArray(id) ? id[0] : id;
    const router = useRouter();
    const { token } = useAuth();

    const [stats, setStats] = useState<LiveStatsResponse | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchStats = useCallback(async () => {
        if (!eventId || !token) return;

        try {
            const response = await axios.get(`${API_URL}/bookings/live-stats/${eventId}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setStats(response.data);
        } catch (error) {
            console.error("Failed to fetch live stats:", error);
        } finally {
            setLoading(false);
        }
    }, [eventId, token]);

    useEffect(() => {
        fetchStats();
    }, [fetchStats]);

    useEffect(() => {
        if (!eventId || !token) return;

        const socketBaseUrl = API_URL.replace(/\/api\/?$/, "");
        const socket = io(socketBaseUrl, {
            auth: { token },
        });

        socket.emit("organizer:join-event", { eventId });

        socket.on("event:stats-updated", (payload: LiveStatsResponse) => {
            if (payload?.eventId !== eventId) return;
            setStats((prev) => ({ ...(prev || {} as LiveStatsResponse), ...payload }));
        });

        socket.on("event:stats-refresh", (payload: { eventId?: string }) => {
            if (payload?.eventId !== eventId) return;
            fetchStats();
        });

        return () => {
            socket.disconnect();
        };
    }, [eventId, token, fetchStats]);

    if (loading) {
        return (
            <View className="flex-1 bg-white justify-center items-center">
                <ActivityIndicator size="large" color="#FB96BB" />
            </View>
        );
    }

    return (
        <View className="flex-1 bg-gray-50">
            <View className="pt-12 pb-4 px-6 bg-white border-b border-gray-100 flex-row items-center">
                <TouchableOpacity onPress={() => router.back()} className="mr-4 p-2 bg-gray-50 rounded-full">
                    <ArrowLeft color="#FB96BB" size={22} />
                </TouchableOpacity>
                <View className="flex-1">
                    <Text className="text-xl font-bold text-gray-900">Live Event Stats</Text>
                    <Text className="text-xs text-gray-500 mt-0.5" numberOfLines={1}>{stats?.event?.title || "Event"}</Text>
                </View>
            </View>

            <ScrollView className="flex-1 px-6 pt-5" showsVerticalScrollIndicator={false}>
                <StatCard label="Total Revenue" value={`${(stats?.totalRevenue || 0).toLocaleString("en-US")} VND`} />
                <StatCard label="Total Bookings" value={stats?.totalBookings || 0} />
                <StatCard label="Paid Bookings" value={stats?.paidBookings || 0} />
                <StatCard label="Pending Bookings" value={stats?.pendingBookings || 0} />
                <StatCard label="Refunded Bookings" value={stats?.refundedBookings || 0} />
                <StatCard label="Cancelled Bookings" value={stats?.cancelledBookings || 0} />
                <StatCard label="Tickets Sold" value={stats?.ticketsSold || 0} />
                <StatCard label="Checked In" value={stats?.ticketsCheckedIn || 0} />
                <StatCard label="Valid Tickets" value={stats?.ticketsValid || 0} />
                <StatCard label="Expired Tickets" value={stats?.ticketsExpired || 0} />
                <StatCard label="Sales Speed (tickets/min)" value={stats?.salesPerMinute || 0} />
                <StatCard label="Most Congested Gate" value={stats?.busiestGate || "-"} />
                <StatCard label="Gate Scan Load (5m)" value={stats?.busiestGateScansPer5m || 0} />

                <View className="py-4">
                    <Text className="text-center text-xs text-gray-400">
                        Last updated: {stats?.updatedAt ? new Date(stats.updatedAt).toLocaleString("en-US") : "-"}
                    </Text>
                </View>
            </ScrollView>
        </View>
    );
}
