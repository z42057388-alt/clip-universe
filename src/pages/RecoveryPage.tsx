import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { securityRequest } from '@/lib/security/client';
import { supabase } from '@/integrations/supabase/client';
export default function RecoveryPage() {
 const [code,setCode]=useState(''),[description,setDescription]=useState(''),[email,setEmail]=useState(''),[message,setMessage]=useState('');
 const [busy,setBusy]=useState(false);
 return <main className="min-h-screen bg-background text-foreground p-4"><div className="max-w-md mx-auto py-8 space-y-6"><Link to="/auth" className="text-primary">← Вход в VidTube</Link><h1 className="text-2xl font-bold">Восстановление доступа</h1><p className="text-sm text-muted-foreground">Вход только по коду пока недоступен. Действующий код подтверждает владение при создании обращения; почта и другие сведения не раскрываются.</p>{message && <p role="status" className="break-words text-sm border-l-2 border-primary pl-3">{message}</p>}
 <form className="space-y-3" onSubmit={async e=>{e.preventDefault();setBusy(true);setMessage('');try{const data=await securityRequest('recover',{code,description,confirmed:true});setCode('');setDescription('');setMessage(`Код подтверждён. Обращение ${data.request_id} создано. Ожидается ручная проверка; бот не подключён.`);}catch(e){setMessage(e instanceof Error?e.message:'Не удалось проверить код');}finally{setBusy(false);}}}>
 <label className="block text-sm" htmlFor="recovery-code">Код безопасности</label><Input id="recovery-code" type="password" autoComplete="off" value={code} onChange={e=>setCode(e.target.value)} minLength={20} maxLength={40} required/>
 <p className="text-xs text-muted-foreground">Введите точно: регистр и каждый символ важны. Не добавляйте пробелы. После 5 попыток действует блокировка на 15 минут.</p>
 <label className="block text-sm" htmlFor="recovery-description">Проблема и контакт для ответа (без кода и пароля)</label><Textarea id="recovery-description" value={description} onChange={e=>setDescription(e.target.value)} minLength={10} maxLength={2000} required/>
 <Button type="submit" disabled={busy} className="w-full">Подтвердить код и создать обращение</Button></form>
 <section className="border-t border-border pt-6 space-y-3"><h2 className="font-semibold">Восстановить по почте</h2><p className="text-sm text-muted-foreground">Если почта сохранилась, получите ссылку для установки нового пароля.</p><form className="space-y-3" onSubmit={async e=>{e.preventDefault();setBusy(true);try{await supabase.auth.resetPasswordForEmail(email,{redirectTo:`${window.location.origin}/reset-password`});setMessage('Если адрес зарегистрирован и отправка доступна, на него придёт ссылка. Проверьте также спам.');}finally{setBusy(false);}}}><Input type="email" autoComplete="email" aria-label="Почта для восстановления" placeholder="Ваша почта" value={email} onChange={e=>setEmail(e.target.value)} required/><Button variant="outline" type="submit" disabled={busy}>Отправить ссылку</Button></form></section>
 <p className="text-xs text-muted-foreground">Потеряли и код, и почту? Нужна ручная проверка доказательств владения командой VidTube. Неподтверждённое обращение не даёт доступ к аккаунту.</p></div></main>;
}
