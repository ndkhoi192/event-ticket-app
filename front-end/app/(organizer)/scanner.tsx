import axios from "axios";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useRouter } from "expo-router";
import { ArrowLeft, CheckCircle, QrCode } from "lucide-react-native";
import React, { useState } from "react";
import { ActivityIndicator, Alert, Text, TextInput, TouchableOpacity, View } from "react-native";
import { API_URL, useAuth } from "../../context/AuthContext";

export default function TicketScannerScreen() {
    const { token } = useAuth();
    const router = useRouter();
    const [permission, requestPermission] = useCameraPermissions();
    const [ticketCode, setTicketCode] = useState("");
    const [loading, setLoading] = useState(false);
    const [isScanActive, setIsScanActive] = useState(true);

    const showResultByError = (error: any) => {
        const apiCode = error?.response?.data?.code;
        const apiMessage = error?.response?.data?.message;

        if (apiCode === "ALREADY_CHECKED_IN") {
            Alert.alert("Ticket already checked in", "Ve da co nguoi check-in.");
            return;
        }

        if (apiCode === "INVALID_QR") {
            Alert.alert("Invalid code", "Code loi. Vui long thu lai.");
            return;
        }

        if (apiCode === "TICKET_EXPIRED") {
            Alert.alert("Expired", "Ticket da het han su dung.");
            return;
        }

        Alert.alert("Validation failed", apiMessage || "Khong the xac thuc ve luc nay.");
    };

    const validateTicket = async (rawCode: string) => {
        const normalizedCode = rawCode.trim();

        if (!normalizedCode) {
            Alert.alert("Error", "Please enter a ticket code.");
            return;
        }

        setLoading(true);
        try {
            const response = await axios.post(`${API_URL}/tickets/validate`, {
                qr_code_data: normalizedCode,
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            Alert.alert(
                "Check-in successful",
                `Ticket hop le va da check-in.\nEvent: ${response.data.ticket?.event || "Unknown"}\nType: ${response.data.ticket?.type || "Unknown"}`
            );
            setTicketCode("");
        } catch (error: any) {
            console.error("Ticket validation failed:", error);
            showResultByError(error);
        } finally {
            setLoading(false);
        }
    };

    const handleCheckIn = async () => {
        await validateTicket(ticketCode);
    };

    const handleBarcodeScanned = async ({ data }: { data: string }) => {
        if (!isScanActive || loading) return;

        const scannedCode = String(data || "").trim();
        if (!scannedCode) return;

        setIsScanActive(false);
        setTicketCode(scannedCode);
        await validateTicket(scannedCode);

        setTimeout(() => {
            setIsScanActive(true);
        }, 1200);
    };

    return (
        <View className="flex-1 bg-white">
            <View className="pt-12 pb-4 px-6 flex-row items-center border-b border-gray-100 mb-10">
                <TouchableOpacity onPress={() => router.back()} className="mr-4 p-2 bg-gray-50 rounded-full">
                    <ArrowLeft color="#FB96BB" size={24} />
                </TouchableOpacity>
                <Text className="text-xl font-bold text-gray-900">Ticket Verification</Text>
            </View>

            <View className="px-6 items-center">
                <View className="w-24 h-24 bg-pink-50 rounded-full items-center justify-center mb-6">
                    <QrCode size={48} color="#FB96BB" />
                </View>

                <Text className="text-xl font-bold text-gray-800 mb-2">QR Check-in</Text>
                <Text className="text-gray-500 text-center mb-8 px-4">
                    Quet QR ve de check-in ngay. Ban van co the nhap ma thu cong neu can.
                </Text>

                {!permission ? (
                    <View className="w-full h-64 rounded-2xl border border-gray-200 items-center justify-center bg-gray-50 mb-6">
                        <ActivityIndicator color="#FB96BB" />
                    </View>
                ) : !permission.granted ? (
                    <View className="w-full rounded-2xl border border-gray-200 p-5 bg-gray-50 mb-6">
                        <Text className="text-gray-700 text-center mb-3">
                            Can quyen camera de quet QR.
                        </Text>
                        <TouchableOpacity
                            className="bg-pastel-blue py-3 rounded-xl"
                            onPress={requestPermission}
                        >
                            <Text className="text-white text-center font-bold">Allow Camera Access</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <View className="w-full h-64 rounded-2xl overflow-hidden border border-pink-100 mb-6">
                        <CameraView
                            style={{ flex: 1 }}
                            facing="back"
                            barcodeScannerSettings={{
                                barcodeTypes: ["qr"],
                            }}
                            onBarcodeScanned={isScanActive ? handleBarcodeScanned : undefined}
                        />
                    </View>
                )}

                <TextInput
                    className="w-full border border-gray-200 rounded-xl px-5 py-4 bg-gray-50 text-gray-800 text-lg mb-6 focus:border-pastel-blue text-center uppercase font-bold tracking-widest"
                    value={ticketCode}
                    onChangeText={setTicketCode}
                    placeholder="ENTER OR PASTE TICKET CODE"
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
                            <Text className="text-white font-bold text-lg ml-2">Validate Ticket</Text>
                        </>
                    )}
                </TouchableOpacity>
            </View>
        </View>
    );
}

