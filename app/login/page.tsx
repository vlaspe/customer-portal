"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";

export default function Login() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const signIn = async () => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      alert(error.message);
    } else {
      router.push("/");
    }
  };

  return (
    <>
      <main className="bg">
        <div className="card">
          <h1>Customer portal</h1>
          <p className="subtitle">Sign in to your account</p>

          <input
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <input
            placeholder="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <button onClick={signIn}>Sign in</button>
        </div>
      </main>

      <style jsx>{`
        .bg {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: sans-serif;

          /* 🔥 jemný profesionálny background */
          background: #f6f7fb;
          padding: 20px;
        }

        .card {
          width: 360px;
          padding: 32px;
          border-radius: 14px;

          background: white;
          border: 1px solid #e8e8ee;

          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.06);

          text-align: left;
        }

        h1 {
          font-size: 22px;
          margin-bottom: 6px;
          color: #111827;
        }

        .subtitle {
          font-size: 14px;
          color: #6b7280;
          margin-bottom: 20px;
        }

        input {
          width: 100%;
          padding: 12px 14px;
          margin-bottom: 12px;

          border-radius: 10px;
          border: 1px solid #e5e7eb;

          font-size: 14px;
          outline: none;

          transition: all 0.2s ease;
          background: #fafafa;
        }

        input:focus {
          border-color: #c7c9d1;
          background: white;
        }

        button {
          width: 100%;
          padding: 12px 14px;

          border-radius: 10px;
          border: none;

          background: #111827;
          color: white;

          font-weight: 500;
          cursor: pointer;

          transition: 0.2s ease;
        }

        button:hover {
          background: #1f2937;
        }

        button:active {
          transform: scale(0.98);
        }

        /* 📱 MOBILE */
        @media (max-width: 768px) {
          .card {
            width: 100%;
            max-width: 340px;
            padding: 24px;
          }

          h1 {
            font-size: 20px;
          }
        }
          /* 🔥 fix pre dark mode / system override */
input {
  color: #111827;          /* text v inpute */
  -webkit-text-fill-color: #111827; /* iOS autofill fix */
  caret-color: #111827;    /* kurzor */
}

/* 🔥 fix pre autofill (Chrome / Safari) */
input:-webkit-autofill {
  -webkit-box-shadow: 0 0 0px 1000px #fafafa inset;
  -webkit-text-fill-color: #111827;
  transition: background-color 9999s ease-in-out 0s;
}

/* 🔥 dark mode override (ak by browser prepol farby) */
@media (prefers-color-scheme: dark) {
  .bg {
    background: #f6f7fb; /* drží light theme aj v dark mode */
  }

  .card {
    background: white;
    border-color: #e8e8ee;
  }

  input {
    background: #fafafa;
    color: #111827;
  }

  input::placeholder {
    color: #9ca3af;
  }
}
      `}</style>
    </>
  );
}

