import axios from "axios";
import { useLocalSearchParams } from "expo-router";
import { Filter, Search } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, RefreshControl, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";
import StandardEventCard from "../../components/StandardEventCard";
import { API_URL } from "../../context/AuthContext";
import { Category, Event } from "../../types";

export default function DiscoverScreen() {
    const params = useLocalSearchParams();
    const [events, setEvents] = useState<Event[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState(params.search as string || "");
    const [selectedCategory, setSelectedCategory] = useState(params.category as string || "All");
    const [refreshing, setRefreshing] = useState(false);

    const fetchEvents = async () => {
        try {
            let url = `${API_URL}/events?status=published`;
            if (searchQuery) url += `&keyword=${searchQuery}`;
            if (selectedCategory && selectedCategory !== "All") url += `&category=${selectedCategory}`;

            const response = await axios.get(url);
            setEvents(response.data);
        } catch (error) {
            console.error("Failed to fetch events:", error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const fetchCategories = async () => {
        try {
            const response = await axios.get(`${API_URL}/categories`);
            setCategories([{ _id: "All", name: "All Events" }, ...response.data]);
        } catch (error) {
            console.error("Failed to fetch categories:", error);
        }
    };

    useEffect(() => {
        fetchCategories();
    }, []);

    useEffect(() => {
        setLoading(true);
        fetchEvents();
    }, [searchQuery, selectedCategory]);

    const onRefresh = () => {
        setRefreshing(true);
        fetchEvents();
    };

    return (
        <View className="flex-1 bg-gray-50 pt-14 px-5">
            {/* Header */}
            <View className="mb-5">
                <Text className="text-3xl font-bold text-gray-900 mb-4">Discover Events</Text>

                <View className="flex-row items-center space-x-2">
                    <View className="flex-1 flex-row items-center bg-gray-50 rounded-xl px-4 py-3 border border-gray-200">
                        <Search color="#FB96BB" size={20} />
                        <TextInput
                            placeholder="Find amazing events..."
                            className="flex-1 ml-2 text-gray-700 font-medium"
                            placeholderTextColor="#FB96BB"
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            onSubmitEditing={fetchEvents}
                        />
                    </View>
                    <TouchableOpacity className="bg-pastel-pink p-3 rounded-xl shadow-sm">
                        <Filter color="white" size={20} />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Categories */}
            <View className="mb-5 h-10">
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ paddingRight: 20, paddingLeft: 2 }}
                >
                    {categories.map((category) => (
                        <TouchableOpacity
                            key={category._id}
                            onPress={() => setSelectedCategory(category._id)}
                            className={`mr-3 px-5 py-2 rounded-full border ${selectedCategory === category._id
                                    ? "bg-pastel-pink border-pastel-pink"
                                    : "bg-white border-gray-200"
                                }`}
                        >
                            <Text
                                className={`font-semibold ${selectedCategory === category._id ? "text-white" : "text-gray-600"
                                    }`}
                            >
                                {category.name}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            {/* Events List */}
            {loading && !refreshing ? (
                <View className="flex-1 justify-center items-center">
                    <ActivityIndicator size="large" color="#FB96BB" />
                </View>
            ) : (
                <FlatList
                    data={events}
                    keyExtractor={(item) => item._id}
                    renderItem={({ item }) => <StandardEventCard event={item} />}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingBottom: 128, paddingTop: 4 }}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FB96BB" />
                    }
                    ListEmptyComponent={
                        <View className="mt-20 items-center">
                            <Text className="text-gray-400 text-lg">No events found.</Text>
                            <Text className="text-gray-400 text-sm mt-2">
                                Try adjusting your search or category.
                            </Text>
                        </View>
                    }
                />
            )}
        </View>
    );
}

