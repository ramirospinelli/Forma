import { NavLink } from "react-router-dom";
import { Home, Activity, BarChart2, MessageCircle, User } from "lucide-react";
import styles from "./TabBar.module.css";

const tabs = [
  { to: "/", icon: Home, label: "Inicio" },
  { to: "/activities", icon: Activity, label: "Actividades" },
  { to: "/stats", icon: BarChart2, label: "Análisis" },
  { to: "/coach", icon: MessageCircle, label: "Coach" },
  { to: "/profile", icon: User, label: "Perfil" },
];

export default function TabBar() {
  return (
    <nav className={styles.tabBar}>
      {tabs.map(({ to, icon: Icon, label }) => (
        <NavLink
          key={to}
          to={to}
          end={to === "/"}
          className={({ isActive }) =>
            `${styles.tab} ${isActive ? styles.tabActive : ""}`
          }
        >
          <Icon size={22} strokeWidth={1.8} className={styles.icon} />
          <span className={styles.label}>{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
