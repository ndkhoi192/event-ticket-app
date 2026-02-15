import { Tabs } from "expo-router";
import { Home, User } from "lucide-react-native";

export default function AttendeeLayout() {
    return (
        <Tabs screenOptions={{ tabBarActiveTintColor: "#A7C7E7", headerShown: false }}>
            <Tabs.Screen
                name="home"
                options={{
                    title: "Home",
                    tabBarIcon: ({ color }) => <Home color={color} />,
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
