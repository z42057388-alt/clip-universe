import { Home, Flame, Music, Gamepad2, Film, Radio, Clock, ThumbsUp, ListVideo } from "lucide-react";

interface SidebarProps {
  collapsed: boolean;
}

const menuItems = [
  { icon: Home, label: "Главная", active: true },
  { icon: Flame, label: "В тренде" },
  { icon: Music, label: "Музыка" },
  { icon: Gamepad2, label: "Игры" },
  { icon: Film, label: "Фильмы" },
  { icon: Radio, label: "Эфир" },
];

const libraryItems = [
  { icon: Clock, label: "История" },
  { icon: ThumbsUp, label: "Понравившиеся" },
  { icon: ListVideo, label: "Плейлисты" },
];

export const Sidebar = ({ collapsed }: SidebarProps) => {
  if (collapsed) {
    return (
      <aside className="fixed left-0 top-14 bottom-0 w-[72px] bg-background z-40 overflow-y-auto hidden sm:flex flex-col items-center pt-2 gap-1">
        {menuItems.slice(0, 4).map((item) => (
          <button
            key={item.label}
            className={`flex flex-col items-center gap-1 p-2 rounded-lg w-16 transition-colors ${
              item.active ? "bg-surface-hover" : "hover:bg-surface-hover"
            }`}
          >
            <item.icon className="w-5 h-5 text-foreground" />
            <span className="text-[10px] text-foreground">{item.label}</span>
          </button>
        ))}
      </aside>
    );
  }

  return (
    <aside className="fixed left-0 top-14 bottom-0 w-56 bg-background z-40 overflow-y-auto border-r border-border hidden sm:block">
      <div className="py-3 px-3">
        {menuItems.map((item) => (
          <button
            key={item.label}
            className={`flex items-center gap-5 w-full px-3 py-2 rounded-lg transition-colors ${
              item.active ? "bg-surface-hover" : "hover:bg-surface-hover"
            }`}
          >
            <item.icon className="w-5 h-5 text-foreground" />
            <span className="text-sm text-foreground">{item.label}</span>
          </button>
        ))}
      </div>
      <div className="border-t border-border py-3 px-3">
        <p className="px-3 mb-1 text-sm text-muted-foreground font-medium">Библиотека</p>
        {libraryItems.map((item) => (
          <button
            key={item.label}
            className="flex items-center gap-5 w-full px-3 py-2 rounded-lg hover:bg-surface-hover transition-colors"
          >
            <item.icon className="w-5 h-5 text-foreground" />
            <span className="text-sm text-foreground">{item.label}</span>
          </button>
        ))}
      </div>
    </aside>
  );
};
