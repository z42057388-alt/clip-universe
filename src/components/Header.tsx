import { Menu, Search, Upload, User, MessageCircle, Bot } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { UploadDialog } from "./UploadDialog";
import { useAuth } from "@/contexts/AuthContext";
import { NotificationsBell } from "./NotificationsBell";
import { AccountSwitcher } from "./AccountSwitcher";

interface HeaderProps {
  onToggleSidebar: () => void;
}

export const Header = ({ onToggleSidebar }: HeaderProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [uploadOpen, setUploadOpen] = useState(false);
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between h-14 px-4 bg-background border-b border-border">
        <div className="flex items-center gap-4">
          <button onClick={onToggleSidebar} className="p-2 rounded-full hover:bg-surface-hover transition-colors">
            <Menu className="w-5 h-5 text-foreground" />
          </button>
          <Link to="/" className="flex items-center gap-1">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">▶</span>
            </div>
            <span className="text-foreground font-roboto font-bold text-xl hidden sm:block">VidTube</span>
            <span className="hidden md:block text-[10px] leading-tight text-muted-foreground border border-border rounded-full px-2 py-0.5">ZakharX community</span>
          </Link>
        </div>

        <div className="flex-1 max-w-xl mx-4">
          <div className="flex">
            <input
              type="text"
              placeholder="Поиск"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 bg-surface border border-border rounded-l-full text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
            />
            <button className="px-5 bg-surface-hover border border-l-0 border-border rounded-r-full hover:bg-accent transition-colors">
              <Search className="w-5 h-5 text-foreground" />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button onClick={() => setUploadOpen(true)} className="p-2 rounded-full hover:bg-surface-hover transition-colors" title="Загрузить видео">
            <Upload className="w-5 h-5 text-foreground" />
          </button>
          <Link to="/ai-chat" className="p-2 rounded-full hover:bg-surface-hover transition-colors" title="AI Ассистент">
            <Bot className="w-5 h-5 text-foreground" />
          </Link>
          <Link to="/chat" className="p-2 rounded-full hover:bg-surface-hover transition-colors" title="Чаты">
            <MessageCircle className="w-5 h-5 text-foreground" />
          </Link>
          {user ? (
            <>
              <NotificationsBell />
              <AccountSwitcher />
            </>
          ) : (
            <button onClick={() => navigate("/auth")} className="flex items-center gap-1.5 px-3 py-1.5 border border-primary/50 rounded-full text-primary text-sm hover:bg-primary/10 transition-colors">
              <User className="w-4 h-4" />
              <span className="hidden sm:inline">Войти</span>
            </button>
          )}
        </div>
      </header>
      <UploadDialog open={uploadOpen} onOpenChange={setUploadOpen} />
    </>
  );
};
