import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, signInAnonymously, onAuthStateChanged, type User } from "firebase/auth";
import { atom } from 'nanostores';
// Import analytics only if needed and configured properly
// import { getAnalytics } from "firebase/analytics";

// Your web app's Firebase configuration (USE ENVIRONMENT VARIABLES IN PRODUCTION)
const firebaseConfig = {
  apiKey: "AIzaSyBkUZ2ZU3AIbjkLQrlr5581XcWcnit4U40", // WARNING: Exposing API keys client-side is normal, but manage carefully. Use env vars.
  authDomain: "naksh-2dc98.firebaseapp.com",
  projectId: "naksh-2dc98",
  storageBucket: "naksh-2dc98.appspot.com", // Corrected storage bucket domain
  messagingSenderId: "609446156995",
  appId: "1:609446156995:web:e5a5a920f91eda9c9c2076",
  measurementId: "G-XTVJV0FVP2"
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
// let analytics;
// if (typeof window !== 'undefined') { // Ensure it runs only on client
//   analytics = getAnalytics(app);
// }

export { db, auth, app, ensureAuthInitialized }; 