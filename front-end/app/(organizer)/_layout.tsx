import { Tabs } from "expo-router";
import { Calendar, Ticket, User } from "lucide-react-native";

export default function OrganizerLayout() {
    return (
        <Tabs
            screenOptions={{
                tabBarActiveTintColor: "#FB96BB",
                tabBarInactiveTintColor: "#FB96BB",
                headerShown: false,
                tabBarHideOnKeyboard: true,
                tabBarStyle: {
                    borderTopWidth: 0,
                    elevation: 0,
                    height: 72,
                    paddingTop: 8,
                    paddingBottom: 12,
                    paddingHorizontal: 8,
                    backgroundColor: "#FFFFFF",
                },
                tabBarLabelStyle: {
                    fontSize: 12,
                    fontWeight: "600",
                },
            }}
        >
            <Tabs.Screen
                name="dashboard"
                options={{
                    title: "My Events",
                    tabBarIcon: ({ color }) => <Calendar color={color} />,
                }}
            />
            <Tabs.Screen
                name="vouchers"
                options={{
                    title: "Vouchers",
                    tabBarIcon: ({ color }) => <Ticket color={color} />,
                }}
            />
            <Tabs.Screen
                name="profile"
                options={{
                    title: "Profile",
                    tabBarIcon: ({ color }) => <User color={color} />,
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
            <Tabs.Screen
                name="events/create"
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
                name="events/edit/[id]"
                options={{
                    href: null,
                }}
            />
            <Tabs.Screen
                name="events/live-stats/[id]"
                options={{
                    href: null,
                }}
            />
            <Tabs.Screen
                name="scanner"
                options={{
                    href: null,
                }}
            />
        </Tabs>
    );
}

