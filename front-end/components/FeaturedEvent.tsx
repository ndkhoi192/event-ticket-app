import { Link } from "expo-router";
import React from "react";
import { Image, TouchableOpacity, useWindowDimensions } from "react-native";
import { Event } from "../types";

interface FeaturedEventProps {
    event: Event;
}

export default function FeaturedEvent({ event }: FeaturedEventProps) {
    const { width } = useWindowDimensions();

    return (
        <Link href={`/(attendee)/events/${event._id}`} asChild>
            <TouchableOpacity style={{ width, height: 220 }} className="overflow-hidden">
                <Image
                    source={{ uri: event.banner_url }}
                    className="w-full h-full object-cover"
                />
            </TouchableOpacity>
        </Link>
    );
}
