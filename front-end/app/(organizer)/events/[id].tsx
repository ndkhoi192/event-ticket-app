import axios from "axios";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ArrowLeft, Clock, Edit, Folder, MapPin, Trash2 } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Image, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { API_URL } from "../../../context/AuthContext";
import { Event } from "../../../types";

export default function EventDetailsScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const [event, setEvent] = useState<Event | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchEventDetails = async () => {
            try {
                const response = await axios.get(`${API_URL}/events/${id}`);
                setEvent(response.data);
            } catch (error) {
                console.error("Failed to fetch event details:", error);
                Alert.alert("Error", "Could not load event details");
            } finally {
                setLoading(false);
            }
        };

        if (id) {
            fetchEventDetails();
        }
    }, [id]);

    const handleDelete = () => {
        Alert.alert(
            "Delete Event",
            "Are you sure you want to delete this event? This action cannot be undone.",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            await axios.delete(`${API_URL}/events/${id}`);
                            Alert.alert("Success", "Event deleted successfully");
                            router.back();
                        } catch (error) {
                            Alert.alert("Error", "Failed to delete event");
                        }
                    },
                },
            ]
        );
    };

    if (loading) {
        return (
            <View className="flex-1 justify-center items-center bg-white">
                <ActivityIndicator size="large" color="#A7C7E7" />
            </View>
        );
    }

    if (!event) {
        return (
            <View className="flex-1 justify-center items-center bg-white">
                <Text className="text-gray-500">Event not found</Text>
            </View>
        );
    }

    const date = new Date(event.date_time).toLocaleDateString("vi-VN", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
    });

    const time = new Date(event.date_time).toLocaleTimeString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
    });

    return (
        <ScrollView className="flex-1 bg-white" showsVerticalScrollIndicator={false}>
            {/* Header Image */}
            <View className="relative">
                <Image
                    source={{ uri: event.banner_url }}
                    className="w-full h-64"
                    resizeMode="cover"
                />
                <TouchableOpacity
                    className="absolute top-12 left-4 bg-white/80 p-2 rounded-full backdrop-blur-sm"
                    onPress={() => router.back()}
                >
                    <ArrowLeft color="#1F2937" size={24} />
                </TouchableOpacity>

                {/* Status Badge */}
                <View className="absolute bottom-4 right-4 bg-white/90 px-3 py-1 rounded-full">
                    <Text className="text-xs font-bold capitalize text-gray-800">{event.status}</Text>
                </View>
            </View>

            {/* Content */}
            <View className="px-5 py-6">
                <Text className="text-2xl font-bold text-gray-900 mb-2">{event.title}</Text>

                {/* Info Row: Date & Time */}
                <View className="flex-row items-center mb-3">
                    <Clock size={16} color="#A7C7E7" />
                    <Text className="text-gray-600 ml-2 text-base">{time} - {date}</Text>
                </View>

                {/* Info Row: Location */}
                <View className="flex-row items-center mb-3">
                    <MapPin size={16} color="#FAA0A0" />
                    <Text className="text-gray-600 ml-2 text-base">{event.location?.name}</Text>
                </View>

                {/* Info Row: Category */}
                <View className="flex-row items-center mb-6">
                    <Folder size={16} color="#9CA3AF" />
                    <Text className="text-gray-600 ml-2 text-base">
                        {typeof event.category_id === 'object' ? event.category_id.name : "Category"}
                    </Text>
                </View>

                {/* Description */}
                <Text className="text-lg font-bold text-gray-800 mb-2">About Event</Text>
                <Text className="text-gray-500 leading-6 mb-8">{event.description}</Text>

                {/* Ticket Types */}
                <Text className="text-lg font-bold text-gray-800 mb-3">Ticket Information</Text>
                <View className="space-y-3 mb-8">
                    {event.ticket_types.map((ticket, index) => (
                        <View key={index} className="flex-row justify-between items-center bg-gray-50 p-4 rounded-xl border border-gray-100">
                            <View>
                                <Text className="font-bold text-gray-700 text-lg">{ticket.type_name}</Text>
                                <Text className="text-gray-400 text-sm">{ticket.remaining_quantity} / {ticket.total_quantity} available</Text>
                            </View>
                            <Text className="text-pastel-blue font-bold text-lg">{ticket.price.toLocaleString()} đ</Text>
                        </View>
                    ))}
                </View>

                {/* Actions */}
                <View className="flex-row space-x-4 mb-10">
                    <TouchableOpacity
                        className="flex-1 flex-row justify-center items-center bg-gray-100 py-4 rounded-xl"
                        onPress={() => Alert.alert("Coming Soon", "Edit functionality will be implemented soon.")}
                    >
                        <Edit size={20} color="#4B5563" />
                        <Text className="text-gray-700 font-bold ml-2">Edit Event</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        className="flex-1 flex-row justify-center items-center bg-red-50 py-4 rounded-xl"
                        onPress={handleDelete}
                    >
                        <Trash2 size={20} color="#EF4444" />
                        <Text className="text-red-500 font-bold ml-2">Delete Event</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </ScrollView>
    );
}
