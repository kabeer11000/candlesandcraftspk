import { map, atom, computed } from 'nanostores';
import { db, auth, currentUser } from '@/lib/firebase'; // Import Firestore, Auth, and user store
import { 
    collection, 
    doc, 
    getDocs, 
    writeBatch, 
    serverTimestamp, 
    deleteDoc, 
    setDoc, 
    getDoc,
    increment
} from "firebase/firestore";

export type CartItem = {
    id: string; // Product ID
    name: string;
    image: string;
    price: number;
    quantity: number;
    slug: string;
};

// The local representation of the cart
export const cartItems = map<Record<string, CartItem>>({});
export const isCartLoading = atom<boolean>(true);
export const cartError = atom<string | null>(null);

let userId: string | null = null;
let unsubscribeAuth: Function | null = null;
let cartInitialized = false;

// Function to initialize the cart (fetch from Firestore)
async function initializeCart() {
    if (cartInitialized) return;
    console.log("Attempting to initialize cart...");

    // Subscribe to auth changes
    unsubscribeAuth = currentUser.subscribe(async (user) => {
        if (user === undefined) { 
            console.log("Cart init: User state loading...");
            isCartLoading.set(true);
            return; // Still loading
        }
        if (user && user.uid !== userId) { // User logged in or changed
            userId = user.uid;
            console.log("Cart init: User identified", userId);
            cartInitialized = true; // Mark as initialized once we have a user
            isCartLoading.set(true);
            cartError.set(null);
            cartItems.set({}); // Clear local cart before loading
            try {
                const cartColRef = collection(db, `carts/${userId}/items`);
                const snapshot = await getDocs(cartColRef);
                const loadedItems: Record<string, CartItem> = {};
                snapshot.forEach((doc) => {
                    loadedItems[doc.id] = doc.data() as CartItem;
                });
                cartItems.set(loadedItems);
                console.log("Cart loaded from Firestore:", loadedItems);
            } catch (error) {
                console.error("Error loading cart from Firestore:", error);
                cartError.set("Failed to load cart.");
            } finally {
                isCartLoading.set(false);
            }
        } else if (!user && userId) { // User logged out
            console.log("Cart init: User logged out.");
            userId = null;
            cartItems.set({}); // Clear cart on logout
            isCartLoading.set(false);
            cartInitialized = false; // Allow re-initialization if they log back in
        } else if (!user && !userId) {
             console.log("Cart init: No user yet.");
             isCartLoading.set(false); // Not loading if no user
        }
    });
}

// Call initializeCart when this module is loaded on the client
if (typeof window !== 'undefined') {
    initializeCart();
}

// --- Cart Actions --- 

// Helper to check auth state before action
function ensureUserAuthenticated(actionName: string): string {
    const user = currentUser.get(); // Check the latest user state synchronously
    if (!user || !user.uid) {
        console.error(`User not authenticated for ${actionName}. Current state:`, user);
        throw new Error("Authentication required."); 
    }
    return user.uid;
}

// Helper to get cart item ref (now uses ensureUserAuthenticated)
const getCartItemRef = (productId: string) => {
    const currentUserId = ensureUserAuthenticated('getCartItemRef');
    return doc(db, `carts/${currentUserId}/items/${productId}`);
}

// Add item to cart (Firestore)
export async function addItemToCart(item: Omit<CartItem, 'quantity'>) {
    const currentUserId = ensureUserAuthenticated('addItemToCart'); // Check first
    isCartLoading.set(true);
    try {
        const itemRef = doc(db, `carts/${currentUserId}/items/${item.id}`); // Use checked ID
        const itemSnap = await getDoc(itemRef);

        if (itemSnap.exists()) {
            // Item exists, increment quantity
            await setDoc(itemRef, { quantity: increment(1) }, { merge: true });
            // Update local store optimistically or after success?
            // For simplicity, we let the Firestore listener update the store eventually,
            // but a better UX might involve optimistic updates.
            const currentLocalItem = cartItems.get()[item.id];
             cartItems.setKey(item.id, {
                 ...currentLocalItem, // Keep existing data
                 quantity: currentLocalItem.quantity + 1,
             });

        } else {
            // Item doesn't exist, add it with quantity 1
            const newItemData: CartItem = { ...item, quantity: 1 };
            await setDoc(itemRef, newItemData);
            cartItems.setKey(item.id, newItemData); // Update local store
        }
        console.log("Item added/updated in Firestore cart");
    } catch (error) {
        console.error("Error adding item to Firestore cart:", error);
        cartError.set("Failed to add item.");
        // Optionally revert optimistic update here
        throw error; // Re-throw to allow UI to handle
    } finally {
         isCartLoading.set(false);
    }
}

// Remove item from cart (Firestore)
export async function removeItemFromCart(productId: string) {
    const currentUserId = ensureUserAuthenticated('removeItemFromCart'); // Check first
    isCartLoading.set(true);
    try {
        const itemRef = doc(db, `carts/${currentUserId}/items/${productId}`); // Use checked ID
        await deleteDoc(itemRef);
        // Update local store
        const currentItems = cartItems.get();
        delete currentItems[productId];
        cartItems.set(currentItems);
        console.log("Item removed from Firestore cart");
    } catch (error) {
        console.error("Error removing item from Firestore cart:", error);
        cartError.set("Failed to remove item.");
        throw error;
    } finally {
        isCartLoading.set(false);
    }
}

// Update item quantity (Firestore)
export async function updateItemQuantity(productId: string, newQuantity: number) {
    const currentUserId = ensureUserAuthenticated('updateItemQuantity'); // Check first
    if (newQuantity <= 0) {
        return removeItemFromCart(productId); // This already checks auth
    }
    isCartLoading.set(true);
    try {
        const itemRef = doc(db, `carts/${currentUserId}/items/${productId}`); // Use checked ID
        await setDoc(itemRef, { quantity: newQuantity }, { merge: true });
         // Update local store
        cartItems.setKey(productId, { ...cartItems.get()[productId], quantity: newQuantity });
        console.log("Item quantity updated in Firestore cart");
    } catch (error) {
        console.error("Error updating item quantity:", error);
        cartError.set("Failed to update quantity.");
        throw error;
    } finally {
        isCartLoading.set(false);
    }
}

// Clear entire cart (Firestore)
export async function clearCart() {
    const currentUserId = ensureUserAuthenticated('clearCart'); // Check first
    console.log(`Clearing cart for user: ${currentUserId}`);
    isCartLoading.set(true);
    try {
        const cartColRef = collection(db, `carts/${currentUserId}/items`); // Use checked ID
        const snapshot = await getDocs(cartColRef);
        if (snapshot.empty) {
             console.log("Cart already empty.");
             cartItems.set({});
             return;
        }
        
        const batch = writeBatch(db);
        snapshot.docs.forEach((doc) => {
            batch.delete(doc.ref);
        });
        await batch.commit();
        cartItems.set({}); // Clear local store
        console.log("Firestore cart cleared successfully.");
    } catch (error) {
        console.error("Error clearing Firestore cart:", error);
        cartError.set("Failed to clear cart.");
        throw error;
    } finally {
        isCartLoading.set(false);
    }
}


// Computed values based on the local store
export const cartTotal = computed(cartItems, (items) => {
    return Object.values(items).reduce((total, item) => total + item.price * item.quantity, 0);
});

export const cartItemCount = computed(cartItems, (items) => {
     return Object.values(items).reduce((total, item) => total + item.quantity, 0);
});

// Cleanup listener on module unload (might not work reliably in all HMR scenarios)
/* 
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    if (unsubscribeAuth) {
      unsubscribeAuth();
      console.log("Unsubscribed from auth changes.");
    }
  });
}
*/ 