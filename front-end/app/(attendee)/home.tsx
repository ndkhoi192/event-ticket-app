import axios from "axios";
import { useRouter } from "expo-router";
import { ChevronLeft, ChevronRight, Search } from "lucide-react-native";
import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, FlatList, ScrollView, Text, TextInput, TouchableOpacity, View, useWindowDimensions } from "react-native";
import FeaturedEvent from "../../components/FeaturedEvent";
import StandardEventCard from "../../components/StandardEventCard";
import { API_URL, useAuth } from "../../context/AuthContext";
import { Event } from "../../types";

export default function AttendeeHomeScreen() {
    const { user } = useAuth();
    const router = useRouter();
    const { width } = useWindowDimensions();
    const [latestEvents, setLatestEvents] = useState<Event[]>([]);
    const [hotEvents, setHotEvents] = useState<Event[]>([]);
    const [loading, setLoading] = useState(true);
    const [showSearchInput, setShowSearchInput] = useState(false);
    const [searchKeyword, setSearchKeyword] = useState("");
    const [activeSlide, setActiveSlide] = useState(0);
    const featuredListRef = useRef<FlatList<Event>>(null);

    const handleHeaderSearch = () => {
        const keyword = searchKeyword.trim();
        router.push({
            pathname: "/(attendee)/discover",
            params: keyword ? { search: keyword } : {},
        });
        setShowSearchInput(false);
    };

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [latestRes, hotRes] = await Promise.all([
                    axios.get(`${API_URL}/events/latest?n=5`),
                    axios.get(`${API_URL}/events/hot?n=5`),
                ]);
                setLatestEvents(Array.isArray(latestRes.data) ? latestRes.data : []);
                setHotEvents(Array.isArray(hotRes.data) ? hotRes.data : []);
            } catch (error) {
                console.error("Error fetching data:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    const featuredEvents = latestEvents;

    const handlePrevSlide = () => {
        if (featuredEvents.length === 0) return;
        const prevIndex = activeSlide === 0 ? featuredEvents.length - 1 : activeSlide - 1;
        featuredListRef.current?.scrollToOffset({ offset: prevIndex * width, animated: true });
        setActiveSlide(prevIndex);
    };

    const handleNextSlide = () => {
        if (featuredEvents.length === 0) return;
        const nextIndex = activeSlide === featuredEvents.length - 1 ? 0 : activeSlide + 1;
        featuredListRef.current?.scrollToOffset({ offset: nextIndex * width, animated: true });
        setActiveSlide(nextIndex);
    };

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
            <View className="bg-[#fc87b4] pt-14 pb-5 px-6 rounded-b-[10px]">
                <View className="flex-row justify-between items-center">
                    <View className="flex-row items-end">
                        <Text className="text-white text-[24px] leading-[30px] font-extrabold">
                            {`Hello, ${user?.full_name?.split(" ")[0] || "Guest"}`}
                        </Text>
                    </View>
                    <TouchableOpacity
                        className="w-11 h-11 rounded-full items-center justify-center border border-white/40 bg-white/10"
                        onPress={() => setShowSearchInput((prev) => !prev)}
                    >
                        <Search size={22} color="white" />
                    </TouchableOpacity>
                </View>

                {showSearchInput && (
                    <View className="mt-4 flex-row items-center rounded-xl border border-white/40 bg-white/15 px-3 py-2">
                        <Search size={18} color="white" />
                        <TextInput
                            className="flex-1 ml-2 text-white"
                            placeholder="Search events..."
                            placeholderTextColor="#FDE7F0"
                            value={searchKeyword}
                            onChangeText={setSearchKeyword}
                            returnKeyType="search"
                            onSubmitEditing={handleHeaderSearch}
                            autoFocus
                        />
                        <TouchableOpacity onPress={handleHeaderSearch} className="px-2 py-1">
                            <Text className="text-white font-semibold">Go</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>

            {/* Featured Events */}
            <View className="mb-7 mt-0">
                <View className="relative">
                    <FlatList
                        ref={featuredListRef}
                        horizontal
                        data={featuredEvents}
                        keyExtractor={(item) => item._id}
                        renderItem={({ item }) => <FeaturedEvent event={item} />}
                        showsHorizontalScrollIndicator={false}
                        pagingEnabled
                        decelerationRate="fast"
                        bounces={false}
                        onMomentumScrollEnd={(event) => {
                            const width = event.nativeEvent.layoutMeasurement.width;
                            const index = Math.round(event.nativeEvent.contentOffset.x / width);
                            setActiveSlide(index);
                        }}
                    />

                    {featuredEvents.length > 1 && (
                        <>
                            <TouchableOpacity
                                onPress={handlePrevSlide}
                                className="absolute left-3 w-9 h-9 rounded-full bg-black/35 items-center justify-center"
                                style={{ top: "50%", transform: [{ translateY: -18 }] }}
                            >
                                <ChevronLeft size={20} color="white" />
                            </TouchableOpacity>

                            <TouchableOpacity
                                onPress={handleNextSlide}
                                className="absolute right-3 w-9 h-9 rounded-full bg-black/35 items-center justify-center"
                                style={{ top: "50%", transform: [{ translateY: -18 }] }}
                            >
                                <ChevronRight size={20} color="white" />
                            </TouchableOpacity>
                        </>
                    )}
                </View>

                {featuredEvents.length > 1 && (
                    <View className="mt-4 flex-row items-center justify-center gap-2">
                        {featuredEvents.map((_, index) => (
                            <View
                                key={`dot-${index}`}
                                className={`h-2.5 w-2.5 rounded-full ${index === activeSlide ? "bg-[#fc87b4]" : "bg-[#f9c7d9]"}`}
                            />
                        ))}
                    </View>
                )}
            </View>

            {/* Special Events */}
            <View className="px-6 pb-28">
                <Text className="text-lg font-bold text-gray-900 mb-4">Hot Events</Text>
                {hotEvents.map((event) => (
                    <StandardEventCard key={event._id} event={event} />
                ))}

                {hotEvents.length === 0 && (
                    <Text className="text-gray-400 text-center mt-4">No events found.</Text>
                )}
            </View>
        </ScrollView>
    );
}

