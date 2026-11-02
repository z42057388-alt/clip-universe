import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
export default function ResetPasswordPage() {
 const [ready,setReady]=useState(false),[password,setPassword]=useState(''),[repeat,setRepeat]=useState(''),[message,setMessage]=useState(''),[busy,setBusy]=useState(false);
 const navigate=useNavigate();
 useEffect(()=>{
  const recoveryHash=new URLSearchParams(window.location.hash.slice(1)).get('type')==='recovery';
  const {data:{subscription}}=supabase.auth.onAuthStateChange((event,session)=>{if(event==='PASSWORD_RECOVERY' && session)setReady(true);});
  if(recoveryHash) supabase.auth.getUser().then(({data,error})=>{if(!error && data.user)setReady(true);});
  return ()=>subscription.unsubscribe();
 },[]);
 return <main className="min-h-screen bg-background text-foreground p-4"><div className="max-w-sm mx-auto py-12 space-y-4"><h1 className="text-2xl font-bold">Новый пароль VidTube</h1>{message && <p role="status" className="text-sm">{message}</p>}{ready?<form className="space-y-3" onSubmit={async e=>{e.preventDefault();if(password.length<12 || password!==repeat){setMessage('Минимум 12 символов; пароли должны совпадать.');return;}setBusy(true);const {error}=await supabase.auth.updateUser({password});setBusy(false);if(error){setMessage('Не удалось изменить пароль. Запросите новую ссылку или проверьте требования к паролю.');return;}setPassword('');setRepeat('');setMessage('Пароль изменён.');navigate('/settings/security');}}><Input type="password" autoComplete="new-password" aria-label="Новый пароль восстановления" placeholder="Новый пароль" minLength={12} value={password} onChange={e=>setPassword(e.target.value)} required/><Input type="password" autoComplete="new-password" aria-label="Повторите пароль восстановления" placeholder="Повторите пароль" value={repeat} onChange={e=>setRepeat(e.target.value)} required/><Button type="submit" disabled={busy}>Сохранить новый пароль</Button></form>:<p className="text-muted-foreground text-sm">Откройте действующую ссылку восстановления из письма. Если она истекла, запросите новую.</p>}<Link to="/recover" className="block text-primary">Запросить ссылку восстановления</Link></div></main>;
}
