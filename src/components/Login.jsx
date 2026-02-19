import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../firebase/firebase";

export default function Login() {
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [err, setErr] = useState("");

  async function login(e) {
    e.preventDefault();
    setErr("");
    try {
      await signInWithEmailAndPassword(auth, email, pass);
    } catch (error) {
      setErr("Credenciales incorrectas o error de conexión.");
    }
  }

  return (
    <div className="container py-4">
      <h3>Iniciar sesión</h3>
      <form onSubmit={login} className="d-grid gap-2" style={{ maxWidth: 420 }}>
        <input
          className="form-control"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          className="form-control"
          placeholder="Contraseña"
          type="password"
          value={pass}
          onChange={(e) => setPass(e.target.value)}
        />
        {err && <div className="alert alert-danger">{err}</div>}
        <button className="btn btn-primary">Entrar</button>
      </form>
    </div>
  );
}
