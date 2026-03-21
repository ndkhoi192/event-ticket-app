import axios from "axios";
import { useRouter } from "expo-router";
import { CalendarDays, MapPin, QrCode, RefreshCw, Ticket } from "lucide-react-native";
import React, { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Image,
    Modal,
    RefreshControl,
    ScrollView,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { API_URL, useAuth } from "../../context/AuthContext";
import { Booking, TicketItem } from "../../types";

type TabType = 'tickets' | 'bookings';

export default function TicketsScreen() {
    const router = useRouter();
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState<TabType>('tickets');
    const [tickets, setTickets] = useState<TicketItem[]>([]);
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [qrModalVisible, setQrModalVisible] = useState(false);
    const [selectedBookingId, setSelectedBookingId] = useState<string>("");
    const [selectedQrData, setSelectedQrData] = useState<string>("");

    const fetchData = useCallback(async () => {
        try {
            const [ticketsRes, bookingsRes] = await Promise.all([
                axios.get(`${API_URL}/tickets`),
                axios.get(`${API_URL}/bookings`),
            ]);
            setTickets(ticketsRes.data);
            setBookings(bookingsRes.data);
        } catch (error) {
            console.error("Failed to fetch data", error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const onRefresh = () => {
        setRefreshing(true);
        fetchData();
    };

    const formatDate = (dateStr: string) => {
        const d = new Date(dateStr);
        return d.toLocaleDateString('vi-VN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'valid': return { bg: 'bg-pink-100', text: 'text-pink-700', label: 'Hợp lệ' };
            case 'used': return { bg: 'bg-gray-100', text: 'text-gray-600', label: 'Đã sử dụng' };
            case 'expired': return { bg: 'bg-red-100', text: 'text-red-600', label: 'Hết hạn' };
            default: return { bg: 'bg-gray-100', text: 'text-gray-500', label: status };
        }
    };

    const getPaymentStatusStyle = (status: string) => {
        switch (status) {
            case 'paid': return { bg: 'bg-pink-100', text: 'text-pink-700', label: 'Đã thanh toán' };
            case 'pending': return { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Chờ thanh toán' };
            case 'refunded': return { bg: 'bg-pink-100', text: 'text-pink-600', label: 'Đã hoàn tiền' };
            case 'cancelled': return { bg: 'bg-red-100', text: 'text-red-600', label: 'Đã hủy' };
            default: return { bg: 'bg-gray-100', text: 'text-gray-500', label: status };
        }
    };

    const getPaymentMethodLabel = (method: string) => {
        switch (method) {
            case 'payos': return 'QR thanh toan';
            case 'cash': return 'Tiền mặt';
            default: return method;
        }
    };

    const handleCancelBooking = (bookingId: string) => {
        Alert.alert(
            "Hủy đơn đặt vé",
            "Bạn có chắc chắn muốn hủy đơn này?",
            [
                { text: "Không", style: "cancel" },
                {
                    text: "Hủy đơn",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            await axios.put(`${API_URL}/bookings/${bookingId}/cancel`);
                            Alert.alert("Thành công", "Đơn đã được hủy.");
                            fetchData();
                        } catch (error: any) {
                            Alert.alert("Lỗi", error.response?.data?.message || "Không thể hủy đơn");
                        }
                    }
                }
            ]
        );
    };

    const handleOpenPaymentQr = (booking: Booking) => {
        if (!booking.checkout_qr_data) {
            Alert.alert("Loi", "Khong tim thay QR thanh toan.");
            return;
        }
        setSelectedBookingId(booking._id);
        setSelectedQrData(booking.checkout_qr_data);
        setQrModalVisible(true);
    };

    const handleConfirmPayment = async (bookingId: string) => {
        try {
            const response = await axios.post(`${API_URL}/bookings/${bookingId}/confirm-payment`);
            if (response.data.booking.payment_status === 'paid') {
                Alert.alert("Thành công! 🎉", "Thanh toán đã được xác nhận.");
                fetchData();
            } else {
                Alert.alert("Chưa xác nhận được", "Hệ thống chưa nhận được thanh toán. Vui lòng thử lại sau.");
            }
        } catch (error: any) {
            Alert.alert("Lỗi", error.response?.data?.message || "Không thể xác nhận thanh toán");
        }
    };

    if (loading) {
        return (
            <View className="flex-1 bg-white justify-center items-center">
                <ActivityIndicator size="large" color="#FB96BB" />
            </View>
        );
    }

    return (
        <View className="flex-1 bg-gray-50">
            {/* Header */}
            <View className="pt-14 pb-5 px-6 bg-white border-b border-gray-100">
                <Text className="text-2xl font-bold text-gray-900">Vé của tôi</Text>
            </View>

            {/* Tabs */}
            <View className="flex-row bg-white px-6 pb-4 border-b border-gray-100">
                <TouchableOpacity
                    onPress={() => setActiveTab('tickets')}
                    className={`flex-1 py-3 rounded-xl mr-2 ${activeTab === 'tickets' ? 'bg-pink-500' : 'bg-gray-100'}`}
                >
                    <Text className={`text-center font-bold ${activeTab === 'tickets' ? 'text-white' : 'text-gray-500'}`}>
                        🎫 Vé ({tickets.length})
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    onPress={() => setActiveTab('bookings')}
                    className={`flex-1 py-3 rounded-xl ml-2 ${activeTab === 'bookings' ? 'bg-pink-500' : 'bg-gray-100'}`}
                >
                    <Text className={`text-center font-bold ${activeTab === 'bookings' ? 'text-white' : 'text-gray-500'}`}>
                        📋 Đơn đặt ({bookings.length})
                    </Text>
                </TouchableOpacity>
            </View>

            <ScrollView
                className="flex-1 px-6 pt-5"
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#FB96BB"]} />}
            >
                {/* ===== TICKETS TAB ===== */}
                {activeTab === 'tickets' && (
                    <>
                        {tickets.length === 0 ? (
                            <View className="items-center mt-20">
                                <Ticket size={60} color="#BDD8DA" />
                                <Text className="text-gray-400 text-lg mt-4 font-semibold">Chưa có vé nào</Text>
                                <Text className="text-gray-400 text-sm mt-1">Hãy đặt vé cho sự kiện yêu thích!</Text>
                            </View>
                        ) : (
                            tickets.map((ticket) => {
                                const event = ticket.event_id as any;
                                const statusStyle = getStatusColor(ticket.status);
                                return (
                                    <View key={ticket._id} className="bg-white rounded-2xl p-4 mb-5 border border-gray-100 shadow-sm">
                                        <View className="flex-row justify-between items-start mb-3">
                                            <View className="flex-1 mr-3">
                                                <Text className="font-bold text-gray-900 text-base" numberOfLines={2}>
                                                    {event?.title || 'Sự kiện'}
                                                </Text>
                                                <Text className="text-pink-500 font-semibold text-sm mt-1">
                                                    {ticket.ticket_type}
                                                </Text>
                                            </View>
                                            <View className={`px-3 py-1 rounded-full ${statusStyle.bg}`}>
                                                <Text className={`text-xs font-bold ${statusStyle.text}`}>
                                                    {statusStyle.label}
                                                </Text>
                                            </View>
                                        </View>

                                        {event?.date_time && (
                                            <View className="flex-row items-center mb-1.5">
                                                <CalendarDays size={14} color="#FB96BB" />
                                                <Text className="text-gray-500 text-xs ml-2">{formatDate(event.date_time)}</Text>
                                            </View>
                                        )}
                                        {event?.location?.name && (
                                            <View className="flex-row items-center mb-3">
                                                <MapPin size={14} color="#FB96BB" />
                                                <Text className="text-gray-500 text-xs ml-2" numberOfLines={1}>{event.location.name}</Text>
                                            </View>
                                        )}

                                        {/* QR Code indicator */}
                                        {ticket.status === 'valid' && (
                                            <View className="flex-row items-center bg-white border border-pink-200 p-3 rounded-xl">
                                                <QrCode size={18} color="#FB96BB" />
                                                <Text className="text-pink-700 text-xs font-semibold ml-2 flex-1">
                                                    QR: {ticket.qr_code_data.substring(0, 8)}...
                                                </Text>
                                            </View>
                                        )}

                                        {ticket.status === 'used' && ticket.check_in_at && (
                                            <Text className="text-gray-400 text-xs">
                                                Check-in: {formatDate(ticket.check_in_at)}
                                            </Text>
                                        )}
                                    </View>
                                );
                            })
                        )}
                    </>
                )}

                {/* ===== BOOKINGS TAB ===== */}
                {activeTab === 'bookings' && (
                    <>
                        {bookings.length === 0 ? (
                            <View className="items-center mt-20">
                                <Ticket size={60} color="#BDD8DA" />
                                <Text className="text-gray-400 text-lg mt-4 font-semibold">Chưa có đơn nào</Text>
                            </View>
                        ) : (
                            bookings.map((booking) => {
                                const event = booking.event_id as any;
                                const paymentStyle = getPaymentStatusStyle(booking.payment_status);
                                return (
                                    <View key={booking._id} className="bg-white rounded-2xl p-4 mb-5 border border-gray-100 shadow-sm">
                                        <View className="flex-row justify-between items-start mb-2">
                                            <View className="flex-1 mr-3">
                                                <Text className="font-bold text-gray-900 text-base" numberOfLines={2}>
                                                    {event?.title || 'Sự kiện'}
                                                </Text>
                                            </View>
                                            <View className={`px-3 py-1 rounded-full ${paymentStyle.bg}`}>
                                                <Text className={`text-xs font-bold ${paymentStyle.text}`}>
                                                    {paymentStyle.label}
                                                </Text>
                                            </View>
                                        </View>

                                        {/* Items */}
                                        {booking.items.map((item, idx) => (
                                            <View key={idx} className="flex-row justify-between py-1">
                                                <Text className="text-gray-600 text-sm">
                                                    {item.type_name} × {item.quantity}
                                                </Text>
                                                <Text className="text-gray-700 text-sm font-semibold">
                                                    {(item.unit_price * item.quantity).toLocaleString('vi-VN')} đ
                                                </Text>
                                            </View>
                                        ))}

                                        <View className="border-t border-gray-100 mt-2 pt-2 flex-row justify-between">
                                            <Text className="text-gray-500 text-sm">
                                                {getPaymentMethodLabel(booking.payment_method)}
                                            </Text>
                                            <Text className="font-bold text-pink-500">
                                                {booking.total_amount === 0 ? 'Miễn phí' : `${booking.total_amount.toLocaleString('vi-VN')} đ`}
                                            </Text>
                                        </View>

                                        <Text className="text-gray-400 text-xs mt-2">
                                            {formatDate(booking.createdAt)}
                                        </Text>

                                        {/* Action buttons */}
                                        {booking.payment_status === 'pending' && (
                                            <View className="flex-row mt-3 gap-2">
                                                {booking.payment_method === 'payos' && (
                                                    <>
                                                        <TouchableOpacity
                                                            onPress={() => handleOpenPaymentQr(booking)}
                                                            className="flex-1 py-2.5 bg-pink-500 rounded-xl"
                                                        >
                                                            <Text className="text-white text-center font-bold text-sm">Xem QR</Text>
                                                        </TouchableOpacity>
                                                        <TouchableOpacity
                                                            onPress={() => handleConfirmPayment(booking._id)}
                                                            className="flex-1 py-2.5 bg-white border border-pink-300 rounded-xl"
                                                        >
                                                            <Text className="text-pink-600 text-center font-bold text-sm">Đã thanh toán</Text>
                                                        </TouchableOpacity>
                                                    </>
                                                )}
                                                <TouchableOpacity
                                                    onPress={() => handleCancelBooking(booking._id)}
                                                    className={`py-2.5 bg-red-50 rounded-xl border border-red-200 ${booking.payment_method === 'payos' ? '' : 'flex-1'}`}
                                                    style={booking.payment_method === 'payos' ? { paddingHorizontal: 16 } : {}}
                                                >
                                                    <Text className="text-red-500 text-center font-bold text-sm">Hủy</Text>
                                                </TouchableOpacity>
                                            </View>
                                        )}
                                    </View>
                                );
                            })
                        )}
                    </>
                )}

                {/* Bottom spacer */}
                <View className="h-28" />
            </ScrollView>

            <Modal visible={qrModalVisible} transparent animationType="slide" onRequestClose={() => setQrModalVisible(false)}>
                <View className="flex-1 bg-black/40 justify-end">
                    <View className="bg-white rounded-t-3xl px-6 pt-6 pb-10">
                        <Text className="text-xl font-bold text-gray-900 text-center">QR thanh toan</Text>
                        <Text className="text-gray-500 text-center mt-2">Quet QR va bam da thanh toan thanh cong.</Text>

                        <View className="mt-5 mb-4 items-center">
                            {selectedQrData ? (
                                <Image source={{ uri: selectedQrData }} style={{ width: 220, height: 220 }} resizeMode="contain" />
                            ) : (
                                <View className="w-[220px] h-[220px] bg-gray-100 rounded-2xl items-center justify-center">
                                    <Text className="text-gray-400">Khong co QR</Text>
                                </View>
                            )}
                        </View>

                        <TouchableOpacity
                            className="bg-pink-500 py-4 rounded-xl"
                            onPress={async () => {
                                const bookingId = selectedBookingId;
                                setQrModalVisible(false);
                                if (bookingId) {
                                    await handleConfirmPayment(bookingId);
                                }
                            }}
                        >
                            <Text className="text-white text-center font-bold">Da thanh toan thanh cong</Text>
                        </TouchableOpacity>

                        <TouchableOpacity className="mt-3 py-3" onPress={() => setQrModalVisible(false)}>
                            <Text className="text-center text-gray-500 font-semibold">Dong</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

