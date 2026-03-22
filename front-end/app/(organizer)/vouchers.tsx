import DateTimePicker from "@react-native-community/datetimepicker";
import axios from "axios";
import { useRouter } from "expo-router";
import { ArrowLeft, Edit2, Plus, Trash2 } from "lucide-react-native";
import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, FlatList, KeyboardAvoidingView, Modal, Platform, RefreshControl, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";
import { API_URL, useAuth } from "../../context/AuthContext";

interface Voucher {
    _id: string;
    code: string;
    discount_type: "percentage" | "fixed";
    discount_value: number;
    min_order_value: number;
    expiry_date: string;
}

export default function ManageVouchersScreen() {
    const { token } = useAuth();
    const router = useRouter();
    const [vouchers, setVouchers] = useState<Voucher[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Modal state
    const [modalVisible, setModalVisible] = useState(false);
    const [showExpiryPicker, setShowExpiryPicker] = useState(false);
    const [formData, setFormData] = useState<{
        _id?: string;
        code: string;
        discount_type: "percentage" | "fixed";
        discount_value: string;
        min_order_value: string;
        expiry_date: string;
    }>({
        code: "",
        discount_type: "fixed",
        discount_value: "",
        min_order_value: "0",
        expiry_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    });

    const toSafeNumber = (value: unknown, fallback = 0) => {
        const n = Number(value);
        return Number.isFinite(n) ? n : fallback;
    };

    const fetchVouchers = useCallback(async () => {
        try {
            const response = await axios.get(`${API_URL}/vouchers`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const normalized: Voucher[] = (Array.isArray(response.data) ? response.data : []).map((item: any) => ({
                _id: String(item?._id || item?.id || Math.random().toString(36).slice(2)),
                code: String(item?.code || "NO-CODE"),
                discount_type: item?.discount_type === "percentage" ? "percentage" : "fixed",
                discount_value: toSafeNumber(item?.discount_value, 0),
                min_order_value: toSafeNumber(item?.min_order_value, 0),
                expiry_date: item?.expiry_date || new Date().toISOString(),
            }));
            setVouchers(normalized);
        } catch (error) {
            console.error("Failed to fetch vouchers", error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [token]);

    useEffect(() => {
        fetchVouchers();
    }, [fetchVouchers]);

    const onRefresh = () => {
        setRefreshing(true);
        fetchVouchers();
    };

    const handleSave = async () => {
        if (!formData.code || !formData.discount_value || !formData.expiry_date) {
            Alert.alert("Error", "Please fill in all required fields.");
            return;
        }

        try {
            const payload = {
                code: formData.code.toUpperCase(),
                discount_type: formData.discount_type,
                discount_value: Number(formData.discount_value),
                min_order_value: Number(formData.min_order_value || 0),
                expiry_date: new Date(formData.expiry_date).toISOString(),
            };

            const headers = { Authorization: `Bearer ${token}` };
            if (formData._id) {
                await axios.put(`${API_URL}/vouchers/${formData._id}`, payload, { headers });
                Alert.alert("Success", "Voucher updated successfully.");
            } else {
                await axios.post(`${API_URL}/vouchers`, payload, { headers });
                Alert.alert("Success", "Voucher created successfully.");
            }
            setModalVisible(false);
            fetchVouchers();
        } catch (error: any) {
            console.error(error);
            Alert.alert("Error", error.response?.data?.message || "Could not save voucher.");
        }
    };

    const handleDelete = (id: string, code: string) => {
        Alert.alert(
            "Delete voucher",
            `Are you sure you want to delete voucher "${code}"?`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            await axios.delete(`${API_URL}/vouchers/${id}`, {
                                headers: { Authorization: `Bearer ${token}` }
                            });
                            Alert.alert("Success", "Voucher deleted.");
                            fetchVouchers();
                        } catch {
                            Alert.alert("Error", "Could not delete voucher.");
                        }
                    }
                }
            ]
        );
    };

    if (loading && !refreshing) {
        return (
            <View className="flex-1 justify-center items-center bg-white">
                <ActivityIndicator size="large" color="#FB96BB" />
            </View>
        );
    }

    return (
        <View className="flex-1 bg-gray-50">
            {/* Header */}
            <View className="pt-12 pb-4 px-6 flex-row justify-between items-center bg-white border-b border-gray-100">
                <View className="flex-row items-center">
                    <TouchableOpacity onPress={() => router.back()} className="mr-4 p-2 bg-gray-50 rounded-full">
                        <ArrowLeft color="#FB96BB" size={24} />
                    </TouchableOpacity>
                    <Text className="text-xl font-bold text-gray-900">Vouchers</Text>
                </View>
                <TouchableOpacity 
                    className="p-2 bg-pastel-blue rounded-full shadow-sm"
                    onPress={() => {
                        setFormData({ 
                            code: "",
                            discount_type: "fixed",
                            discount_value: "",
                            min_order_value: "0",
                            expiry_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
                        });
                        setShowExpiryPicker(false);
                        setModalVisible(true);
                    }}
                >
                    <Plus color="white" size={24} />
                </TouchableOpacity>
            </View>

            <FlatList
                data={vouchers}
                keyExtractor={(item) => item._id}
                contentContainerStyle={{ padding: 16 }}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FB96BB" />}
                ListEmptyComponent={
                    <Text className="text-center text-gray-400 mt-10">No vouchers created yet.</Text>
                }
                renderItem={({ item }) => (
                    <View className="bg-white p-4 rounded-xl border border-gray-100 mb-3 flex-row justify-between items-center shadow-sm">
                        <View className="flex-1">
                            <Text className="text-lg font-bold text-pastel-blue">{item.code}</Text>
                            <Text className="text-gray-600 mt-1">
                                Discount: <Text className="font-bold">{item.discount_type === "percentage" ? `${item.discount_value}%` : `${item.discount_value.toLocaleString("en-US")} VND`}</Text>
                            </Text>
                            <Text className="text-gray-500 text-xs mt-1">
                                Minimum order: {item.min_order_value.toLocaleString("en-US")} VND
                            </Text>
                            <Text className="text-gray-400 text-xs mt-1">
                                Expires: {new Date(item.expiry_date).toLocaleDateString('en-US')}
                            </Text>
                        </View>
                        
                        <View className="flex-row space-x-2">
                            <TouchableOpacity 
                                className="p-2 bg-pink-50 border border-pink-100 rounded-lg mr-2"
                                onPress={() => {
                                    setFormData({ 
                                        _id: item._id, 
                                        code: item.code, 
                                        discount_type: item.discount_type,
                                        discount_value: toSafeNumber(item.discount_value).toString(),
                                        min_order_value: toSafeNumber(item.min_order_value).toString(),
                                        expiry_date: new Date(item.expiry_date).toISOString().slice(0, 10)
                                    });
                                    setShowExpiryPicker(false);
                                    setModalVisible(true);
                                }}
                            >
                                <Edit2 size={18} color="#FB96BB" />
                            </TouchableOpacity>
                            <TouchableOpacity 
                                className="p-2 bg-red-50 border border-red-100 rounded-lg"
                                onPress={() => handleDelete(item._id, item.code)}
                            >
                                <Trash2 size={18} color="#FB96BB" />
                            </TouchableOpacity>
                        </View>
                    </View>
                )}
            />

            {/* Modal */}
            <Modal animationType="slide" transparent={true} visible={modalVisible}>
                <KeyboardAvoidingView
                    className="flex-1 justify-end bg-black/50"
                    behavior={Platform.OS === "ios" ? "padding" : "height"}
                >
                    <View className="bg-white rounded-t-3xl shadow-xl max-h-[90%]">
                        <ScrollView
                            contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 24, paddingBottom: 36 }}
                            keyboardShouldPersistTaps="handled"
                        >
                            <Text className="text-xl font-bold text-gray-800 mb-4">
                                {formData._id ? "Edit voucher" : "Add voucher"}
                            </Text>

                            <TextInput
                                className="border border-gray-200 bg-gray-50 rounded-xl px-4 py-3 mb-4 text-base focus:border-pastel-blue focus:bg-white uppercase"
                                placeholder="Code (e.g. SUMMER24)"
                                value={formData.code}
                                onChangeText={(t) => setFormData({ ...formData, code: t })}
                                autoCapitalize="characters"
                            />

                            <View className="flex-row mb-4">
                                <TouchableOpacity
                                    className={`flex-1 py-3 rounded-xl mr-2 border ${formData.discount_type === "fixed" ? "bg-pink-50 border-pink-300" : "bg-gray-50 border-gray-200"}`}
                                    onPress={() => setFormData({ ...formData, discount_type: "fixed" })}
                                >
                                    <Text className="text-center font-semibold text-gray-700">Fixed amount</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    className={`flex-1 py-3 rounded-xl ml-2 border ${formData.discount_type === "percentage" ? "bg-pink-50 border-pink-300" : "bg-gray-50 border-gray-200"}`}
                                    onPress={() => setFormData({ ...formData, discount_type: "percentage" })}
                                >
                                    <Text className="text-center font-semibold text-gray-700">Percentage</Text>
                                </TouchableOpacity>
                            </View>

                            <View className="flex-row mb-4 space-x-4">
                                <TextInput
                                    className="flex-1 border border-gray-200 bg-gray-50 rounded-xl px-4 py-3 text-base focus:border-pastel-blue"
                                    placeholder={formData.discount_type === "percentage" ? "Discount (%)" : "Discount (VND)"}
                                    value={formData.discount_value}
                                    onChangeText={(t) => setFormData({ ...formData, discount_value: t })}
                                    keyboardType="numeric"
                                />
                                <TextInput
                                    className="flex-1 border border-gray-200 bg-gray-50 rounded-xl px-4 py-3 text-base focus:border-pastel-blue"
                                    placeholder="Minimum order (VND)"
                                    value={formData.min_order_value}
                                    onChangeText={(t) => setFormData({ ...formData, min_order_value: t })}
                                    keyboardType="numeric"
                                />
                            </View>

                            <View className="mb-4">
                                <Text className="text-xs text-gray-500 mb-1">Expiry date</Text>
                                <TouchableOpacity
                                    className="border border-gray-200 bg-gray-50 rounded-xl px-4 py-3"
                                    onPress={() => setShowExpiryPicker(true)}
                                >
                                    <Text className="text-base text-gray-800">{formData.expiry_date}</Text>
                                </TouchableOpacity>
                            </View>

                            {showExpiryPicker && (
                                <DateTimePicker
                                    value={new Date(formData.expiry_date)}
                                    mode="date"
                                    display={Platform.OS === "ios" ? "spinner" : "default"}
                                    textColor={Platform.OS === "ios" ? "#111827" : undefined}
                                    themeVariant={Platform.OS === "ios" ? "light" : undefined}
                                    accentColor={Platform.OS === "ios" ? "#FB96BB" : undefined}
                                    minimumDate={new Date()}
                                    onChange={(_, selectedDate) => {
                                        if (Platform.OS === "android") {
                                            setShowExpiryPicker(false);
                                        }
                                        if (selectedDate) {
                                            setFormData({
                                                ...formData,
                                                expiry_date: selectedDate.toISOString().slice(0, 10),
                                            });
                                        }
                                    }}
                                />
                            )}

                            <View className="flex-row space-x-4 mt-2">
                                <TouchableOpacity
                                    className="flex-1 items-center justify-center bg-gray-100 py-4 rounded-xl mr-2"
                                    onPress={() => setModalVisible(false)}
                                >
                                    <Text className="text-gray-600 font-bold text-base">Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    className="flex-1 items-center justify-center bg-pastel-blue py-4 rounded-xl ml-2"
                                    onPress={handleSave}
                                >
                                    <Text className="text-white font-bold text-base">Save</Text>
                                </TouchableOpacity>
                            </View>
                        </ScrollView>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </View>
    );
}

