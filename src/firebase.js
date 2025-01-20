import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getFunctions } from "firebase/functions";

const firebaseConfig = {
  apiKey: "AIzaSyBoOYKTjTz2ZuHPXj41oHwDY0BscnJBTYI",
  authDomain: "bookingapp-57c55.firebaseapp.com",
  projectId: "bookingapp-57c55",
  storageBucket: "bookingapp-57c55.firebasestorage.app",
  messagingSenderId: "654887082567",
  appId: "1:654887082567:web:0e1bcbbcec389692f7af62",
  measurementId: "G-0SSPLKKJJE",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const functions = getFunctions(app);
