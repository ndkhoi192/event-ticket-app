import DateTimePicker from "@react-native-community/datetimepicker";
import axios from "axios";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { ArrowLeft, Calendar, Clock, MapPin, Trash2, Upload } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Image,
    Keyboard,
    KeyboardAvoidingView,
    Modal,
    Platform,
    SafeAreaView,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from "react-native";
import EventMapPicker from "../../../components/EventMapPicker";
import { API_URL, useAuth } from "../../../context/AuthContext";
import { Category } from "../../../types";

export default function CreateEventScreen() {
    const router = useRouter();
    const { token } = useAuth();

    // Form State
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [banner, setBanner] = useState<string | null>(null);
    const [date, setDate] = useState(new Date());

    const [showDatePicker, setShowDatePicker] = useState(false);
    const [mode, setMode] = useState<"date" | "time">("date");
    const [locationName, setLocationName] = useState("");
    const [coordinates, setCoordinates] = useState({ lat: 10.762622, lng: 106.660172 }); // Default Ho Chi Minh City
    const [showMap, setShowMap] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [suggestions, setSuggestions] = useState<any[]>([]);

    const [categories, setCategories] = useState<Category[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<string>("");

    const [ticketTypes, setTicketTypes] = useState([
        { type_name: "Standard", price: "", total_quantity: "" },
    ]);

    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        fetchCategories();
    }, []);

    const fetchCategories = async () => {
        try {
            const response = await axios.get(`${API_URL}/categories`);
            setCategories(response.data);
        } catch (error) {
            console.error("Failed to fetch categories", error);
            Alert.alert("Error", "Failed to load categories");
        }
    };

    const pickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            // aspect: [16, 9], // Removing fixed aspect ratio so you can manually drag the crop box to be wide (16:9)
            allowsEditing: false,
            quality: 0.5, // Lower quality to keep base64 string size manageable
            base64: true,
        });

        if (!result.canceled) {
            // Use Base64 for cross-platform compatibility (Web/Android/iOS) without a dedicated storage server
            // Note: In production, upload 'result.assets[0].uri' to S3/Cloudinary and save the URL.
            if (result.assets[0].base64) {
                const base64Img = `data:image/jpeg;base64,${result.assets[0].base64}`;
                setBanner(base64Img);
            } else {
                setBanner(result.assets[0].uri);
            }
        }
    };

    const addTicketType = () => {
        setTicketTypes([...ticketTypes, { type_name: "", price: "", total_quantity: "" }]);
    };

    const removeTicketType = (index: number) => {
        if (ticketTypes.length > 1) {
            const newTickets = [...ticketTypes];
            newTickets.splice(index, 1);
            setTicketTypes(newTickets);
        }
    };

    const updateTicketType = (index: number, field: string, value: string) => {
        const newTickets = [...ticketTypes];
        // @ts-ignore
        newTickets[index][field] = value;
        setTicketTypes(newTickets);
    };

    const handleCreate = async () => {
        if (!title || !description || !banner || !selectedCategory || !locationName) {
            Alert.alert("Error", "Please fill in all required fields");
            return;
        }

        setIsSubmitting(true);

        try {
            const formattedTickets = ticketTypes.map(t => ({
                type_name: t.type_name,
                price: parseInt(t.price) || 0,
                total_quantity: parseInt(t.total_quantity) || 0,
                remaining_quantity: parseInt(t.total_quantity) || 0,
            }));

            // NOTE: Since we don't have a real upload endpoint in this snippet, 
            // we are sending the local URI. The backend will likely fail if it expects a valid web URL 
            // unless it treats this string effectively or we implement an uploader.
            // For now, I'm passing the URI string.

            const payload = {
                title,
                description,
                banner_url: banner, // TODO: Implement real image upload
                date_time: date.toISOString(),
                location: {
                    name: locationName,
                    coordinates,
                },
                category_id: selectedCategory,
                ticket_types: formattedTickets,
                status: "published",
            };

            const headers = token ? { Authorization: `Bearer ${token}` } : {};

            await axios.post(`${API_URL}/events`, payload, { headers });

            Alert.alert("Success", "Event created successfully!");

            // Reset Form
            setTitle("");
            setDescription("");
            setBanner(null);
            setDate(new Date());
            setLocationName("");
            setSelectedCategory("");
            setCoordinates({ lat: 10.762622, lng: 106.660172 });
            setTicketTypes([{ type_name: "Standard", price: "", total_quantity: "" }]);

            router.back();
        } catch (error: any) {
            console.error("Create event error:", error.response?.data || error);
            Alert.alert("Error", error.response?.data?.message || "Failed to create event");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            keyboardVerticalOffset={Platform.OS === "ios" ? 60 : 0} // Adjust offset if header exists
        >
            <ScrollView
                className="flex-1 bg-white"
                contentContainerStyle={{ paddingBottom: 100 }}
                showsVerticalScrollIndicator={false}
            >
                {/* Header */}
                <View className="flex-row items-center px-4 py-4 border-b border-gray-100 mt-8">
                    <TouchableOpacity onPress={() => router.back()} className="mr-4">
                        <ArrowLeft color="#374151" size={24} />
                    </TouchableOpacity>
                    <Text className="text-xl font-bold text-gray-800">Create New Event</Text>
                </View>

                <View className="p-6 space-y-8">
                    {/* Banner Image */}
                    <TouchableOpacity
                        onPress={pickImage}
                        className="w-full bg-gray-100 rounded-xl items-center justify-center overflow-hidden border border-gray-200 border-dashed"
                        style={{ aspectRatio: 16 / 9 }}
                    >
                        {banner ? (
                            <Image source={{ uri: banner }} className="w-full h-full" resizeMode="cover" />
                        ) : (
                            <View className="items-center">
                                <Upload color="#9CA3AF" size={32} />
                                <Text className="text-gray-500 mt-2">Upload Banner Image (16:9)</Text>
                            </View>
                        )}
                    </TouchableOpacity>

                    {/* Basic Info */}
                    <View>
                        <Text className="text-sm font-bold text-gray-700 mb-2">Event Title</Text>
                        <TextInput
                            className="border border-gray-200 rounded-lg px-4 py-3 bg-gray-50 focus:border-pastel-pink text-gray-800"
                            placeholder="e.g. Summer Music Festival"
                            value={title}
                            onChangeText={setTitle}
                        />
                    </View>

                    <View>
                        <Text className="text-sm font-bold text-gray-700 mb-2">Description</Text>
                        <TextInput
                            className="border border-gray-200 rounded-lg px-4 py-3 bg-gray-50 focus:border-pastel-pink text-gray-800 h-32"
                            placeholder="Describe your event..."
                            multiline
                            textAlignVertical="top"
                            value={description}
                            onChangeText={setDescription}
                        />
                    </View>

                    {/* Date & Time Selection */}
                    <View className="flex-row space-x-4">
                        {/* Date Picker */}
                        <View className="flex-1">
                            <Text className="text-sm font-bold text-gray-700 mb-2">Date</Text>
                            <TouchableOpacity
                                onPress={() => {
                                    setMode("date");
                                    setShowDatePicker(true);
                                }}
                                className="flex-row items-center border border-gray-200 rounded-lg px-4 py-3 bg-gray-50"
                            >
                                <Calendar color="#9CA3AF" size={20} />
                                <Text className="ml-3 text-gray-700">
                                    {date.toLocaleDateString()}
                                </Text>
                            </TouchableOpacity>
                        </View>

                        {/* Time Picker */}
                        <View className="flex-1">
                            <Text className="text-sm font-bold text-gray-700 mb-2">Time</Text>
                            <TouchableOpacity
                                onPress={() => {
                                    setMode("time");
                                    setShowDatePicker(true);
                                }}
                                className="flex-row items-center border border-gray-200 rounded-lg px-4 py-3 bg-gray-50"
                            >
                                <Clock color="#9CA3AF" size={20} />
                                <Text className="ml-3 text-gray-700">
                                    {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Picker (Hidden by default, shows modal on Android/iOS) */}
                    {/* Picker Handling */}
                    {showDatePicker && (
                        <View>
                            {Platform.OS === 'ios' ? (
                                <View className="bg-gray-50 rounded-xl mt-2 border border-gray-200 overflow-hidden">
                                    <View className="flex-row justify-end bg-gray-100 px-4 py-2 border-b border-gray-200">
                                        <TouchableOpacity
                                            onPress={() => setShowDatePicker(false)}
                                            className="bg-white px-4 py-1 rounded border border-gray-300 shadow-sm"
                                        >
                                            <Text className="text-pastel-blue font-bold text-sm">Done</Text>
                                        </TouchableOpacity>
                                    </View>
                                    <DateTimePicker
                                        value={date}
                                        mode={mode}
                                        is24Hour={true}
                                        display="spinner"
                                        textColor="black"
                                        onChange={(event, selectedDate) => {
                                            if (selectedDate) setDate(selectedDate);
                                        }}
                                        style={{ height: 120, width: "100%" }}
                                    />
                                </View>
                            ) : (
                                <DateTimePicker
                                    value={date}
                                    mode={mode}
                                    is24Hour={true}
                                    display="default"
                                    onChange={(event, selectedDate) => {
                                        setShowDatePicker(false);
                                        if (selectedDate) setDate(selectedDate);
                                    }}
                                />
                            )}
                        </View>
                    )}

                    {/* Location */}
                    <View className="mt-4">
                        <Text className="text-sm font-bold text-gray-700 mb-2">Location Name</Text>
                        <TextInput
                            className="border border-gray-200 rounded-lg px-4 py-3 bg-gray-50 focus:border-pastel-pink text-gray-800 mb-2"
                            placeholder="e.g. National Stadium"
                            value={locationName}
                            onChangeText={setLocationName}
                        />

                        <TouchableOpacity
                            onPress={() => setShowMap(true)}
                            className="flex-row items-center justify-center border border-pastel-blue rounded-lg py-3 mt-2"
                        >
                            <MapPin color="#A7C7E7" size={20} />
                            <Text className="ml-2 text-pastel-blue font-bold">
                                Select Location on Map
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {/* Category */}
                    <View>
                        <Text className="text-sm font-bold text-gray-700 mb-2">Category</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="space-x-2">
                            {categories.map((cat) => (
                                <TouchableOpacity
                                    key={cat._id}
                                    onPress={() => setSelectedCategory(cat._id)}
                                    className={`px-4 py-2 rounded-full border ${selectedCategory === cat._id ? "bg-pastel-pink border-pastel-pink" : "bg-white border-gray-200"}`}
                                >
                                    <Text className={selectedCategory === cat._id ? "text-white font-bold" : "text-gray-600"}>
                                        {cat.name}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>

                    {/* Ticket Types */}
                    <View>
                        <View className="flex-row justify-between items-center mb-2">
                            <Text className="text-sm font-bold text-gray-700">Ticket Types</Text>
                            <TouchableOpacity onPress={addTicketType}>
                                <Text className="text-pastel-blue font-bold">+ Add Type</Text>
                            </TouchableOpacity>
                        </View>

                        {ticketTypes.map((ticket, index) => (
                            <View key={index} className="bg-gray-50 p-3 rounded-xl border border-gray-100 mb-3">
                                <View className="flex-row justify-between mb-2">
                                    <Text className="text-gray-500 text-xs font-bold uppercase">Ticket #{index + 1}</Text>
                                    {index > 0 && (
                                        <TouchableOpacity onPress={() => removeTicketType(index)}>
                                            <Trash2 size={16} color="#EF4444" />
                                        </TouchableOpacity>
                                    )}
                                </View>
                                <TextInput
                                    placeholder="Type Name (e.g. VIP)"
                                    className="bg-white border border-gray-200 rounded p-2 mb-2"
                                    value={ticket.type_name}
                                    onChangeText={(text) => updateTicketType(index, "type_name", text)}
                                />
                                <View className="flex-row space-x-4">
                                    <TextInput
                                        placeholder="Price (VND)"
                                        className="flex-1 bg-white border border-gray-200 rounded p-2"
                                        keyboardType="numeric"
                                        value={ticket.price}
                                        onChangeText={(text) => updateTicketType(index, "price", text)}
                                    />
                                    <TextInput
                                        placeholder="Quantity"
                                        className="flex-1 bg-white border border-gray-200 rounded p-2"
                                        keyboardType="numeric"
                                        value={ticket.total_quantity}
                                        onChangeText={(text) => updateTicketType(index, "total_quantity", text)}
                                    />
                                </View>
                            </View>
                        ))}
                    </View>

                    {/* Submit Button */}
                    <TouchableOpacity
                        className="bg-pastel-blue py-4 rounded-xl items-center shadow-lg mt-4 mb-10"
                        onPress={handleCreate}
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? (
                            <ActivityIndicator color="white" />
                        ) : (
                            <Text className="text-white font-bold text-lg">Publish Event</Text>
                        )}
                    </TouchableOpacity>
                </View>
            </ScrollView>

            {/* Map Modal */}
            <Modal visible={showMap} animationType="slide" onRequestClose={() => setShowMap(false)}>
                <SafeAreaView className="flex-1 bg-white">
                    <View className="p-4 flex-row items-center space-x-2 border-b border-gray-100">
                        <TouchableOpacity onPress={() => setShowMap(false)} className="mr-2">
                            <ArrowLeft color="#374151" size={24} />
                        </TouchableOpacity>
                        <Text className="text-lg font-bold text-gray-800">Select Location</Text>
                    </View>

                    {/* Search Bar in Map */}
                    <View className="p-4 z-50">
                        <View className="flex-row space-x-2 relative">
                            <TextInput
                                className="flex-1 border border-gray-200 rounded-lg px-4 py-3 bg-gray-50 focus:border-pastel-pink text-gray-800"
                                placeholder="Search location..."
                                value={searchQuery}
                                onChangeText={async (text) => {
                                    setSearchQuery(text);
                                    if (text.length > 2) {
                                        try {
                                            const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(text)}`, {
                                                headers: {
                                                    'User-Agent': 'EventTicketApp/1.0'
                                                }
                                            });
                                            const data = await response.json();
                                            setSuggestions(data);
                                        } catch (error) {
                                            console.error(error);
                                        }
                                    } else {
                                        setSuggestions([]);
                                    }
                                }}
                            />
                            {/* Clear/Search Buttons actions could go here, but we use auto-search on type */}
                        </View>

                        {/* Suggestions Dropdown */}
                        {suggestions.length > 0 && (
                            <View className="absolute top-14 left-4 right-4 bg-white rounded-lg shadow-xl border border-gray-100 max-h-60 z-50">
                                <FlatList
                                    data={suggestions}
                                    keyExtractor={(item, index) => item.place_id ? item.place_id.toString() : index.toString()}
                                    keyboardShouldPersistTaps="handled"
                                    renderItem={({ item }) => (
                                        <TouchableOpacity
                                            onPress={() => {
                                                const lat = parseFloat(item.lat);
                                                const lng = parseFloat(item.lon);
                                                setCoordinates({ lat, lng });
                                                setSearchQuery(item.display_name);
                                                setSuggestions([]);
                                                Keyboard.dismiss();
                                            }}
                                            className="p-3 border-b border-gray-100"
                                        >
                                            <Text className="text-gray-800 text-sm" numberOfLines={2}>
                                                {item.display_name}
                                            </Text>
                                        </TouchableOpacity>
                                    )}
                                />
                            </View>
                        )}
                    </View>

                    <View className="flex-1">
                        <EventMapPicker coordinates={coordinates} setCoordinates={setCoordinates} />
                    </View>

                    <View className="p-4 border-t border-gray-100">
                        <TouchableOpacity
                            onPress={() => setShowMap(false)}
                            className="bg-pastel-blue py-4 rounded-xl items-center"
                        >
                            <Text className="text-white font-bold text-lg">Confirm Location</Text>
                        </TouchableOpacity>
                    </View>
                </SafeAreaView>
            </Modal>
        </KeyboardAvoidingView>
    );
}
