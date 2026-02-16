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

export interface Event {
    _id: string;
    organizer_id: string;
    category_id: Category | string;
    title: string;
    description: string;
    banner_url: string;
    date_time: string;
    location: Location;
    ticket_types: TicketType[];
    add_ons: AddOn[];
    status: 'draft' | 'published' | 'cancelled';
}
