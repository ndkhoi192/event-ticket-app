import axios from "axios";
import { useRouter } from "expo-router";
import { ArrowLeft, CalendarDays, MapPin, RefreshCw } from "lucide-react-native";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { API_URL } from "../../context/AuthContext";
import { Event } from "../../types";

type EventStatus = "published" | "draft" | "cancelled" | "ended";

const STATUS_ORDER: EventStatus[] = ["published", "draft", "cancelled", "ended"];

const STATUS_META: Record<EventStatus, { label: string; chipClass: string; chipTextClass: string }> = {
    published: { label: "Published", chipClass: "bg-emerald-100", chipTextClass: "text-emerald-700" },
    draft: { label: "Draft", chipClass: "bg-amber-100", chipTextClass: "text-amber-700" },
    cancelled: { label: "Cancelled", chipClass: "bg-rose-100", chipTextClass: "text-rose-700" },
    ended: { label: "Ended", chipClass: "bg-slate-200", chipTextClass: "text-slate-700" },
};

export default function AdminEventsScreen() {
    const router = useRouter();
    const [eventsByStatus, setEventsByStatus] = useState<Record<EventStatus, Event[]>>({
        published: [],
        draft: [],
        cancelled: [],
        ended: [],
    });
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchEventsByStatus = useCallback(async () => {
        try {
            const responses = await Promise.all(
                STATUS_ORDER.map((status) => axios.get(`${API_URL}/events?status=${status}`))
            );

            const grouped: Record<EventStatus, Event[]> = {
                published: [],
                draft: [],
                cancelled: [],
                ended: [],
            };

            STATUS_ORDER.forEach((status, index) => {
                const list = responses[index]?.data;
                grouped[status] = Array.isArray(list) ? list : [];
            });

            setEventsByStatus(grouped);
        } catch (error) {
            console.error("Failed to load admin events", error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        fetchEventsByStatus();
    }, [fetchEventsByStatus]);

    const totalEvents = useMemo(() => {
        return STATUS_ORDER.reduce((sum, status) => sum + eventsByStatus[status].length, 0);
    }, [eventsByStatus]);

    const renderEventCard = (event: Event) => {
        const status = (event.status || "draft") as EventStatus;
        const meta = STATUS_META[status] || STATUS_META.draft;
        return (
            <View key={event._id} className="bg-white rounded-2xl p-4 border border-gray-100 mb-3 shadow-sm">
                <View className="flex-row items-start justify-between mb-2">
                    <Text className="text-gray-900 font-bold text-base flex-1 pr-3">{event.title}</Text>
                    <View className={`px-2 py-1 rounded-full ${meta.chipClass}`}>
                        <Text className={`text-[11px] font-bold uppercase ${meta.chipTextClass}`}>{meta.label}</Text>
                    </View>
                </View>

                <View className="flex-row items-center mb-1">
                    <CalendarDays size={14} color="#6B7280" />
                    <Text className="text-gray-500 text-xs ml-2">
                        {new Date(event.date_time).toLocaleString("en-US")}
                    </Text>
                </View>

                <View className="flex-row items-center">
                    <MapPin size={14} color="#6B7280" />
                    <Text className="text-gray-500 text-xs ml-2" numberOfLines={1}>
                        {event.location?.name || "No location"}
                    </Text>
                </View>
            </View>
        );
    };

    if (loading && !refreshing) {
        return (
            <View className="flex-1 items-center justify-center bg-gray-50">
                <ActivityIndicator size="large" color="#FB96BB" />
            </View>
        );
    }

    return (
        <View className="flex-1 bg-gray-50">
            <View className="pt-12 pb-4 px-6 bg-white border-b border-gray-100">
                <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center">
                        <TouchableOpacity onPress={() => router.back()} className="mr-3 p-2 bg-gray-50 rounded-full">
                            <ArrowLeft color="#FB96BB" size={22} />
                        </TouchableOpacity>
                        <View>
                            <Text className="text-2xl font-bold text-gray-900">Manage Events</Text>
                            <Text className="text-gray-500 text-sm">All events grouped by status</Text>
                        </View>
                    </View>

                    <TouchableOpacity
                        className="p-2 rounded-full bg-pink-50"
                        onPress={() => {
                            setRefreshing(true);
                            fetchEventsByStatus();
                        }}
                    >
                        <RefreshCw color="#FB96BB" size={20} />
                    </TouchableOpacity>
                </View>

                <View className="mt-4">
                    <Text className="text-xs text-gray-500 uppercase font-semibold">Total events</Text>
                    <Text className="text-3xl font-extrabold text-gray-900">{totalEvents}</Text>
                </View>
            </View>

            <ScrollView className="flex-1 px-4 pt-4" showsVerticalScrollIndicator={false}>
                {STATUS_ORDER.map((status) => {
                    const data = eventsByStatus[status];
                    const meta = STATUS_META[status];
                    return (
                        <View key={status} className="mb-6">
                            <View className="flex-row items-center justify-between mb-3 px-1">
                                <Text className="text-lg font-bold text-gray-900">{meta.label}</Text>
                                <Text className="text-sm font-semibold text-gray-500">{data.length}</Text>
                            </View>

                            {data.length === 0 ? (
                                <View className="bg-white border border-dashed border-gray-200 rounded-2xl p-4">
                                    <Text className="text-gray-400 text-sm">No events in this status.</Text>
                                </View>
                            ) : (
                                data.map((event) => renderEventCard(event))
                            )}
                        </View>
                    );
                })}
            </ScrollView>
        </View>
    );
}
