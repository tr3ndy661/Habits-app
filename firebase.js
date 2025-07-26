// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.1.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, GoogleAuthProvider, signInWithPopup, updateProfile } from "https://www.gstatic.com/firebasejs/10.1.0/firebase-auth.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.1.0/firebase-storage.js";
import { getFirestore, collection, addDoc, getDocs, query, where, doc, setDoc } from "https://www.gstatic.com/firebasejs/10.1.0/firebase-firestore.js";

// Your web app's Firebase configuration
const firebaseConfig = {
    // Add your Firebase config here after creating the project in Firebase Console
    apiKey: "AIzaSyBIPjZlxSmW7BPEOOf7pazpMuHDNMxc6Oc",
    authDomain: "moodboard-3d1ec.firebaseapp.com",
    projectId: "moodboard-3d1ec",
    storageBucket: "moodboard-3d1ec.firebasestorage.app",
    messagingSenderId: "759042090964",
    appId: "1:759042090964:web:2e79f97ccadcc7e887d841"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services with region and custom domain
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app, "gs://moodboard-3d1ec.firebasestorage.app");

// Configure Storage to use custom domain
storage.maxOperationRetryTime = 10000; // 10 seconds
storage.maxUploadRetryTime = 10000; // 10 seconds
const googleProvider = new GoogleAuthProvider();

// Authentication functions
export const signInWithGoogle = async () => {
    try {
        const result = await signInWithPopup(auth, googleProvider);
        return result.user;
    } catch (error) {
        throw error;
    }
};

export const signInWithEmail = async (email, password) => {
    try {
        const result = await signInWithEmailAndPassword(auth, email, password);
        return result.user;
    } catch (error) {
        throw error;
    }
};

export const signUpWithEmail = async (email, password) => {
    try {
        const result = await createUserWithEmailAndPassword(auth, email, password);
        return result.user;
    } catch (error) {
        throw error;
    }
};

export const signOutUser = () => signOut(auth);

// Firestore functions
export const saveMoodEntry = async (userId, date, moodData) => {
    try {
        console.log('Saving mood entry:', { userId, date, moodData });
        const docRef = doc(db, 'users', userId, 'moods', date);
        await setDoc(docRef, {
            ...moodData,
            timestamp: new Date().toISOString()
        });
        console.log('Successfully saved mood entry');
        return docRef.id;
    } catch (error) {
        console.error('Error in saveMoodEntry:', error);
        throw error;
    }
};

export const getMoodEntries = async (userId) => {
    try {
        const moodsRef = collection(db, 'users', userId, 'moods');
        const querySnapshot = await getDocs(moodsRef);
        const entries = {};
        querySnapshot.forEach((doc) => {
            entries[doc.id] = doc.data();
        });
        return entries;
    } catch (error) {
        throw error;
    }
};

// Export Firebase instances and auth functions
export { 
    auth, 
    db, 
    storage, 
    updateProfile,
    ref,
    uploadBytes,
    getDownloadURL
};
