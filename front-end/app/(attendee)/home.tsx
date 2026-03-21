import axios from "axios";
import { Link, useRouter } from "expo-router";
import { Search } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";
import FeaturedEvent from "../../components/FeaturedEvent";
import StandardEventCard from "../../components/StandardEventCard";
import { API_URL, useAuth } from "../../context/AuthContext";
import { Category, Event } from "../../types";

export default function AttendeeHomeScreen() {
    const { user } = useAuth();
    const router = useRouter();
    const [events, setEvents] = useState<Event[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [eventsRes, categoriesRes] = await Promise.all([
                    axios.get(`${API_URL}/events`),
                    axios.get(`${API_URL}/categories`)
                ]);
                setEvents(eventsRes.data);
                setCategories(categoriesRes.data);
            } catch (error) {
                console.error("Error fetching data:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    const featuredEvents = events.slice(0, 5); // Take first 5 for featured
    const upcomingEvents = events; // All for list

    if (loading) {
        return (
            <View className="flex-1 justify-center items-center bg-white">
                <ActivityIndicator size="large" color="#FB96BB" />
            </View>
        );
    }

    return (
        <ScrollView className="flex-1 bg-gray-50" showsVerticalScrollIndicator={false}>
            {/* Header */}
            <View className="bg-white pt-14 pb-4 px-6 border-b border-gray-100">
                <View className="flex-row justify-between items-center mb-4">
                    <View>
                        <Text className="text-gray-500 font-medium">Hello, {user?.full_name?.split(' ')[0] || 'Guest'}!</Text>
                        <View className="flex-row items-center">
                            <Text className="text-2xl font-bold text-gray-900">Let's find fun!</Text>
                            <Text className="text-2xl ml-2">✨</Text>
                        </View>
                    </View>
                    <Link href="/(attendee)/profile" asChild>
                        <TouchableOpacity className="w-10 h-10 bg-gray-100 rounded-full items-center justify-center border border-gray-200">
                            <Text className="text-gray-600 font-bold text-sm">
                                {user?.full_name ? user.full_name.charAt(0).toUpperCase() : 'G'}
                            </Text>
                        </TouchableOpacity>
                    </Link>
                </View>
            </View>

            {/* Featured Events */}
            <View className="mb-7 mt-3">
                <View className="flex-row justify-between items-center px-6 mb-4">
                    <Text className="text-xl font-bold text-gray-900">Featured Events</Text>
                    <Link href="/(attendee)/discover" asChild>
                        <TouchableOpacity>
                            <Text className="text-pastel-pink font-semibold">See all</Text>
                        </TouchableOpacity>
                    </Link>
                </View>

                <FlatList
                    horizontal
                    data={featuredEvents}
                    keyExtractor={(item) => item._id}
                    renderItem={({ item }) => <FeaturedEvent event={item} />}
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ paddingLeft: 24, paddingRight: 8 }}
                    snapToInterval={300} // Width + margin of card approximately
                    decelerationRate="fast"
                />
            </View>

            {/* Upcoming Near You */}
            <View className="px-6 pb-28">
                <Text className="text-xl font-bold text-gray-900 mb-4">Upcoming Near You</Text>
                {upcomingEvents.map((event) => (
                    <StandardEventCard key={event._id} event={event} />
                ))}
                {upcomingEvents.length === 0 && (
                    <Text className="text-gray-400 text-center mt-4">No upcoming events found.</Text>
                )}
            </View>
        </ScrollView>
    );
}

