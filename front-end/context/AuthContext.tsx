import axios from "axios";
import * as SecureStore from "expo-secure-store";
import React, { createContext, useContext, useEffect, useState } from "react";
import { Platform } from "react-native";

const getApiUrl = () => {
    let url = process.env.EXPO_PUBLIC_API_URL || "http://192.168.1.19:3002/api";
    console.log("Initial API URL:", url);

    // Handle localhost on Native platforms
    if (Platform.OS !== "web" && url.includes("localhost")) {
        if (Platform.OS === "android") {
            url = url.replace("localhost", "10.0.2.2");
        } else {
            // For iOS physical device or simulator wanting to hit host
            url = url.replace("localhost", "192.168.1.19");
        }
    }

    console.log("Resolved API URL:", url);
    return url;
};

export const API_URL = getApiUrl();

interface User {
    _id: string;
    full_name: string;
    email: string;
    role: "attendee" | "organizer" | "admin";
    token?: string;
}

interface AuthContextType {
    user: User | null;
    token: string | null;
    isLoading: boolean;
    login: (email: string, password: string) => Promise<User | undefined>;
    register: (
        full_name: string,
        email: string,
        password: string,
        role: "attendee" | "organizer"
    ) => Promise<void>;
    logout: () => Promise<void>;
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

    const login = async (email: string, password: string) => {
        try {
            console.log("Logging in to:", `${API_URL}/auth/login`);
            const response = await axios.post(`${API_URL}/auth/login`, {
                email,
                password,
            });

            const { token, ...userData } = response.data;
            console.log("User data received:", userData);

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
            const response = await axios.post(`${API_URL}/users`, {
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
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};
