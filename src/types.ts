export interface ProductDetails {
    inspiration?: string;
    history?: string;
    materials?: string;
    features?: string;
    dimensions?: string;
}

export interface Product {
    id: string; // Often same as slug if slug is unique ID
    name: string;
    slug: string;
    price: number;
    description: string;
    category: string;
    imageUrl: string;
    imageGallery: string[]; 
    details: ProductDetails;
    isLimited: boolean;
}

// Matches the structure saved in checkout.astro
export interface ShippingDetails {
    name: string;
    address: string;
    city: string;
    postalCode: string;
    country: string; // Should be "Pakistan"
    phone: string;
}

export interface OrderItem {
    id: string;
    name: string;
    image: string;
    price: number;
    quantity: number;
    slug: string;
}

export interface Order {
    userId: string;
    items: Record<string, OrderItem>; // Map of product IDs to OrderItem
    subtotal: number;
    shippingCost: number;
    total: number;
    shipping: ShippingDetails;
    status: string; // e.g., "Pending", "Shipped", "Delivered", "Cancelled"
    paymentMethod: string; // e.g., "Cash on Delivery"
    createdAt: import("firebase/firestore").Timestamp; // Use Firestore Timestamp type
    // Add other fields if needed (e.g., trackingNumber)
} 