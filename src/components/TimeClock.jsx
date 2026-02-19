import { useEffect, useMemo, useState } from "react";
import { auth, db } from "../firebase/firebase";
import { signOut } from "firebase/auth";
import {
  addDoc,
  collection,
  query,
  where,
  onSnapshot,
  serverTimestamp,
} from "firebase/firestore";

export default function TimeClock() {
  const [lastLog, setLastLog] = useState(undefined);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const uid = auth.currentUser?.uid;

  const canMarkIn = useMemo(
    () => lastLog === null || lastLog?.type === "OUT",
    [lastLog],
  );
  const canMarkOut = useMemo(() => lastLog?.type === "IN", [lastLog]);

  useEffect(() => {
    if (!uid) return;
    setError("");
    const q = query(collection(db, "time_logs"), where("uid", "==", uid));
    const unsub = onSnapshot(
      q,
      (snap) => {
        if (snap.empty) {
          setLastLog(null);
          return;
        }
        const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        docs.sort((a, b) => (b.localTs || 0) - (a.localTs || 0));
        setLastLog(docs[0]);
      },
      (e) => {
        console.error("Firestore error:", e);
        setError(
          "No se puede leer Firestore. Verifica las reglas de seguridad del proyecto.",
        );
        setLastLog(null);
      },
    );
    return () => unsub();
  }, [uid]);

  async function mark(type) {
    if (!uid) return;
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      await addDoc(collection(db, "time_logs"), {
        uid,
        type,
        ts: serverTimestamp(),
        localTs: Date.now(),
      });
      setSuccess(type === "IN" ? "Entrada registrada" : "Salida registrada");
      setTimeout(() => setSuccess(""), 3000);
    } catch (e) {
      console.error("Error al guardar:", e);
      setError("Error al guardar. Verifica las reglas de Firestore.");
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    await signOut(auth);
  }

  const lastLabel =
    lastLog?.type === "IN"
      ? "Entrada"
      : lastLog?.type === "OUT"
        ? "Salida"
        : null;

  const lastTime = lastLog?.localTs
    ? new Date(lastLog.localTs).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  const isInitialLoading = lastLog === undefined;

  return (
    <div className="container py-5" style={{ maxWidth: 480 }}>
      <div className="card shadow-sm">
        <div className="card-header bg-primary text-white d-flex justify-content-between align-items-center">
          <h5 className="mb-0">Control de Asistencia</h5>
          <button
            onClick={handleLogout}
            className="btn btn-sm btn-outline-light border-0"
            title="Cerrar sesión"
          >
            <i className="bi bi-box-arrow-right fs-5"></i>
          </button>
        </div>

        <div className="card-body">
          {error && <div className="alert alert-danger py-2">{error}</div>}
          {success && <div className="alert alert-success py-2">{success}</div>}
          {isInitialLoading ? (
            <div className="text-center py-4">
              <span className="spinner-border text-primary" />
              <p className="mt-2 text-muted">Cargando estado...</p>
            </div>
          ) : (
            <div className="d-grid gap-3">
              <button
                className="btn btn-success btn-lg"
                disabled={!canMarkIn || loading}
                onClick={() => mark("IN")}
              >
                {loading ? (
                  <span className="spinner-border spinner-border-sm me-2" />
                ) : (
                  " "
                )}
                Marcar Entrada
              </button>
              <button
                className="btn btn-danger btn-lg"
                disabled={!canMarkOut || loading}
                onClick={() => mark("OUT")}
              >
                {loading ? (
                  <span className="spinner-border spinner-border-sm me-2" />
                ) : (
                  " "
                )}
                Marcar Salida
              </button>
            </div>
          )}
          <div className="mt-4 alert alert-secondary mb-0">
            Ultimo registro:{" "}
            <strong>
              {lastLabel
                ? `${lastLabel}${lastTime ? ` a las ${lastTime}` : ""}`
                : "Sin registros"}
            </strong>
          </div>
        </div>
      </div>
    </div>
  );
}
