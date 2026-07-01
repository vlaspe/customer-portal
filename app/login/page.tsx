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

    if (error) return alert(error.message);
    router.push("/");
  };

  return (
    <>
      <main className="bg">

{/* LEFT IMAGE SIDE */}
<div className="left">

  <img
    src="https://indevo.sk/welcome.jpg"
    alt="preview"
  />

  {/* overlay text */}
<div className="leftOverlay">

 <h2>
  Build faster.<br />
  Scale from prototype to production.
</h2>


</div>

</div>


        {/* RIGHT LOGIN SIDE */}
        <div className="right">

          <div className="panel">

            <div className="logoWrap">
              <img src="https://indevo.sk/logo.jpg" alt="logo" />
            </div>

            <h1></h1>
            <p className="sub">Welcome back</p>

            <input
              placeholder="Email"
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

            <div className="hint">
              Secure access to your platform
            </div>

          </div>

        </div>

      </main>

      <style jsx>{`
        .bg {
          height: 100vh;
          display: flex;
          font-family: ui-sans-serif, system-ui;
          background: #ffffff;
        }

       /* LEFT SIDE */
.left {
  flex: 1;
  position: relative;
  overflow: hidden;
}

.left img {
  width: 100%;
  height: 100%;
  object-fit: cover;

  position: relative;
  z-index: 1;
}

/* overlay layer */
.leftOverlay {
  position: absolute;
  inset: 0;

  display: flex;
  flex-direction: column;
  justify-content: center;

  padding: 70px;
  color: white;

  z-index: 2;
}

/* dark gradient behind text */
.leftOverlay::before {
  content: "";
  position: absolute;
  inset: 0;

  background: linear-gradient(
    90deg,
    rgba(0, 0, 0, 0.65),
    rgba(0, 0, 0, 0.25),
    rgba(0, 0, 0, 0)
  );

  z-index: 1;
}

/* text above gradient */
.leftOverlay h2,
.leftOverlay p {
  position: relative;
  z-index: 2;
}

/* optional: better typography */
.leftOverlay h2 {
  font-size: 24px;
  font-weight: 600;
  line-height: 1.05;
  letter-spacing: -0.8px;
  margin: 0;
}

.leftOverlay p {
  margin-top: 16px;
  font-size: 16px;
  max-width: 480px;
  opacity: 0.9;
  line-height: 1.6;
}

        /* RIGHT SIDE */
        .right {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #ffffff;
          padding: 40px;
        }

        .panel {
          width: 100%;
          max-width: 360px;
        }

        .logoWrap {
          display: flex;
          justify-content: center;
          margin-bottom: 18px;
        }

        .logoWrap img {
          height: 40px;
          object-fit: contain;
        }

        h1 {
          font-size: 24px;
          margin: 0;
          color: #111827;
        }

        .sub {
          font-size: 14px;
          color: #6b7280;
          margin-bottom: 20px;
        }

        input {
          width: 100%;
          padding: 12px 14px;
          margin-bottom: 10px;
          border-radius: 10px;
          border: 1px solid #e5e7eb;
          outline: none;
          font-size: 14px;
          color: #111827;
        }

        input:focus {
          border-color: #111827;
        }

        button {
          width: 100%;
          padding: 12px;
          border-radius: 10px;
          border: none;
          background: #111827;
          color: white;
          cursor: pointer;
          margin-top: 6px;
        }

        .hint {
          margin-top: 14px;
          font-size: 11px;
          color: #9ca3af;
          text-align: center;
        }

        /* MOBILE */
        @media (max-width: 768px) {
          .bg {
            flex-direction: column;
          }

          .left {
            height: 35vh;
          }

          .right {
            height: 65vh;
          }
        }
      `}</style>
    </>
  );
}