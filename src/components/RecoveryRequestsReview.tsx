import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { securityRequest } from '@/lib/security/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

type Request = { id:string; description:string; status:string; created_at:string };
export function RecoveryRequestsReview() {
  const { user }=useAuth();
  const [requests,setRequests]=useState<Request[]>([]);
  const [allowed,setAllowed]=useState(false);
  const [response,setResponse]=useState('');
  const [selected,setSelected]=useState<string|null>(null);
  const [message,setMessage]=useState('');
  const [busy,setBusy]=useState(false);
  useEffect(()=>{
    if(!user) return;
    let alive=true;
    supabase.rpc('has_role',{_user_id:user.id,_role:'admin'}).then(async({data,error})=>{
      if(!alive || error || !data) return;
      setAllowed(true);
      const result=await supabase.from('account_recovery_requests').select('id,description,status,created_at').order('created_at',{ascending:false}).limit(50);
      if(alive) setRequests(result.data || []);
    });
    return ()=>{alive=false;};
  },[user?.id]);
  if(!allowed) return null;
  async function review(status:'reviewing'|'resolved'|'rejected') {
    if(!selected || !response.trim()) return;
    setBusy(true);
    try {
      await securityRequest('review_request',{request_id:selected,status,response:response.trim(),confirmed:true});
      setRequests(old=>old.map(r=>r.id===selected?{...r,status}:r));
      setSelected(null);setResponse('');setMessage('Ответ сохранён и отправлен владельцу. Контроль над аккаунтом не передавался.');
    } catch(e) {setMessage(e instanceof Error?e.message:'Не удалось сохранить ответ');}
    finally {setBusy(false);}
  }
  return <section className="border-t border-border pt-6 space-y-4"><h2 className="text-lg font-semibold">Обращения о восстановлении · администратор</h2>
    <p className="text-sm text-muted-foreground">Коды и пароли недоступны. Проверяйте доказательства владения; ответ не меняет пароль и не предоставляет доступ.</p>
    {message && <p role="status" className="text-sm">{message}</p>}
    {requests.map(r=><article key={r.id} className="border-b border-border py-3 space-y-2"><p className="text-xs text-muted-foreground break-all">{r.id} · {r.status} · {new Date(r.created_at).toLocaleString('ru-RU')}</p><p className="text-sm break-words">{r.description}</p><Button variant="outline" size="sm" onClick={()=>{setSelected(r.id);setResponse('');}}>Ответить</Button></article>)}
    {selected && <div className="space-y-3"><Textarea aria-label="Ответ поддержки" value={response} onChange={e=>setResponse(e.target.value)} maxLength={2000}/><div className="flex flex-wrap gap-2"><Button disabled={busy || !response.trim()} onClick={()=>review('reviewing')}>На проверке</Button><Button disabled={busy || !response.trim()} variant="outline" onClick={()=>review('resolved')}>Завершить обращение</Button><Button disabled={busy || !response.trim()} variant="outline" onClick={()=>review('rejected')}>Отклонить</Button></div></div>}
  </section>;
}