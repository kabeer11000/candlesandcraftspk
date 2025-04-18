import { map, atom, computed } from 'nanostores';
import { db, auth, currentUser } from '@/lib/firebase'; // Import Firestore, Auth, and user store
import { 
    collection, 
    doc, 
    getDocs, 
    writeBatch, 
    deleteDoc, 
    setDoc, 
    getDoc,
    increment,
    query,
    collectionGroup
} from "firebase/firestore";
import type { Product } from '@/types'; // Import the main Product type

// Define the shape of the item stored *locally* after fetching details
export type CartItem = Product & { quantity: number }; 

// Define the shape of the item stored *in Firestore*
type FirestoreCartItem = {
    quantity: number;
};

// Local store holds the *detailed* cart items
export const cartItems = map<Record<string, CartItem>>({}); 
export const isCartLoading = atom<boolean>(true);
export const cartError = atom<string | null>(null);

let userId: string | null = null;
let unsubscribeAuth: Function | null = null;
let cartInitialized = false;

// Function to initialize the cart and fetch full details
async function initializeCart() {
    if (cartInitialized) return;
    console.log("[cartStore] Attempting to initialize cart...");

    unsubscribeAuth = currentUser.subscribe(async (user) => {
        if (user === undefined) { 
            console.log("[cartStore] Init: User state loading...");
            isCartLoading.set(true);
            return; 
        }
        
        const currentUserId = user?.uid;

        if (currentUserId && currentUserId !== userId) { // User logged in or changed
            userId = currentUserId;
            console.log(`[cartStore] Init: User identified: ${userId}`);
            cartInitialized = true; 
            isCartLoading.set(true);
            cartError.set(null);
            cartItems.set({}); // Clear local detailed cart

            try {
                // 1. Fetch basic cart (product IDs and quantities)
                const cartColRef = collection(db, `carts/${userId}/items`);
                const cartSnapshot = await getDocs(cartColRef);
                
                const productIdsAndQuantities: { id: string; quantity: number }[] = [];
                cartSnapshot.forEach((doc) => {
                    const data = doc.data() as FirestoreCartItem;
                    if (data.quantity > 0) {
                         productIdsAndQuantities.push({ id: doc.id, quantity: data.quantity });
                    } else {
                        // Optional: Clean up items with 0 quantity if they somehow exist
                        console.warn(`[cartStore] Found item with quantity 0, removing: ${doc.id}`);
                        deleteDoc(doc.ref); 
                    }
                });

                if (productIdsAndQuantities.length === 0) {
                    console.log("[cartStore] User cart is empty in Firestore.");
                    cartItems.set({});
                    isCartLoading.set(false);
                    return;
                }

                console.log("[cartStore] Fetched product IDs and quantities:", productIdsAndQuantities);

                // 2. Fetch full product details for these IDs
                const productRefs = productIdsAndQuantities.map(item => doc(db, "products", item.id));
                // Note: Using multiple getDoc calls. For very large carts, consider alternative strategies if needed.
                const productSnapshots = await Promise.all(productRefs.map(ref => getDoc(ref)));

                // 3. Combine data and populate local store
                const loadedItems: Record<string, CartItem> = {};
                productSnapshots.forEach((productDoc, index) => {
                    if (productDoc.exists()) {
                        const productData = productDoc.data() as Product;
                        const cartInfo = productIdsAndQuantities[index];
                        loadedItems[cartInfo.id] = { 
                            ...productData, // Spread all product details
                            id: cartInfo.id, // Ensure ID is consistent
                            slug: productDoc.id, // Use doc ID as slug for consistency
                            quantity: cartInfo.quantity // Add the quantity
                        };
                    } else {
                        console.warn(`[cartStore] Product ${productIdsAndQuantities[index].id} not found in products collection, removing from cart.`);
                        // Product doesn't exist anymore, remove it from the user's cart
                        deleteDoc(doc(db, `carts/${userId}/items/${productIdsAndQuantities[index].id}`)); 
                    }
                });
                
                cartItems.set(loadedItems);
                console.log("[cartStore] Cart loaded with full details:", loadedItems);

            } catch (error) {
                console.error("[cartStore] Error loading cart:", error);
                cartError.set("Failed to load cart details.");
            } finally {
                isCartLoading.set(false);
            }
        } else if (!currentUserId && userId) { // User logged out
            console.log("[cartStore] Init: User logged out.");
            userId = null;
            cartItems.set({}); 
            isCartLoading.set(false);
            cartInitialized = false; 
        } else if (!currentUserId && !userId) {
             console.log("[cartStore] Init: No user session.");
             isCartLoading.set(false); 
        }
    });
}

// Initialize on client load
if (typeof window !== 'undefined') {
    initializeCart();
}

// --- Cart Actions (Refactored) --- 

function ensureUserAuthenticated(actionName: string): string {
    const user = currentUser.get();
    if (!user || !user.uid) {
        const errorMsg = `User not authenticated for ${actionName}.`;
        console.error(errorMsg, "Current state:", user);
        cartError.set("Please log in to modify your cart."); // Set user-facing error
        throw new Error(errorMsg); 
    }
    return user.uid;
}

// Add item or increment quantity
export async function addItemToCart(productId: string) {
    console.log(`[cartStore] addItemToCart called for productId: ${productId}`);
    const currentUserId = ensureUserAuthenticated('addItemToCart');
    isCartLoading.set(true); // Indicate activity
    try {
        const itemRef = doc(db, `carts/${currentUserId}/items/${productId}`);
        const itemSnap = await getDoc(itemRef);

        let newQuantity: number;
        if (itemSnap.exists()) {
            // Increment quantity
            const currentData = itemSnap.data() as FirestoreCartItem;
            newQuantity = currentData.quantity + 1;
            await setDoc(itemRef, { quantity: increment(1) }, { merge: true });
            console.log(`[cartStore] Incremented quantity for ${productId} to ${newQuantity}`);
        } else {
            // Add new item with quantity 1
            newQuantity = 1;
            await setDoc(itemRef, { quantity: 1 });
             console.log(`[cartStore] Added new item ${productId} with quantity 1`);
        }

        // Optimistic Update (or fetch details immediately)
        // Fetch full product details to update local store immediately for better UX
        const productRef = doc(db, "products", productId);
        const productSnap = await getDoc(productRef);
        if (productSnap.exists()) {
             const productData = productSnap.data() as Product;
             const detailedItem: CartItem = {
                 ...productData,
                 id: productId,
                 slug: productId,
                 quantity: newQuantity
             };
             cartItems.setKey(productId, detailedItem); // Update local store with full details
        } else {
             console.error(`[cartStore] Product ${productId} not found after adding to cart!`);
             // Optionally remove from cart again if product disappeared
             await deleteDoc(itemRef);
        }

    } catch (error) {
        console.error("[cartStore] Error adding item:", error);
        cartError.set("Failed to add item.");
        throw error; 
    } finally {
         isCartLoading.set(false);
    }
}

// Remove item completely
export async function removeItemFromCart(productId: string) {
    console.log(`[cartStore] removeItemFromCart called for productId: ${productId}`);
    const currentUserId = ensureUserAuthenticated('removeItemFromCart');
    isCartLoading.set(true);
    try {
        const itemRef = doc(db, `carts/${currentUserId}/items/${productId}`);
        await deleteDoc(itemRef);
        
        // Update local store by removing the key
        const currentLocalItems = cartItems.get();
        delete currentLocalItems[productId];
        cartItems.set(currentLocalItems); 
        console.log(`[cartStore] Item ${productId} removed.`);
    } catch (error) {
        console.error("[cartStore] Error removing item:", error);
        cartError.set("Failed to remove item.");
        throw error;
    } finally {
        isCartLoading.set(false);
    }
}

// Update quantity (handles removal if quantity <= 0)
export async function updateItemQuantity(productId: string, newQuantity: number) {
     console.log(`[cartStore] updateItemQuantity called for ${productId} with quantity ${newQuantity}`);
    if (newQuantity <= 0) {
        return removeItemFromCart(productId); 
    }
    const currentUserId = ensureUserAuthenticated('updateItemQuantity');
    isCartLoading.set(true);
    try {
        const itemRef = doc(db, `carts/${currentUserId}/items/${productId}`);
        await setDoc(itemRef, { quantity: newQuantity }); // Overwrite with new quantity
        
        // Optimistic update or fetch
        const currentLocalItem = cartItems.get()[productId];
        if(currentLocalItem) {
             cartItems.setKey(productId, { ...currentLocalItem, quantity: newQuantity });
             console.log(`[cartStore] Updated quantity for ${productId} to ${newQuantity}.`);
        } else {
            // Item wasn't in local store? Reload maybe?
             console.warn(`[cartStore] Item ${productId} not found in local store during quantity update. Fetching details.`);
             const productRef = doc(db, "products", productId);
             const productSnap = await getDoc(productRef);
             if (productSnap.exists()) {
                 const productData = productSnap.data() as Product;
                 const detailedItem: CartItem = { ...productData, id: productId, slug: productId, quantity: newQuantity };
                 cartItems.setKey(productId, detailedItem);
             } else {
                  console.error(`[cartStore] Product ${productId} not found after updating quantity!`);
                  await deleteDoc(itemRef); // Clean up cart if product vanished
             }
        }
       
    } catch (error) {
        console.error("[cartStore] Error updating quantity:", error);
        cartError.set("Failed to update quantity.");
        throw error;
    } finally {
        isCartLoading.set(false);
    }
}

// Clear entire cart
export async function clearCart() {
     console.log(`[cartStore] clearCart called.`);
    const currentUserId = ensureUserAuthenticated('clearCart');
    isCartLoading.set(true);
    try {
        const cartColRef = collection(db, `carts/${currentUserId}/items`);
        const snapshot = await getDocs(cartColRef);
        if (snapshot.empty) {
             console.log("[cartStore] Cart already empty in Firestore.");
             cartItems.set({});
             isCartLoading.set(false);
             return;
        }
        
        const batch = writeBatch(db);
        snapshot.docs.forEach((doc) => {
            batch.delete(doc.ref);
        });
        await batch.commit();
        cartItems.set({}); // Clear local store
        console.log("[cartStore] Firestore cart cleared.");
    } catch (error) {
        console.error("[cartStore] Error clearing cart:", error);
        cartError.set("Failed to clear cart.");
        throw error;
    } finally {
        isCartLoading.set(false);
    }
}

// --- Computed values (remain the same, operate on local detailed store) ---
export const cartTotal = computed(cartItems, (items) => {
    // Ensure price exists and is a number before calculation
    return Object.values(items).reduce((total, item) => {
        const price = Number(item?.price); // Attempt to convert price
        const quantity = Number(item?.quantity);
        if (!isNaN(price) && price > 0 && !isNaN(quantity) && quantity > 0) {
             return total + price * quantity;
        }
        return total; // Skip item if price or quantity is invalid/zero
    }, 0);
});

export const cartItemCount = computed(cartItems, (items) => {
     return Object.values(items).reduce((total, item) => {
         const quantity = Number(item?.quantity);
         return total + (isNaN(quantity) ? 0 : quantity); // Add quantity, default to 0 if invalid
     }, 0);
});

// Cleanup listener (optional)
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