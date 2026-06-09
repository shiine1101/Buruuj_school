"use client";

import { useState, useRef, useEffect } from "react";
import { Bot, Send, User, Sparkles } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAppStore, type Student, type Driver, type Bus, type Payment, type Attendance, type Maintenance } from "@/lib/store";

type Message = { role: "user" | "assistant"; text: string };

type StoreData = {
  students: Student[];
  buses: Bus[];
  payments: Payment[];
  maintenance: Maintenance[];
  attendance: Attendance[];
  drivers: Driver[];
};

const PROMPTS = [
  "Show unpaid students",
  "How many buses are active?",
  "Show buses in maintenance",
  "What is the total fuel cost?",
  "How many students are active?",
  "Ardayda aan bixin lacagta bishaan",
];

function generateReply(input: string, data: StoreData): string {
  const { students, buses, payments, maintenance, attendance, drivers } = data;
  const q = input.toLowerCase();

  if (q.includes("unpaid") || q.includes("lacag") || q.includes("bixin")) {
    const unpaid = payments.filter((p: Payment) => p.status === "Unpaid" || p.status === "Partial");
    if (!unpaid.length) return "✅ Great news — all payments are settled!";
    return `❌ ${unpaid.length} unpaid/partial payment(s):\n` +
      unpaid.map((p: Payment) => `• ${p.student} — ${p.amount} (${p.month})`).join("\n");
  }
  if (q.includes("bus") && (q.includes("active") || q.includes("how many"))) {
    const active = buses.filter((b: Bus) => b.status === "Active");
    return `🚌 ${active.length} out of ${buses.length} buses are active:\n` +
      active.map((b: Bus) => `• ${b.busNumber} — Plate: ${b.plateNumber}`).join("\n");
  }
  if (q.includes("maintenance") || q.includes("breakdown")) {
    const inMaintenance = buses.filter((b: Bus) => b.status === "Maintenance" || b.status === "OutOfService");
    const records = maintenance.filter((m: Maintenance) => m.status === "InProgress");
    return `🔧 ${inMaintenance.length} bus(es) in maintenance/out-of-service.\n${records.length} open maintenance record(s).`;
  }
  if (q.includes("fuel")) {
    const fuelCost = maintenance
      .filter((m: Maintenance) => m.type === "Fuel")
      .reduce((sum: number, m: Maintenance) => sum + Number(String(m.cost).replace(/[^0-9.]/g, "")), 0);
    return `⛽ Total fuel cost: $${fuelCost.toLocaleString()}`;
  }
  if (q.includes("student") || q.includes("ardayda")) {
    const active = students.filter((s: Student) => s.status === "Active");
    return `👨‍🎓 ${students.length} total students — ${active.length} active, ${students.length - active.length} archived.`;
  }
  if (q.includes("driver")) {
    const active = drivers.filter((d: Driver) => d.status === "Active");
    return `🧑‍✈️ ${drivers.length} drivers — ${active.length} active.`;
  }
  if (q.includes("attendance")) {
    const pickedUp = attendance.filter((a: Attendance) => a.pickedUp === "Allowed").length;
    return `📋 ${attendance.length} attendance record(s). ${pickedUp} picked up.`;
  }
  if (q.includes("payment") || q.includes("total")) {
    const total = payments.reduce((sum: number, p: Payment) => sum + Number(String(p.amount).replace(/[^0-9.]/g, "")), 0);
    const paid = payments
      .filter((p: Payment) => p.status === "Paid")
      .reduce((sum: number, p: Payment) => sum + Number(String(p.amount).replace(/[^0-9.]/g, "")), 0);
    return `💰 Total billed: $${total.toLocaleString()} — Collected: $${paid.toLocaleString()}`;
  }
  return "🤖 I can help with: student info, payment summaries, bus status, fuel costs, attendance, and driver data. Try asking something specific!";
}

export default function AiAssistantPage() {
  const { students, buses, payments, maintenance, attendance, drivers } = useAppStore();
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", text: "👋 Hi! I'm your school bus AI assistant. Ask me anything about students, payments, buses, maintenance, or attendance — in English or Somali!" }
  ]);
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function send(text?: string) {
    const q = (text ?? input).trim();
    if (!q) return;
    const reply = generateReply(q, { students, buses, payments, maintenance, attendance, drivers });
    setMessages((prev) => [...prev, { role: "user", text: q }, { role: "assistant", text: reply }]);
    setInput("");
  }

  return (
    <AppShell>
      <Card className="mx-auto flex max-w-3xl flex-col" style={{ height: "calc(100vh - 220px)" }}>
        <CardHeader className="border-b">
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-blue-600" />
            AI Assistant
            <span className="ml-auto flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
              <Sparkles className="h-3 w-3" /> Online
            </span>
          </CardTitle>
        </CardHeader>

        {/* Messages */}
        <CardContent className="flex-1 space-y-4 overflow-y-auto py-5">
          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
              <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full ${msg.role === "assistant" ? "bg-blue-600" : "bg-slate-700"}`}>
                {msg.role === "assistant" ? <Bot className="h-4 w-4 text-white" /> : <User className="h-4 w-4 text-white" />}
              </div>
              <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm whitespace-pre-line ${msg.role === "assistant" ? "bg-slate-100 text-slate-800" : "bg-blue-600 text-white"}`}>
                {msg.text}
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </CardContent>

        {/* Prompt suggestions + input */}
        <div className="border-t px-5 pt-3 pb-4">
          <div className="mb-3 flex flex-wrap gap-2">
            {PROMPTS.map((p) => (
              <button key={p} onClick={() => send(p)}
                className="rounded-full border bg-white px-3 py-1 text-xs font-semibold text-slate-600 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 transition-colors">
                {p}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder="Ask anything about transport operations..."
            />
            <button
              onClick={() => send()}
              disabled={!input.trim()}
              className="flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              <Send className="h-4 w-4" /> Send
            </button>
          </div>
        </div>
      </Card>
    </AppShell>
  );
}
