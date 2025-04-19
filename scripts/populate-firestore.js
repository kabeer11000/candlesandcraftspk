// populateFirestore.js
const admin = require("firebase-admin");
const fs = require("fs");
const path = require("path");

// --- Configuration ---
// IMPORTANT: Replace with the actual path to your downloaded service account key
const serviceAccountPath = path.join(__dirname, "../credentials/candlesandcraftspk-firebase-adminsdk-fbsvc-73be1d33c9.json"); 
// Path to your product data
const productsDataPath = path.join(__dirname, "../src/data/products.json");
// --- End Configuration ---

try {
    // Initialize Firebase Admin SDK
    const serviceAccount = require(serviceAccountPath);
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        // Optional: Add your database URL if needed, usually inferred
        // databaseURL: "https://<YOUR_PROJECT_ID>.firebaseio.com" 
    });

    const db = admin.firestore();
    console.log("Firebase Admin Initialized.");

    // Read product data
    console.log(`Reading product data from: ${productsDataPath}`);
    const productsRaw = fs.readFileSync(productsDataPath);
    const products = JSON.parse(productsRaw);
    console.log(`Found ${products.length} products.`);

    if (!Array.isArray(products) || products.length === 0) {
        throw new Error("Product data is empty or not an array.");
    }

    // --- Populate Products ---
    const populateProducts = async () => {
        console.log("\nPopulating 'products' collection...");
        const productsCollection = db.collection("products");
        let count = 0;
        
        // Use batch writes for efficiency, though individual sets are fine for small amounts
        const batch = db.batch();

        for (const product of products) {
            // Validate essential fields (optional but good practice)
            if (!product.slug || !product.id || !product.name) {
                console.warn(`Skipping product due to missing slug/id/name: ${JSON.stringify(product)}`);
                continue;
            }
            
            // Use the product slug as the document ID for easy lookup
            const productRef = productsCollection.doc(product.slug);
            console.log(`Preparing product: ${product.slug} (${product.name})`);
            
            // Set the data (overwrites existing doc with the same slug)
            batch.set(productRef, product); 
            count++;
        }
        
        console.log(`Committing batch for ${count} products...`);
        await batch.commit();
        console.log(`Successfully populated ${count} products.`);
    };

    // --- Run Population ---
    populateProducts()
        .then(() => {
            console.log("\nFirestore population completed successfully!");
            process.exit(0);
        })
        .catch((error) => {
            console.error("\nError populating Firestore:", error);
            process.exit(1);
        });

} catch (error) {
    console.error("Script Initialization Error:", error);
    process.exit(1);
}
