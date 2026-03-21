import { Link } from "expo-router";
import { CalendarDays } from "lucide-react-native";
import React from "react";
import { Image, Text, TouchableOpacity, View } from "react-native";
import { Event } from "../types";

export default function StandardEventCard({ event }: { event: Event }) {
    const minPrice = event.ticket_types && event.ticket_types.length > 0
        ? Math.min(...event.ticket_types.map((t) => t.price))
        : 0;

    const formattedDate = new Date(event.date_time).toLocaleDateString("en-US", {
        day: "2-digit",
        month: "long",
        year: "numeric",
    });

    return (
        <Link href={`/(attendee)/events/${event._id}`} asChild>
            <TouchableOpacity className="bg-white rounded-2xl mb-4 overflow-hidden border border-gray-100 shadow-sm">
                <View className="w-full h-52 rounded-2xl overflow-hidden">
                    <Image
                        source={{ uri: event.banner_url }}
                        className="w-full h-full object-cover"
                    />
                </View>

                <View className="px-4 pt-4 pb-3">
                    <Text className="text-gray-900 text-[17px] leading-[23px] font-bold" numberOfLines={2}>
                        {event.title}
                    </Text>

                    <Text className="text-pastel-pink text-[15px] leading-[21px] font-extrabold mt-2">
                        {`From ${minPrice.toLocaleString("en-US")} VND`}
                    </Text>

                    <View className="flex-row items-center mt-2 mb-3">
                        <CalendarDays size={16} color="#6B7280" />
                        <Text className="text-gray-600 text-[14px] leading-[20px] ml-2 font-medium">
                            {formattedDate}
                        </Text>
                    </View>
                </View>
            </TouchableOpacity>
        </Link>
    );
}

