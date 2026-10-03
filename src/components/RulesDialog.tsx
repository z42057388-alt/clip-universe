import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollText } from "lucide-react";
import { useState } from "react";

const rules = [
  "Запрещён контент 18+ (обнажённый или откровенный материал).",
  "Запрещено насилие, жестокость и шокирующий контент.",
  "Запрещены оскорбления, травля и разжигание ненависти.",
  "Запрещён спам, мошенничество и реклама запрещённых веществ.",
  "Запрещено выкладывать чужой контент без разрешения автора.",
  "Нарушение правил ведёт к блокировке канала и удалению видео.",
];

export const RulesContent = () => (
          <div className="space-y-4 text-sm">
            <div>
              <h3 className="font-semibold text-foreground mb-2">Что означают галочки</h3>
              <ul className="space-y-2 text-muted-foreground">
                <li className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded-full bg-red-500 shrink-0 inline-block" />
                  <span><span className="text-foreground font-medium">Красная</span> — аккаунт подтверждён VidTube.</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded-full bg-green-500 shrink-0 inline-block" />
                  <span><span className="text-foreground font-medium">Зелёная</span> — у пользователя есть собственная платформа.</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded-full bg-purple-500 shrink-0 inline-block" />
                  <span><span className="text-foreground font-medium">Фиолетовая</span> — пользователь участвовал в создании VidTube.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-4 h-4 rounded-full bg-white shrink-0 inline-block" />
                  <span><span className="text-foreground font-medium">Белая</span> — доверенный пользователь.</span>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-foreground mb-2">Правила платформы</h3>
              <ul className="space-y-2 text-muted-foreground list-disc list-inside">
                {rules.map((rule) => (
                  <li key={rule}>{rule}</li>
                ))}
              </ul>
            </div>
          </div>
);

export const RulesDialog = () => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="p-2 rounded-full hover:bg-surface-hover transition-colors shrink-0"
        title="Правила платформы"
      >
        <ScrollText className="w-5 h-5 text-foreground" />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground">
              <ScrollText className="w-5 h-5" />
              Правила VidTube
            </DialogTitle>
          </DialogHeader>

          <RulesContent />
        </DialogContent>
      </Dialog>
    </>
  );
};
