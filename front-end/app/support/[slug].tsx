import { useLocalSearchParams, useRouter } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import React from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";

type SupportKey = "help-center" | "terms-of-service" | "privacy-policy" | "about";

type SupportSection = {
    heading: string;
    body: string;
};

type SupportArticle = {
    title: string;
    subtitle: string;
    sections: SupportSection[];
};

const SUPPORT_CONTENT: Record<SupportKey, SupportArticle> = {
    "help-center": {
        title: "Help Center",
        subtitle: "Find detailed guidance, troubleshooting steps, and support channels.",
        sections: [
            {
                heading: "Booking issues",
                body: "If your booking does not appear in My Tickets, first pull to refresh and wait a few seconds for synchronization. Then open your booking history and confirm the payment status is marked as completed. In some cases, bank confirmation can take 5-10 minutes depending on network traffic. If the ticket still does not show, log out and log back in using the same account used during checkout. You can also search by event date and order ID to verify whether the ticket was issued successfully.",
            },
            {
                heading: "Payment support",
                body: "For QR payment issues, verify your internet connection is stable and make sure your banking app session has not expired. Return to booking details and tap payment confirmation again instead of creating a new order immediately. If your account was charged but status remains pending, keep the payment receipt and transaction code for support review. We recommend waiting up to 15 minutes before retrying to avoid duplicate charges. If a duplicate payment occurs, contact support with both transaction references so we can assist with verification and refund processing.",
            },
            {
                heading: "Contact us",
                body: "Email: support@eventticket.app\nHotline: +84 1900 xxxx\nWorking hours: 08:30 - 18:00 (Mon - Sat)\n\nWhen contacting us, please include your account email, event name, booking ID, payment timestamp, and screenshots of any error messages. Providing complete details helps us investigate faster and reduce back-and-forth requests. For urgent check-in issues on event day, hotline support is recommended for priority handling.",
            },
        ],
    },
    "terms-of-service": {
        title: "Terms of Service",
        subtitle: "Detailed rules and responsibilities when using the Event Ticket platform.",
        sections: [
            {
                heading: "Account responsibility",
                body: "You are responsible for maintaining account security, protecting your password, and ensuring your login information is not shared with unauthorized parties. All activities under your account, including bookings and profile changes, are considered valid unless reported otherwise. If you suspect unauthorized access, you must immediately change your password and notify support. We may temporarily restrict certain actions to protect your account while verification is in progress.",
            },
            {
                heading: "Ticket usage",
                body: "Tickets are valid only for the event, date, venue, and time stated in the ticket details. Each ticket is intended for lawful attendance and may be rejected if altered, duplicated, or used outside organizer rules. Unauthorized resale, commercial redistribution, or fraudulent use is prohibited. Organizers may require identity verification at check-in to ensure ticket authenticity and compliance with event policies.",
            },
            {
                heading: "Refund and cancellation",
                body: "Refund eligibility depends on the organizer's policy, ticket type, and payment status at the time of request. Some promotional or limited tickets may be non-refundable unless the event is cancelled or materially changed. If an event is cancelled, affected attendees are generally eligible for a refund in accordance with platform policy and processing timelines. Refund processing time may vary by payment provider and can take several business days after approval.",
            },
        ],
    },
    "privacy-policy": {
        title: "Privacy Policy",
        subtitle: "How we collect, use, store, and protect your personal data.",
        sections: [
            {
                heading: "Collected data",
                body: "We collect account information such as name, email, and phone number, as well as booking details including event history, ticket status, and transaction references. We also collect essential device and session data, such as login timestamps and app interaction logs, to maintain service reliability and security. Data collection is limited to what is necessary for account management, payment verification, and support operations.",
            },
            {
                heading: "How data is used",
                body: "Your data is used for authentication, ticket processing, booking confirmation, and delivery of event notifications. We also use data to detect suspicious activity, prevent fraud, and improve product performance through aggregated analytics. Where required, certain information may be shared with event organizers or trusted service providers for operational purposes, under appropriate data protection controls.",
            },
            {
                heading: "Data protection",
                body: "We apply security controls such as access restrictions, secure transmission practices, and role-based permissions for internal systems. Sensitive operations require authenticated requests and may include additional verification in high-risk scenarios. We periodically review our security processes and monitor for unusual activity to reduce the risk of unauthorized access. Although no system is completely risk-free, we continuously improve safeguards to better protect user data.",
            },
        ],
    },
    about: {
        title: "About",
        subtitle: "Overview of Event Ticket App, our goals, and core technology.",
        sections: [
            {
                heading: "Our mission",
                body: "Event Ticket App helps attendees discover relevant events, compare options, and complete booking quickly with a smooth mobile experience. At the same time, it enables organizers to create events, manage ticket inventory, and monitor participant activity in one platform. Our mission is to simplify the end-to-end event journey, from discovery and booking to check-in and post-event engagement.",
            },
            {
                heading: "Platform version",
                body: "Version: 1.0.0\nRelease channel: Production\n\nThis release includes core attendee booking, organizer event management, and QR-based check-in flows. Upcoming updates may include richer analytics, personalization improvements, and expanded support utilities.",
            },
            {
                heading: "Built with",
                body: "Built with Expo Router and React Native on the client side, with a Node.js backend and MongoDB data storage. The platform uses modular APIs for authentication, event lifecycle management, booking workflows, and notifications. This architecture supports scalable feature development while keeping cross-platform performance and maintainability in focus.",
            },
        ],
    },
};

export default function SupportArticleScreen() {
    const router = useRouter();
    const { slug, from } = useLocalSearchParams<{ slug?: string | string[]; from?: string | string[] }>();
    const slugValue = Array.isArray(slug) ? slug[0] : slug;
    const fromValue = Array.isArray(from) ? from[0] : from;

    const article = slugValue && slugValue in SUPPORT_CONTENT
        ? SUPPORT_CONTENT[slugValue as SupportKey]
        : null;

    const handleBack = () => {
        if (fromValue === "attendee-profile") {
            router.replace("/(attendee)/profile");
            return;
        }

        if (fromValue === "organizer-profile") {
            router.replace("/(organizer)/profile");
            return;
        }

        if (fromValue === "admin-profile") {
            router.replace("/(admin)/profile");
            return;
        }

        router.back();
    };

    return (
        <View className="flex-1 bg-gray-50">
            <View className="pt-14 pb-5 px-6 bg-white border-b border-gray-100 flex-row items-center">
                <TouchableOpacity onPress={handleBack} className="mr-3 p-1.5 rounded-full bg-pink-50">
                    <ArrowLeft size={20} color="#FB96BB" />
                </TouchableOpacity>
                <View className="flex-1">
                    <Text className="text-xl font-bold text-gray-900">{article?.title || "Support"}</Text>
                    <Text className="text-xs text-gray-500 mt-0.5">{article?.subtitle || "Content not found."}</Text>
                </View>
            </View>

            <ScrollView className="flex-1 px-6 pt-5" showsVerticalScrollIndicator={false}>
                {!article ? (
                    <View className="bg-white border border-gray-100 rounded-2xl p-4">
                        <Text className="text-gray-600">This content is not available.</Text>
                    </View>
                ) : (
                    article.sections.map((section) => (
                        <View key={section.heading} className="bg-white border border-gray-100 rounded-2xl p-4 mb-4">
                            <Text className="text-base font-bold text-gray-900 mb-2">{section.heading}</Text>
                            <Text className="text-sm text-gray-600 leading-6">{section.body}</Text>
                        </View>
                    ))
                )}

                <View className="h-8" />
            </ScrollView>
        </View>
    );
}
