import { Link } from "expo-router";
import { MapPin } from "lucide-react-native";
import React from "react";
import { Image, Text, TouchableOpacity, View } from "react-native";
import { Event } from "../types";

interface FeaturedEventProps {
    event: Event;
}

export default function FeaturedEvent({ event }: FeaturedEventProps) {
    const formattedDate = new Date(event.date_time).toLocaleDateString("vi-VN", {
        day: "numeric",
        month: "short",
    });

    return (
        <Link href={`/(attendee)/events/${event._id}`} asChild>
            <TouchableOpacity className="mr-4 w-72 rounded-3xl overflow-hidden shadow-lg border border-gray-100 relative h-48">
                <Image
                    source={{ uri: event.banner_url }}
                    className="w-full h-full object-cover"
                />

                {/* Overlay Gradient */}
                <View className="absolute bottom-0 w-full h-full bg-black/40" />

                <View className="absolute top-3 left-3 bg-white/20 backdrop-blur-md px-3 py-1 rounded-full border border-white/20">
                    <Text className="text-white text-xs font-bold">HOT 🔥</Text>
                </View>

                <View className="absolute bottom-4 left-4 right-4">
                    <Text className="text-white text-xl font-bold mb-1" numberOfLines={1}>
                        {event.title}
                    </Text>
                    <View className="flex-row items-center mb-1">
                        <MapPin size={12} color="white" />
                        <Text className="text-white text-xs ml-1" numberOfLines={1}>
                            {event.location?.name || "TBA"}
                        </Text>
                    </View>
                </View>
            </TouchableOpacity>
        </Link>
    );
}
