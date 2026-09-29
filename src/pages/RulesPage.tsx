import { Header } from "@/components/Header";
import { RulesContent } from "@/components/RulesDialog";
import { ScrollText } from "lucide-react";

const RulesPage = () => (
  <div className="min-h-screen bg-background">
    <Header onToggleSidebar={() => {}} />
    <main className="max-w-2xl mx-auto px-4 pt-20 pb-10">
      <h1 className="text-2xl font-bold text-foreground mb-6 flex items-center gap-2"><ScrollText className="w-6 h-6" /> Правила VidTube</h1>
      <RulesContent />
    </main>
  </div>
);
export default RulesPage;
