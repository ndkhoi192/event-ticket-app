import axios from "axios";
import * as Linking from "expo-linking";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ArrowLeft, Minus, Plus, Ticket } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { API_URL, useAuth } from "../../../context/AuthContext";
import { Event, TicketType } from "../../../types";

export default function BookingScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const { user } = useAuth();
    const [event, setEvent] = useState<Event | null>(null);
    const [loading, setLoading] = useState(true);
    const [quantities, setQuantities] = useState<{ [key: string]: number }>({});
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        const fetchEvent = async () => {
            try {
                const response = await axios.get(`${API_URL}/events/${id}`);
                setEvent(response.data);

                // Initialize quantities
                const initialQuantities: { [key: string]: number } = {};
                response.data.ticket_types.forEach((t: TicketType) => {
                    initialQuantities[t.type_name] = 0;
                });
                setQuantities(initialQuantities);
            } catch (error) {
                console.error("Failed to fetch event", error);
                Alert.alert("Error", "Could not load event details");
                router.back();
            } finally {
                setLoading(false);
            }
        };

        if (id) fetchEvent();
    }, [id]);

    const updateQuantity = (typeName: string, delta: number) => {
        setQuantities(prev => {
            const current = prev[typeName] || 0;
            const newVal = Math.max(0, current + delta);

            // Check remaining quantity
            const ticketType = event?.ticket_types.find(t => t.type_name === typeName);
            if (ticketType && newVal > ticketType.remaining_quantity) {
                Alert.alert("Limit Reached", `Only ${ticketType.remaining_quantity} tickets left.`);
                return prev;
            }

            return { ...prev, [typeName]: newVal };
        });
    };

    const calculateTotal = () => {
        if (!event) return 0;
        return event.ticket_types.reduce((total, type) => {
            return total + (type.price * (quantities[type.type_name] || 0));
        }, 0);
    };

    const handleCheckout = async () => {
        const total = calculateTotal();
        if (total === 0) {
            Alert.alert("Select Tickets", "Please select at least one ticket.");
            return;
        }

        if (!user) {
            router.push("/(auth)/login");
            return;
        }

        setProcessing(true);

        try {
            // Prepare items
            const items = Object.entries(quantities)
                .filter(([_, qty]) => qty > 0)
                .map(([typeName, qty]) => ({
                    type_name: typeName,
                    quantity: qty,
                    unit_price: event?.ticket_types.find(t => t.type_name === typeName)?.price || 0
                }));

            // Create Booking
            const response = await axios.post(`${API_URL}/bookings`, {
                event_id: event?._id,
                items,
                total_amount: total,
                payment_method: 'payos'
            });

            const { booking, checkoutUrl } = response.data;

            // Open Payment Link
            if (checkoutUrl) {
                const supported = await Linking.canOpenURL(checkoutUrl);
                if (supported) {
                    await Linking.openURL(checkoutUrl);

                    // Navigate to confirmation check screen or just wait
                    // For simplicity, showing an alert to confirm manually
                    Alert.alert(
                        "Payment Processing",
                        "Please complete payment in the browser/app. Once done, click 'I have paid'.",
                        [
                            { text: "Cancel", style: "cancel" },
                            {
                                text: "I have paid",
                                onPress: () => confirmPayment(booking._id)
                            }
                        ]
                    );
                } else {
                    Alert.alert("Error", "Cannot open payment link");
                }
            } else {
                // If immediate success (e.g. status paid or free)
                router.replace("/(attendee)/tickets");
            }

        } catch (error: any) {
            console.error("Booking failed", error);
            Alert.alert("Booking Failed", error.response?.data?.message || "Something went wrong");
        } finally {
            setProcessing(false);
        }
    };

    const confirmPayment = async (bookingId: string) => {
        setProcessing(true);
        try {
            const response = await axios.post(`${API_URL}/bookings/${bookingId}/confirm`);
            if (response.data.booking.payment_status === 'paid') {
                Alert.alert("Success", "Tickets booked successfully!");
                router.replace("/(attendee)/tickets");
            } else {
                Alert.alert(
                    "Payment Not Found",
                    "We couldn't verify your payment yet. Please try again or check your bank app.",
                    [
                        { text: "Cancel", style: "cancel" },
                        { text: "Check Again", onPress: () => confirmPayment(bookingId) }
                    ]
                );
            }
        } catch (error) {
            console.error("Confirmation failed", error);
            Alert.alert("Error", "Failed to confirm payment");
        } finally {
            setProcessing(false);
        }
    };

    if (loading) return <View className="flex-1 bg-white justify-center items-center"><ActivityIndicator size="large" color="#F472B6" /></View>;
    if (!event) return <View className="flex-1 bg-white justify-center items-center"><Text>Event not found</Text></View>;

    return (
        <View className="flex-1 bg-white">
            {/* Header */}
            <View className="pt-12 pb-4 px-6 flex-row items-center border-b border-gray-100 bg-white z-10">
                <TouchableOpacity onPress={() => router.back()} className="mr-4 p-2 bg-gray-50 rounded-full">
                    <ArrowLeft color="#374151" size={24} />
                </TouchableOpacity>
                <Text className="text-xl font-bold text-gray-900 flex-1" numberOfLines={1}>Booking: {event.title}</Text>
            </View>

            <ScrollView className="flex-1 px-6 pt-6">
                <Text className="text-lg font-bold text-gray-800 mb-4">Select Tickets</Text>

                {event.ticket_types.map((type) => (
                    <View key={type.type_name} className="flex-row items-center justify-between mb-6 bg-gray-50 p-4 rounded-xl border border-gray-100">
                        <View className="flex-1">
                            <Text className="font-bold text-gray-900 text-base">{type.type_name}</Text>
                            <Text className="text-pastel-pink font-semibold mt-1">
                                {type.price.toLocaleString('vi-VN')} VND
                            </Text>
                            <Text className="text-gray-400 text-xs mt-1">
                                {type.remaining_quantity} available
                            </Text>
                        </View>

                        <View className="flex-row items-center bg-white rounded-lg shadow-sm border border-gray-100">
                            <TouchableOpacity
                                onPress={() => updateQuantity(type.type_name, -1)}
                                className="p-3 border-r border-gray-100"
                            >
                                <Minus size={16} color="#9CA3AF" />
                            </TouchableOpacity>
                            <Text className="w-10 text-center font-bold text-gray-800">
                                {quantities[type.type_name] || 0}
                            </Text>
                            <TouchableOpacity
                                onPress={() => updateQuantity(type.type_name, 1)}
                                className="p-3 border-l border-gray-100"
                            >
                                <Plus size={16} color="#F472B6" />
                            </TouchableOpacity>
                        </View>
                    </View>
                ))}
            </ScrollView>

            {/* Bottom Bar */}
            <View className="p-6 border-t border-gray-100 bg-white shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                <View className="flex-row justify-between items-center mb-4">
                    <Text className="text-gray-500 font-medium">Total Amount</Text>
                    <Text className="text-2xl font-bold text-pastel-pink">
                        {calculateTotal().toLocaleString('vi-VN')} VND
                    </Text>
                </View>

                <TouchableOpacity
                    className={`nav-button bg-pastel-blue py-4 rounded-2xl shadow-lg flex-row justify-center items-center ${processing ? 'opacity-70' : ''}`}
                    onPress={handleCheckout}
                    disabled={processing}
                >
                    {processing ? (
                        <ActivityIndicator color="white" />
                    ) : (
                        <>
                            <Text className="text-white font-bold text-lg mr-2">Proceed to Payment</Text>
                            <Ticket color="white" size={20} />
                        </>
                    )}
                </TouchableOpacity>
            </View>
        </View>
    );
}
