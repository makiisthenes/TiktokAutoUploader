import { NavLink } from "react-router-dom";
import { Users, Upload, Calendar, Film, LogIn } from "lucide-react";
import clsx from "clsx";

const items = [
  { to: "/accounts", label: "Accounts", icon: Users },
  { to: "/upload", label: "Upload", icon: Upload },
  { to: "/schedules", label: "Schedules", icon: Calendar },
  { to: "/videos", label: "Videos", icon: Film },
  { to: "/login", label: "Browser login", icon: LogIn },
];

export default function Sidebar() {
  return (
    <aside className="w-60 shrink-0 border-r border-slate-200 bg-white">
      <div className="p-5 border-b border-slate-200">
        <h1 className="text-lg font-semibold tracking-tight">autotok</h1>
        <p className="text-xs text-slate-500 mt-1">Local control panel</p>
      </div>
      <nav className="p-3 space-y-1">
        {items.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              clsx(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-brand-50 text-brand-700"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
              )
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
