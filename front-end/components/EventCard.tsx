import { Link } from "expo-router";
import { Calendar, MapPin } from "lucide-react-native";
import React from "react";
import { Image, Text, TouchableOpacity, View } from "react-native";
import { Event } from "../types";

interface EventCardProps {
    event: Event;
}

export default function EventCard({ event }: EventCardProps) {
    const date = new Date(event.date_time).toLocaleDateString("vi-VN", {
        day: "numeric",
        month: "short",
        year: "numeric",
    });

    const statusColor = {
        published: "bg-green-100 text-green-700",
        draft: "bg-gray-100 text-gray-700",
        cancelled: "bg-red-100 text-red-700",
    };

    return (
        <Link href={`/(organizer)/events/${event._id}`} asChild>
            <TouchableOpacity className="bg-white rounded-2xl shadow-sm mb-4 overflow-hidden border border-gray-100">
                <Image
                    source={{ uri: event.banner_url }}
                    className="w-full h-40"
                    resizeMode="cover"
                />
                <View className="p-4">
                    <View className="flex-row justify-between items-start mb-2">
                        <View className={`px-2 py-1 rounded-full ${statusColor[event.status]?.split(" ")[0] || "bg-gray-100"}`}>
                            <Text className={`text-xs font-semibold capitalize ${statusColor[event.status]?.split(" ")[1] || "text-gray-500"}`}>
                                {event.status}
                            </Text>
                        </View>
                        <Text className="text-pastel-blue font-bold text-lg flex-1 text-right">
                            {event.ticket_types && event.ticket_types.length > 0
                                ? `${event.ticket_types[0].price.toLocaleString()} VND`
                                : "Free"}
                        </Text>
                    </View>

                    <Text className="text-xl font-bold text-gray-800 mb-2 truncate" numberOfLines={1}>
                        {event.title}
                    </Text>

                    <View className="flex-row items-center mb-1">
                        <Calendar size={14} color="#9CA3AF" />
                        <Text className="text-gray-500 ml-2 text-sm">{date}</Text>
                    </View>

                    <View className="flex-row items-center">
                        <MapPin size={14} color="#9CA3AF" />
                        <Text className="text-gray-500 ml-2 text-sm truncate" numberOfLines={1}>
                            {event.location?.name || "TBA"}
                        </Text>
                    </View>
                </View>
            </TouchableOpacity>
        </Link>
    );
}
