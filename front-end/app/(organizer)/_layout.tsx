import { Tabs } from "expo-router";
import { Calendar, User } from "lucide-react-native";

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
            <Tabs.Screen
                name="profile"
                options={{
                    title: "Profile",
                    tabBarIcon: ({ color }) => <User color={color} />,
                }}
            />
        </Tabs>
    );
}
