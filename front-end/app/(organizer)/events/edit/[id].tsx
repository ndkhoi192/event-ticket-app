import DateTimePicker from "@react-native-community/datetimepicker";
import axios from "axios";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ArrowLeft, Calendar, Clock, MapPin, Trash2, Upload } from "lucide-react-native";
import React, { useEffect, useMemo, useState } from "react";
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
import EventMapPicker from "../../../../components/EventMapPicker";
import { API_URL, useAuth } from "../../../../context/AuthContext";
import { Category, Event } from "../../../../types";

type EditableTicketType = {
    type_name: string;
    price: string;
    total_quantity: string;
    remaining_quantity: string;
};

export default function EditEventScreen() {
    const router = useRouter();
    const { id } = useLocalSearchParams<{ id: string }>();
    const { token } = useAuth();

    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [banner, setBanner] = useState<string | null>(null);
    const [selectedImage, setSelectedImage] = useState<ImagePicker.ImagePickerAsset | null>(null);
    const [date, setDate] = useState(new Date());

    const [showDatePicker, setShowDatePicker] = useState(false);
    const [mode, setMode] = useState<"date" | "time">("date");
    const [locationName, setLocationName] = useState("");
    const [coordinates, setCoordinates] = useState({ lat: 10.762622, lng: 106.660172 });
    const [showMap, setShowMap] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [suggestions, setSuggestions] = useState<any[]>([]);

    const [categories, setCategories] = useState<Category[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<string>("");
    const [ticketTypes, setTicketTypes] = useState<EditableTicketType[]>([
        { type_name: "Standard", price: "", total_quantity: "", remaining_quantity: "" },
    ]);

    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const authHeaders = useMemo(() => (token ? { Authorization: `Bearer ${token}` } : {}), [token]);

    useEffect(() => {
        const fetchInitialData = async () => {
            if (!id) return;

            try {
                const [categoriesRes, eventRes] = await Promise.all([
                    axios.get(`${API_URL}/categories`),
                    axios.get(`${API_URL}/events/${id}`),
                ]);

                setCategories(Array.isArray(categoriesRes.data) ? categoriesRes.data : []);

                const event: Event = eventRes.data;
                setTitle(event.title || "");
                setDescription(event.description || "");
                setBanner(event.banner_url || null);
                setDate(event.date_time ? new Date(event.date_time) : new Date());
                setLocationName(event.location?.name || "");
                setCoordinates({
                    lat: event.location?.coordinates?.lat ?? 10.762622,
                    lng: event.location?.coordinates?.lng ?? 106.660172,
                });
                setSelectedCategory(typeof event.category_id === "string" ? event.category_id : event.category_id?._id || "");

                if (Array.isArray(event.ticket_types) && event.ticket_types.length > 0) {
                    setTicketTypes(
                        event.ticket_types.map((ticket) => ({
                            type_name: ticket.type_name,
                            price: String(ticket.price ?? ""),
                            total_quantity: String(ticket.total_quantity ?? ""),
                            remaining_quantity: String(ticket.remaining_quantity ?? ""),
                        }))
                    );
                }
            } catch (error: any) {
                console.error("Failed to load edit event data", error?.response?.data || error);
                Alert.alert("Error", "Could not load event information.");
                router.back();
            } finally {
                setLoading(false);
            }
        };

        fetchInitialData();
    }, [id, router]);

    const pickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [16, 9],
            quality: 0.8,
        });

        if (!result.canceled) {
            setBanner(result.assets[0].uri);
            setSelectedImage(result.assets[0]);
        }
    };

    const addTicketType = () => {
        setTicketTypes([...ticketTypes, { type_name: "", price: "", total_quantity: "", remaining_quantity: "" }]);
    };

    const removeTicketType = (index: number) => {
        if (ticketTypes.length > 1) {
            const newTickets = [...ticketTypes];
            newTickets.splice(index, 1);
            setTicketTypes(newTickets);
        }
    };

    const updateTicketType = (index: number, field: keyof EditableTicketType, value: string) => {
        const newTickets = [...ticketTypes];
        newTickets[index][field] = value;
        setTicketTypes(newTickets);
    };

    const handleUpdate = async () => {
        if (!id) return;

        if (!title || !description || !selectedCategory || !locationName || !banner) {
            Alert.alert("Error", "Please fill in all required fields");
            return;
        }

        setIsSubmitting(true);

        try {
            const formattedTickets = ticketTypes.map((t) => {
                const total = parseInt(t.total_quantity, 10) || 0;
                const remaining = parseInt(t.remaining_quantity, 10);

                return {
                    type_name: t.type_name,
                    price: parseInt(t.price, 10) || 0,
                    total_quantity: total,
                    remaining_quantity: Number.isNaN(remaining) ? total : remaining,
                };
            });

            const formData = new FormData();
            formData.append("title", title);
            formData.append("description", description);
            formData.append("date_time", date.toISOString());
            formData.append("location", JSON.stringify({
                name: locationName,
                coordinates,
            }));
            formData.append("category_id", selectedCategory);
            formData.append("ticket_types", JSON.stringify(formattedTickets));
            formData.append("status", "published");

            if (selectedImage) {
                if (Platform.OS === "web") {
                    const response = await fetch(selectedImage.uri);
                    const blob = await response.blob();
                    formData.append("banner", blob, "banner.jpg");
                } else {
                    formData.append("banner", {
                        uri: selectedImage.uri,
                        name: selectedImage.fileName || `banner-${Date.now()}.jpg`,
                        type: selectedImage.mimeType || "image/jpeg",
                    } as any);
                }
            }

            await axios.put(`${API_URL}/events/${id}`, formData, { headers: authHeaders });

            Alert.alert("Success", "Event updated successfully!");
            router.replace(`/(organizer)/events/${id}` as any);
        } catch (error: any) {
            console.error("Update event error", error?.response?.data || error);
            Alert.alert("Error", error?.response?.data?.message || "Failed to update event");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading) {
        return (
            <View className="flex-1 bg-white justify-center items-center">
                <ActivityIndicator size="large" color="#FB96BB" />
            </View>
        );
    }

    return (
        <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            keyboardVerticalOffset={Platform.OS === "ios" ? 60 : 0}
        >
            <ScrollView
                className="flex-1 bg-white"
                contentContainerStyle={{ paddingBottom: 100 }}
                showsVerticalScrollIndicator={false}
            >
                <View className="flex-row items-center px-4 py-4 border-b border-gray-100 mt-8">
                    <TouchableOpacity onPress={() => router.back()} className="mr-4">
                        <ArrowLeft color="#FB96BB" size={24} />
                    </TouchableOpacity>
                    <Text className="text-xl font-bold text-gray-800">Edit Event</Text>
                </View>

                <View className="p-6 space-y-8">
                    <TouchableOpacity
                        onPress={pickImage}
                        className="w-full bg-gray-100 rounded-xl items-center justify-center overflow-hidden border border-gray-200 border-dashed"
                        style={{ aspectRatio: 16 / 9 }}
                    >
                        {banner ? (
                            <Image source={{ uri: banner }} className="w-full h-full" resizeMode="cover" />
                        ) : (
                            <View className="items-center">
                                <Upload color="#FB96BB" size={32} />
                                <Text className="text-gray-500 mt-2">Upload Banner Image (16:9)</Text>
                            </View>
                        )}
                    </TouchableOpacity>

                    <View>
                        <Text className="text-sm font-bold text-gray-700 mb-2">Event Title</Text>
                        <TextInput
                            className="border border-gray-200 rounded-lg px-4 py-3 bg-gray-50 text-gray-800"
                            placeholder="e.g. Summer Music Festival"
                            value={title}
                            onChangeText={setTitle}
                        />
                    </View>

                    <View>
                        <Text className="text-sm font-bold text-gray-700 mb-2">Description</Text>
                        <TextInput
                            className="border border-gray-200 rounded-lg px-4 py-3 bg-gray-50 text-gray-800 h-32"
                            placeholder="Describe your event..."
                            multiline
                            textAlignVertical="top"
                            value={description}
                            onChangeText={setDescription}
                        />
                    </View>

                    <View className="flex-row space-x-4">
                        <View className="flex-1">
                            <Text className="text-sm font-bold text-gray-700 mb-2">Date</Text>
                            <TouchableOpacity
                                onPress={() => {
                                    setMode("date");
                                    setShowDatePicker(true);
                                }}
                                className="flex-row items-center border border-gray-200 rounded-lg px-4 py-3 bg-gray-50"
                            >
                                <Calendar color="#FB96BB" size={20} />
                                <Text className="ml-3 text-gray-700">{date.toLocaleDateString()}</Text>
                            </TouchableOpacity>
                        </View>

                        <View className="flex-1">
                            <Text className="text-sm font-bold text-gray-700 mb-2">Time</Text>
                            <TouchableOpacity
                                onPress={() => {
                                    setMode("time");
                                    setShowDatePicker(true);
                                }}
                                className="flex-row items-center border border-gray-200 rounded-lg px-4 py-3 bg-gray-50"
                            >
                                <Clock color="#FB96BB" size={20} />
                                <Text className="ml-3 text-gray-700">
                                    {date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {showDatePicker && (
                        <View>
                            {Platform.OS === "ios" ? (
                                <View className="bg-gray-50 rounded-xl mt-2 border border-gray-200 overflow-hidden">
                                    <View className="flex-row justify-end bg-gray-100 px-4 py-2 border-b border-gray-200">
                                        <TouchableOpacity
                                            onPress={() => setShowDatePicker(false)}
                                            className="bg-white px-4 py-1 rounded border border-gray-300"
                                        >
                                            <Text className="text-pastel-blue font-bold text-sm">Done</Text>
                                        </TouchableOpacity>
                                    </View>
                                    <DateTimePicker
                                        value={date}
                                        mode={mode}
                                        is24Hour
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
                                    is24Hour
                                    display="default"
                                    onChange={(event, selectedDate) => {
                                        setShowDatePicker(false);
                                        if (selectedDate) setDate(selectedDate);
                                    }}
                                />
                            )}
                        </View>
                    )}

                    <View className="mt-4">
                        <Text className="text-sm font-bold text-gray-700 mb-2">Location Name</Text>
                        <TextInput
                            className="border border-gray-200 rounded-lg px-4 py-3 bg-gray-50 text-gray-800 mb-2"
                            placeholder="e.g. National Stadium"
                            value={locationName}
                            onChangeText={setLocationName}
                        />

                        <TouchableOpacity
                            onPress={() => setShowMap(true)}
                            className="flex-row items-center justify-center border border-pastel-blue rounded-lg py-3 mt-2"
                        >
                            <MapPin color="#FB96BB" size={20} />
                            <Text className="ml-2 text-pastel-blue font-bold">Select Location on Map</Text>
                        </TouchableOpacity>
                    </View>

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
                                            <Trash2 size={16} color="#FB96BB" />
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
                                <TextInput
                                    placeholder="Remaining quantity"
                                    className="bg-white border border-gray-200 rounded p-2 mt-2"
                                    keyboardType="numeric"
                                    value={ticket.remaining_quantity}
                                    onChangeText={(text) => updateTicketType(index, "remaining_quantity", text)}
                                />
                            </View>
                        ))}
                    </View>

                    <TouchableOpacity
                        className="bg-pastel-blue py-4 rounded-xl items-center shadow-lg mt-4 mb-10"
                        onPress={handleUpdate}
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? <ActivityIndicator color="white" /> : <Text className="text-white font-bold text-lg">Save Changes</Text>}
                    </TouchableOpacity>
                </View>
            </ScrollView>

            <Modal visible={showMap} animationType="slide" onRequestClose={() => setShowMap(false)}>
                <SafeAreaView className="flex-1 bg-white">
                    <View className="p-4 flex-row items-center space-x-2 border-b border-gray-100">
                        <TouchableOpacity onPress={() => setShowMap(false)} className="mr-2">
                            <ArrowLeft color="#FB96BB" size={24} />
                        </TouchableOpacity>
                        <Text className="text-lg font-bold text-gray-800">Select Location</Text>
                    </View>

                    <View className="p-4 z-50">
                        <View className="flex-row space-x-2 relative">
                            <TextInput
                                className="flex-1 border border-gray-200 rounded-lg px-4 py-3 bg-gray-50 text-gray-800"
                                placeholder="Search location..."
                                value={searchQuery}
                                onChangeText={async (text) => {
                                    setSearchQuery(text);
                                    if (text.length > 2) {
                                        try {
                                            const response = await fetch(
                                                `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(text)}`,
                                                {
                                                    headers: {
                                                        "User-Agent": "EventTicketApp/1.0",
                                                    },
                                                }
                                            );
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
                        </View>

                        {suggestions.length > 0 && (
                            <View className="absolute top-14 left-4 right-4 bg-white rounded-lg shadow-xl border border-gray-100 max-h-60 z-50">
                                <FlatList
                                    data={suggestions}
                                    keyExtractor={(item, index) => (item.place_id ? item.place_id.toString() : index.toString())}
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
                        <TouchableOpacity onPress={() => setShowMap(false)} className="bg-pastel-blue py-4 rounded-xl items-center">
                            <Text className="text-white font-bold text-lg">Confirm Location</Text>
                        </TouchableOpacity>
                    </View>
                </SafeAreaView>
            </Modal>
        </KeyboardAvoidingView>
    );
}
