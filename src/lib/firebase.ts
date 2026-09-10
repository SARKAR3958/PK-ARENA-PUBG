import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getDatabase } from "firebase/database";
import { getFirestore, enableMultiTabIndexedDbPersistence } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCDFEnc4IPvkfE9z5jeWtKjliP7PBsWnH0",
  authDomain: "pak-arena-new.firebaseapp.com",
  databaseURL: "https://pak-arena-new-default-rtdb.firebaseio.com",
  projectId: "pak-arena-new",
  storageBucket: "pak-arena-new.firebasestorage.app",
  messagingSenderId: "428230681074",
  appId: "1:428230681074:web:1a368067ea4a7aad444b6b"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getDatabase(app);
export const firestore = getFirestore(app);

// Enable persistence for instant "old message" loading
enableMultiTabIndexedDbPersistence(firestore).catch((err) => {
    if (err.code === 'failed-precondition') {
        // Multiple tabs open, persistence can only be enabled in one tab at a time.
    } else if (err.code === 'unimplemented') {
        // The current browser does not support all of the features required to enable persistence
    }
});
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account'
});
