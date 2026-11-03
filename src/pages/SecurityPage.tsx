import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Copy, Eye, EyeOff, RefreshCw, ShieldCheck, LogOut } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { createClient } from '@supabase/supabase-js';
import { removeAccount } from '@/lib/accounts';
import { securityRequest } from '@/lib/security/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { SecurityWarning } from '@/components/SecurityWarning';
import { AlertDialog, AlertDialogContent, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '@/components/ui/alert-dialog';

type Event = {id:string;event_type:string;created_at:string};
const labels:Record<string,string>={code_created:'Код создан',code_rotated:'Код заменён',code_revealed:'Код показан владельцу',code_login:'Вход по коду',password_changed:'Пароль изменён',sessions_revoked:'Сеансы завершены',new_browser:'Новый браузер (не обязательно подозрительный)',support_requested:'Обращение в поддержку'};
export default function SecurityPage() {
  const { user, loading }=useAuth();
  const navigate=useNavigate();
  const [status,setStatus]=useState<{exists:boolean;revision:number}|null>(null);
  const [code,setCode]=useState('');
  const [proof,setProof]=useState('');
  const [proofType,setProofType]=useState<'password'|'code'>('password');
  const [message,setMessage]=useState('');
  const [busy,setBusy]=useState(false);
  const [confirm,setConfirm]=useState<'create'|'rotate'|'revoke_sessions'|null>(null);
  const [events,setEvents]=useState<Event[]>([]);
  const [description,setDescription]=useState('');
  const [currentPassword,setCurrentPassword]=useState('');
  const [newPassword,setNewPassword]=useState('');
  const [repeatPassword,setRepeatPassword]=useState('');
  const [requests,setRequests]=useState<{id:string;status:string;response:string|null;created_at:string}[]>([]);
  const refresh=async()=>{
    const result=await securityRequest('status'); setStatus(result);
    if(!user) return;
    const [history,tickets]=await Promise.all([
      supabase.from('account_security_events').select('id,event_type,created_at').eq('user_id',user.id).order('created_at',{ascending:false}).limit(30),
      supabase.from('account_recovery_requests').select('id,status,response,created_at').eq('user_id',user.id).order('created_at',{ascending:false}).limit(10),
    ]);
    setEvents(history.data || []); setRequests(tickets.data || []);
  };
  useEffect(()=>{
    if(loading) return;
    if(!user) { navigate('/auth?next=/settings/security',{replace:true}); return; }
    let alive=true;
    securityRequest('status').then(result=>{if(alive) setStatus(result);}).catch(e=>{if(alive) setMessage(e.message);});
    supabase.from('account_security_events').select('id,event_type,created_at').eq('user_id',user.id).order('created_at',{ascending:false}).limit(30).then(({data})=>{if(alive)setEvents(data || []);});
    supabase.from('account_recovery_requests').select('id,status,response,created_at').eq('user_id',user.id).order('created_at',{ascending:false}).limit(10).then(({data})=>{if(alive)setRequests(data || []);});
    return ()=>{alive=false;};
  },[user?.id,loading,navigate]);
  async function operate(action:'create'|'rotate'|'reveal'|'revoke_sessions') {
    setBusy(true);setMessage('');
    try {
      const result=await securityRequest(action,{[proofType]:proof,confirmed:action!=='reveal',...(action==='create'||action==='rotate'?{revision:status?.revision || 0}:{})});
      setProof('');
      if(action==='revoke_sessions') {
        if(user) removeAccount(user.id);
        await supabase.auth.signOut({scope:'local'}); navigate('/auth'); return;
      }
      setCode(result.code);setStatus({exists:true,revision:result.revision});
      setMessage(action==='reveal'?'Код показан. Не передавайте его другим людям.':'Новый код безопасности успешно создан. Сохраните его в надёжном месте');
      await refresh();
    } catch(e) {setMessage(e instanceof Error?e.message:'Операция не выполнена');}
    finally {setBusy(false);setConfirm(null);}
  }
  async function changePassword(e:React.FormEvent) {
    e.preventDefault();
    if(newPassword.length<12 || newPassword!==repeatPassword) {setMessage('Новый пароль: минимум 12 символов; оба поля должны совпадать.');return;}
    setBusy(true);setMessage('');
    try {
      if (!user?.email) { setMessage('Для изменения пароля потребуется подтверждённая почта.'); return; }
      const verifier = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
      const { data: verified, error: verifyError } = await verifier.auth.signInWithPassword({ email: user.email, password: currentPassword });
      if (verifyError || verified.user?.id !== user.id) { setMessage('Текущий пароль неверный.'); return; }
      if (verified.session) await verifier.auth.signOut({ scope: 'local' });
      const {error}=await supabase.auth.updateUser({password:newPassword,current_password:currentPassword});
      if(error) {setMessage('Не удалось изменить пароль. Проверьте текущий пароль и требования к новому.');return;}
      setCurrentPassword('');setNewPassword('');setRepeatPassword('');
      setMessage('Пароль изменён. При подозрении на взлом завершите все сеансы и замените код безопасности.');
      await refresh();
    } finally {setBusy(false);}
  }
  async function sendSupport(e:React.FormEvent) {
    e.preventDefault();setBusy(true);
    try {
      const result=await securityRequest('support',{description,confirmed:true});
      setMessage(`Обращение ${result.request_id} создано. Бот не подключён; автоматической передачи аккаунта нет.`);setDescription('');await refresh();
    } catch(e) {setMessage(e instanceof Error?e.message:'Не удалось отправить обращение');}
    finally {setBusy(false);}
  }
  if(loading || !user) return <div className="min-h-screen bg-background p-6 text-muted-foreground">Загрузка…</div>;
  return <div className="min-h-screen bg-background text-foreground"><main className="max-w-2xl mx-auto p-4 sm:p-8 space-y-8">
    <Button variant="ghost" onClick={()=>navigate('/profile/edit')}><ArrowLeft className="mr-2 h-4 w-4"/>Настройки аккаунта</Button>
    <header className="space-y-2"><ShieldCheck className="h-8 w-8 text-primary"/><h1 className="text-2xl font-bold">Код безопасности</h1><p className="text-muted-foreground">Действует бессрочно, пока вы не замените его. Сохраните код в надёжном месте.</p></header>
    {message && <p role="status" className="border-l-2 border-primary pl-3 text-sm break-words">{message}</p>}
    <section className="space-y-4">
      <p className="text-sm text-muted-foreground">{!status?'Проверяем состояние защиты…':status.exists?'Код уже создан. По умолчанию он скрыт.':'Защита ещё не включена. Создайте свой уникальный код.'}</p>
      <div className="flex items-start gap-2 border border-border rounded-md p-3 min-h-14">
        <output aria-label="Текущий код безопасности" className="font-mono break-all flex-1 min-w-0">{code || (status?.exists?'••••••••••••••••••••••••':'Код ещё не создан')}</output>
        {status?.exists && <Button variant="ghost" size="icon" aria-label={code?'Скрыть код':'Показать код'} title={code?'Скрыть код':'Показать код'} disabled={busy} onClick={()=>code?setCode(''):operate('reveal')}>{code?<EyeOff className="h-4 w-4"/>:<Eye className="h-4 w-4"/>}</Button>}
        <Button variant="ghost" size="icon" aria-label="Скопировать код" title="Скопировать код" disabled={!code || busy} onClick={async()=>{try{await navigator.clipboard.writeText(code);setMessage('Код скопирован. Сохраните его в надёжном месте.');}catch{setMessage('Не удалось скопировать. Сохраните показанный код вручную.');}}}><Copy className="h-4 w-4"/></Button>
      </div>
      <fieldset className="space-y-2"><legend className="text-sm mb-2">Подтверждение владельца</legend><div className="flex gap-4 text-sm">
        <label className="flex items-center gap-2"><input type="radio" name="proof" checked={proofType==='password'} onChange={()=>{setProofType('password');setProof('');}}/>Текущий пароль</label>
        <label className="flex items-center gap-2"><input type="radio" name="proof" checked={proofType==='code'} onChange={()=>{setProofType('code');setProof('');}}/>Действующий код</label>
      </div><Input type="password" autoComplete="off" aria-label={proofType==='password'?'Пароль для подтверждения':'Код для подтверждения'} value={proof} onChange={e=>setProof(e.target.value)} placeholder={proofType==='password'?'Текущий пароль':'Действующий код без изменений'}/></fieldset>
      <p className="text-xs text-muted-foreground">Для первого создания можно войти заново и создать код в течение 5 минут. Показ и замена требуют текущий пароль или код.</p>
      <Button disabled={busy || !status} onClick={()=>setConfirm(status?.exists?'rotate':'create')} className="w-full sm:w-auto whitespace-normal"><RefreshCw className="h-4 w-4 mr-2 shrink-0"/>{status?.exists?'Сгенерировать новый код':'Создать код безопасности'}</Button>
      <p className="text-sm text-muted-foreground">После успешной замены предыдущий код перестанет работать. При ошибке он останется действительным. Пробелы, регистр и каждый символ имеют значение.</p>
      <p className="text-sm text-muted-foreground">Вход только по коду пока не поддерживается. Код используется для подтверждения обращения о восстановлении.</p>
    </section>
    <SecurityWarning/>
    <section className="border-t border-border pt-6 space-y-4"><h2 className="text-lg font-semibold">Изменить пароль</h2><form onSubmit={changePassword} className="space-y-3">
      <Input type="password" autoComplete="current-password" aria-label="Текущий пароль" placeholder="Текущий пароль" value={currentPassword} onChange={e=>setCurrentPassword(e.target.value)} required/>
      <Input type="password" autoComplete="new-password" aria-label="Новый пароль" placeholder="Новый пароль · минимум 12 символов" value={newPassword} onChange={e=>setNewPassword(e.target.value)} minLength={12} required/>
      <Input type="password" autoComplete="new-password" aria-label="Повторите пароль" placeholder="Повторите новый пароль" value={repeatPassword} onChange={e=>setRepeatPassword(e.target.value)} required/>
      <Button disabled={busy} type="submit">Изменить пароль</Button>
    </form></section>
    <section className="border-t border-border pt-6 space-y-3"><h2 className="text-lg font-semibold">Активные сеансы</h2><p className="text-sm text-muted-foreground">Выйти на всех устройствах, включая это. Уже выданные токены могут действовать до окончания срока; дальнейшее обновление сеансов прекращается.</p><Button variant="outline" disabled={busy} onClick={()=>setConfirm('revoke_sessions')}><LogOut className="h-4 w-4 mr-2"/>Завершить все сеансы</Button></section>
    <section className="border-t border-border pt-6 space-y-3"><h2 className="text-lg font-semibold">Сообщить о взломе</h2><p className="text-sm text-muted-foreground">Опишите проблему и доказательства владения. Не отправляйте код или пароль. Обращение не завершает чужие сеансы и не передаёт аккаунт.</p><form onSubmit={sendSupport} className="space-y-3"><Textarea aria-label="Обращение о взломе" value={description} onChange={e=>setDescription(e.target.value)} minLength={10} maxLength={2000} required/><Button type="submit" disabled={busy}>Создать обращение</Button><Button variant="ghost" type="button" onClick={()=>navigate('/chat')}>Чат поддержки</Button></form>
      {requests.map(r=><div key={r.id} className="text-sm border-b border-border py-2 break-words"><p>{r.id} · {r.status==='pending'?'Ожидает проверки':r.status}</p>{r.response && <p>{r.response}</p>}</div>)}
    </section>
    <section className="border-t border-border pt-6 space-y-3"><h2 className="text-lg font-semibold">Журнал безопасности</h2>{events.length?events.map(event=><div className="flex flex-wrap justify-between gap-2 py-2 border-b border-border text-sm" key={event.id}><span>{labels[event.event_type] || 'Событие безопасности'}</span><time className="text-muted-foreground">{new Date(event.created_at).toLocaleString('ru-RU')}</time></div>):<p className="text-sm text-muted-foreground">Событий пока нет.</p>}</section>
    <AlertDialog open={!!confirm} onOpenChange={open=>{if(!open)setConfirm(null);}}><AlertDialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-lg"><AlertDialogTitle>{confirm==='revoke_sessions'?'Завершить все сеансы?':'Создать новый код безопасности?'}</AlertDialogTitle><AlertDialogDescription>{confirm==='revoke_sessions'?'Вы выйдете из аккаунта на всех устройствах. Для продолжения потребуется снова войти.':'Вы уверены, что хотите создать новый код безопасности? После успешной замены предыдущий код перестанет действовать.'}</AlertDialogDescription><AlertDialogFooter><AlertDialogCancel disabled={busy}>Отмена</AlertDialogCancel><AlertDialogAction disabled={busy} onClick={e=>{e.preventDefault();if(confirm)operate(confirm);}}>Подтвердить</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </main></div>;
}
