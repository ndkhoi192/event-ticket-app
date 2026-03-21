import axios from "axios";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ArrowLeft, Clock, Heart, MapPin, Share2, Ticket } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Image, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";
import { API_URL, useAuth } from "../../../context/AuthContext";
import { Event } from "../../../types";

type ReviewItem = {
    _id: string;
    rating: number;
    comment: string;
    user_id: {
        full_name: string;
    };
    createdAt: string;
};

export default function EventDetailsScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const { user, refreshUser } = useAuth();
    const [event, setEvent] = useState<Event | null>(null);
    const [reviews, setReviews] = useState<ReviewItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingReviews, setLoadingReviews] = useState(false);
    const [submittingReview, setSubmittingReview] = useState(false);
    const [rating, setRating] = useState<number>(5);
    const [comment, setComment] = useState<string>("");

    const fetchReviews = async () => {
        if (!id) {
            return;
        }
        setLoadingReviews(true);
        try {
            const response = await axios.get(`${API_URL}/reviews/${id}`);
            setReviews(Array.isArray(response.data) ? response.data : []);
        } catch (error) {
            console.error("Failed to load reviews", error);
        } finally {
            setLoadingReviews(false);
        }
    };

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
            fetchReviews();
        }
    }, [id]);

    const handleSubmitReview = async () => {
        if (!user) {
            Alert.alert("Login Required", "Please login to write a review", [
                { text: "Cancel", style: "cancel" },
                { text: "Login", onPress: () => router.push("/(auth)/login") },
            ]);
            return;
        }

        if (!comment.trim()) {
            Alert.alert("Missing comment", "Please write a short review.");
            return;
        }

        setSubmittingReview(true);
        try {
            await axios.post(`${API_URL}/reviews`, {
                event_id: event?._id,
                rating,
                comment: comment.trim(),
            });
            setComment("");
            setRating(5);
            await fetchReviews();
            Alert.alert("Thanks!", "Your review has been submitted.");
        } catch (error: any) {
            Alert.alert("Error", error.response?.data?.message || "Could not submit review.");
        } finally {
            setSubmittingReview(false);
        }
    };

    if (loading) {
        return (
            <View className="flex-1 justify-center items-center bg-white">
                <ActivityIndicator size="large" color="#FB96BB" />
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

    const date = new Date(event.date_time).toLocaleDateString("en-US", {
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric",
    });

    const time = new Date(event.date_time).toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
    });

    const lowPrice = event.ticket_types && event.ticket_types.length > 0
        ? Math.min(...event.ticket_types.map(t => t.price))
        : 0;

    const averageRating = reviews.length > 0
        ? (reviews.reduce((sum, item) => sum + item.rating, 0) / reviews.length).toFixed(1)
        : null;

    const isSaved = user?.saved_events?.includes(event._id);

    const toggleSave = async () => {
        if (!user) {
            Alert.alert("Login Required", "Please login to save events", [
                { text: "Cancel", style: "cancel" },
                { text: "Login", onPress: () => router.push("/(auth)/login") }
            ]);
            return;
        }

        try {
            if (isSaved) {
                await axios.delete(`${API_URL}/users/me/saved-events/${event._id}`);
            } else {
                await axios.post(`${API_URL}/users/me/saved-events/${event._id}`);
            }
            await refreshUser();
        } catch (error) {
            console.error("Failed to toggle save", error);
            Alert.alert("Error", "Failed to update saved events");
        }
    };

    return (
        <View className="flex-1 bg-white">
            <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
                {/* Header Image */}
                <View className="relative">
                    <Image
                        source={{ uri: event.banner_url }}
                        className="w-full h-80"
                        resizeMode="cover"
                    />

                    {/* Gradient Overlay for cleaner header look if desired, or simple top bar */}
                    <View className="absolute top-0 w-full p-4 pt-12 flex-row justify-between items-center">
                        <TouchableOpacity
                            className="bg-white/80 p-2 rounded-full backdrop-blur-md shadow-sm"
                            onPress={() => router.back()}
                        >
                            <ArrowLeft color="#FB96BB" size={24} />
                        </TouchableOpacity>
                        <View className="flex-row gap-2">
                            <TouchableOpacity
                                className="bg-white/80 p-2 rounded-full backdrop-blur-md shadow-sm mr-2"
                                onPress={toggleSave}
                            >
                                <Heart
                                    color={isSaved ? "#FB96BB" : "#FB96BB"}
                                    fill={isSaved ? "#FB96BB" : "none"}
                                    size={24}
                                />
                            </TouchableOpacity>
                            <TouchableOpacity
                                className="bg-white/80 p-2 rounded-full backdrop-blur-md shadow-sm"
                                onPress={() => Alert.alert("Share", "Sharing not implemented yet!")}
                            >
                                <Share2 color="#FB96BB" size={24} />
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>

                {/* Content */}
                <View className="flex-1 bg-white -mt-6 rounded-t-3xl px-6 pt-8 pb-32">
                    <Text className="text-3xl font-bold text-gray-900 mb-2 leading-tight">{event.title}</Text>

                    <View className="flex-row items-center mb-6">
                        <View className="bg-pink-50 px-3 py-1 rounded-full mr-2">
                            <Text className="text-pastel-blue font-semibold text-xs">
                                {typeof event.category_id === 'object' ? event.category_id.name : "Event"}
                            </Text>
                        </View>
                        {event.ticket_types.some(t => t.remaining_quantity < 10) && (
                            <View className="bg-red-50 px-3 py-1 rounded-full">
                                <Text className="text-red-500 font-semibold text-xs">🔥 Selling Fast</Text>
                            </View>
                        )}
                    </View>

                    {/* Date & Location Grid */}
                    {/* Date & Location Grid */}
                    <View className="mb-8 bg-gray-50 p-4 rounded-xl border border-gray-100">
                        <View className="flex-row items-center">
                            <View className="w-10 h-10 bg-white rounded-full items-center justify-center shadow-sm mr-3">
                                <Clock size={20} color="#FB96BB" />
                            </View>
                            <View className="flex-1">
                                <Text className="text-xs text-gray-500 uppercase font-bold">Date & Time</Text>
                                <Text className="text-gray-900 font-semibold text-sm">{date}</Text>
                                <Text className="text-gray-500 text-xs">{time}</Text>
                            </View>
                        </View>

                        <View className="h-[1px] bg-gray-200 my-3" />

                        <View className="flex-row items-center">
                            <View className="w-10 h-10 bg-white rounded-full items-center justify-center shadow-sm mr-3">
                                <MapPin size={20} color="#FB96BB" />
                            </View>
                            <View className="flex-1">
                                <Text className="text-xs text-gray-500 uppercase font-bold">Location</Text>
                                <Text className="text-gray-900 font-semibold text-sm">
                                    {event.location?.name}
                                </Text>
                            </View>
                        </View>
                    </View>

                    {/* About */}
                    <Text className="text-xl font-bold text-gray-900 mb-2">About Event</Text>
                    <Text className="text-gray-500 leading-6 mb-8 text-base">
                        {event.description}
                    </Text>

                    {/* Organizer (Optional to show) */}
                    <View className="flex-row items-center mb-8">
                        <View className="w-12 h-12 bg-gray-200 rounded-full mr-3 border border-white shadow-sm" />
                        <View>
                            <Text className="text-gray-900 font-bold">
                                {typeof event.organizer_id === 'object' ? event.organizer_id.full_name : "Organizer"}
                            </Text>
                            <Text className="text-gray-500 text-xs">Organizer</Text>
                        </View>
                        <TouchableOpacity className="ml-auto bg-gray-100 px-4 py-2 rounded-lg">
                            <Text className="text-pastel-blue font-bold text-xs">Follow</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Reviews */}
                    <View className="mb-8">
                        <View className="flex-row items-center justify-between mb-3">
                            <Text className="text-xl font-bold text-gray-900">Reviews</Text>
                            <Text className="text-gray-500 text-sm font-semibold">
                                {averageRating ? `${averageRating} / 5 (${reviews.length})` : "No reviews yet"}
                            </Text>
                        </View>

                        <View className="bg-gray-50 border border-gray-100 rounded-xl p-4 mb-4">
                            <Text className="font-semibold text-gray-800 mb-2">Write your review</Text>
                            <View className="flex-row mb-3">
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <TouchableOpacity key={star} onPress={() => setRating(star)} className="mr-1">
                                        <Text className={`text-xl ${star <= rating ? "text-yellow-500" : "text-gray-300"}`}>★</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                            <TextInput
                                className="bg-white border border-gray-200 rounded-lg px-3 py-3 text-gray-700"
                                placeholder="Share your experience"
                                value={comment}
                                onChangeText={setComment}
                                multiline
                            />
                            <TouchableOpacity
                                className={`mt-3 py-3 rounded-lg ${submittingReview ? "bg-gray-300" : "bg-pastel-blue"}`}
                                onPress={handleSubmitReview}
                                disabled={submittingReview}
                            >
                                <Text className="text-center text-white font-bold">
                                    {submittingReview ? "Submitting..." : "Submit review"}
                                </Text>
                            </TouchableOpacity>
                        </View>

                        {loadingReviews ? (
                            <View className="py-6 items-center">
                                <ActivityIndicator size="small" color="#FB96BB" />
                            </View>
                        ) : reviews.length === 0 ? (
                            <View className="py-5 bg-white border border-gray-100 rounded-xl items-center">
                                <Text className="text-gray-400">No reviews yet.</Text>
                            </View>
                        ) : (
                            reviews.map((item) => (
                                <View key={item._id} className="bg-white border border-gray-100 rounded-xl p-4 mb-3">
                                    <View className="flex-row items-center justify-between mb-1">
                                        <Text className="font-bold text-gray-800">{item.user_id?.full_name || "Anonymous"}</Text>
                                        <Text className="text-yellow-500 font-semibold">{item.rating}.0 ★</Text>
                                    </View>
                                    <Text className="text-gray-600 mb-2">{item.comment}</Text>
                                    <Text className="text-gray-400 text-xs">
                                        {new Date(item.createdAt).toLocaleDateString("en-US")}
                                    </Text>
                                </View>
                            ))
                        )}
                    </View>
                </View>
            </ScrollView>

            {/* Bottom Floating Action Bar */}
            <View className="absolute bottom-0 w-full bg-white border-t border-gray-100 px-6 py-4 pb-8 flex-row items-center justify-between shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                <View>
                    <Text className="text-gray-500 text-xs font-medium uppercase">Starting from</Text>
                    <View className="flex-row items-baseline">
                        <Text className="text-2xl font-bold text-pastel-pink">
                            {`${lowPrice.toLocaleString('en-US')} VND`}
                        </Text>
                        {lowPrice > 0 && <Text className="text-gray-400 text-sm ml-1">/ person</Text>}
                    </View>
                </View>

                <TouchableOpacity
                    className="bg-pastel-blue px-8 py-4 rounded-2xl shadow-lg flex-row items-center"
                    onPress={() => router.push({ pathname: "/(attendee)/book/[id]", params: { id: Array.isArray(id) ? id[0] : id } })}
                >
                    <Text className="text-white font-bold text-lg mr-2">Book now</Text>
                    <Ticket color="white" size={20} />
                </TouchableOpacity>
            </View>
        </View>
    );
}
