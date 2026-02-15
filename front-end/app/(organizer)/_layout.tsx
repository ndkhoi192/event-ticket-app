import { Tabs } from "expo-router";
import { Calendar } from "lucide-react-native";

export default function OrganizerLayout() {
    return (
        <Tabs screenOptions={{ tabBarActiveTintColor: "#FAA0A0", headerShown: false }}>
            <Tabs.Screen
                name="dashboard"
                options={{
                    title: "My Events",
                    tabBarIcon: ({ color }) => <Calendar color={color} />,
                }}
            />
        </Tabs>
    );
}
