// populateFirestoreClient.js
import { initializeApp } from "firebase/app";
import { getFirestore, collection, doc, writeBatch } from "firebase/firestore";
import { getAuth, signInAnonymously, onAuthStateChanged } from "firebase/auth";
import fs from "fs";
import path from "path";

// --- Configuration ---
// Path to your product data
const productsDataPath = path.join(__dirname, "../src/data/products.json");
// Your web app's Firebase configuration (copied from your frontend setup)
const firebaseConfig = {
  apiKey: "AIzaSyBkUZ2ZU3AIbjkLQrlr5581XcWcnit4U40", // Use env vars ideally
  authDomain: "naksh-2dc98.firebaseapp.com",
  projectId: "naksh-2dc98",
  storageBucket: "naksh-2dc98.appspot.com",
  messagingSenderId: "609446156995",
  appId: "1:609446156995:web:e5a5a920f91eda9c9c2076",
  measurementId: "G-XTVJV0FVP2"
};
// --- End Configuration ---

async function populate() {
    try {
        // Initialize Firebase Client SDK
        const app = initializeApp(firebaseConfig);
        const db = getFirestore(app);
        const auth = getAuth(app);
        console.log("Firebase Client SDK Initialized.");

        // 1. Sign In Anonymously
        console.log("Signing in anonymously...");
        await signInAnonymously(auth);
        
        // Wait for auth state to confirm sign-in (optional but safer)
        await new Promise((resolve, reject) => {
            const unsubscribe = onAuthStateChanged(auth, (user) => {
                if (user) {
                    console.log("Signed in anonymously with UID:", user.uid);
                    unsubscribe(); // Stop listening
                    resolve(user);
                } else {
                    // This shouldn't happen immediately after successful sign-in
                     console.log("Waiting for user...");
                }
            }, (error) => {
                 console.error("Auth state error:", error);
                 unsubscribe();
                 reject(error);
            });
        });


        // 2. Read product data
        console.log(`Reading product data from: ${productsDataPath}`);
        const productsRaw = fs.readFileSync(productsDataPath);
        const products = JSON.parse(productsRaw);
        console.log(`Found ${products.length} products.`);

        if (!Array.isArray(products) || products.length === 0) {
            throw new Error("Product data is empty or not an array.");
        }

        // 3. Populate Products using Batch Write
        console.log("\nPopulating 'products' collection (Client SDK)...");
        const productsCollection = collection(db, "products");
        let count = 0;
        const batch = writeBatch(db);

        for (const product of products) {
            if (!product.slug) {
                console.warn(`Skipping product due to missing slug: ${product.name || 'N/A'}`);
                continue;
            }
            // Use slug as document ID
            const productRef = doc(productsCollection, product.slug);
            console.log(`Preparing product: ${product.slug}`);
            batch.set(productRef, product);
            count++;
        }

        console.log(`Committing batch for ${count} products...`);
        await batch.commit();
        console.log(`Successfully populated ${count} products using client SDK.`);
        console.log("\nIMPORTANT: Remember to revert your Firestore security rules for the 'products' collection!");

    } catch (error) {
        console.error("\nError during client-side population:", error);
        process.exit(1); // Indicate failure
    }
}

// Run the population function
populate()
 .then(() => process.exit(0)) // Indicate success
 .catch(() => process.exit(1)); // Ensure exit on error catch too