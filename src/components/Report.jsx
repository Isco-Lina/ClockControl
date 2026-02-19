import { useState } from "react";
import { auth, db } from "../firebase/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

function toYmd(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function isMonToSat(dateStr) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dow = new Date(y, m - 1, d).getDay(); // 0=Dom, 1=Lun, 6=Sáb
  return dow >= 1 && dow <= 6;
}

const LUNCH_DEDUCTION = 30; // minutos

function pairLogsToDailyRows(logs) {
  const rowsByDay = new Map();
  const sorted = [...logs].sort((a, b) => (a.localTs || 0) - (b.localTs || 0));
  for (const item of sorted) {
    const dt = new Date(item.localTs || 0);
    const dayKey = toYmd(dt);
    if (!rowsByDay.has(dayKey)) rowsByDay.set(dayKey, []);
    const dayRows = rowsByDay.get(dayKey);
    if (item.type === "IN") {
      dayRows.push({
        date: dayKey,
        in: dt,
        out: null,
        minutes: 0,
        deduction: 0,
        netMinutes: 0,
        pending: true,
      });
    } else if (item.type === "OUT") {
      const pendingIdx = [...dayRows].reverse().findIndex((r) => r.pending);
      if (pendingIdx !== -1) {
        const realIdx = dayRows.length - 1 - pendingIdx;
        const r = dayRows[realIdx];
        r.out = dt;
        r.pending = false;
        r.minutes = Math.max(0, Math.round((r.out - r.in) / 60000));
        r.deduction = isMonToSat(r.date) ? LUNCH_DEDUCTION : 0;
        r.netMinutes = Math.max(0, r.minutes - r.deduction);
      } else {
        dayRows.push({
          date: dayKey,
          in: null,
          out: dt,
          minutes: 0,
          deduction: 0,
          netMinutes: 0,
          pending: false,
          orphanOut: true,
        });
      }
    }
  }
  const rows = [];
  for (const dayRows of rowsByDay.values())
    for (const r of dayRows) rows.push(r);
  rows.sort((a, b) => a.date.localeCompare(b.date));
  return rows;
}

function fmtTime(dt) {
  if (!dt) return "-";
  return dt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function estadoLabel(r) {
  if (r.pending) return "Falta salida";
  if (r.orphanOut) return "Sin entrada";
  return "OK";
}

export default function Report() {
  const uid = auth.currentUser?.uid;
  const today = new Date();
  const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const [start, setStart] = useState(toYmd(firstOfMonth));
  const [end, setEnd] = useState(toYmd(today));
  const [rows, setRows] = useState([]);
  const [totalMinutes, setTotalMinutes] = useState(0);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");

  async function generate() {
    if (!uid) return;
    setGenerating(true);
    setError("");
    setRows([]);
    setTotalMinutes(0);
    try {
      const q = query(collection(db, "time_logs"), where("uid", "==", uid));
      const snap = await getDocs(q);
      const startTs = new Date(`${start}T00:00:00`).getTime();
      const endTs = new Date(`${end}T23:59:59`).getTime();
      const logs = snap.docs
        .map((d) => d.data())
        .filter((d) => {
          const ts = d.localTs || 0;
          return ts >= startTs && ts <= endTs;
        });
      const dailyRows = pairLogsToDailyRows(logs);
      const total = dailyRows.reduce((acc, r) => acc + (r.netMinutes || 0), 0);
      setRows(dailyRows);
      setTotalMinutes(total);
    } catch (e) {
      console.error("Error generando reporte:", e);
      setError(
        "Error al obtener los datos. Verifica las reglas de seguridad de Firestore.",
      );
    } finally {
      setGenerating(false);
    }
  }

  function exportExcel() {
    const data = rows.map((r) => ({
      Fecha: r.date,
      Entrada: fmtTime(r.in),
      Salida: fmtTime(r.out),
      "Horas brutas": (r.minutes / 60).toFixed(2),
      "Colación (h)": r.deduction > 0 ? (r.deduction / 60).toFixed(2) : "-",
      "Horas netas": (r.netMinutes / 60).toFixed(2),
      Estado: estadoLabel(r),
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Reporte");
    XLSX.writeFile(wb, `reporte_${start}_a_${end}.xlsx`);
  }

  function exportPDF() {
    const doc = new jsPDF();

    doc.setFontSize(12);
    doc.text(`Reporte de Asistencia`, 14, 14);
    doc.setFontSize(10);
    doc.text(`Rango: ${start} a ${end}`, 14, 20);

    const body = rows.map((r) => [
      r.date,
      fmtTime(r.in),
      fmtTime(r.out),
      (r.minutes / 60).toFixed(2),
      r.deduction > 0 ? `-${(r.deduction / 60).toFixed(2)}` : "-",
      (r.netMinutes / 60).toFixed(2),
      estadoLabel(r),
    ]);

    const result = autoTable(doc, {
      startY: 26,
      head: [
        [
          "Fecha",
          "Entrada",
          "Salida",
          "Horas brutas",
          "Colación",
          "Horas netas",
          "Estado",
        ],
      ],
      columnStyles: { 4: { halign: "center" } },
      body,
      styles: { fontSize: 9 },
    });

    const finalY = doc.lastAutoTable?.finalY ?? 100;
    const totalHours = (totalMinutes / 60).toFixed(2);
    doc.text(`Total horas trabajadas: ${totalHours} h`, 14, finalY + 10);

    doc.save(`reporte_${start}_a_${end}.pdf`);
  }

  return (
    <div className="container py-4">
      <div className="card shadow-sm">
        <div className="card-header bg-secondary text-white">
          <h5 className="mb-0">Reporte de Asistencia</h5>
        </div>
        <div className="card-body">
          {error && <div className="alert alert-danger">{error}</div>}
          <div className="row g-2 align-items-end mb-3">
            <div className="col-12 col-md-4">
              <label className="form-label fw-semibold">Desde</label>
              <input
                className="form-control"
                type="date"
                value={start}
                onChange={(e) => setStart(e.target.value)}
              />
            </div>
            <div className="col-12 col-md-4">
              <label className="form-label fw-semibold">Hasta</label>
              <input
                className="form-control"
                type="date"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
              />
            </div>
            <div className="col-12 col-md-4 d-flex gap-2 flex-wrap">
              <button
                className="btn btn-primary"
                onClick={generate}
                disabled={generating}
              >
                {generating ? (
                  <span className="spinner-border spinner-border-sm me-1" />
                ) : null}
                Generar
              </button>
              <button
                className="btn btn-outline-success"
                disabled={!rows.length || generating}
                onClick={exportExcel}
              >
                Excel
              </button>
              <button
                className="btn btn-outline-danger"
                disabled={!rows.length || generating}
                onClick={exportPDF}
              >
                PDF
              </button>
            </div>
          </div>
          {rows.length > 0 && (
            <div className="alert alert-info mb-3 d-flex justify-content-between align-items-center">
              <span>Total horas netas (sin colación):</span>
              <strong>{(totalMinutes / 60).toFixed(2)} h</strong>
            </div>
          )}
          <div className="table-responsive">
            <table className="table table-sm table-hover table-bordered">
              <thead className="table-dark">
                <tr>
                  <th>Fecha</th>
                  <th>Entrada</th>
                  <th>Salida</th>
                  <th>Horas brutas</th>
                  <th>Colación</th>
                  <th>Horas netas</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center text-muted py-4">
                      {generating
                        ? "Cargando..."
                        : "Selecciona un rango y presiona Generar"}
                    </td>
                  </tr>
                ) : (
                  rows.map((r, idx) => (
                    <tr
                      key={idx}
                      className={
                        r.pending || r.orphanOut ? "table-warning" : ""
                      }
                    >
                      <td>{r.date}</td>
                      <td>{fmtTime(r.in)}</td>
                      <td>{fmtTime(r.out)}</td>
                      <td>{(r.minutes / 60).toFixed(2)}</td>
                      <td className="text-center">
                        {r.deduction > 0 ? (
                          <span className="badge bg-warning text-dark">
                            -30 min
                          </span>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td>{(r.netMinutes / 60).toFixed(2)}</td>
                      <td>{estadoLabel(r)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
