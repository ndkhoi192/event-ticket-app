import React from "react";
import { Text, View } from "react-native";

interface EventMapPickerProps {
    coordinates: { lat: number; lng: number };
    setCoordinates: (coords: { lat: number; lng: number }) => void;
}

export default function EventMapPicker({ coordinates, setCoordinates }: EventMapPickerProps) {
    return (
        <View className="flex-1 items-center justify-center bg-gray-100">
            <Text className="text-gray-500">Map selection is not supported on Web.</Text>
            <Text className="text-gray-400 text-xs mt-1">
                Lat: {coordinates.lat.toFixed(4)}, Lng: {coordinates.lng.toFixed(4)}
            </Text>
        </View>
    );
}
