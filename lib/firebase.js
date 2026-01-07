import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyAmdF76M8QwwLdUbtNRncJ7Yw816tkBQKw",
  authDomain: "study-buddies-446813.firebaseapp.com",
  projectId: "study-buddies-446813",
  storageBucket: "study-buddies-446813.firebasestorage.app",
  messagingSenderId: "700180410067",
  appId: "1:700180410067:web:56f0aede7d19c6cf22ee26",
  measurementId: "G-YPE41RJ0QF"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

// Configure the custom parameters with your client ID
if (process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID) {
  googleProvider.setCustomParameters({
    client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
    prompt: 'select_account'
  });
}

export default app;
