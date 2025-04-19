import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, signInAnonymously, onAuthStateChanged, type User } from "firebase/auth";
import { atom } from 'nanostores';
// Import analytics only if needed and configured properly
import { getAnalytics } from "firebase/analytics";

// Your web app's Firebase configuration (USE ENVIRONMENT VARIABLES IN PRODUCTION)
const firebaseConfig = {
    apiKey: "AIzaSyC-OUL0zkKH0R8VOjIijWAG8FW898teR3E",
    authDomain: "candlesandcraftspk.firebaseapp.com",
    projectId: "candlesandcraftspk",
    storageBucket: "candlesandcraftspk.firebasestorage.app",
    messagingSenderId: "262541020595",
    appId: "1:262541020595:web:f033e0f21f1fb99e568fc6",
    measurementId: "G-FX02EFJ44T"
};
// Initialize Firebase
// Prevent re-initialization in HMR environments
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);
const auth = getAuth(app);

// Store for current user state
export const currentUser = atom<User | null | undefined>(undefined); // undefined = loading, null = signed out

// Function to ensure user is signed in (anonymously)
let authInitialized = false;
async function ensureAuthInitialized() {
    if (authInitialized) return;
    authInitialized = true;
    console.log("Initializing Auth Listener...");

    onAuthStateChanged(auth, (user) => {
        if (user) {
            // User is signed in.
            console.log("User signed in:", user.uid);
            currentUser.set(user);
        } else {
            // User is signed out, try to sign in anonymously.
            console.log("User signed out, attempting anonymous sign-in...");
            currentUser.set(null);
            signInAnonymously(auth).catch((error) => {
                console.error("Anonymous sign-in error:", error);
                // Handle error appropriately, maybe show a message to the user
            });
        }
    });
}

// Call this early in your client-side setup (e.g., BaseLayout or a main script)
if (typeof window !== 'undefined') {
    ensureAuthInitialized();
}

// Initialize Analytics if needed (optional)
let analytics;
if (typeof window !== 'undefined') { // Ensure it runs only on client
  analytics = getAnalytics(app);
}

export { db, auth, app, ensureAuthInitialized }; 