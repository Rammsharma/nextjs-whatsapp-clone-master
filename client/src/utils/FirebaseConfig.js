import { getAuth } from "firebase/auth";
import { initializeApp, getApps } from "firebase/app";

const firebaseConfig = {
  apiKey: "AIzaSyB0Q_69GhHxWi097kdMGphTa0DXBHpnKqU",
  authDomain: "chatty-3af06.firebaseapp.com",
  projectId: "chatty-3af06",
  storageBucket: "chatty-3af06.appspot.com",
  messagingSenderId: "329854164555",
  appId: "1:329854164555:web:a0a65d0d8b3a21eb8a77ce",
  measurementId: "G-F4C2V992GV",
};

const app =
  getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
export const firebaseAuth = getAuth(app);
