"use client";
import { auth, googleProvider } from "@/lib/firebase";
import { signInWithPopup, signOut, onAuthStateChanged, User } from "firebase/auth";
import { useEffect, useState } from "react";

export default function AuthButton() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return;
    }
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleSignIn = async () => {
    if (!auth || !googleProvider) return;
    await signInWithPopup(auth, googleProvider);
    window.location.href = "/dashboard";
  };
  const handleSignOut = async () => {
    if (!auth) return;
    await signOut(auth);
    window.location.href = "/";
  };

  if (loading) return null;

  if (user) {
    return (
      <button
        onClick={handleSignOut}
        className="rounded-full bg-gray-900 text-white px-5 py-2 hover:bg-black transition"
      >
        Sign out
      </button>
    );
  }
  return (
    <button
      onClick={handleSignIn}
      className="rounded-full bg-green-600 text-white px-5 py-2 hover:bg-green-700 transition"
    >
      Continue with Google
    </button>
  );
}


