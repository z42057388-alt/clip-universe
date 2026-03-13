import { Menu, Search, Upload, Bell, User } from "lucide-react";
import { useState } from "react";
import { UploadDialog } from "./UploadDialog";

interface HeaderProps {
  onToggleSidebar: () => void;
}

export const Header = ({ onToggleSidebar }: HeaderProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [uploadOpen, setUploadOpen] = useState(false);

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between h-14 px-4 bg-background border-b border-border">
        <div className="flex items-center gap-4">
          <button onClick={onToggleSidebar} className="p-2 rounded-full hover:bg-surface-hover transition-colors">
            <Menu className="w-5 h-5 text-foreground" />
          </button>
          <div className="flex items-center gap-1">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">▶</span>
            </div>
            <span className="text-foreground font-roboto font-bold text-xl hidden sm:block">VidTube</span>
          </div>
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

        <div className="flex items-center gap-2">
          <button
            onClick={() => setUploadOpen(true)}
            className="p-2 rounded-full hover:bg-surface-hover transition-colors"
          >
            <Upload className="w-5 h-5 text-foreground" />
          </button>
          <button className="p-2 rounded-full hover:bg-surface-hover transition-colors">
            <Bell className="w-5 h-5 text-foreground" />
          </button>
          <button className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
            <User className="w-4 h-4 text-primary-foreground" />
          </button>
        </div>
      </header>
      <UploadDialog open={uploadOpen} onOpenChange={setUploadOpen} />
    </>
  );
};
