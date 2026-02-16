import React from "react";
import MapView, { Marker } from "react-native-maps";

interface EventMapPickerProps {
    coordinates: { lat: number; lng: number };
    setCoordinates: (coords: { lat: number; lng: number }) => void;
}

export default function EventMapPicker({ coordinates, setCoordinates }: EventMapPickerProps) {
    return (
        <MapView
            style={{ flex: 1 }}
            region={{
                latitude: coordinates.lat,
                longitude: coordinates.lng,
                latitudeDelta: 0.05,
                longitudeDelta: 0.05,
            }}
            onPress={(e) => setCoordinates({
                lat: e.nativeEvent.coordinate.latitude,
                lng: e.nativeEvent.coordinate.longitude
            })}
        >
            <Marker coordinate={{ latitude: coordinates.lat, longitude: coordinates.lng }} />
        </MapView>
    );
}
