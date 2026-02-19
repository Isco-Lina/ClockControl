import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./firebase/firebase";

import Login from "./components/Login";
import TimeClock from "./components/TimeClock";
import Report from "./components/Report";

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  if (loading) return <div className="container py-4">Cargando...</div>;

  return (
    <div>
      {!user ? (
        <Login />
      ) : (
        <>
          <TimeClock />
          <Report />
        </>
      )}
    </div>
  );
}

export default App;
