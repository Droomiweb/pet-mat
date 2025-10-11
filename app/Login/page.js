"use client";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../lib/firebase"; // make sure firebase.js exports auth

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const router = useRouter();

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMsg("");

    try {
      // Map username to Firebase email (username@example.com)
      const email = username + "@example.com";

      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      console.log("Logged in user UID:", userCredential.user.uid);

      router.push("/Home"); // redirect to Add Pet page
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || "Login failed");
    }
  };

  return (
    <div className="w-screen h-screen overflow-hidden relative">
      <Image
        src="/imgs/topimg.png"
        alt="background"
        className="absolute sm:-left-96 -top-1/2 left-0 w-screen h-screen object-contain scale-125"
        width={200}
        height={200}
      />

      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 p-10 bg-white/80 shadow-lg rounded-lg flex flex-col items-center w-80 sm:w-96">
        <h1 className="text-[#4F200D] mb-6 text-center text-3xl font-bold">LOGIN</h1>

        <form onSubmit={handleLogin} className="w-full flex flex-col">
          <label className="self-start text-xl mb-1">Username</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full outline-none bg-transparent mb-4 border-b-4 border-[#4F200D] p-2"
            required
          />

          <label className="self-start text-xl mb-1">Password</label>
          <div className="relative w-full mb-4">
            <input
              type={showPass ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full outline-none bg-transparent border-b-4 border-[#4F200D] p-2 pr-12"
              required
            />
            <button
              type="button"
              onClick={() => setShowPass(!showPass)}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 text-sm text-gray-600 hover:text-gray-900"
            >
              {showPass ? "Hide" : "Show"}
            </button>
          </div>

          <button
            type="submit"
            className="mt-2 bg-[#4F200D] text-white px-6 py-2 rounded-lg hover:bg-orange-500 transition"
          >
            Login
          </button>

          {errorMsg && <p className="mt-2 text-red-600 text-sm text-center">{errorMsg}</p>}

          <p className="mt-4 text-center">
            Don't have an account? <Link href="/Signup">Signup</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
