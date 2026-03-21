import axios from "axios";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ArrowLeft, CreditCard, Minus, Plus, Ticket } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Image, Modal, ScrollView, Text, TouchableOpacity, View } from "react-native";
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
  const [qrModalVisible, setQrModalVisible] = useState(false);
  const [pendingBookingId, setPendingBookingId] = useState<string>("");
  const [checkoutQrData, setCheckoutQrData] = useState<string>("");

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        const response = await axios.get(`${API_URL}/events/${id}`);
        setEvent(response.data);

        const initialQuantities: { [key: string]: number } = {};
        response.data.ticket_types.forEach((t: TicketType) => {
          initialQuantities[t.type_name] = 0;
        });
        setQuantities(initialQuantities);
      } catch (error) {
        console.error("Failed to fetch event", error);
        Alert.alert("Loi", "Khong the tai thong tin su kien");
        router.back();
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchEvent();
    }
  }, [id, router]);

  const updateQuantity = (typeName: string, delta: number) => {
    setQuantities((prev) => {
      const current = prev[typeName] || 0;
      const newVal = Math.max(0, current + delta);

      const ticketType = event?.ticket_types.find((t) => t.type_name === typeName);
      if (ticketType && newVal > ticketType.remaining_quantity) {
        Alert.alert("Da dat gioi han", `Chi con ${ticketType.remaining_quantity} ve.`);
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

  const isFreeEvent = () => {
    if (!event) {
      return false;
    }
    return event.ticket_types.every((t) => t.price === 0);
  };

  const confirmPayment = async (bookingId: string) => {
    setProcessing(true);
    try {
      const response = await axios.post(`${API_URL}/bookings/${bookingId}/confirm-payment`);
      if (response.data.booking.payment_status === "paid") {
        Alert.alert("Thanh cong", "Thanh toan da duoc xac nhan. Ve da san sang!", [
          { text: "Xem ve", onPress: () => router.replace("/(attendee)/tickets") },
        ]);
      } else {
        Alert.alert("Chua xac nhan", "He thong chua nhan duoc thanh toan. Vui long thu lai sau.", [
          { text: "Huy", style: "cancel" },
          { text: "Thu lai", onPress: () => confirmPayment(bookingId) },
        ]);
      }
    } catch (error: any) {
      console.error("Confirmation failed", error);
      Alert.alert("Loi", error.response?.data?.message || "Khong the xac nhan thanh toan");
    } finally {
      setProcessing(false);
    }
  };

  const handleCheckout = async () => {
    const total = calculateTotal();
    const hasSelected = Object.values(quantities).some((q) => q > 0);

    if (!hasSelected) {
      Alert.alert("Chon ve", "Vui long chon it nhat mot ve.");
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
        Alert.alert("Thanh cong", message || "Ve da duoc dat thanh cong!", [
          { text: "Xem ve", onPress: () => router.replace("/(attendee)/tickets") },
        ]);
        return;
      }

      if (checkoutQrData) {
        setPendingBookingId(booking._id);
        setCheckoutQrData(checkoutQrData);
        setQrModalVisible(true);
      } else {
        Alert.alert("Loi", "Khong nhan duoc QR thanh toan tu server.");
      }
    } catch (error: any) {
      console.error("Booking failed", error);
      Alert.alert("Dat ve that bai", error.response?.data?.message || "Da xay ra loi. Vui long thu lai.");
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
        <Text>Khong tim thay su kien</Text>
      </View>
    );
  }

  const total = calculateTotal();
  const isFree = isFreeEvent();

  return (
    <View className="flex-1 bg-white">
      <View className="pt-12 pb-4 px-6 flex-row items-center border-b border-gray-100 bg-white z-10">
        <TouchableOpacity onPress={() => router.back()} className="mr-4 p-2 bg-gray-50 rounded-full">
          <ArrowLeft color="#FB96BB" size={24} />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-gray-900 flex-1" numberOfLines={1}>
          Dat ve: {event.title}
        </Text>
      </View>

      <ScrollView className="flex-1 px-6 pt-6">
        <Text className="text-lg font-bold text-gray-800 mb-4">Chon loai ve</Text>

        {event.ticket_types.map((type) => (
          <View
            key={type.type_name}
            className="flex-row items-center justify-between mb-4 bg-gray-50 p-4 rounded-xl border border-gray-100"
          >
            <View className="flex-1">
              <Text className="font-bold text-gray-900 text-base">{type.type_name}</Text>
              <Text className="text-pastel-pink font-semibold mt-1">
                {type.price === 0 ? "Mien phi" : `${type.price.toLocaleString("vi-VN")} VND`}
              </Text>
              <Text className="text-gray-400 text-xs mt-1">Con {type.remaining_quantity} ve</Text>
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

        {!isFree && total > 0 && (
          <View className="mt-4 mb-6">
            <Text className="text-lg font-bold text-gray-800 mb-3">Phuong thuc thanh toan</Text>

            <View className="flex-row items-center p-4 rounded-xl border mb-3 border-pink-400 bg-pink-50">
              <View className="w-10 h-10 rounded-full items-center justify-center mr-3 bg-pink-400">
                <CreditCard size={20} color="white" />
              </View>
              <View className="flex-1">
                <Text className="font-bold text-base text-pink-600">
                  QR thanh toan
                </Text>
                <Text className="text-gray-400 text-xs mt-0.5">He thong se hien QR fake, ban bam nut da thanh toan de hoan tat.</Text>
              </View>
            </View>
          </View>
        )}

        {isFree && (
          <View className="mt-2 mb-4 p-4 bg-pink-50 rounded-xl border border-pink-200">
            <Text className="text-pink-700 font-semibold text-center">Su kien mien phi - Khong can thanh toan!</Text>
          </View>
        )}

        <View className="h-32" />
      </ScrollView>

      <View className="p-6 border-t border-gray-100 bg-white shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        <View className="flex-row justify-between items-center mb-4">
          <Text className="text-gray-500 font-medium">Tong cong</Text>
          <Text className="text-2xl font-bold text-pastel-pink">
            {total === 0 ? "Mien phi" : `${total.toLocaleString("vi-VN")} VND`}
          </Text>
        </View>

        <TouchableOpacity
          className={`py-4 rounded-2xl shadow-lg flex-row justify-center items-center ${processing ? "opacity-70" : ""} ${
            isFree || total === 0 ? "bg-pink-500" : "bg-pastel-blue"
          }`}
          onPress={handleCheckout}
          disabled={processing}
        >
          {processing ? (
            <ActivityIndicator color="white" />
          ) : (
            <>
              <Text className="text-white font-bold text-lg mr-2">
                {isFree || total === 0 ? "Dat ve mien phi" : "Tao QR thanh toan"}
              </Text>
              <Ticket color="white" size={20} />
            </>
          )}
        </TouchableOpacity>
      </View>

      <Modal visible={qrModalVisible} transparent animationType="slide" onRequestClose={() => setQrModalVisible(false)}>
        <View className="flex-1 bg-black/40 justify-end">
          <View className="bg-white rounded-t-3xl px-6 pt-6 pb-10">
            <Text className="text-xl font-bold text-gray-900 text-center">QR thanh toan</Text>
            <Text className="text-gray-500 text-center mt-2">Quet QR ben duoi, sau do bam nut da thanh toan thanh cong.</Text>

            <View className="mt-5 mb-4 items-center">
              {checkoutQrData ? (
                <Image source={{ uri: checkoutQrData }} style={{ width: 220, height: 220 }} resizeMode="contain" />
              ) : (
                <View className="w-[220px] h-[220px] bg-gray-100 rounded-2xl items-center justify-center">
                  <Text className="text-gray-400">Khong co QR</Text>
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
