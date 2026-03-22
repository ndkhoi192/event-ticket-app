import { useRouter } from "expo-router";
import { ChevronRight } from "lucide-react-native";
import React, { useEffect, useRef } from "react";
import {
    Alert,
    Animated,
    Easing,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { useAuth } from "../../context/AuthContext";

const COLORS = {
    background: "#FFFFFF",
    surface: "#FAFAFA",
    textPrimary: "#262626",
    textSecondary: "#8C8C8C",
    border: "#F0F0F0",
    accent: "#FB96BB",
};

function ScalePressable({
    onPress,
    children,
    style,
}: {
    onPress: () => void;
    children: React.ReactNode;
    style?: any;
}) {
    const scale = useRef(new Animated.Value(1)).current;

    const onPressIn = () => {
        Animated.spring(scale, {
            toValue: 0.97,
            useNativeDriver: true,
            speed: 30,
            bounciness: 6,
        }).start();
    };

    const onPressOut = () => {
        Animated.spring(scale, {
            toValue: 1,
            useNativeDriver: true,
            speed: 25,
            bounciness: 8,
        }).start();
    };

    return (
        <Animated.View style={[{ transform: [{ scale }] }, style]}>
            <TouchableOpacity activeOpacity={1} onPressIn={onPressIn} onPressOut={onPressOut} onPress={onPress}>
                {children}
            </TouchableOpacity>
        </Animated.View>
    );
}

export default function ProfileScreen() {
    const { user, logout } = useAuth();
    const router = useRouter();

    const headerAnim = useRef(new Animated.Value(0)).current;
    const settingsAnim = useRef(new Animated.Value(0)).current;
    const supportAnim = useRef(new Animated.Value(0)).current;
    const logoutAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const animateIn = (value: Animated.Value, delay: number) =>
            Animated.timing(value, {
                toValue: 1,
                duration: 360,
                delay,
                easing: Easing.out(Easing.cubic),
                useNativeDriver: true,
            });

        Animated.parallel([
            animateIn(headerAnim, 0),
            animateIn(settingsAnim, 100),
            animateIn(supportAnim, 180),
            animateIn(logoutAnim, 260),
        ]).start();
    }, [headerAnim, settingsAnim, supportAnim, logoutAnim]);

    const enterStyle = (value: Animated.Value) => ({
        opacity: value,
        transform: [
            {
                translateY: value.interpolate({
                    inputRange: [0, 1],
                    outputRange: [14, 0],
                }),
            },
        ],
    });

    const openPlaceholder = (title: string) => {
        Alert.alert(title, "This section is coming soon.");
    };

    const onLogout = async () => {
        await logout();
        router.replace("/(auth)/login");
    };

    const renderMenuItem = (label: string, onPress: () => void, isLast = false) => (
        <ScalePressable key={label} onPress={onPress}>
            <View style={[styles.menuItem, !isLast && styles.menuItemDivider]}>
                <View style={styles.menuItemLeft}>
                    <Text style={styles.menuIcon}>◇</Text>
                    <Text style={styles.menuLabel}>{label}</Text>
                </View>
                <ChevronRight size={18} color={COLORS.textSecondary} />
            </View>
        </ScalePressable>
    );

    return (
        <View style={styles.screen}>
            <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
            >
                <Animated.View style={[styles.profileCard, enterStyle(headerAnim)]}>
                    <View style={styles.avatar}>
                        <Text style={styles.avatarText}>
                        {user?.full_name?.charAt(0).toUpperCase() || "A"}
                    </Text>
                    </View>
                    <View style={styles.profileInfo}>
                        <Text style={styles.profileName} numberOfLines={1}>
                            {user?.full_name || "Admin"}
                        </Text>
                        <Text style={styles.profileEmail} numberOfLines={1}>
                            {user?.email}
                        </Text>
                        <Text style={styles.profileRole}>{user?.role || "Admin"}</Text>
                    </View>
                </Animated.View>

                <Animated.View style={enterStyle(settingsAnim)}>
                    <Text style={styles.sectionTitle}>Settings</Text>
                    <View style={styles.sectionCard}>
                        {renderMenuItem("Update Profile", () => openPlaceholder("Update Profile"))}
                        {renderMenuItem("Change Password", () => openPlaceholder("Change Password"))}
                        {renderMenuItem("Admin Dashboard", () => router.push("/(admin)/admin-overview"))}
                        {renderMenuItem("Manage Users", () => router.push("/(admin)/users"))}
                        {renderMenuItem("Manage Categories", () => router.push("/(admin)/categories"), true)}
                    </View>
                </Animated.View>

                <Animated.View style={enterStyle(supportAnim)}>
                    <Text style={styles.sectionTitle}>Support</Text>
                    <View style={styles.sectionCard}>
                        {renderMenuItem("Help Center", () => router.push({ pathname: "/support/help-center", params: { from: "admin-profile" } }))}
                        {renderMenuItem("Terms of Service", () => router.push({ pathname: "/support/terms-of-service", params: { from: "admin-profile" } }))}
                        {renderMenuItem("Privacy Policy", () => router.push({ pathname: "/support/privacy-policy", params: { from: "admin-profile" } }))}
                        {renderMenuItem("About", () => router.push({ pathname: "/support/about", params: { from: "admin-profile" } }), true)}
                    </View>
                </Animated.View>

                <Animated.View style={[styles.logoutWrap, enterStyle(logoutAnim)]}>
                    <ScalePressable onPress={onLogout} style={styles.logoutButtonScaleWrap}>
                        <View style={styles.logoutButton}>
                            <Text style={styles.logoutText}>Log out</Text>
                        </View>
                    </ScalePressable>
                </Animated.View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    scroll: {
        flex: 1,
    },
    content: {
        paddingTop: 16,
        paddingHorizontal: 16,
        paddingBottom: 24,
    },
    profileCard: {
        backgroundColor: "#FFFFFF",
        borderRadius: 16,
        padding: 16,
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 20,
        borderWidth: 1,
        borderColor: COLORS.border,
        shadowColor: "#000",
        shadowOpacity: 0.04,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 4 },
        elevation: 2,
    },
    avatar: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: COLORS.accent,
        alignItems: "center",
        justifyContent: "center",
        marginRight: 14,
    },
    avatarText: {
        color: "#FFFFFF",
        fontSize: 28,
        fontWeight: "700",
    },
    profileInfo: {
        flex: 1,
    },
    profileName: {
        color: COLORS.textPrimary,
        fontSize: 22,
        fontWeight: "700",
    },
    profileEmail: {
        color: COLORS.textSecondary,
        fontSize: 14,
        marginTop: 4,
    },
    profileRole: {
        color: COLORS.textSecondary,
        fontSize: 13,
        marginTop: 4,
        textTransform: "capitalize",
    },
    sectionTitle: {
        color: COLORS.textPrimary,
        fontSize: 22,
        fontWeight: "700",
        marginBottom: 10,
    },
    sectionCard: {
        backgroundColor: COLORS.surface,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: COLORS.border,
        marginBottom: 18,
        overflow: "hidden",
        shadowColor: "#000",
        shadowOpacity: 0.03,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 3 },
        elevation: 1,
    },
    menuItem: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 14,
        paddingVertical: 13,
    },
    menuItemDivider: {
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    menuItemLeft: {
        flexDirection: "row",
        alignItems: "center",
    },
    menuIcon: {
        color: COLORS.textSecondary,
        fontSize: 15,
        marginRight: 10,
    },
    menuLabel: {
        color: COLORS.textPrimary,
        fontSize: 15,
        fontWeight: "500",
    },
    logoutWrap: {
        marginTop: 6,
    },
    logoutButtonScaleWrap: {
        borderRadius: 12,
    },
    logoutButton: {
        borderRadius: 12,
        borderWidth: 1.5,
        borderColor: COLORS.accent,
        backgroundColor: "#FFFFFF",
        paddingVertical: 12,
    },
    logoutText: {
        textAlign: "center",
        color: COLORS.accent,
        fontSize: 18,
        fontWeight: "700",
    },
});
