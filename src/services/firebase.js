import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// TODO: Replace with your app's Firebase project configuration
// For now, we'll use placeholders. The user needs to update this.
const firebaseConfig = {
  apiKey: "AIzaSyDQOqjRTKuIaE6NXQy2XHZH315iExkdEqA",
  authDomain: "infinit-chat-c5769.firebaseapp.com",
  projectId: "infinit-chat-c5769",
  storageBucket: "infinit-chat-c5769.firebasestorage.app",
  messagingSenderId: "1067809099982",
  appId: "1:1067809099982:web:e08ec85a086558a232c09f"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
