//Importaciones:
import React, { createContext, useContext, useEffect, useState } from "react";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { auth } from "../firebaseConfig";
import { createUserProfile, getUserProfile, updateUserProfile, uploadProfilePhoto } from "../services/firestoreService";
import { registerForPushNotificationsAsync } from "../services/pushNotifications";

//JS:
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        const p = await getUserProfile(firebaseUser.uid);
        setProfile(p);
        registerForPushNotificationsAsync().then((token) => {
          if (token && token !== p?.expoPushToken) {
            updateUserProfile(firebaseUser.uid, { expoPushToken: token }).catch(() => {});
          }
        });
      } else {
        setProfile(null);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  async function register({ email, password, playerName, photoUri }) {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    let photoURL = null;
    if (photoUri) {
      photoURL = await uploadProfilePhoto(cred.user.uid, photoUri);
    }
    await createUserProfile({ uid: cred.user.uid, email, playerName, photoURL });
    setProfile({ uid: cred.user.uid, email, playerName, photoURL });
  }

  async function login({ email, password }) {
    await signInWithEmailAndPassword(auth, email, password);
  }

  async function logout() {
    await signOut(auth);
  }

  async function refreshProfile() {
    if (!user) return;
    const p = await getUserProfile(user.uid);
    setProfile(p);
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading, register, login, logout, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
