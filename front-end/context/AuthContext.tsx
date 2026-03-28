import axios from "axios";
import Constants from "expo-constants";
import * as SecureStore from "expo-secure-store";
import React, { createContext, useContext, useEffect, useState } from "react";
import { Platform } from "react-native";

const getApiUrl = () => {
    let url = process.env.EXPO_PUBLIC_API_URL || "https://event-ticket-app-y706.onrender.com/api";

    // Handle localhost on Native platforms without hard-coding a LAN IP.
    if (Platform.OS !== "web" && /(localhost|127\.0\.0\.1)/.test(url)) {
        const hostUri =
            (Constants as any)?.expoConfig?.hostUri ||
            (Constants as any)?.manifest2?.extra?.expoClient?.hostUri ||
            (Constants as any)?.manifest?.debuggerHost;
        const devHost = typeof hostUri === "string" ? hostUri.split(":")[0] : null;

        if (devHost && devHost !== "localhost" && devHost !== "127.0.0.1") {
            url = url.replace(/localhost|127\.0\.0\.1/g, devHost);
        } else if (Platform.OS === "android") {
            // Android emulator can reach host machine via 10.0.2.2.
            url = url.replace(/localhost|127\.0\.0\.1/g, "10.0.2.2");
        }
    }

    url = url.replace(/\/+$/, "");
    return url;
};

export const API_URL = getApiUrl();

interface User {
    _id: string;
    full_name: string;
    email: string;
    role: "attendee" | "organizer" | "admin";
    avatar_url?: string;
    token?: string;
    saved_events?: string[];
}

interface AuthContextType {
    user: User | null;
    token: string | null;
    isLoading: boolean;
    login: (email: string, password: string) => Promise<User>;
    register: (
        full_name: string,
        email: string,
        password: string,
        role: "attendee" | "organizer"
    ) => Promise<void>;
    logout: () => Promise<void>;
    refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
};

// Helper for storage
const setStorageItem = async (key: string, value: string) => {
    if (Platform.OS === "web") {
        try {
            if (typeof localStorage !== "undefined") {
                localStorage.setItem(key, value);
            }
        } catch (e) {
            console.error("Local storage is unavailable:", e);
        }
    } else {
        await SecureStore.setItemAsync(key, value);
    }
};

const getStorageItem = async (key: string) => {
    if (Platform.OS === "web") {
        try {
            if (typeof localStorage !== "undefined") {
                return localStorage.getItem(key);
            }
        } catch (e) {
            console.error("Local storage is unavailable:", e);
        }
        return null;
    } else {
        return await SecureStore.getItemAsync(key);
    }
};

const deleteStorageItem = async (key: string) => {
    if (Platform.OS === "web") {
        try {
            if (typeof localStorage !== "undefined") {
                localStorage.removeItem(key);
            }
        } catch (e) {
            console.error("Local storage is unavailable:", e);
        }
    } else {
        await SecureStore.deleteItemAsync(key);
    }
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const loadUser = async () => {
            try {
                const storedToken = await getStorageItem("token");
                if (storedToken) {
                    setToken(storedToken);
                    axios.defaults.headers.common["Authorization"] = `Bearer ${storedToken}`;
                    const response = await axios.get(`${API_URL}/users/me`);
                    setUser(response.data);
                }
            } catch (error) {
                console.error("Failed to load user", error);
                await logout();
            } finally {
                setIsLoading(false);
            }
        };

        loadUser();
    }, []);

    const refreshUser = async () => {
        try {
            const storedToken = await getStorageItem("token");
            if (storedToken) {
                const response = await axios.get(`${API_URL}/users/me`);
                setUser(response.data);
            }
        } catch (error) {
            console.error("Failed to refresh user", error);
        }
    };

    const login = async (email: string, password: string) => {
        try {
            const response = await axios.post(`${API_URL}/auth/login`, {
                email,
                password,
            });

            const { token, ...userData } = response.data;

            setToken(token);
            setUser(userData);

            await setStorageItem("token", token);
            axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;

            return userData;
        } catch (error) {
            console.error("Login failed", error);
            throw error;
        }
    };

    const register = async (
        full_name: string,
        email: string,
        password: string,
        role: "attendee" | "organizer"
    ) => {
        try {
            const response = await axios.post(`${API_URL}/auth/register`, {
                full_name,
                email,
                password,
                role,
            });

            const { token, ...userData } = response.data;

            setToken(token);
            setUser(userData);

            await setStorageItem("token", token);
            axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
        } catch (error) {
            console.error("Registration failed", error);
            throw error;
        }
    };

    const logout = async () => {
        await deleteStorageItem("token");
        setToken(null);
        setUser(null);
        delete axios.defaults.headers.common["Authorization"];
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                token,
                isLoading,
                login,
                register,
                logout,
                refreshUser,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};
