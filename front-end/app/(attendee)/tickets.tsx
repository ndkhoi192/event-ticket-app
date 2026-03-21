import axios from "axios";
import { CalendarDays, MapPin, QrCode, Ticket, X } from "lucide-react-native";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Image,
    Modal,
    RefreshControl,
    ScrollView,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { API_URL } from "../../context/AuthContext";
import { TicketItem } from "../../types";

export default function TicketsScreen() {
    const [tickets, setTickets] = useState<TicketItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [ticketDetailVisible, setTicketDetailVisible] = useState(false);
    const [selectedTicket, setSelectedTicket] = useState<TicketItem | null>(null);

    const fetchData = useCallback(async () => {
        try {
            const ticketsRes = await axios.get(`${API_URL}/tickets`);
            setTickets(Array.isArray(ticketsRes.data) ? ticketsRes.data : []);
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
        return d.toLocaleDateString('en-US', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'valid': return { bg: 'bg-pink-100', text: 'text-pink-700', label: 'Valid' };
            case 'used': return { bg: 'bg-gray-100', text: 'text-gray-600', label: 'Used' };
            case 'expired': return { bg: 'bg-red-100', text: 'text-red-600', label: 'Expired' };
            default: return { bg: 'bg-gray-100', text: 'text-gray-500', label: status };
        }
    };

    const getEventFromTicket = (ticket: TicketItem) => {
        const event = ticket.event_id as any;
        if (!event || typeof event === 'string') return null;
        return event;
    };

    const sortedTickets = useMemo(
        () =>
            [...tickets].sort((a, b) => {
                const aEvent = getEventFromTicket(a);
                const bEvent = getEventFromTicket(b);
                const aTime = new Date(aEvent?.date_time || a.createdAt).getTime();
                const bTime = new Date(bEvent?.date_time || b.createdAt).getTime();
                return (Number.isNaN(aTime) ? 0 : aTime) - (Number.isNaN(bTime) ? 0 : bTime);
            }),
        [tickets]
    );

    const handleOpenTicketDetail = (ticket: TicketItem) => {
        setSelectedTicket(ticket);
        setTicketDetailVisible(true);
    };

    const selectedEvent = selectedTicket ? getEventFromTicket(selectedTicket) : null;

    const selectedStatusStyle = selectedTicket ? getStatusColor(selectedTicket.status) : null;
    const ticketQrUri = useMemo(() => {
        const qrData = selectedTicket?.qr_code_data?.trim();
        if (!qrData) return "";
        if (qrData.startsWith("http") || qrData.startsWith("data:image")) return qrData;
        return `https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=${encodeURIComponent(qrData)}`;
    }, [selectedTicket]);

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
                <Text className="text-2xl font-bold text-gray-900">My Tickets</Text>
            </View>

            <View className="bg-white px-6 pb-4 border-b border-gray-100">
                <View className="py-3 rounded-xl bg-pink-500/10 border border-pink-100">
                    <Text className="text-center font-bold text-pink-600 tracking-[0.2px]">
                        All Tickets ({tickets.length})
                    </Text>
                </View>
            </View>

            <ScrollView
                className="flex-1 px-6 pt-5"
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#FB96BB"]} />}
            >
                {tickets.length === 0 ? (
                    <View className="items-center mt-20">
                        <Ticket size={60} color="#BDD8DA" />
                        <Text className="text-gray-400 text-lg mt-4 font-semibold">No tickets yet</Text>
                        <Text className="text-gray-400 text-sm mt-1">Book your favorite events to see tickets here.</Text>
                    </View>
                ) : (
                    sortedTickets.map((ticket) => {
                        const event = getEventFromTicket(ticket);
                        const statusStyle = getStatusColor(ticket.status);

                        return (
                            <TouchableOpacity
                                key={ticket._id}
                                onPress={() => handleOpenTicketDetail(ticket)}
                                className="bg-white rounded-2xl p-4 mb-4 border border-gray-100 shadow-sm"
                            >
                                <View className="flex-row justify-between items-start mb-3">
                                    <View className="flex-1 mr-3">
                                        <Text className="font-bold text-gray-900 text-base" numberOfLines={2}>
                                            {event?.title || 'Event'}
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
                                        <Text className="text-gray-500 text-xs ml-2" numberOfLines={1}>
                                            {event.location.name}
                                        </Text>
                                    </View>
                                )}

                                <View className="flex-row items-center bg-pink-50 border border-pink-200 p-3 rounded-xl">
                                    <QrCode size={18} color="#FB96BB" />
                                    <Text className="text-pink-700 text-xs font-bold ml-2 flex-1 tracking-[0.2px]">
                                        Tap to view detailed ticket pass
                                    </Text>
                                </View>
                            </TouchableOpacity>
                        );
                    })
                )}

                {/* Bottom spacer */}
                <View className="h-28" />
            </ScrollView>

            <Modal
                visible={ticketDetailVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setTicketDetailVisible(false)}
            >
                <View className="flex-1 bg-black/45 justify-center px-4">
                    <View className="bg-[#fff7fb] rounded-3xl p-4 border border-pink-200">
                        <View className="flex-row items-center justify-between mb-3 px-1">
                            <Text className="text-pink-700 text-base font-extrabold tracking-[0.4px]">TICKET DETAIL</Text>
                            <TouchableOpacity onPress={() => setTicketDetailVisible(false)} className="w-8 h-8 rounded-full items-center justify-center bg-pink-100">
                                <X size={16} color="#be185d" />
                            </TouchableOpacity>
                        </View>

                        <View className="bg-white rounded-3xl overflow-hidden border border-pink-200">
                            <View className="px-4 py-4 bg-[#ffe7f1]">
                                <Text className="text-[11px] text-pink-600 font-extrabold tracking-[1px]">EVENT PASS</Text>
                                <Text className="text-gray-900 text-[22px] leading-[28px] font-extrabold mt-1" numberOfLines={2}>
                                    {selectedEvent?.title || 'Event'}
                                </Text>

                                <View className="mt-4">
                                    <Text className="text-[11px] text-gray-500 font-bold">TYPE</Text>
                                    <Text className="text-[15px] text-gray-900 font-extrabold mt-0.5">{selectedTicket?.ticket_type || '-'}</Text>
                                </View>

                                <View className="mt-2.5">
                                    <Text className="text-[11px] text-gray-500 font-bold">TIME</Text>
                                    <Text className="text-[14px] text-gray-900 font-extrabold mt-0.5">
                                        {selectedEvent?.date_time ? formatDate(selectedEvent.date_time) : '-'}
                                    </Text>
                                </View>

                                <View className="mt-2.5">
                                    <Text className="text-[11px] text-gray-500 font-bold">VENUE</Text>
                                    <Text className="text-[14px] text-gray-900 font-extrabold mt-0.5" numberOfLines={1}>
                                        {selectedEvent?.location?.name || '-'}
                                    </Text>
                                </View>

                                {selectedStatusStyle && (
                                    <View className={`self-start mt-3 px-3 py-1 rounded-full ${selectedStatusStyle.bg}`}>
                                        <Text className={`text-[11px] font-extrabold tracking-[0.3px] ${selectedStatusStyle.text}`}>
                                            {selectedStatusStyle.label}
                                        </Text>
                                    </View>
                                )}
                            </View>

                            <View className="h-[1px] bg-pink-200 mx-4" style={{ borderStyle: 'dashed' }} />

                            <View className="items-center px-4 py-5 bg-[#fffafc]">
                                <Text className="text-pink-700 text-[11px] font-extrabold tracking-[0.8px]">SCAN THIS QR</Text>
                                <View className="mt-3 w-[220px] h-[220px] border-[6px] border-pink-300 rounded-2xl bg-white items-center justify-center">
                                    {ticketQrUri ? (
                                        <Image source={{ uri: ticketQrUri }} style={{ width: 190, height: 190 }} resizeMode="contain" />
                                    ) : (
                                        <QrCode size={80} color="#be185d" />
                                    )}
                                </View>

                                <Text className="text-[11px] text-center text-gray-600 mt-3 font-bold" numberOfLines={2}>
                                    {selectedTicket?.qr_code_data ? `${selectedTicket.qr_code_data.slice(0, 30)}...` : 'NO CODE'}
                                </Text>
                            </View>
                        </View>

                        {selectedTicket?.check_in_at && (
                            <Text className="text-xs text-pink-700 mt-3 text-center font-bold">
                                Check-in: {formatDate(selectedTicket.check_in_at)}
                            </Text>
                        )}

                        <TouchableOpacity className="mt-4 bg-pink-500 py-3 rounded-xl" onPress={() => setTicketDetailVisible(false)}>
                            <Text className="text-center text-white font-extrabold tracking-[0.3px]">Close</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
}


