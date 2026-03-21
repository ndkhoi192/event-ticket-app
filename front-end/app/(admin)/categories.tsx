import axios from "axios";
import { useRouter } from "expo-router";
import { ArrowLeft, Edit2, Plus, Trash2 } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, FlatList, Modal, RefreshControl, Text, TextInput, TouchableOpacity, View } from "react-native";
import { API_URL, useAuth } from "../../context/AuthContext";
import { Category } from "../../types";

export default function ManageCategoriesScreen() {
    const { token } = useAuth();
    const router = useRouter();
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Modal state
    const [modalVisible, setModalVisible] = useState(false);
    const [currentCat, setCurrentCat] = useState<{_id?: string, name: string}>({ name: "" });

    const fetchCategories = async () => {
        try {
            const response = await axios.get(`${API_URL}/categories`);
            setCategories(response.data);
        } catch (error) {
            console.error("Failed to fetch categories", error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchCategories();
    }, []);

    const onRefresh = () => {
        setRefreshing(true);
        fetchCategories();
    };

    const handleSave = async () => {
        if (!currentCat.name.trim()) {
            Alert.alert("Lỗi", "Tên danh mục không được để trống.");
            return;
        }

        try {
            const headers = { Authorization: `Bearer ${token}` };
            if (currentCat._id) {
                // Update
                await axios.put(`${API_URL}/categories/${currentCat._id}`, { name: currentCat.name }, { headers });
                Alert.alert("Thành công", "Cập nhật thành công.");
            } else {
                // Create
                await axios.post(`${API_URL}/categories`, { name: currentCat.name }, { headers });
                Alert.alert("Thành công", "Thêm mới thành công.");
            }
            setModalVisible(false);
            fetchCategories();
        } catch (error) {
            console.error(error);
            Alert.alert("Lỗi", "Không thể lưu danh mục.");
        }
    };

    const handleDelete = (id: string, name: string) => {
        Alert.alert(
            "Xóa danh mục",
            `Bạn có chắc muốn xóa "${name}"?`,
            [
                { text: "Hủy", style: "cancel" },
                {
                    text: "Xóa",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            await axios.delete(`${API_URL}/categories/${id}`, {
                                headers: { Authorization: `Bearer ${token}` }
                            });
                            Alert.alert("Thành công", "Đã xóa danh mục.");
                            fetchCategories();
                        } catch (error) {
                            Alert.alert("Lỗi", "Không thể xóa (có thể danh mục đang được sử dụng).");
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
                    <Text className="text-xl font-bold text-gray-900">Danh mục</Text>
                </View>
                <TouchableOpacity 
                    className="p-2 bg-pastel-pink rounded-full shadow-sm"
                    onPress={() => {
                        setCurrentCat({ name: "" });
                        setModalVisible(true);
                    }}
                >
                    <Plus color="white" size={24} />
                </TouchableOpacity>
            </View>

            <FlatList
                data={categories}
                keyExtractor={(item) => item._id}
                contentContainerStyle={{ padding: 16 }}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FB96BB" />}
                renderItem={({ item }) => (
                    <View className="bg-white p-4 rounded-xl border border-gray-100 mb-3 flex-row justify-between items-center shadow-sm">
                        <Text className="text-base font-bold text-gray-800">{item.name}</Text>
                        
                        <View className="flex-row space-x-2">
                            <TouchableOpacity 
                                className="p-2 bg-pink-50 border border-pink-100 rounded-lg mr-2"
                                onPress={() => {
                                    setCurrentCat({ _id: item._id, name: item.name });
                                    setModalVisible(true);
                                }}
                            >
                                <Edit2 size={18} color="#FB96BB" />
                            </TouchableOpacity>
                            <TouchableOpacity 
                                className="p-2 bg-red-50 border border-red-100 rounded-lg"
                                onPress={() => handleDelete(item._id, item.name)}
                            >
                                <Trash2 size={18} color="#FB96BB" />
                            </TouchableOpacity>
                        </View>
                    </View>
                )}
            />

            {/* Modal Edit/Create */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={modalVisible}
                onRequestClose={() => setModalVisible(false)}
            >
                <View className="flex-1 justify-end bg-black/50">
                    <View className="bg-white px-6 pt-6 pb-12 rounded-t-3xl shadow-xl">
                        <Text className="text-xl font-bold text-gray-800 mb-4">
                            {currentCat._id ? "Sửa danh mục" : "Thêm danh mục"}
                        </Text>
                        
                        <TextInput
                            className="border border-gray-200 bg-gray-50 rounded-xl px-4 py-4 mb-6 text-base focus:border-pastel-pink focus:bg-white"
                            placeholder="Tên danh mục..."
                            value={currentCat.name}
                            onChangeText={(text) => setCurrentCat({ ...currentCat, name: text })}
                            autoFocus
                        />
                        
                        <View className="flex-row space-x-4">
                            <TouchableOpacity 
                                className="flex-1 items-center justify-center bg-gray-100 py-4 rounded-xl mr-2"
                                onPress={() => setModalVisible(false)}
                            >
                                <Text className="text-gray-600 font-bold text-base">Hủy</Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                                className="flex-1 items-center justify-center bg-pastel-pink py-4 rounded-xl ml-2"
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

