import { Stack } from "expo-router";

export default function AdminLayout() {
    return (
        <Stack>
            <Stack.Screen name="admin-overview" options={{ title: "Admin Dashboard" }} />
        </Stack>
    );
}
