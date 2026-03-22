import { Tabs } from "expo-router";
import { Compass, Home, Ticket, User } from "lucide-react-native";

export default function AttendeeLayout() {
    return (
        <Tabs
            screenOptions={{
                tabBarActiveTintColor: "#FB96BB", // pastel-pink
                tabBarInactiveTintColor: "#FB96BB",
                tabBarStyle: {
                    borderTopWidth: 0,
                    elevation: 0,
                    height: 74,
                    paddingTop: 8,
                    paddingBottom: 12,
                    paddingHorizontal: 8,
                    backgroundColor: "#FFFFFF",
                },
                tabBarLabelStyle: {
                    fontSize: 12,
                    fontWeight: "600",
                },
                headerShown: false,
                tabBarShowLabel: true,
                tabBarHideOnKeyboard: true,
            }}
        >
            <Tabs.Screen
                name="home"
                options={{
                    title: "Home",
                    tabBarIcon: ({ color }) => <Home color={color} size={24} />,
                }}
            />
            <Tabs.Screen
                name="discover"
                options={{
                    title: "Discover",
                    tabBarIcon: ({ color }) => <Compass color={color} size={24} />,
                }}
            />

            <Tabs.Screen
                name="tickets"
                options={{
                    title: "Tickets",
                    tabBarIcon: ({ color }) => <Ticket color={color} size={24} />,
                }}
            />
            <Tabs.Screen
                name="profile"
                options={{
                    title: "Profile",
                    tabBarIcon: ({ color }) => <User color={color} size={24} />,
                }}
            />
            {/* Hidden screens - accessible via navigation but not shown in tabs */}
            <Tabs.Screen
                name="book/[id]"
                options={{
                    href: null,
                }}
            />
            <Tabs.Screen
                name="events/[id]"
                options={{
                    href: null,
                }}
            />
            <Tabs.Screen
                name="saved-events"
                options={{
                    href: null,
                }}
            />
            <Tabs.Screen
                name="edit-profile"
                options={{
                    href: null,
                }}
            />
            <Tabs.Screen
                name="change-password"
                options={{
                    href: null,
                }}
            />
        </Tabs>
    );
}

