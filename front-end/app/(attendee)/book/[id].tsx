import axios from "axios";
import * as Linking from "expo-linking";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ArrowLeft, Banknote, CreditCard, Minus, Plus, Ticket } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { API_URL, useAuth } from "../../../context/AuthContext";
import { Event, TicketType } from "../../../types";

type PaymentMethod = 'payos' | 'cash';

export default function BookingScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const { user } = useAuth();
    const [event, setEvent] = useState<Event | null>(null);
    const [loading, setLoading] = useState(true);
    const [quantities, setQuantities] = useState<{ [key: string]: number }>({});
    const [processing, setProcessing] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('payos');

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
                Alert.alert("Lỗi", "Không thể tải thông tin sự kiện");
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
                Alert.alert("Đã đạt giới hạn", `Chỉ còn ${ticketType.remaining_quantity} vé.`);
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

    const isFreeEvent = () => {
        if (!event) return false;
        return event.ticket_types.every(t => t.price === 0);
    };

    const handleCheckout = async () => {
        const total = calculateTotal();
        const hasSelected = Object.values(quantities).some(q => q > 0);

        if (!hasSelected) {
            Alert.alert("Chọn vé", "Vui lòng chọn ít nhất một vé.");
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

            // Determine payment method
            let method: string = paymentMethod;
            if (total === 0) {
                method = 'free';
            }

            // Create Booking
            const response = await axios.post(`${API_URL}/bookings`, {
                event_id: event?._id,
                items,
                total_amount: total,
                payment_method: method
            });

            const { booking, checkoutUrl, tickets, message } = response.data;

            // ===== FREE EVENT =====
            if (method === 'free' || booking.payment_status === 'paid') {
                Alert.alert(
                    "Thành công! 🎉",
                    message || "Vé đã được đặt thành công!",
                    [{ text: "Xem vé", onPress: () => router.replace("/(attendee)/tickets") }]
                );
                return;
            }

            // ===== CASH PAYMENT =====
            if (method === 'cash') {
                Alert.alert(
                    "Đặt vé thành công! 💵",
                    "Vui lòng thanh toán tiền mặt tại quầy trước khi sự kiện diễn ra. Vé sẽ được cấp sau khi ban tổ chức xác nhận thanh toán.",
                    [{ text: "OK", onPress: () => router.replace("/(attendee)/tickets") }]
                );
                return;
            }

            // ===== PAYOS ONLINE PAYMENT =====
            if (checkoutUrl) {
                const supported = await Linking.canOpenURL(checkoutUrl);
                if (supported) {
                    await Linking.openURL(checkoutUrl);

                    // Show confirmation dialog after returning from payment
                    Alert.alert(
                        "Xác nhận thanh toán",
                        "Bạn đã hoàn tất thanh toán chưa?",
                        [
                            {
                                text: "Hủy",
                                style: "cancel",
                                onPress: () => {
                                    Alert.alert(
                                        "Lưu ý",
                                        "Bạn có thể kiểm tra lại trong mục Vé của tôi. Nếu đã thanh toán, hãy bấm xác nhận lại.",
                                        [{ text: "OK" }]
                                    );
                                }
                            },
                            {
                                text: "Đã thanh toán ✅",
                                onPress: () => confirmPayment(booking._id)
                            }
                        ]
                    );
                } else {
                    Alert.alert("Lỗi", "Không thể mở link thanh toán. Vui lòng thử lại.");
                }
            } else {
                Alert.alert("Lỗi", "Không nhận được link thanh toán từ server.");
            }

        } catch (error: any) {
            console.error("Booking failed", error);
            const errorMsg = error.response?.data?.message || "Đã xảy ra lỗi. Vui lòng thử lại.";
            Alert.alert("Đặt vé thất bại", errorMsg);
        } finally {
            setProcessing(false);
        }
    };

    const confirmPayment = async (bookingId: string) => {
        setProcessing(true);
        try {
            const response = await axios.post(`${API_URL}/bookings/${bookingId}/confirm-payment`);
            if (response.data.booking.payment_status === 'paid') {
                Alert.alert(
                    "Thành công! 🎉",
                    "Thanh toán đã được xác nhận. Vé đã sẵn sàng!",
                    [{ text: "Xem vé", onPress: () => router.replace("/(attendee)/tickets") }]
                );
            } else {
                Alert.alert(
                    "Chưa xác nhận được",
                    "Hệ thống chưa nhận được thanh toán. Vui lòng chờ vài phút rồi thử lại.",
                    [
                        { text: "Hủy", style: "cancel" },
                        { text: "Thử lại", onPress: () => confirmPayment(bookingId) }
                    ]
                );
            }
        } catch (error: any) {
            console.error("Confirmation failed", error);
            const errorMsg = error.response?.data?.message || "Không thể xác nhận thanh toán";
            Alert.alert(
                "Lỗi xác nhận",
                errorMsg,
                [
                    { text: "Hủy", style: "cancel" },
                    { text: "Thử lại", onPress: () => confirmPayment(bookingId) }
                ]
            );
        } finally {
            setProcessing(false);
        }
    };

    if (loading) return <View className="flex-1 bg-white justify-center items-center"><ActivityIndicator size="large" color="#F472B6" /></View>;
    if (!event) return <View className="flex-1 bg-white justify-center items-center"><Text>Không tìm thấy sự kiện</Text></View>;

    const total = calculateTotal();
    const isFree = isFreeEvent();

    return (
        <View className="flex-1 bg-white">
            {/* Header */}
            <View className="pt-12 pb-4 px-6 flex-row items-center border-b border-gray-100 bg-white z-10">
                <TouchableOpacity onPress={() => router.back()} className="mr-4 p-2 bg-gray-50 rounded-full">
                    <ArrowLeft color="#374151" size={24} />
                </TouchableOpacity>
                <Text className="text-xl font-bold text-gray-900 flex-1" numberOfLines={1}>Đặt vé: {event.title}</Text>
            </View>

            <ScrollView className="flex-1 px-6 pt-6">
                {/* Ticket Selection */}
                <Text className="text-lg font-bold text-gray-800 mb-4">Chọn loại vé</Text>

                {event.ticket_types.map((type) => (
                    <View key={type.type_name} className="flex-row items-center justify-between mb-4 bg-gray-50 p-4 rounded-xl border border-gray-100">
                        <View className="flex-1">
                            <Text className="font-bold text-gray-900 text-base">{type.type_name}</Text>
                            <Text className="text-pastel-pink font-semibold mt-1">
                                {type.price === 0 ? 'Miễn phí' : `${type.price.toLocaleString('vi-VN')} VND`}
                            </Text>
                            <Text className="text-gray-400 text-xs mt-1">
                                Còn {type.remaining_quantity} vé
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

                {/* Payment Method Selection - Only show for paid events */}
                {!isFree && total > 0 && (
                    <View className="mt-4 mb-6">
                        <Text className="text-lg font-bold text-gray-800 mb-3">Phương thức thanh toán</Text>

                        {/* PayOS Online */}
                        <TouchableOpacity
                            onPress={() => setPaymentMethod('payos')}
                            className={`flex-row items-center p-4 rounded-xl border mb-3 ${paymentMethod === 'payos'
                                    ? 'border-pink-400 bg-pink-50'
                                    : 'border-gray-200 bg-gray-50'
                                }`}
                        >
                            <View className={`w-10 h-10 rounded-full items-center justify-center mr-3 ${paymentMethod === 'payos' ? 'bg-pink-400' : 'bg-gray-200'
                                }`}>
                                <CreditCard size={20} color={paymentMethod === 'payos' ? 'white' : '#6B7280'} />
                            </View>
                            <View className="flex-1">
                                <Text className={`font-bold text-base ${paymentMethod === 'payos' ? 'text-pink-600' : 'text-gray-700'}`}>
                                    Chuyển khoản / Ví điện tử
                                </Text>
                                <Text className="text-gray-400 text-xs mt-0.5">
                                    Thanh toán qua PayOS (QR Code, Momo, ZaloPay...)
                                </Text>
                            </View>
                            <View className={`w-5 h-5 rounded-full border-2 items-center justify-center ${paymentMethod === 'payos' ? 'border-pink-400' : 'border-gray-300'
                                }`}>
                                {paymentMethod === 'payos' && (
                                    <View className="w-3 h-3 rounded-full bg-pink-400" />
                                )}
                            </View>
                        </TouchableOpacity>

                        {/* Cash */}
                        <TouchableOpacity
                            onPress={() => setPaymentMethod('cash')}
                            className={`flex-row items-center p-4 rounded-xl border ${paymentMethod === 'cash'
                                    ? 'border-green-400 bg-green-50'
                                    : 'border-gray-200 bg-gray-50'
                                }`}
                        >
                            <View className={`w-10 h-10 rounded-full items-center justify-center mr-3 ${paymentMethod === 'cash' ? 'bg-green-500' : 'bg-gray-200'
                                }`}>
                                <Banknote size={20} color={paymentMethod === 'cash' ? 'white' : '#6B7280'} />
                            </View>
                            <View className="flex-1">
                                <Text className={`font-bold text-base ${paymentMethod === 'cash' ? 'text-green-700' : 'text-gray-700'}`}>
                                    Tiền mặt
                                </Text>
                                <Text className="text-gray-400 text-xs mt-0.5">
                                    Thanh toán trực tiếp tại quầy sự kiện
                                </Text>
                            </View>
                            <View className={`w-5 h-5 rounded-full border-2 items-center justify-center ${paymentMethod === 'cash' ? 'border-green-400' : 'border-gray-300'
                                }`}>
                                {paymentMethod === 'cash' && (
                                    <View className="w-3 h-3 rounded-full bg-green-500" />
                                )}
                            </View>
                        </TouchableOpacity>
                    </View>
                )}

                {/* Free event notice */}
                {isFree && (
                    <View className="mt-2 mb-4 p-4 bg-green-50 rounded-xl border border-green-200">
                        <Text className="text-green-700 font-semibold text-center">
                            🎉 Sự kiện miễn phí - Không cần thanh toán!
                        </Text>
                    </View>
                )}

                {/* Spacer for bottom bar */}
                <View className="h-32" />
            </ScrollView>

            {/* Bottom Bar */}
            <View className="p-6 border-t border-gray-100 bg-white shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                <View className="flex-row justify-between items-center mb-4">
                    <Text className="text-gray-500 font-medium">Tổng cộng</Text>
                    <Text className="text-2xl font-bold text-pastel-pink">
                        {total === 0 ? 'Miễn phí' : `${total.toLocaleString('vi-VN')} VND`}
                    </Text>
                </View>

                <TouchableOpacity
                    className={`py-4 rounded-2xl shadow-lg flex-row justify-center items-center ${processing ? 'opacity-70' : ''
                        } ${isFree || total === 0
                            ? 'bg-green-500'
                            : paymentMethod === 'cash'
                                ? 'bg-green-500'
                                : 'bg-pastel-blue'
                        }`}
                    onPress={handleCheckout}
                    disabled={processing}
                >
                    {processing ? (
                        <ActivityIndicator color="white" />
                    ) : (
                        <>
                            <Text className="text-white font-bold text-lg mr-2">
                                {isFree || total === 0
                                    ? 'Đặt vé miễn phí'
                                    : paymentMethod === 'cash'
                                        ? 'Đặt vé - Trả tiền mặt'
                                        : 'Thanh toán online'
                                }
                            </Text>
                            <Ticket color="white" size={20} />
                        </>
                    )}
                </TouchableOpacity>
            </View>
        </View>
    );
}
