import { initializeApp, getApps } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyA3a9L85rqBiT0Hi2eCuScJWyoCsMRWSOo",
  authDomain: "my-education-platform-a160e.firebaseapp.com",
  projectId: "my-education-platform-a160e",
  storageBucket: "my-education-platform-a160e.firebasestorage.app",
  messagingSenderId: "909123190965",
  appId: "1:909123190965:web:6a53aba06248180fb27efc",
};

export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
export const db = getFirestore(app);
export const auth = getAuth(app);
