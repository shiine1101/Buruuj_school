"use client";

import { useState } from "react";
import { Save, User, Lock, School, Bell } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/ui/dialog";

export default function ProfilePage() {
  const [profile, setProfile] = useState({
    name: "Admin User",
    email: "admin@buruuj.school",
    phone: "+252 61 555 0000",
    role: "System Administrator",
  });
  const [passwords, setPasswords] = useState({ current: "", newPass: "", confirm: "" });
  const [saved, setSaved] = useState(false);

  function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  function changePassword(e: React.FormEvent) {
    e.preventDefault();
    if (passwords.newPass !== passwords.confirm) return alert("New passwords do not match!");
    if (passwords.newPass.length < 6) return alert("Password must be at least 6 characters.");
    alert("✅ Password changed successfully!");
    setPasswords({ current: "", newPass: "", confirm: "" });
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-2xl space-y-6">
        {/* Avatar */}
        <div className="flex items-center gap-5 rounded-xl border bg-white p-6 shadow-sm">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-blue-600 text-3xl font-black text-white">
            {profile.name.charAt(0)}
          </div>
          <div>
            <h2 className="text-xl font-black">{profile.name}</h2>
            <p className="text-slate-500">{profile.role}</p>
            <p className="text-sm text-slate-400">{profile.email}</p>
          </div>
        </div>

        {/* Profile Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><User className="h-5 w-5 text-blue-600" /> Profile Information</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={saveProfile} className="grid gap-4">
              <FormField label="Full Name" required>
                <Input value={profile.name} onChange={(e) => setProfile(p => ({ ...p, name: e.target.value }))} />
              </FormField>
              <FormField label="Email Address" required>
                <Input type="email" value={profile.email} onChange={(e) => setProfile(p => ({ ...p, email: e.target.value }))} />
              </FormField>
              <FormField label="Phone Number">
                <Input value={profile.phone} onChange={(e) => setProfile(p => ({ ...p, phone: e.target.value }))} placeholder="+252 61 ..." />
              </FormField>
              <FormField label="Role">
                <Input value={profile.role} readOnly className="bg-slate-50 text-slate-500" />
              </FormField>
              <div className="flex items-center justify-between">
                <button type="submit" className="flex items-center gap-2 rounded-md bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors">
                  <Save className="h-4 w-4" /> Save Changes
                </button>
                {saved && <span className="text-sm font-semibold text-emerald-600">✅ Saved!</span>}
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Change Password */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Lock className="h-5 w-5 text-blue-600" /> Change Password</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={changePassword} className="grid gap-4">
              <FormField label="Current Password" required>
                <Input type="password" value={passwords.current} onChange={(e) => setPasswords(p => ({ ...p, current: e.target.value }))} required />
              </FormField>
              <FormField label="New Password" required>
                <Input type="password" value={passwords.newPass} onChange={(e) => setPasswords(p => ({ ...p, newPass: e.target.value }))} required />
              </FormField>
              <FormField label="Confirm New Password" required>
                <Input type="password" value={passwords.confirm} onChange={(e) => setPasswords(p => ({ ...p, confirm: e.target.value }))} required />
              </FormField>
              <button type="submit" className="flex items-center gap-2 rounded-md border border-slate-300 px-5 py-2.5 text-sm font-semibold hover:bg-slate-50 transition-colors">
                <Lock className="h-4 w-4" /> Update Password
              </button>
            </form>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Bell className="h-5 w-5 text-blue-600" /> Notification Preferences</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { label: "Email notifications for payments", key: "email_payments" },
              { label: "SMS alerts for bus breakdowns", key: "sms_breakdown" },
              { label: "WhatsApp updates for attendance", key: "wa_attendance" },
              { label: "Daily summary report", key: "daily_report" },
            ].map((pref) => (
              <label key={pref.key} className="flex items-center justify-between rounded-lg border p-4 cursor-pointer hover:bg-slate-50">
                <span className="text-sm font-semibold">{pref.label}</span>
                <input type="checkbox" defaultChecked className="h-4 w-4 accent-blue-600" />
              </label>
            ))}
          </CardContent>
        </Card>

        {/* School Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><School className="h-5 w-5 text-blue-600" /> School Information</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <FormField label="School Name">
              <Input defaultValue="Buruuj International School" />
            </FormField>
            <FormField label="Address">
              <Input defaultValue="Mogadishu, Somalia" />
            </FormField>
            <FormField label="Contact Email">
              <Input defaultValue="info@buruuj.school" />
            </FormField>
            <button className="flex items-center gap-2 rounded-md bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors w-fit">
              <Save className="h-4 w-4" /> Save School Info
            </button>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
