import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyALV4AY6PX7AmfJw0Mipj962mD4SOEpQTw",
  authDomain: "validador-mibanco-demo.firebaseapp.com",
  projectId: "validador-mibanco-demo",
  storageBucket: "validador-mibanco-demo.firebasestorage.app",
  messagingSenderId: "707982796971",
  appId: "1:707982796971:web:0201bb445cf6d997532fee"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export { signInWithPopup, signOut };
