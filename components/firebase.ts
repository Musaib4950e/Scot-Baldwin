import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDSOwJTvSmzC4Yj63TtgPKclr5rmIvzf0M",
  authDomain: "cfzgxt.firebaseapp.com",
  projectId: "cfzgxt",
  storageBucket: "cfzgxt.firebasestorage.app",
  messagingSenderId: "237221122422",
  appId: "1:237221122422:web:106cc16a6efc4ea86a2a57"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

export { db, auth };