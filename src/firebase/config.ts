import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyB87VACv8gL6oedUnvrUvLtzxHZh1hkwgw",
  authDomain: "topstore-inventario.firebaseapp.com",
  projectId: "topstore-inventario",
  storageBucket: "topstore-inventario.firebasestorage.app",
  messagingSenderId: "397166415089",
  appId: "1:397166415089:web:056db173149c9c85b16d50",
  measurementId: "G-SWS09EVYVE"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
