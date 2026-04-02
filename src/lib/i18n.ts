// Multi-language support: English + Urdu

export type Locale = "en" | "ur";

const translations: Record<Locale, Record<string, string>> = {
  en: {
    // Navigation
    "nav.dashboard": "Dashboard",
    "nav.clients": "Clients",
    "nav.pipeline": "Pipeline",
    "nav.tasks": "Tasks",
    "nav.calendar": "Calendar",
    "nav.team": "Team",
    "nav.attendance": "Attendance",
    "nav.invoices": "Invoices",
    "nav.reports": "Reports",
    "nav.settings": "Settings",

    // Dashboard
    "dashboard.revenue": "Revenue This Month",
    "dashboard.clients": "Active Clients",
    "dashboard.tasks": "Open Tasks",
    "dashboard.utilization": "Team Utilization",
    "dashboard.welcome": "Welcome back",

    // Common
    "common.search": "Search...",
    "common.add": "Add",
    "common.edit": "Edit",
    "common.delete": "Delete",
    "common.save": "Save",
    "common.cancel": "Cancel",
    "common.export": "Export",
    "common.import": "Import",
    "common.filter": "Filter",
    "common.all": "All",
    "common.loading": "Loading...",
    "common.noResults": "No results found",
    "common.confirm": "Are you sure?",
    "common.actions": "Actions",

    // Auth
    "auth.signIn": "Sign In",
    "auth.signOut": "Sign Out",
    "auth.register": "Register",
    "auth.email": "Email",
    "auth.password": "Password",

    // Employee
    "employee.hire": "Hire Employee",
    "employee.hiredBy": "Hired by FU Corp",
    "employee.assignTo": "Assign to Company",
    "employee.remove": "Remove Employee",

    // Attendance
    "attendance.present": "Present",
    "attendance.absent": "Absent",
    "attendance.late": "Late",
    "attendance.remote": "Remote",
    "attendance.leave": "On Leave",
    "attendance.checkIn": "Check In",
    "attendance.checkOut": "Check Out",

    // Invoice
    "invoice.create": "New Invoice",
    "invoice.paid": "Paid",
    "invoice.pending": "Pending",
    "invoice.overdue": "Overdue",
    "invoice.draft": "Draft",
  },
  ur: {
    // Navigation
    "nav.dashboard": "ڈیش بورڈ",
    "nav.clients": "کلائنٹس",
    "nav.pipeline": "پائپ لائن",
    "nav.tasks": "ٹاسکس",
    "nav.calendar": "کیلنڈر",
    "nav.team": "ٹیم",
    "nav.attendance": "حاضری",
    "nav.invoices": "انوائسز",
    "nav.reports": "رپورٹس",
    "nav.settings": "سیٹنگز",

    // Dashboard
    "dashboard.revenue": "اس ماہ کی آمدنی",
    "dashboard.clients": "فعال کلائنٹس",
    "dashboard.tasks": "باقی ٹاسکس",
    "dashboard.utilization": "ٹیم استعمال",
    "dashboard.welcome": "خوش آمدید",

    // Common
    "common.search": "تلاش کریں...",
    "common.add": "شامل کریں",
    "common.edit": "ترمیم",
    "common.delete": "حذف کریں",
    "common.save": "محفوظ کریں",
    "common.cancel": "منسوخ",
    "common.export": "برآمد",
    "common.import": "درآمد",
    "common.filter": "فلٹر",
    "common.all": "سب",
    "common.loading": "لوڈ ہو رہا ہے...",
    "common.noResults": "کوئی نتائج نہیں ملے",
    "common.confirm": "کیا آپ کو یقین ہے؟",
    "common.actions": "اعمال",

    // Auth
    "auth.signIn": "سائن ان",
    "auth.signOut": "سائن آؤٹ",
    "auth.register": "رجسٹر",
    "auth.email": "ای میل",
    "auth.password": "پاسورڈ",

    // Employee
    "employee.hire": "ملازم بھرتی کریں",
    "employee.hiredBy": "ایف یو کارپ نے بھرتی کیا",
    "employee.assignTo": "کمپنی کو تفویض کریں",
    "employee.remove": "ملازم ہٹائیں",

    // Attendance
    "attendance.present": "حاضر",
    "attendance.absent": "غیر حاضر",
    "attendance.late": "تاخیر",
    "attendance.remote": "ریموٹ",
    "attendance.leave": "چھٹی",
    "attendance.checkIn": "چیک ان",
    "attendance.checkOut": "چیک آؤٹ",

    // Invoice
    "invoice.create": "نئی انوائس",
    "invoice.paid": "ادا شدہ",
    "invoice.pending": "زیر التواء",
    "invoice.overdue": "واجب الادا",
    "invoice.draft": "ڈرافٹ",
  },
};

export function t(key: string, locale: Locale = "en"): string {
  return translations[locale]?.[key] || translations.en[key] || key;
}

export function getDirection(locale: Locale): "ltr" | "rtl" {
  return locale === "ur" ? "rtl" : "ltr";
}
