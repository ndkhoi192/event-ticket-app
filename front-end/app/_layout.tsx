import { Slot } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import * as Font from "expo-font";
import React, { useEffect, useState } from "react";
import { Text, TextInput } from "react-native";
import { Comfortaa_400Regular } from "@expo-google-fonts/comfortaa";
import { Montserrat_400Regular } from "@expo-google-fonts/montserrat";
import { AuthProvider } from "../context/AuthContext";
import "../global.css";

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [isReady, setIsReady] = useState(false);
  const [appFontFamily, setAppFontFamily] = useState<string | undefined>(undefined);

  useEffect(() => {
    let isMounted = true;

    const prepareFonts = async () => {
      try {
        try {
          await Font.loadAsync({ Comfortaa_400Regular });
          if (isMounted) setAppFontFamily("Comfortaa_400Regular");
        } catch {
          await Font.loadAsync({ Montserrat_400Regular });
          if (isMounted) setAppFontFamily("Montserrat_400Regular");
        }
      } catch {
        if (isMounted) setAppFontFamily(undefined);
      } finally {
        if (isMounted) setIsReady(true);
      }
    };

    prepareFonts();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!appFontFamily) return;

    const GlobalText = Text as unknown as { defaultProps?: { style?: unknown } };
    const GlobalTextInput = TextInput as unknown as { defaultProps?: { style?: unknown } };

    GlobalText.defaultProps = GlobalText.defaultProps || {};
    GlobalText.defaultProps.style = [GlobalText.defaultProps.style, { fontFamily: appFontFamily }];

    GlobalTextInput.defaultProps = GlobalTextInput.defaultProps || {};
    GlobalTextInput.defaultProps.style = [GlobalTextInput.defaultProps.style, { fontFamily: appFontFamily }];
  }, [appFontFamily]);

  useEffect(() => {
    if (!isReady) return;
    void SplashScreen.hideAsync();
  }, [isReady]);

  if (!isReady) return null;

  return (
    <AuthProvider>
      <Slot />
      <StatusBar style="auto" />
    </AuthProvider>
  );
}
