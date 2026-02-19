import { useState } from "react";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from "firebase/auth";
import { auth, db } from "../firebase/firebase";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";

export default function Login() {
  const [mode, setMode] = useState("login"); // "login" o "register"
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setErr("");
    setLoading(true);

    try {
      if (mode === "login") {
        await signInWithEmailAndPassword(auth, email, pass);
      } else {
        // Crear cuenta
        const cred = await createUserWithEmailAndPassword(auth, email, pass);

        // (Recomendado) crear perfil mínimo en Firestore
        await setDoc(doc(db, "users", cred.user.uid), {
          email: cred.user.email,
          createdAt: serverTimestamp(),
        });
      }
    } catch (error) {
      console.error(error);
      setErr(
        "Error: revisa el email/contraseña o intenta con otra contraseña.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container py-4">
      <h3>{mode === "login" ? "Iniciar sesión" : "Crear cuenta"}</h3>

      <form
        onSubmit={handleSubmit}
        className="d-grid gap-2"
        style={{ maxWidth: 420 }}
      >
        <input
          className="form-control"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
        />
        <input
          className="form-control"
          placeholder="Contraseña"
          type="password"
          value={pass}
          onChange={(e) => setPass(e.target.value)}
          autoComplete={mode === "login" ? "current-password" : "new-password"}
        />

        {err && <div className="alert alert-danger">{err}</div>}

        <button className="btn btn-primary" disabled={loading}>
          {loading
            ? "Cargando..."
            : mode === "login"
              ? "Entrar"
              : "Registrarme"}
        </button>

        <button
          type="button"
          className="btn btn-outline-secondary"
          onClick={() => setMode(mode === "login" ? "register" : "login")}
          disabled={loading}
        >
          {mode === "login" ? "Crear cuenta" : "Ya tengo cuenta"}
        </button>
      </form>
    </div>
  );
}
