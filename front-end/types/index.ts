export interface Category {
    _id: string;
    name: string;
    icon_url: string;
    active: boolean;
}

export interface TicketType {
    type_name: string;
    price: number;
    total_quantity: number;
    remaining_quantity: number;
}

export interface AddOn {
    name: string;
    price: number;
}

export interface Location {
    name: string;
    coordinates?: {
        lat: number;
        lng: number;
    };
}

export interface User {
    _id: string;
    full_name: string;
    email: string;
    role: 'attendee' | 'organizer' | 'admin';
    avatar_url?: string;
    saved_events?: string[];
}

export interface Event {
    _id: string;
    organizer_id: string | User;
    category_id: Category | string;
    title: string;
    description: string;
    banner_url: string;
    date_time: string;
    location: Location;
    ticket_types: TicketType[];
    add_ons: AddOn[];
    status: 'draft' | 'published' | 'cancelled' | 'ended';
}

export interface BookingItem {
    type_name: string;
    quantity: number;
    unit_price: number;
}

export interface Booking {
    _id: string;
    user_id: string | User;
    event_id: string | Event;
    items: BookingItem[];
    total_amount: number;
    payment_method: 'payos' | 'cash' | 'free';
    payment_status: 'pending' | 'paid' | 'refunded' | 'cancelled';
    transaction_id?: string;
    orderCode?: number;
    checkout_url?: string;
    confirmed_by?: string;
    confirmed_at?: string;
    cancelled_reason?: string;
    createdAt: string;
    updatedAt: string;
}

export interface TicketItem {
    _id: string;
    booking_id: string;
    event_id: string | Event;
    user_id: string;
    ticket_type: string;
    qr_code_data: string;
    status: 'valid' | 'used' | 'expired';
    check_in_at?: string;
    createdAt: string;
}

