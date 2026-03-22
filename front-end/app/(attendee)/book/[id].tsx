import axios from "axios";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ArrowLeft, CreditCard, Minus, Plus, Ticket } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Image, Modal, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { io } from "socket.io-client";
import { API_URL, useAuth } from "../../../context/AuthContext";
import { Event, TicketType } from "../../../types";

export default function BookingScreen() {
  const { id } = useLocalSearchParams();
  const eventId = Array.isArray(id) ? id[0] : id;
  const router = useRouter();
  const { user, token } = useAuth();

  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [quantities, setQuantities] = useState<{ [key: string]: number }>({});
  const [processing, setProcessing] = useState(false);
  const [qrModalVisible, setQrModalVisible] = useState(false);
  const [pendingBookingId, setPendingBookingId] = useState<string>("");
  const [checkoutQrData, setCheckoutQrData] = useState<string>("");

  const fetchEvent = React.useCallback(async () => {
    if (!eventId) return;

    try {
      const response = await axios.get(`${API_URL}/events/${eventId}`);
      if (response.data?.status !== "published") {
        Alert.alert("Unavailable", "This event is no longer available for booking.", [
          { text: "OK", onPress: () => router.replace("/(attendee)/discover") },
        ]);
        return;
      }

      setEvent(response.data);

      const initialQuantities: { [key: string]: number } = {};
      response.data.ticket_types.forEach((t: TicketType) => {
        initialQuantities[t.type_name] = 0;
      });
      setQuantities(initialQuantities);
    } catch (error) {
      console.error("Failed to fetch event", error);
      Alert.alert("Error", "Could not load event details.");
      router.back();
    }
  }, [eventId, router]);

  useEffect(() => {
    if (!eventId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    fetchEvent().finally(() => {
      setLoading(false);
    });
  }, [eventId, fetchEvent]);

  useEffect(() => {
    if (!eventId || !token) return;

    const socketBaseUrl = API_URL.replace(/\/api\/?$/, "");
    const socket = io(socketBaseUrl, {
      auth: { token },
    });

    socket.emit("attendee:join-event", { eventId });

    socket.on("event:inventory-updated", (payload: { eventId?: string; ticketTypes?: TicketType[] }) => {
      if (payload?.eventId !== eventId || !Array.isArray(payload.ticketTypes)) return;

      setEvent((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          ticket_types: payload.ticketTypes,
        };
      });

      setQuantities((prev) => {
        const next = { ...prev };
        payload.ticketTypes.forEach((type) => {
          const current = next[type.type_name] || 0;
          if (current > type.remaining_quantity) {
            next[type.type_name] = Math.max(0, type.remaining_quantity);
          }
        });
        return next;
      });
    });

    socket.on("booking:status-updated", (payload: { bookingId?: string; paymentStatus?: string }) => {
      if (!pendingBookingId || payload?.bookingId !== pendingBookingId) return;

      if (payload?.paymentStatus === "paid") {
        setQrModalVisible(false);
        Alert.alert("Success", "Payment confirmed. Your tickets are ready.", [
          { text: "View tickets", onPress: () => router.replace("/(attendee)/tickets") },
        ]);
      }
    });

    socket.on("event:details-updated", (payload: { eventId?: string; status?: string }) => {
      if (payload?.eventId !== eventId) return;

      if (payload?.status && payload.status !== "published") {
        Alert.alert("Unavailable", "This event is no longer available for booking.", [
          { text: "OK", onPress: () => router.replace("/(attendee)/discover") },
        ]);
        return;
      }

      fetchEvent();
    });

    return () => {
      socket.disconnect();
    };
  }, [eventId, token, pendingBookingId, router, fetchEvent]);

  const updateQuantity = (typeName: string, delta: number) => {
    setQuantities((prev) => {
      const current = prev[typeName] || 0;
      const newVal = Math.max(0, current + delta);

      const ticketType = event?.ticket_types.find((t) => t.type_name === typeName);
      if (ticketType && newVal > ticketType.remaining_quantity) {
        Alert.alert("Limit reached", "You cannot select more tickets for this type.");
        return prev;
      }

      return { ...prev, [typeName]: newVal };
    });
  };

  const calculateTotal = () => {
    if (!event) {
      return 0;
    }

    return event.ticket_types.reduce((total, type) => {
      return total + type.price * (quantities[type.type_name] || 0);
    }, 0);
  };

  const confirmPayment = async (bookingId: string) => {
    setProcessing(true);
    try {
      const response = await axios.post(`${API_URL}/bookings/${bookingId}/confirm-payment`);
      if (response.data.booking.payment_status === "paid") {
        Alert.alert("Success", "Payment confirmed. Your tickets are ready.", [
          { text: "View tickets", onPress: () => router.replace("/(attendee)/tickets") },
        ]);
      } else {
        Alert.alert("Not confirmed yet", "Payment has not been confirmed. Please try again.", [
          { text: "Cancel", style: "cancel" },
          { text: "Retry", onPress: () => confirmPayment(bookingId) },
        ]);
      }
    } catch (error: any) {
      console.error("Confirmation failed", error);
      Alert.alert("Error", error.response?.data?.message || "Could not confirm payment.");
    } finally {
      setProcessing(false);
    }
  };

  const handleCheckout = async () => {
    const total = calculateTotal();
    const hasSelected = Object.values(quantities).some((q) => q > 0);

    if (!hasSelected) {
      Alert.alert("Select tickets", "Please select at least one ticket.");
      return;
    }

    if (!user) {
      router.push("/(auth)/login");
      return;
    }

    setProcessing(true);

    try {
      const items = Object.entries(quantities)
        .filter(([_, qty]) => qty > 0)
        .map(([typeName, qty]) => ({
          type_name: typeName,
          quantity: qty,
          unit_price: event?.ticket_types.find((t) => t.type_name === typeName)?.price || 0,
        }));

      const response = await axios.post(`${API_URL}/bookings`, {
        event_id: event?._id,
        items,
        total_amount: total,
        payment_method: "payos",
      });

      const { booking, checkoutQrData, message } = response.data;

      if (booking.payment_status === "paid") {
        Alert.alert("Success", message || "Booking completed successfully.", [
          { text: "View tickets", onPress: () => router.replace("/(attendee)/tickets") },
        ]);
        return;
      }

      if (checkoutQrData) {
        setPendingBookingId(booking._id);
        setCheckoutQrData(checkoutQrData);
        setQrModalVisible(true);
      } else {
        Alert.alert("Error", "Could not receive the payment QR.");
      }
    } catch (error: any) {
      console.error("Booking failed", error);
      Alert.alert("Booking failed", error.response?.data?.message || "Something went wrong. Please try again.");
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <View className="flex-1 bg-white justify-center items-center">
        <ActivityIndicator size="large" color="#FB96BB" />
      </View>
    );
  }

  if (!event) {
    return (
      <View className="flex-1 bg-white justify-center items-center">
        <Text>Event not found</Text>
      </View>
    );
  }

  const total = calculateTotal();
  const hasSelected = Object.values(quantities).some((q) => q > 0);
  const totalRemaining = event.ticket_types.reduce((sum, t) => sum + (t.remaining_quantity || 0), 0);
  const isSoldOut = totalRemaining <= 0;

  return (
    <View className="flex-1 bg-white">
      <View className="pt-12 pb-4 px-6 flex-row items-center border-b border-gray-100 bg-white z-10">
        <TouchableOpacity onPress={() => router.back()} className="mr-4 p-2 bg-gray-50 rounded-full">
          <ArrowLeft color="#FB96BB" size={24} />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-gray-900 flex-1" numberOfLines={1}>
          Book: {event.title}
        </Text>
      </View>

      <ScrollView className="flex-1 px-6 pt-6">
        <Text className="text-lg font-bold text-gray-800 mb-4">Choose ticket types</Text>

        {isSoldOut && (
          <View className="mb-4 bg-red-50 border border-red-200 rounded-xl p-3">
            <Text className="text-red-600 font-semibold text-center">Sold out on all devices in real time.</Text>
          </View>
        )}

        {event.ticket_types.map((type) => (
          <View
            key={type.type_name}
            className="flex-row items-center justify-between mb-4 bg-gray-50 p-4 rounded-xl border border-gray-100"
          >
            <View className="flex-1">
              <Text className="font-bold text-gray-900 text-base">{type.type_name}</Text>
              <Text className="text-pastel-pink font-semibold mt-1">
                {`${type.price.toLocaleString("vi-VN")} VND`}
              </Text>
            </View>

            <View className="flex-row items-center bg-white rounded-lg shadow-sm border border-gray-100">
              <TouchableOpacity onPress={() => updateQuantity(type.type_name, -1)} className="p-3 border-r border-gray-100">
                <Minus size={16} color="#FB96BB" />
              </TouchableOpacity>
              <Text className="w-10 text-center font-bold text-gray-800">{quantities[type.type_name] || 0}</Text>
              <TouchableOpacity onPress={() => updateQuantity(type.type_name, 1)} className="p-3 border-l border-gray-100">
                <Plus size={16} color="#FB96BB" />
              </TouchableOpacity>
            </View>
          </View>
        ))}

        {total > 0 && (
          <View className="mt-4 mb-6">
            <Text className="text-lg font-bold text-gray-800 mb-3">Payment method</Text>

            <View className="flex-row items-center p-4 rounded-xl border mb-3 border-pink-400 bg-pink-50">
              <View className="w-10 h-10 rounded-full items-center justify-center mr-3 bg-pink-400">
                <CreditCard size={20} color="white" />
              </View>
              <View className="flex-1">
                <Text className="font-bold text-base text-pink-600">
                  QR payment
                </Text>
                <Text className="text-gray-400 text-xs mt-0.5">A demo QR will be shown. Tap payment success after payment.</Text>
              </View>
            </View>
          </View>
        )}

        <View className="h-32" />
      </ScrollView>

      <View className="p-6 border-t border-gray-100 bg-white shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        <View className="flex-row justify-between items-center mb-4">
          <Text className="text-gray-500 font-medium">Total</Text>
          <Text className="text-2xl font-bold text-pastel-pink">
            {`${total.toLocaleString("vi-VN")} VND`}
          </Text>
        </View>

        <TouchableOpacity
          className={`py-4 rounded-2xl shadow-lg flex-row justify-center items-center ${processing ? "opacity-70" : ""} ${
            !hasSelected || isSoldOut ? "bg-gray-300" : total === 0 ? "bg-pink-500" : "bg-pastel-blue"
          }`}
          onPress={handleCheckout}
          disabled={processing || !hasSelected || isSoldOut}
        >
          {processing ? (
            <ActivityIndicator color="white" />
          ) : (
            <>
              <Text className="text-white font-bold text-lg mr-2">
                {total === 0 ? "Book tickets" : "Proceed to QR payment"}
              </Text>
              <Ticket color="white" size={20} />
            </>
          )}
        </TouchableOpacity>
      </View>

      <Modal visible={qrModalVisible} transparent animationType="slide" onRequestClose={() => setQrModalVisible(false)}>
        <View className="flex-1 bg-black/40 justify-end">
          <View className="bg-white rounded-t-3xl px-6 pt-6 pb-10">
            <Text className="text-xl font-bold text-gray-900 text-center">Payment QR</Text>
            <Text className="text-gray-500 text-center mt-2">Scan this QR, then tap payment success.</Text>

            <View className="mt-5 mb-4 items-center">
              {checkoutQrData ? (
                <Image source={{ uri: checkoutQrData }} style={{ width: 220, height: 220 }} resizeMode="contain" />
              ) : (
                <View className="w-[220px] h-[220px] bg-gray-100 rounded-2xl items-center justify-center">
                  <Text className="text-gray-400">No QR available</Text>
                </View>
              )}
            </View>

            <TouchableOpacity
              className="bg-pink-500 py-4 rounded-xl"
              onPress={async () => {
                const bookingId = pendingBookingId;
                setQrModalVisible(false);
                if (bookingId) {
                  await confirmPayment(bookingId);
                }
              }}
              disabled={processing}
            >
              <Text className="text-white text-center font-bold">Payment successful</Text>
            </TouchableOpacity>

            <TouchableOpacity className="mt-3 py-3" onPress={() => setQrModalVisible(false)}>
              <Text className="text-center text-gray-500 font-semibold">Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}
