import { Link } from "expo-router";
import { MapPin } from "lucide-react-native";
import React from "react";
import { Image, Text, TouchableOpacity, View } from "react-native";
import { Event } from "../types";

export default function StandardEventCard({ event }: { event: Event }) {
    const formattedDate = new Date(event.date_time).toLocaleDateString("vi-VN", {
        weekday: "short",
        day: "numeric",
        month: "short",
    });

    return (
        <Link href={`/(attendee)/events/${event._id}`} asChild>
            <TouchableOpacity className="flex-row bg-white rounded-xl mb-4 overflow-hidden border border-gray-100 shadow-sm p-3">
                <View className="relative w-24 h-24 rounded-lg overflow-hidden">
                    <Image
                        source={{ uri: event.banner_url }}
                        className="w-full h-full object-cover"
                    />

                    {/* Date Badge */}
                    <View className="absolute top-1 left-1 bg-white/90 backdrop-blur-sm rounded-lg px-2 py-1 items-center shadow-sm">
                        <Text className="text-pastel-pink text-[10px] font-bold uppercase">
                            {new Date(event.date_time).toLocaleDateString("vi-VN", { month: "short" })}
                        </Text>
                        <Text className="text-gray-900 text-sm font-bold">
                            {new Date(event.date_time).getDate()}
                        </Text>
                    </View>
                </View>

                <View className="flex-1 ml-4 justify-between py-1">
                    <View>
                        <Text className="text-gray-900 font-bold text-lg mb-1" numberOfLines={1}>
                            {event.title}
                        </Text>
                        <View className="flex-row items-center mb-1">
                            <MapPin size={14} color="#9CA3AF" />
                            <Text className="text-gray-500 text-xs ml-1 flex-1" numberOfLines={1}>
                                {event.location?.name || "TBA"}
                            </Text>
                        </View>
                    </View>

                    <View className="flex-row items-center justify-between mt-2">
                        {/* Avatar stack or organizer name if no avatars */}
                        <View className="flex-row -space-x-2">
                            {/* Placeholder avatars for now, or fetch attendee images if avail */}
                            <View className="w-6 h-6 rounded-full bg-gray-200 border border-white" />
                            <View className="w-6 h-6 rounded-full bg-gray-300 border border-white" />
                            <View className="w-6 h-6 rounded-full bg-pastel-blue border border-white items-center justify-center">
                                <Text className="text-[8px] text-white font-bold">+5</Text>
                            </View>
                        </View>

                        <Text className="text-pastel-pink font-bold text-lg">
                            {event.ticket_types && event.ticket_types.length > 0
                                ? `${event.ticket_types[0].price.toLocaleString('vi-VN')} VND`
                                : "Free"}
                        </Text>
                    </View>
                </View>
            </TouchableOpacity>
        </Link>
    );
}
