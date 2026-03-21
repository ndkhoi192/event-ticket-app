import axios from "axios";
import { useRouter } from "expo-router";
import { ArrowLeft, CheckCircle, QrCode } from "lucide-react-native";
import React, { useState } from "react";
import { ActivityIndicator, Alert, Text, TextInput, TouchableOpacity, View } from "react-native";
import { API_URL, useAuth } from "../../context/AuthContext";

export default function TicketScannerScreen() {
    const { token } = useAuth();
    const router = useRouter();
    const [ticketCode, setTicketCode] = useState("");
    const [loading, setLoading] = useState(false);

    const handleCheckIn = async () => {
        if (!ticketCode.trim()) {
            Alert.alert("Lỗi", "Vui lòng nhập mã vé.");
            return;
        }

        setLoading(true);
        try {
            const response = await axios.post(`${API_URL}/tickets/validate`, {
                code: ticketCode.toUpperCase()
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            // If successful, the ticket is valid and marked as used or validated
            Alert.alert(
                "Thành công! ✅", 
                `Vé hợp lệ.\nSự kiện: ${response.data.ticket?.event_id?.title || "Không rõ"}\nLoại: ${response.data.ticket?.type_name || "Không rõ"}`
            );
            setTicketCode("");
        } catch (error: any) {
            console.error("Lỗi xác nhận vé:", error);
            Alert.alert("Lỗi ❌", error.response?.data?.message || "Mã vé không hợp lệ hoặc đã được sử dụng.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <View className="flex-1 bg-white">
            <View className="pt-12 pb-4 px-6 flex-row items-center border-b border-gray-100 mb-10">
                <TouchableOpacity onPress={() => router.back()} className="mr-4 p-2 bg-gray-50 rounded-full">
                    <ArrowLeft color="#FB96BB" size={24} />
                </TouchableOpacity>
                <Text className="text-xl font-bold text-gray-900">Kiểm duyệt vé</Text>
            </View>

            <View className="px-6 items-center">
                <View className="w-24 h-24 bg-pink-50 rounded-full items-center justify-center mb-6">
                    <QrCode size={48} color="#FB96BB" />
                </View>

                <Text className="text-xl font-bold text-gray-800 mb-2">Check-in Thủ Công</Text>
                <Text className="text-gray-500 text-center mb-8 px-4">
                    Nhập mã code trên vé của khách hàng để xác thực và check-in vào sự kiện.
                </Text>

                <TextInput
                    className="w-full border border-gray-200 rounded-xl px-5 py-4 bg-gray-50 text-gray-800 text-lg mb-6 focus:border-pastel-blue text-center uppercase font-bold tracking-widest"
                    value={ticketCode}
                    onChangeText={setTicketCode}
                    placeholder="NHẬP MÃ SỐ VÉ (VD: TK-1234)"
                    autoCapitalize="characters"
                />

                <TouchableOpacity 
                    className="w-full bg-pastel-blue py-4 rounded-xl flex-row justify-center items-center shadow-sm"
                    onPress={handleCheckIn}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color="white" />
                    ) : (
                        <>
                            <CheckCircle color="white" size={20} />
                            <Text className="text-white font-bold text-lg ml-2">Xác Nhận Vé</Text>
                        </>
                    )}
                </TouchableOpacity>
            </View>
        </View>
    );
}

