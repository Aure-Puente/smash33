//Firebase:
import { initializeApp, getApps, getApp } from "firebase/app";
import { initializeAuth, getReactNativePersistence, getAuth } from "firebase/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyBMQ9-HKYj521gK_me8kzManTgG5EtLZdk",
  authDomain: "smash33-a4b76.firebaseapp.com",
  projectId: "smash33-a4b76",
  storageBucket: "smash33-a4b76.firebasestorage.app",
  messagingSenderId: "16802596944",
  appId: "1:16802596944:web:e066eaffea976cfbe82955",
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

let auth;
try {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
} catch (e) {
  auth = getAuth(app);
}

export { auth };
export const db = getFirestore(app);
export const storage = getStorage(app);
export default app;
