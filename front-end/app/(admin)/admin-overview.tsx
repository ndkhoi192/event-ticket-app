import { Link } from "expo-router";
import { Folder, User, Users } from "lucide-react-native";
import { Text, TouchableOpacity, View } from "react-native";

export default function AdminScreen() {
    return (
        <View className="flex-1 bg-gray-50 pt-16 px-6">
            <View className="mb-8">
                <Text className="text-3xl font-bold text-gray-900 mb-2">Admin Dashboard</Text>
                <Text className="text-gray-500 text-base">Hệ thống quản lý</Text>
            </View>

            <View className="space-y-4">
                {/* Manage Users */}
                <Link href="/(admin)/users" asChild>
                    <TouchableOpacity className="flex-row items-center justify-between bg-white p-5 rounded-2xl shadow-sm border border-gray-100 mb-4">
                        <View className="flex-row items-center">
                            <View className="w-12 h-12 bg-pink-50 rounded-full items-center justify-center mr-4">
                                <Users size={24} color="#FB96BB" />
                            </View>
                            <View>
                                <Text className="text-lg font-bold text-gray-800">Quản lý User</Text>
                                <Text className="text-gray-400 text-sm mt-1">Phân quyền thao tác hệ thống</Text>
                            </View>
                        </View>
                        <Text className="text-gray-300 font-bold text-xl">→</Text>
                    </TouchableOpacity>
                </Link>

                {/* Manage Categories */}
                <Link href="/(admin)/categories" asChild>
                    <TouchableOpacity className="flex-row items-center justify-between bg-white p-5 rounded-2xl shadow-sm border border-gray-100 mb-4">
                        <View className="flex-row items-center">
                            <View className="w-12 h-12 bg-pink-50 rounded-full items-center justify-center mr-4">
                                <Folder size={24} color="#FB96BB" />
                            </View>
                            <View>
                                <Text className="text-lg font-bold text-gray-800">Quản lý Danh mục</Text>
                                <Text className="text-gray-400 text-sm mt-1">Thêm/sửa danh mục sự kiện</Text>
                            </View>
                        </View>
                        <Text className="text-gray-300 font-bold text-xl">→</Text>
                    </TouchableOpacity>
                </Link>

                {/* My Profile */}
                <Link href="/(admin)/profile" asChild>
                    <TouchableOpacity className="flex-row items-center justify-between bg-white p-5 rounded-2xl shadow-sm border border-gray-100 mt-4">
                        <View className="flex-row items-center">
                            <View className="w-12 h-12 bg-gray-50 rounded-full items-center justify-center mr-4">
                                <User size={24} color="#FB96BB" />
                            </View>
                            <Text className="text-lg font-bold text-gray-800">Cá nhân & Đăng xuất</Text>
                        </View>
                        <Text className="text-gray-300 font-bold text-xl">→</Text>
                    </TouchableOpacity>
                </Link>
            </View>
        </View>
    );
}

