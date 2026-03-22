import { Link } from "expo-router";
import { CalendarRange, Folder, User, Users } from "lucide-react-native";
import { Text, TouchableOpacity, View } from "react-native";

export default function AdminScreen() {
    return (
        <View className="flex-1 bg-gray-50 pt-16 px-6">
            <View className="mb-8">
                <Text className="text-3xl font-bold text-gray-900 mb-2">Admin Dashboard</Text>
                <Text className="text-gray-500 text-base">Management center</Text>
            </View>

            <View className="space-y-4">
                {/* Manage Events */}
                <Link href="/(admin)/events" asChild>
                    <TouchableOpacity className="flex-row items-center justify-between bg-white p-5 rounded-2xl shadow-sm border border-gray-100 mb-4">
                        <View className="flex-row items-center">
                            <View className="w-12 h-12 bg-pink-50 rounded-full items-center justify-center mr-4">
                                <CalendarRange size={24} color="#FB96BB" />
                            </View>
                            <View>
                                <Text className="text-lg font-bold text-gray-800">Manage Events</Text>
                                <Text className="text-gray-400 text-sm mt-1">View all events by status</Text>
                            </View>
                        </View>
                        <Text className="text-gray-300 font-bold text-xl">→</Text>
                    </TouchableOpacity>
                </Link>

                {/* Manage Users */}
                <Link href="/(admin)/users" asChild>
                    <TouchableOpacity className="flex-row items-center justify-between bg-white p-5 rounded-2xl shadow-sm border border-gray-100 mb-4">
                        <View className="flex-row items-center">
                            <View className="w-12 h-12 bg-pink-50 rounded-full items-center justify-center mr-4">
                                <Users size={24} color="#FB96BB" />
                            </View>
                            <View>
                                <Text className="text-lg font-bold text-gray-800">Manage Users</Text>
                                <Text className="text-gray-400 text-sm mt-1">Update roles and access</Text>
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
                                <Text className="text-lg font-bold text-gray-800">Manage Categories</Text>
                                <Text className="text-gray-400 text-sm mt-1">Create and update event categories</Text>
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
                            <Text className="text-lg font-bold text-gray-800">Profile & Logout</Text>
                        </View>
                        <Text className="text-gray-300 font-bold text-xl">→</Text>
                    </TouchableOpacity>
                </Link>
            </View>
        </View>
    );
}

