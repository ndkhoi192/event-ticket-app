import axios from "axios";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ArrowLeft, CheckCircle, Clock, Edit, Folder, MapPin, Trash2, Users } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Image, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { API_URL, useAuth } from "../../../context/AuthContext";
import { Booking, Event } from "../../../types";

export default function EventDetailsScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const { token } = useAuth();
    const [event, setEvent] = useState<Event | null>(null);
    const [loading, setLoading] = useState(true);
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [showBookings, setShowBookings] = useState(false);
    const [loadingBookings, setLoadingBookings] = useState(false);

    useEffect(() => {
        const fetchEventDetails = async () => {
            try {
                const response = await axios.get(`${API_URL}/events/${id}`);
                setEvent(response.data);
            } catch (error) {
                console.error("Failed to fetch event details:", error);
                Alert.alert("Lỗi", "Không thể tải thông tin sự kiện");
            } finally {
                setLoading(false);
            }
        };

        if (id) {
            fetchEventDetails();
        }
    }, [id]);

    const fetchBookings = async () => {
        setLoadingBookings(true);
        try {
            const headers = token ? { Authorization: `Bearer ${token}` } : {};
            const response = await axios.get(`${API_URL}/bookings/event/${id}`, { headers });
            setBookings(response.data);
            setShowBookings(true);
        } catch (error: any) {
            console.error("Failed to fetch bookings:", error);
            Alert.alert("Lỗi", error.response?.data?.message || "Không thể tải danh sách đơn");
        } finally {
            setLoadingBookings(false);
        }
    };

    const handleConfirmCash = (bookingId: string, userName: string) => {
        Alert.alert(
            "Xác nhận thanh toán tiền mặt",
            `Xác nhận đã nhận tiền mặt từ ${userName}?`,
            [
                { text: "Hủy", style: "cancel" },
                {
                    text: "Xác nhận ✅",
                    onPress: async () => {
                        try {
                            const headers = token ? { Authorization: `Bearer ${token}` } : {};
                            await axios.post(`${API_URL}/bookings/${bookingId}/confirm-payment`, {}, { headers });
                            Alert.alert("Thành công", "Thanh toán đã được xác nhận!");
                            fetchBookings(); // Refresh
                        } catch (error: any) {
                            Alert.alert("Lỗi", error.response?.data?.message || "Không thể xác nhận");
                        }
                    }
                }
            ]
        );
    };

    const handleDelete = () => {
        Alert.alert(
            "Hủy sự kiện",
            "Bạn có chắc muốn hủy sự kiện này?",
            [
                { text: "Không", style: "cancel" },
                {
                    text: "Hủy sự kiện",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            const headers = token ? { Authorization: `Bearer ${token}` } : {};
                            await axios.delete(`${API_URL}/events/${id}`, { headers });
                            Alert.alert("Thành công", "Sự kiện đã được hủy");
                            router.back();
                        } catch (error: any) {
                            Alert.alert("Lỗi", error.response?.data?.message || "Không thể hủy sự kiện");
                        }
                    },
                },
            ]
        );
    };

    const getPaymentStatusStyle = (status: string) => {
        switch (status) {
            case 'paid': return { bg: 'bg-green-100', text: 'text-green-700', label: 'Đã TT' };
            case 'pending': return { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Chờ TT' };
            case 'refunded': return { bg: 'bg-blue-100', text: 'text-blue-600', label: 'Hoàn tiền' };
            case 'cancelled': return { bg: 'bg-red-100', text: 'text-red-600', label: 'Đã hủy' };
            default: return { bg: 'bg-gray-100', text: 'text-gray-500', label: status };
        }
    };

    const getMethodLabel = (m: string) => {
        switch (m) {
            case 'payos': return 'Online';
            case 'cash': return 'Tiền mặt';
            case 'free': return 'Miễn phí';
            default: return m;
        }
    };

    if (loading) {
        return (
            <View className="flex-1 justify-center items-center bg-white">
                <ActivityIndicator size="large" color="#A7C7E7" />
            </View>
        );
    }

    if (!event) {
        return (
            <View className="flex-1 justify-center items-center bg-white">
                <Text className="text-gray-500">Không tìm thấy sự kiện</Text>
            </View>
        );
    }

    const date = new Date(event.date_time).toLocaleDateString("vi-VN", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
    });

    const time = new Date(event.date_time).toLocaleTimeString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
    });

    const pendingCashBookings = bookings.filter(b => b.payment_method === 'cash' && b.payment_status === 'pending');
    const paidBookings = bookings.filter(b => b.payment_status === 'paid');
    const totalRevenue = paidBookings.reduce((s, b) => s + b.total_amount, 0);

    return (
        <ScrollView className="flex-1 bg-white" showsVerticalScrollIndicator={false}>
            {/* Header Image */}
            <View className="relative">
                <Image
                    source={{ uri: event.banner_url }}
                    className="w-full h-64"
                    resizeMode="cover"
                />
                <TouchableOpacity
                    className="absolute top-12 left-4 bg-white/80 p-2 rounded-full backdrop-blur-sm"
                    onPress={() => router.back()}
                >
                    <ArrowLeft color="#1F2937" size={24} />
                </TouchableOpacity>

                {/* Status Badge */}
                <View className="absolute bottom-4 right-4 bg-white/90 px-3 py-1 rounded-full">
                    <Text className="text-xs font-bold capitalize text-gray-800">{event.status}</Text>
                </View>
            </View>

            {/* Content */}
            <View className="px-5 py-6">
                <Text className="text-2xl font-bold text-gray-900 mb-2">{event.title}</Text>

                <View className="flex-row items-center mb-3">
                    <Clock size={16} color="#A7C7E7" />
                    <Text className="text-gray-600 ml-2 text-base">{time} - {date}</Text>
                </View>

                <View className="flex-row items-center mb-3">
                    <MapPin size={16} color="#FAA0A0" />
                    <Text className="text-gray-600 ml-2 text-base">{event.location?.name}</Text>
                </View>

                <View className="flex-row items-center mb-6">
                    <Folder size={16} color="#9CA3AF" />
                    <Text className="text-gray-600 ml-2 text-base">
                        {typeof event.category_id === 'object' ? event.category_id.name : "Category"}
                    </Text>
                </View>

                {/* Description */}
                <Text className="text-lg font-bold text-gray-800 mb-2">Mô tả sự kiện</Text>
                <Text className="text-gray-500 leading-6 mb-8">{event.description}</Text>

                {/* Ticket Types */}
                <Text className="text-lg font-bold text-gray-800 mb-3">Thông tin vé</Text>
                <View className="space-y-3 mb-6">
                    {event.ticket_types.map((ticket, index) => (
                        <View key={index} className="flex-row justify-between items-center bg-gray-50 p-4 rounded-xl border border-gray-100">
                            <View>
                                <Text className="font-bold text-gray-700 text-lg">{ticket.type_name}</Text>
                                <Text className="text-gray-400 text-sm">{ticket.remaining_quantity} / {ticket.total_quantity} còn lại</Text>
                            </View>
                            <Text className="text-pastel-blue font-bold text-lg">
                                {ticket.price === 0 ? 'Miễn phí' : `${ticket.price.toLocaleString()} đ`}
                            </Text>
                        </View>
                    ))}
                </View>

                {/* Bookings Section */}
                <TouchableOpacity
                    className="flex-row items-center justify-center bg-blue-50 py-4 rounded-xl border border-blue-200 mb-4"
                    onPress={fetchBookings}
                    disabled={loadingBookings}
                >
                    {loadingBookings ? (
                        <ActivityIndicator color="#3B82F6" />
                    ) : (
                        <>
                            <Users size={20} color="#3B82F6" />
                            <Text className="text-blue-600 font-bold ml-2">
                                {showBookings ? 'Làm mới đơn đặt vé' : 'Xem đơn đặt vé'}
                            </Text>
                        </>
                    )}
                </TouchableOpacity>

                {showBookings && (
                    <View className="mb-6">
                        {/* Stats */}
                        <View className="flex-row mb-4">
                            <View className="flex-1 bg-green-50 p-3 rounded-xl mr-2 border border-green-100">
                                <Text className="text-green-700 text-xs font-semibold">Doanh thu</Text>
                                <Text className="text-green-800 font-bold text-lg">{totalRevenue.toLocaleString()} đ</Text>
                            </View>
                            <View className="flex-1 bg-blue-50 p-3 rounded-xl ml-2 border border-blue-100">
                                <Text className="text-blue-700 text-xs font-semibold">Tổng đơn</Text>
                                <Text className="text-blue-800 font-bold text-lg">{bookings.length}</Text>
                            </View>
                        </View>

                        {/* Pending Cash */}
                        {pendingCashBookings.length > 0 && (
                            <View className="mb-4">
                                <Text className="text-base font-bold text-yellow-700 mb-2">
                                    ⏳ Chờ xác nhận tiền mặt ({pendingCashBookings.length})
                                </Text>
                                {pendingCashBookings.map(b => {
                                    const u = b.user_id as any;
                                    return (
                                        <View key={b._id} className="bg-yellow-50 p-3 rounded-xl border border-yellow-200 mb-2">
                                            <View className="flex-row justify-between items-center mb-1">
                                                <Text className="font-bold text-gray-800">{u?.full_name || 'Khách'}</Text>
                                                <Text className="font-bold text-yellow-700">{b.total_amount.toLocaleString()} đ</Text>
                                            </View>
                                            <Text className="text-gray-500 text-xs mb-2">
                                                {b.items.map(i => `${i.type_name} ×${i.quantity}`).join(', ')}
                                            </Text>
                                            <TouchableOpacity
                                                className="bg-green-500 py-2 rounded-lg flex-row justify-center items-center"
                                                onPress={() => handleConfirmCash(b._id, u?.full_name || 'Khách')}
                                            >
                                                <CheckCircle size={16} color="white" />
                                                <Text className="text-white font-bold text-sm ml-1">Xác nhận đã nhận tiền</Text>
                                            </TouchableOpacity>
                                        </View>
                                    );
                                })}
                            </View>
                        )}

                        {/* All bookings list */}
                        <Text className="text-base font-bold text-gray-800 mb-2">Tất cả đơn ({bookings.length})</Text>
                        {bookings.length === 0 ? (
                            <Text className="text-gray-400 text-center py-4">Chưa có đơn đặt vé nào</Text>
                        ) : (
                            bookings.map(b => {
                                const u = b.user_id as any;
                                const ps = getPaymentStatusStyle(b.payment_status);
                                return (
                                    <View key={b._id} className="bg-gray-50 p-3 rounded-xl border border-gray-100 mb-2">
                                        <View className="flex-row justify-between items-center">
                                            <View className="flex-1">
                                                <Text className="font-semibold text-gray-800">{u?.full_name || 'N/A'}</Text>
                                                <Text className="text-gray-400 text-xs">{u?.email}</Text>
                                            </View>
                                            <View className={`px-2 py-1 rounded-full ${ps.bg}`}>
                                                <Text className={`text-xs font-bold ${ps.text}`}>{ps.label}</Text>
                                            </View>
                                        </View>
                                        <View className="flex-row justify-between mt-1">
                                            <Text className="text-gray-500 text-xs">
                                                {getMethodLabel(b.payment_method)} • {b.items.map(i => `${i.type_name} ×${i.quantity}`).join(', ')}
                                            </Text>
                                            <Text className="text-gray-700 font-semibold text-xs">
                                                {b.total_amount.toLocaleString()} đ
                                            </Text>
                                        </View>
                                    </View>
                                );
                            })
                        )}
                    </View>
                )}

                {/* Actions */}
                <View className="flex-row space-x-4 mb-10">
                    {event.status !== 'cancelled' && event.status !== 'ended' ? (
                        <>
                            <TouchableOpacity
                                className="flex-1 flex-row justify-center items-center bg-gray-100 py-4 rounded-xl"
                                onPress={() => Alert.alert("Sắp ra mắt", "Chức năng chỉnh sửa sẽ được cập nhật sớm.")}
                            >
                                <Edit size={20} color="#4B5563" />
                                <Text className="text-gray-700 font-bold ml-2">Sửa</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                className="flex-1 flex-row justify-center items-center bg-red-50 py-4 rounded-xl"
                                onPress={handleDelete}
                            >
                                <Trash2 size={20} color="#EF4444" />
                                <Text className="text-red-500 font-bold ml-2">Hủy sự kiện</Text>
                            </TouchableOpacity>
                        </>
                    ) : (
                        <View className="flex-1 flex-row justify-center items-center bg-gray-100 py-4 rounded-xl opacity-70">
                            <Text className="text-gray-500 font-bold text-center">
                                Sự kiện đã {event.status === 'cancelled' ? 'bị hủy' : 'kết thúc'}.
                            </Text>
                        </View>
                    )}
                </View>
            </View>
        </ScrollView>
    );
}
