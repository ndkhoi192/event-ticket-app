import axios from "axios";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ArrowLeft, CheckCircle, Clock, Edit, Folder, MapPin, Trash2, Users } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Image, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { io } from "socket.io-client";
import { API_URL, useAuth } from "../../../context/AuthContext";
import { Booking, Event } from "../../../types";

export default function EventDetailsScreen() {
  const { id } = useLocalSearchParams();
  const eventId = Array.isArray(id) ? id[0] : id;
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
        const response = await axios.get(`${API_URL}/events/${eventId}`);
        setEvent(response.data);
      } catch (error) {
        console.error("Failed to fetch event details:", error);
        Alert.alert("Error", "Could not load event details.");
      } finally {
        setLoading(false);
      }
    };

    if (eventId) {
      fetchEventDetails();
    }
  }, [eventId]);

  const fetchBookings = async () => {
    setLoadingBookings(true);
    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const response = await axios.get(`${API_URL}/bookings/event/${eventId}`, { headers });
      setBookings(response.data);
      setShowBookings(true);
    } catch (error: any) {
      console.error("Failed to fetch bookings:", error);
      Alert.alert("Error", error.response?.data?.message || "Could not load bookings.");
    } finally {
      setLoadingBookings(false);
    }
  };

  useEffect(() => {
    if (!eventId || !token) return;

    const socketBaseUrl = API_URL.replace(/\/api\/?$/, "");
    const socket = io(socketBaseUrl, {
      auth: { token },
    });

    socket.emit("organizer:join-event", { eventId });

    socket.on("event:stats-refresh", (payload: { eventId?: string }) => {
      if (payload?.eventId !== eventId) return;
      if (showBookings) {
        fetchBookings();
      }
    });

    socket.on("event:stats-updated", (payload: { eventId?: string }) => {
      if (payload?.eventId !== eventId) return;
      if (showBookings) {
        fetchBookings();
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [eventId, token, showBookings]);

  const handleConfirmCash = (bookingId: string, userName: string) => {
    Alert.alert("Confirm cash payment", `Confirm that cash payment was received from ${userName}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Confirm",
        onPress: async () => {
          try {
            const headers = token ? { Authorization: `Bearer ${token}` } : {};
            await axios.post(`${API_URL}/bookings/${bookingId}/confirm-payment`, {}, { headers });
            Alert.alert("Success", "Payment confirmed.");
            fetchBookings();
          } catch (error: any) {
            Alert.alert("Error", error.response?.data?.message || "Could not confirm payment.");
          }
        },
      },
    ]);
  };

  const handleDelete = () => {
    Alert.alert("Cancel event", "Are you sure you want to cancel this event?", [
      { text: "No", style: "cancel" },
      {
        text: "Cancel event",
        style: "destructive",
        onPress: async () => {
          try {
            const headers = token ? { Authorization: `Bearer ${token}` } : {};
            await axios.delete(`${API_URL}/events/${id}`, { headers });
            Alert.alert("Success", "Event cancelled.");
            router.back();
          } catch (error: any) {
            Alert.alert("Error", error.response?.data?.message || "Could not cancel event.");
          }
        },
      },
    ]);
  };

  const getPaymentStatusStyle = (status: string) => {
    switch (status) {
      case "paid":
        return { bg: "bg-pink-100", text: "text-pink-700", label: "Paid" };
      case "pending":
        return { bg: "bg-yellow-100", text: "text-yellow-700", label: "Pending" };
      case "refunded":
        return { bg: "bg-pink-100", text: "text-pink-600", label: "Refunded" };
      case "cancelled":
        return { bg: "bg-red-100", text: "text-red-600", label: "Cancelled" };
      default:
        return { bg: "bg-gray-100", text: "text-gray-500", label: status };
    }
  };

  const getMethodLabel = (m: string) => {
    switch (m) {
      case "payos":
        return "Online";
      case "cash":
        return "Cash";
      case "free":
        return "0 VND";
      default:
        return m;
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
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const time = new Date(event.date_time).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const pendingCashBookings = bookings.filter((b) => b.payment_method === "cash" && b.payment_status === "pending");
  const paidBookings = bookings.filter((b) => b.payment_status === "paid");
  const totalRevenue = paidBookings.reduce((s, b) => s + b.total_amount, 0);

  return (
    <ScrollView className="flex-1 bg-white" showsVerticalScrollIndicator={false}>
      <View className="relative">
        <Image source={{ uri: event.banner_url }} className="w-full h-64" resizeMode="cover" />
        <TouchableOpacity className="absolute top-12 left-4 bg-white/80 p-2 rounded-full" onPress={() => router.back()}>
          <ArrowLeft color="#FB96BB" size={24} />
        </TouchableOpacity>

        <View className="absolute bottom-4 right-4 bg-white/90 px-3 py-1 rounded-full">
          <Text className="text-xs font-bold capitalize text-gray-800">{event.status}</Text>
        </View>
      </View>

      <View className="px-5 py-6">
        <Text className="text-2xl font-bold text-gray-900 mb-2">{event.title}</Text>

        <View className="flex-row items-center mb-3">
          <Clock size={16} color="#FB96BB" />
          <Text className="text-gray-600 ml-2 text-base">
            {time} - {date}
          </Text>
        </View>

        <View className="flex-row items-center mb-3">
          <MapPin size={16} color="#FB96BB" />
          <Text className="text-gray-600 ml-2 text-base">{event.location?.name}</Text>
        </View>

        <View className="flex-row items-center mb-6">
          <Folder size={16} color="#FB96BB" />
          <Text className="text-gray-600 ml-2 text-base">
            {typeof event.category_id === "object" ? event.category_id.name : "Category"}
          </Text>
        </View>

        <Text className="text-lg font-bold text-gray-800 mb-2">Event Description</Text>
        <Text className="text-gray-500 leading-6 mb-8">{event.description}</Text>

        <Text className="text-lg font-bold text-gray-800 mb-3">Ticket Information</Text>
        <View className="space-y-3 mb-6">
          {event.ticket_types.map((ticket, index) => (
            <View key={index} className="flex-row justify-between items-center bg-gray-50 p-4 rounded-xl border border-gray-100">
              <View>
                <Text className="font-bold text-gray-700 text-lg">{ticket.type_name}</Text>
                <Text className="text-gray-400 text-sm">
                  {ticket.remaining_quantity} / {ticket.total_quantity} remaining
                </Text>
              </View>
              <Text className="text-pastel-blue font-bold text-lg">
                {`${ticket.price.toLocaleString("en-US")} VND`}
              </Text>
            </View>
          ))}
        </View>

        <TouchableOpacity
          className="flex-row items-center justify-center bg-pink-50 py-4 rounded-xl border border-pink-200 mb-4"
          onPress={fetchBookings}
          disabled={loadingBookings}
        >
          {loadingBookings ? (
            <ActivityIndicator color="#FB96BB" />
          ) : (
            <>
              <Users size={20} color="#FB96BB" />
              <Text className="text-pink-600 font-bold ml-2">{showBookings ? "Refresh bookings" : "View bookings"}</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          className="flex-row items-center justify-center bg-white py-4 rounded-xl border border-gray-200 mb-4"
          onPress={() => router.push(`/(organizer)/events/live-stats/${event._id}` as any)}
        >
          <Text className="text-gray-700 font-bold">Open Live Stats</Text>
        </TouchableOpacity>

        {showBookings && (
          <View className="mb-6">
            <View className="flex-row mb-4">
              <View className="flex-1 bg-pink-50 p-3 rounded-xl mr-2 border border-pink-100">
                <Text className="text-pink-700 text-xs font-semibold">Revenue</Text>
                <Text className="text-pink-800 font-bold text-lg">{totalRevenue.toLocaleString("en-US")} VND</Text>
              </View>
              <View className="flex-1 bg-pink-50 p-3 rounded-xl ml-2 border border-pink-100">
                <Text className="text-pink-700 text-xs font-semibold">Total bookings</Text>
                <Text className="text-pink-700 font-bold text-lg">{bookings.length}</Text>
              </View>
            </View>

            {pendingCashBookings.length > 0 && (
              <View className="mb-4">
                <Text className="text-base font-bold text-yellow-700 mb-2">Pending cash confirmations ({pendingCashBookings.length})</Text>
                {pendingCashBookings.map((b) => {
                  const u = b.user_id as any;
                  return (
                    <View key={b._id} className="bg-yellow-50 p-3 rounded-xl border border-yellow-200 mb-2">
                      <View className="flex-row justify-between items-center mb-1">
                        <Text className="font-bold text-gray-800">{u?.full_name || "Guest"}</Text>
                        <Text className="font-bold text-yellow-700">{b.total_amount.toLocaleString("en-US")} VND</Text>
                      </View>
                      <Text className="text-gray-500 text-xs mb-2">{b.items.map((i) => `${i.type_name} x${i.quantity}`).join(", ")}</Text>
                      <TouchableOpacity
                        className="bg-pink-500 py-2 rounded-lg flex-row justify-center items-center"
                        onPress={() => handleConfirmCash(b._id, u?.full_name || "Guest")}
                      >
                        <CheckCircle size={16} color="white" />
                        <Text className="text-white font-bold text-sm ml-1">Confirm cash received</Text>
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </View>
            )}

            <Text className="text-base font-bold text-gray-800 mb-2">All bookings ({bookings.length})</Text>
            {bookings.length === 0 ? (
              <Text className="text-gray-400 text-center py-4">No bookings yet</Text>
            ) : (
              bookings.map((b) => {
                const u = b.user_id as any;
                const ps = getPaymentStatusStyle(b.payment_status);
                return (
                  <View key={b._id} className="bg-gray-50 p-3 rounded-xl border border-gray-100 mb-2">
                    <View className="flex-row justify-between items-center">
                      <View className="flex-1">
                        <Text className="font-semibold text-gray-800">{u?.full_name || "N/A"}</Text>
                        <Text className="text-gray-400 text-xs">{u?.email}</Text>
                      </View>
                      <View className={`px-2 py-1 rounded-full ${ps.bg}`}>
                        <Text className={`text-xs font-bold ${ps.text}`}>{ps.label}</Text>
                      </View>
                    </View>
                    <View className="flex-row justify-between mt-1">
                      <Text className="text-gray-500 text-xs">
                        {getMethodLabel(b.payment_method)} • {b.items.map((i) => `${i.type_name} x${i.quantity}`).join(", ")}
                      </Text>
                      <Text className="text-gray-700 font-semibold text-xs">{b.total_amount.toLocaleString("en-US")} VND</Text>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        )}

        <View className="flex-row space-x-4 mb-10">
          {event.status !== "cancelled" && event.status !== "ended" ? (
            <>
              <TouchableOpacity
                className="flex-1 flex-row justify-center items-center bg-gray-100 py-4 rounded-xl"
                onPress={() => router.push(`/(organizer)/events/edit/${event._id}` as any)}
              >
                <Edit size={20} color="#FB96BB" />
                <Text className="text-gray-700 font-bold ml-2">Edit</Text>
              </TouchableOpacity>

              <TouchableOpacity className="flex-1 flex-row justify-center items-center bg-red-50 py-4 rounded-xl" onPress={handleDelete}>
                <Trash2 size={20} color="#FB96BB" />
                <Text className="text-red-500 font-bold ml-2">Cancel event</Text>
              </TouchableOpacity>
            </>
          ) : (
            <View className="flex-1 flex-row justify-center items-center bg-gray-100 py-4 rounded-xl opacity-70">
              <Text className="text-gray-500 font-bold text-center">
                Event is already {event.status === "cancelled" ? "cancelled" : "ended"}.
              </Text>
            </View>
          )}
        </View>
      </View>
    </ScrollView>
  );
}
