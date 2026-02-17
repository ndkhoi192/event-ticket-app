import { Tabs } from "expo-router";
import { Compass, Home, Search, Ticket, User } from "lucide-react-native";
import { View } from "react-native";

export default function AttendeeLayout() {
    return (
        <Tabs
            screenOptions={{
                tabBarActiveTintColor: "#F472B6", // pastel-pink
                tabBarInactiveTintColor: "#9CA3AF",
                tabBarStyle: {
                    borderTopWidth: 0,
                    elevation: 0,
                    height: 60,
                    paddingBottom: 10,
                },
                headerShown: false,
                tabBarShowLabel: true,
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

            {/* Center Button Placeholder - could be a modal trip or something */}
            <Tabs.Screen
                name="center"
                options={{
                    title: "",
                    tabBarIcon: () => (
                        <View className="bg-pastel-pink h-14 w-14 rounded-full items-center justify-center -mt-8 shadow-lg">
                            <Search color="white" size={28} />
                        </View>
                    ),
                    href: "/(attendee)/discover", // Redirect to discover for now
                }}
            />

            <Tabs.Screen
                name="tickets"
                options={{
                    title: "My Tickets",
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
        </Tabs>
    );
}
