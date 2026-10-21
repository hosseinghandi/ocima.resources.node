import type { TimeEntry } from "../shared/timeEntry";

export type EmployeeStatus = "Attivo" | "In ferie" | "Inattivo";

export interface Employee {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  department: string;
  contract: string;
  status: EmployeeStatus;
  location: string;
  startDate: string;
  monthlyHours: number;
  targetHours: number;
  initials: string;
  color: string;
}

export const demoEmployees: Employee[] = [
  {
    id: "marco-caso",
    name: "Marco Caso",
    email: "marco.caso@ocima.it",
    phone: "+39 333 482 1906",
    role: "Tecnico di cantiere",
    department: "Produzione",
    contract: "Tempo pieno",
    status: "Attivo",
    location: "Milano",
    startDate: "2022-03-14",
    monthlyHours: 152,
    targetHours: 168,
    initials: "MC",
    color: "bg-amber-100 text-amber-800",
  },
  {
    id: "hossein-ghandi",
    name: "Hossein Ghandi",
    email: "hossein.ghandi@ocima.it",
    phone: "+39 347 201 6384",
    role: "Responsabile manutenzione",
    department: "Manutenzione",
    contract: "Tempo pieno",
    status: "Attivo",
    location: "Bergamo",
    startDate: "2021-09-06",
    monthlyHours: 160,
    targetHours: 168,
    initials: "HG",
    color: "bg-sky-100 text-sky-800",
  },
  {
    id: "peppe-falco",
    name: "Peppe Falco",
    email: "peppe.falco@ocima.it",
    phone: "+39 320 754 8291",
    role: "Operatore produzione",
    department: "Produzione",
    contract: "Tempo pieno",
    status: "In ferie",
    location: "Milano",
    startDate: "2023-01-23",
    monthlyHours: 128,
    targetHours: 168,
    initials: "PF",
    color: "bg-violet-100 text-violet-800",
  },
  {
    id: "roberto-canone",
    name: "Roberto Canone",
    email: "roberto.canone@ocima.it",
    phone: "+39 349 650 7832",
    role: "Addetto logistica",
    department: "Logistica",
    contract: "Part-time",
    status: "Attivo",
    location: "Monza",
    startDate: "2024-05-02",
    monthlyHours: 84,
    targetHours: 96,
    initials: "RC",
    color: "bg-rose-100 text-rose-800",
  },
];

export interface DemoWorkEntry {
  id: string;
  employeeId: string;
  date: string;
  project: string;
  activity: string;
  hours: number;
  status: "Approvata" | "In attesa";
}

export const demoWorkEntries: DemoWorkEntry[] = [
  { id: "w1", employeeId: "marco-caso", date: "2026-10-20", project: "OC-240 · Cantiere Nord", activity: "Installazione impianti", hours: 8, status: "In attesa" },
  { id: "w2", employeeId: "hossein-ghandi", date: "2026-10-20", project: "OC-218 · Manutenzione", activity: "Controllo programmato", hours: 8, status: "Approvata" },
  { id: "w3", employeeId: "peppe-falco", date: "2026-10-19", project: "OC-240 · Cantiere Nord", activity: "Supporto squadra", hours: 7.5, status: "Approvata" },
  { id: "w4", employeeId: "roberto-canone", date: "2026-10-19", project: "OC-305 · Magazzino", activity: "Preparazione materiali", hours: 6, status: "In attesa" },
  { id: "w5", employeeId: "marco-caso", date: "2026-10-19", project: "OC-240 · Cantiere Nord", activity: "Posa canaline", hours: 8, status: "Approvata" },
  { id: "w6", employeeId: "hossein-ghandi", date: "2026-10-17", project: "OC-218 · Manutenzione", activity: "Verifica quadro elettrico", hours: 8, status: "Approvata" },
  { id: "w7", employeeId: "marco-caso", date: "2026-10-16", project: "OC-175 · Sede centrale", activity: "Verifica materiali", hours: 7.5, status: "Approvata" },
  { id: "w8", employeeId: "roberto-canone", date: "2026-10-16", project: "OC-305 · Magazzino", activity: "Inventario", hours: 6, status: "Approvata" },
];

export function getDemoTimeEntries(employeeId: string, month: string): TimeEntry[] {
  return demoWorkEntries
    .filter((entry) => entry.employeeId === employeeId && entry.date.startsWith(month))
    .map((entry) => ({
      id: -Number(entry.id.slice(1)),
      date: entry.date,
      project: entry.project,
      activity: entry.activity,
      hours: entry.hours,
      notes: `Registrazione demo · ${entry.status}`,
      createdAt: `${entry.date}T12:00:00.000Z`,
    }));
}
