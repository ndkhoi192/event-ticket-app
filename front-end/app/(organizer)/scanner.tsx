import axios from "axios";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useRouter } from "expo-router";
import { ArrowLeft, CheckCircle, QrCode } from "lucide-react-native";
import React, { useMemo, useRef, useState } from "react";
import { ActivityIndicator, Alert, Animated, Text, TextInput, TouchableOpacity, View } from "react-native";
import { io } from "socket.io-client";
import { API_URL, useAuth } from "../../context/AuthContext";

export default function TicketScannerScreen() {
    const { token } = useAuth();
    const router = useRouter();
    const [permission, requestPermission] = useCameraPermissions();
    const [ticketCode, setTicketCode] = useState("");
    const [loading, setLoading] = useState(false);
    const [isScanActive, setIsScanActive] = useState(true);
    const [showManualInput, setShowManualInput] = useState(false);
    const [gateId, setGateId] = useState("Gate A");
    const [fraudBanner, setFraudBanner] = useState<string | null>(null);

    const isProcessingRef = useRef(false);
    const alertVisibleRef = useRef(false);
    const fraudBlinkOpacity = useRef(new Animated.Value(1)).current;
    const fraudBlinkLoopRef = useRef<Animated.CompositeAnimation | null>(null);

    const manualFallbackRequired = useMemo(() => {
        if (!permission) return false;
        return !permission.granted;
    }, [permission]);

    const shouldShowManualInput = showManualInput || manualFallbackRequired;

    const resetScannerUI = () => {
        setTicketCode("");
        setLoading(false);
        isProcessingRef.current = false;
        alertVisibleRef.current = false;

        if (manualFallbackRequired) {
            setShowManualInput(true);
            setIsScanActive(false);
            return;
        }

        setShowManualInput(false);
        setIsScanActive(true);
        setFraudBanner(null);
    };

    React.useEffect(() => {
        if (!token) return;

        const socketBaseUrl = API_URL.replace(/\/api\/?$/, "");
        const socket = io(socketBaseUrl, {
            auth: { token },
        });

        socket.on("fraud:alert", (payload: { scannedGate?: string; originalGate?: string }) => {
            const message = `Duplicate scan detected: first at ${payload?.originalGate || "unknown"}, now at ${payload?.scannedGate || "unknown"}.`;
            setFraudBanner(message);
            showSingleAlert("Fraud alert", message);
        });

        return () => {
            socket.disconnect();
        };
    }, [token]);

    React.useEffect(() => {
        if (!fraudBanner) {
            fraudBlinkLoopRef.current?.stop();
            fraudBlinkLoopRef.current = null;
            fraudBlinkOpacity.setValue(1);
            return;
        }

        fraudBlinkLoopRef.current?.stop();
        fraudBlinkLoopRef.current = Animated.loop(
            Animated.sequence([
                Animated.timing(fraudBlinkOpacity, {
                    toValue: 0.35,
                    duration: 360,
                    useNativeDriver: true,
                }),
                Animated.timing(fraudBlinkOpacity, {
                    toValue: 1,
                    duration: 360,
                    useNativeDriver: true,
                }),
            ])
        );
        fraudBlinkLoopRef.current.start();

        return () => {
            fraudBlinkLoopRef.current?.stop();
            fraudBlinkLoopRef.current = null;
            fraudBlinkOpacity.setValue(1);
        };
    }, [fraudBanner, fraudBlinkOpacity]);

    const showSingleAlert = (title: string, message: string) => {
        if (alertVisibleRef.current) return;

        alertVisibleRef.current = true;
        Alert.alert(title, message, [
            {
                text: "OK",
                onPress: () => {
                    alertVisibleRef.current = false;
                },
            },
        ]);
    };

    const showResultByError = (error: any) => {
        const apiCode = error?.response?.data?.code;
        const apiMessage = error?.response?.data?.message;

        if (apiCode === "ALREADY_CHECKED_IN") {
            showSingleAlert("Already checked in", "This ticket has already been checked in.");
            return;
        }

        if (apiCode === "INVALID_QR") {
            showSingleAlert("Invalid code", "The QR code is invalid.");
            return;
        }

        if (apiCode === "FRAUD_SUSPECT") {
            showSingleAlert("Fraud suspect", apiMessage || "Duplicate scan detected.");
            setFraudBanner(apiMessage || "Duplicate scan detected.");
            return;
        }

        if (apiCode === "TICKET_EXPIRED") {
            showSingleAlert("Ticket expired", "This ticket is expired.");
            return;
        }

        showSingleAlert("Validation failed", apiMessage || "Could not validate this ticket right now.");
    };

    const validateTicket = async (rawCode: string) => {
        const normalizedCode = rawCode.trim();

        if (isProcessingRef.current) {
            return;
        }

        if (!normalizedCode) {
            showSingleAlert("Missing code", "Please enter a ticket code.");
            return;
        }

        isProcessingRef.current = true;
        setLoading(true);
        try {
            const response = await axios.post(`${API_URL}/tickets/validate`, {
                qr_code_data: normalizedCode,
                gate_id: gateId,
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            showSingleAlert(
                "Check-in successful",
                `Ticket is valid and now checked in.\nEvent: ${response.data.ticket?.event || "Unknown"}\nType: ${response.data.ticket?.type || "Unknown"}`
            );
            setTicketCode("");
            setIsScanActive(false);
        } catch (error: any) {
            console.error("Ticket validation failed:", error);
            showResultByError(error);
            setIsScanActive(false);
        } finally {
            isProcessingRef.current = false;
            setLoading(false);
        }
    };

    const handleCheckIn = async () => {
        await validateTicket(ticketCode);
    };

    const handleBarcodeScanned = async ({ data }: { data: string }) => {
        if (!isScanActive || loading || isProcessingRef.current) return;

        const scannedCode = String(data || "").trim();
        if (!scannedCode) return;

        setIsScanActive(false);
        setTicketCode(scannedCode);
        await validateTicket(scannedCode);
    };

    const handleScanNext = () => {
        if (loading) return;
        resetScannerUI();
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
                {fraudBanner && (
                    <Animated.View className="w-full bg-red-100 border border-red-300 rounded-xl p-3 mb-4" style={{ opacity: fraudBlinkOpacity }}>
                        <Text className="text-red-700 font-bold text-center">{fraudBanner}</Text>
                    </Animated.View>
                )}

                <View className="w-24 h-24 bg-pink-50 rounded-full items-center justify-center mb-6">
                    <QrCode size={48} color="#FB96BB" />
                </View>

                <View className="w-full mb-4">
                    <Text className="text-gray-700 font-semibold mb-2">Scan Gate</Text>
                    <View className="flex-row">
                        {["Gate A", "Gate B", "Gate C"].map((gate) => (
                            <TouchableOpacity
                                key={gate}
                                className={`flex-1 py-2.5 rounded-xl border mr-2 ${gateId === gate ? "bg-pink-50 border-pink-300" : "bg-white border-gray-200"}`}
                                onPress={() => setGateId(gate)}
                            >
                                <Text className={`text-center font-semibold ${gateId === gate ? "text-pink-600" : "text-gray-600"}`}>{gate}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                <Text className="text-xl font-bold text-gray-800 mb-2">QR Check-in</Text>
                <Text className="text-gray-500 text-center mb-8 px-4">
                    Scan a ticket QR code to check in. One scan triggers only one validation.
                </Text>

                {!permission ? (
                    <View
                        className="w-full rounded-2xl border border-gray-200 items-center justify-center bg-gray-50 mb-6"
                        style={{ aspectRatio: 1 }}
                    >
                        <ActivityIndicator color="#FB96BB" />
                    </View>
                ) : manualFallbackRequired ? (
                    <View className="w-full rounded-2xl border border-gray-200 p-5 bg-gray-50 mb-6">
                        <Text className="text-gray-700 text-center mb-3">
                            Camera access is required for QR scanning.
                        </Text>
                        <TouchableOpacity
                            className="bg-pastel-blue py-3 rounded-xl"
                            onPress={requestPermission}
                        >
                            <Text className="text-white text-center font-bold">Allow Camera Access</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    !shouldShowManualInput && (
                        <View className="w-full mb-6">
                            <View
                                className="w-full rounded-2xl overflow-hidden border border-pink-100"
                                style={{ aspectRatio: 1 }}
                            >
                                <CameraView
                                    style={{ flex: 1 }}
                                    facing="back"
                                    barcodeScannerSettings={{
                                        barcodeTypes: ["qr"],
                                    }}
                                    onBarcodeScanned={isScanActive ? handleBarcodeScanned : undefined}
                                />
                            </View>

                            {!isScanActive && (
                                <TouchableOpacity
                                    className="mt-3 w-full py-3 rounded-xl border border-pink-200"
                                    onPress={handleScanNext}
                                    disabled={loading}
                                >
                                    <Text className="text-center text-pink-600 font-bold">Scan Next Ticket</Text>
                                </TouchableOpacity>
                            )}

                            <TouchableOpacity
                                className="mt-3 w-full py-3 rounded-xl border border-gray-200"
                                onPress={() => setShowManualInput(true)}
                                disabled={loading}
                            >
                                <Text className="text-center text-gray-700 font-semibold">Cannot scan? Use manual validation</Text>
                            </TouchableOpacity>
                        </View>
                    )
                )}

                {shouldShowManualInput && (
                    <View className="w-full">
                        <Text className="text-gray-800 font-semibold mb-2">Manual validation</Text>
                        <TextInput
                            className="w-full border border-gray-200 rounded-xl px-5 py-4 bg-gray-50 text-gray-800 text-lg mb-4 focus:border-pastel-blue text-center uppercase font-bold tracking-widest"
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

                        {permission?.granted && (
                            <TouchableOpacity
                                className="mt-3 w-full py-3 rounded-xl border border-gray-200"
                                onPress={resetScannerUI}
                                disabled={loading}
                            >
                                <Text className="text-center text-gray-700 font-semibold">Back to QR scanner</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                )}
            </View>
        </View>
    );
}

