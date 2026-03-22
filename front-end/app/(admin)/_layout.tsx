import { Stack } from "expo-router";

export default function AdminLayout() {
    return (
        <Stack>
            <Stack.Screen name="admin-overview" options={{ headerShown: false }} />
            <Stack.Screen name="events" options={{ headerShown: false }} />
            <Stack.Screen name="users" options={{ headerShown: false }} />
            <Stack.Screen name="categories" options={{ headerShown: false }} />
            <Stack.Screen name="edit-profile" options={{ headerShown: false }} />
            <Stack.Screen name="change-password" options={{ headerShown: false }} />
            <Stack.Screen name="profile" options={{ headerShown: false }} />
        </Stack>
    );
}
