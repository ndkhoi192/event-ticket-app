import axios from "axios";
import { useRouter } from "expo-router";
import { ArrowLeft, Edit2, Plus, Trash2 } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, FlatList, Modal, RefreshControl, Text, TextInput, TouchableOpacity, View } from "react-native";
import { API_URL, useAuth } from "../../context/AuthContext";

interface Voucher {
    _id: string;
    code: string;
    discount_amount?: number;
    max_uses?: number;
    used_count?: number;
    valid_until: string;
}

export default function ManageVouchersScreen() {
    const { token } = useAuth();
    const router = useRouter();
    const [vouchers, setVouchers] = useState<Voucher[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Modal state
    const [modalVisible, setModalVisible] = useState(false);
    const [formData, setFormData] = useState<{_id?: string, code: string, discount_amount: string, max_uses: string, valid_until: string}>({ 
        code: "", discount_amount: "", max_uses: "", valid_until: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() 
    });

    const toSafeNumber = (value: unknown, fallback = 0) => {
        const n = Number(value);
        return Number.isFinite(n) ? n : fallback;
    };

    const fetchVouchers = async () => {
        try {
            const response = await axios.get(`${API_URL}/vouchers`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const normalized: Voucher[] = (Array.isArray(response.data) ? response.data : []).map((item: any) => ({
                _id: String(item?._id || item?.id || Math.random().toString(36).slice(2)),
                code: String(item?.code || "NO-CODE"),
                discount_amount: toSafeNumber(item?.discount_amount, 0),
                max_uses: toSafeNumber(item?.max_uses, 0),
                used_count: toSafeNumber(item?.used_count, 0),
                valid_until: item?.valid_until || new Date().toISOString(),
            }));
            setVouchers(normalized);
        } catch (error) {
            console.error("Failed to fetch vouchers", error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchVouchers();
    }, []);

    const onRefresh = () => {
        setRefreshing(true);
        fetchVouchers();
    };

    const handleSave = async () => {
        if (!formData.code || !formData.discount_amount || !formData.max_uses) {
            Alert.alert("Lỗi", "Vui lòng nhập đầy đủ thông tin.");
            return;
        }

        try {
            const payload = {
                code: formData.code.toUpperCase(),
                discount_amount: Number(formData.discount_amount),
                max_uses: Number(formData.max_uses),
                valid_until: formData.valid_until,
                event_id: null // Global voucher for this organizer's events
            };

            const headers = { Authorization: `Bearer ${token}` };
            if (formData._id) {
                await axios.put(`${API_URL}/vouchers/${formData._id}`, payload, { headers });
                Alert.alert("Thành công", "Cập nhật mã giảm giá thành công.");
            } else {
                await axios.post(`${API_URL}/vouchers`, payload, { headers });
                Alert.alert("Thành công", "Thêm mã giảm giá thành công.");
            }
            setModalVisible(false);
            fetchVouchers();
        } catch (error: any) {
            console.error(error);
            Alert.alert("Lỗi", error.response?.data?.message || "Không thể lưu mã giảm giá.");
        }
    };

    const handleDelete = (id: string, code: string) => {
        Alert.alert(
            "Xóa mã",
            `Bạn có chắc muốn xóa mã giảm giá "${code}"?`,
            [
                { text: "Hủy", style: "cancel" },
                {
                    text: "Xóa",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            await axios.delete(`${API_URL}/vouchers/${id}`, {
                                headers: { Authorization: `Bearer ${token}` }
                            });
                            Alert.alert("Thành công", "Đã xóa mã giảm giá.");
                            fetchVouchers();
                        } catch (error) {
                            Alert.alert("Lỗi", "Không thể xóa mã giảm giá.");
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
                    <Text className="text-xl font-bold text-gray-900">Mã Giảm Giá</Text>
                </View>
                <TouchableOpacity 
                    className="p-2 bg-pastel-blue rounded-full shadow-sm"
                    onPress={() => {
                        setFormData({ 
                            code: "", discount_amount: "", max_uses: "", 
                            valid_until: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() 
                        });
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
                    <Text className="text-center text-gray-400 mt-10">Chưa có mã giảm giá nào được tạo.</Text>
                }
                renderItem={({ item }) => (
                    <View className="bg-white p-4 rounded-xl border border-gray-100 mb-3 flex-row justify-between items-center shadow-sm">
                        <View className="flex-1">
                            <Text className="text-lg font-bold text-pastel-blue">{item.code}</Text>
                            <Text className="text-gray-600 mt-1">
                                Giảm: <Text className="font-bold">{toSafeNumber(item.discount_amount).toLocaleString("vi-VN")}đ</Text>
                            </Text>
                            <Text className="text-gray-500 text-xs mt-1">
                                Đã dùng: {toSafeNumber(item.used_count)} / {toSafeNumber(item.max_uses)}
                            </Text>
                            <Text className="text-gray-400 text-xs mt-1">
                                Hết hạn: {new Date(item.valid_until).toLocaleDateString('vi-VN')}
                            </Text>
                        </View>
                        
                        <View className="flex-row space-x-2">
                            <TouchableOpacity 
                                className="p-2 bg-pink-50 border border-pink-100 rounded-lg mr-2"
                                onPress={() => {
                                    setFormData({ 
                                        _id: item._id, 
                                        code: item.code, 
                                        discount_amount: toSafeNumber(item.discount_amount).toString(), 
                                        max_uses: toSafeNumber(item.max_uses).toString(),
                                        valid_until: item.valid_until
                                    });
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
                <View className="flex-1 justify-end bg-black/50">
                    <View className="bg-white px-6 pt-6 pb-12 rounded-t-3xl shadow-xl">
                        <Text className="text-xl font-bold text-gray-800 mb-4">
                            {formData._id ? "Sửa mã giảm giá" : "Thêm mã giảm giá"}
                        </Text>
                        
                        <TextInput
                            className="border border-gray-200 bg-gray-50 rounded-xl px-4 py-3 mb-4 text-base focus:border-pastel-blue focus:bg-white uppercase"
                            placeholder="Mã CODE (VD: SUMMER24)"
                            value={formData.code}
                            onChangeText={(t) => setFormData({ ...formData, code: t })}
                            autoCapitalize="characters"
                        />
                        
                        <View className="flex-row mb-4 space-x-4">
                            <TextInput
                                className="flex-1 border border-gray-200 bg-gray-50 rounded-xl px-4 py-3 text-base focus:border-pastel-blue"
                                placeholder="Mức giảm (VNĐ)"
                                value={formData.discount_amount}
                                onChangeText={(t) => setFormData({ ...formData, discount_amount: t })}
                                keyboardType="numeric"
                            />
                            <TextInput
                                className="flex-1 border border-gray-200 bg-gray-50 rounded-xl px-4 py-3 text-base focus:border-pastel-blue"
                                placeholder="Số lượt tối đa"
                                value={formData.max_uses}
                                onChangeText={(t) => setFormData({ ...formData, max_uses: t })}
                                keyboardType="numeric"
                            />
                        </View>
                        
                        <View className="flex-row space-x-4 mt-2">
                            <TouchableOpacity 
                                className="flex-1 items-center justify-center bg-gray-100 py-4 rounded-xl mr-2"
                                onPress={() => setModalVisible(false)}
                            >
                                <Text className="text-gray-600 font-bold text-base">Hủy</Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                                className="flex-1 items-center justify-center bg-pastel-blue py-4 rounded-xl ml-2"
                                onPress={handleSave}
                            >
                                <Text className="text-white font-bold text-base">Lưu lại</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

