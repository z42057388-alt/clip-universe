import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { z } from 'npm:zod@4';
import { generateCode, validCode, digest, encryptCode, decryptCode } from './crypto.ts';

function allowedOrigin(origin: string) {
  return origin==='https://clip-universe.lovable.app' || origin==='http://localhost:8080' || /^https:\/\/id-preview--[a-z0-9-]+\.lovable\.app$/.test(origin);
}
const Body = z.object({
  action:z.enum(['status','create','rotate','reveal','recover','device','support','revoke_sessions','change_password','review_request']),
  code:z.string().max(40).optional(), password:z.string().max(1024).optional(),
  new_password:z.string().min(12).max(1024).optional(),
  request_id:z.string().uuid().optional(), status:z.enum(['reviewing','resolved','rejected']).optional(), response:z.string().min(1).max(2000).optional(),
  confirmed:z.boolean().optional(), revision:z.number().int().min(0).optional(),
  device:z.string().uuid().optional(), description:z.string().min(10).max(2000).optional(),
}).strict();
Deno.serve(async req => {
  const origin=req.headers.get('Origin') || '';
  const headers={...corsHeaders,'Access-Control-Allow-Origin':allowedOrigin(origin)?origin:'','Cache-Control':'no-store','Content-Type':'application/json','Vary':'Origin'};
  const reply=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers});
  if (req.method==='OPTIONS') return new Response(null,{headers});
  if (req.method!=='POST' || (origin && !allowedOrigin(origin))) return reply({error:'Запрос запрещён'},403);
  try {
    if (!req.headers.get('Content-Type')?.includes('application/json')) return reply({error:'Неверный запрос'},400);
    const raw=await req.text();
    if (raw.length>8192) return reply({error:'Слишком большой запрос'},400);
    let input:unknown;
    try { input=JSON.parse(raw); } catch { return reply({error:'Неверный запрос'},400); }
    const parsed=Body.safeParse(input);
    if (!parsed.success) return reply({error:'Проверьте введённые данные'},400);
    const body=parsed.data;
    const url=Deno.env.get('SUPABASE_URL'), anon=Deno.env.get('SUPABASE_ANON_KEY'), service=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'), secret=Deno.env.get('ACCOUNT_SECURITY_KEY');
    if (!url || !anon || !service || !secret) return reply({error:'Защита временно недоступна'},503);
    const admin=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});
    const auth=createClient(url,anon,{auth:{persistSession:false,autoRefreshToken:false}});
    const consume=async(bucket:string)=>{
      const {data,error}=await admin.rpc('consume_account_security_attempt',{_bucket:await digest(bucket,secret)});
      return !error && data===true;
    };
    const record=async(userId:string,event:string,message?:string)=>{
      const {error}=await admin.from('account_security_events').insert({user_id:userId,event_type:event});
      if(error) throw new Error('event');
      if(message) {
        const {error:e}=await admin.from('notifications').insert({user_id:userId,type:'security',message});
        if(e) throw new Error('notification');
      }
    };
    if(body.action==='recover') {
      // Ad-hoc protection; a dedicated proxy/CAPTCHA is needed against distributed attacks.
      const ip=req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('cf-connecting-ip') || 'unknown';
      if(!await consume(`recover-ip:${ip}`)) return reply({error:'Слишком много попыток. Попробуйте через 15 минут.'},429);
      if(!body.confirmed || !body.description || !validCode(body.code)) return reply({error:'Код неверный или был заменён'},400);
      const hash=await digest(`code:${body.code}`,secret);
      if(!await consume(`recover-code:${hash}`)) return reply({error:'Слишком много попыток. Попробуйте через 15 минут.'},429);
      const {data:stored,error}=await admin.from('account_security_codes').select('user_id').eq('code_hash',hash).maybeSingle();
      if(error || !stored) return reply({error:'Код неверный или был заменён'},400);
      const {data:ticket,error:e}=await admin.from('account_recovery_requests').insert({user_id:stored.user_id,description:body.description}).select('id').single();
      if(e) throw new Error('ticket');
      await record(stored.user_id,'support_requested','Получено обращение с действующим кодом безопасности. Автоматическая передача аккаунта не выполнялась.');
      return reply({request_id:ticket.id,verified:true,login_available:false});
    }
    const bearer=req.headers.get('Authorization');
    if(!bearer?.startsWith('Bearer ')) return reply({error:'Войдите в аккаунт'},401);
    const {data:verified,error:userError}=await auth.auth.getUser(bearer.slice(7));
    const user=verified.user;
    if(userError || !user) return reply({error:'Войдите в аккаунт'},401);
    if(body.action==='review_request') {
      const {data:isAdmin,error:roleError}=await admin.rpc('has_role',{_user_id:user.id,_role:'admin'});
      if(roleError || !isAdmin) return reply({error:'Недостаточно прав'},403);
      if(!body.confirmed || !body.request_id || !body.status || !body.response) return reply({error:'Укажите результат проверки и ответ'},400);
      const {data:ticket,error}=await admin.from('account_recovery_requests').update({status:body.status,response:body.response}).eq('id',body.request_id).select('user_id').single();
      if(error) return reply({error:'Обращение не найдено'},400);
      await record(ticket.user_id,'support_requested',`Ответ поддержки: ${body.response}`);
      return reply({ok:true});
    }
    if(body.action==='device') {
      if(!body.device) return reply({error:'Неверный запрос'},400);
      const {error}=await admin.from('account_security_devices').insert({user_id:user.id,device_hash:await digest(`device:${user.id}:${body.device}`,secret)});
      if(error && error.code!=='23505') throw new Error('device');
      if(!error) await record(user.id,'new_browser','Вход с нового браузера. Если это были не вы, завершите сеансы и обратитесь в поддержку.');
      return reply({ok:true});
    }
    if(body.action==='support') {
      if(!body.confirmed || !body.description) return reply({error:'Подтвердите отправку обращения'},400);
      if(!await consume(`support:${user.id}`)) return reply({error:'Попробуйте позже'},429);
      const {data,error}=await admin.from('account_recovery_requests').insert({user_id:user.id,description:body.description}).select('id').single();
      if(error) throw new Error('support');
      await record(user.id,'support_requested','Обращение о безопасности принято. Владение аккаунтом проверяется командой.');
      return reply({request_id:data.id});
    }
    const {data:stored,error:storedError}=await admin.from('account_security_codes').select('revision,updated_at,code_hash,encrypted_code').eq('user_id',user.id).maybeSingle();
    if(storedError) throw new Error('lookup');
    if(body.action==='status') return reply({exists:!!stored,revision:stored?.revision || 0,updated_at:stored?.updated_at || null});
    if(!await consume(`manage:${user.id}`)) return reply({error:'Слишком много попыток. Попробуйте через 15 минут.'},429);
    let proof=false;
    if(body.code && stored) proof=await digest(`code:${body.code}`,secret)===stored.code_hash;
    if(!proof && body.password && user.email) {
      const verifier=createClient(url,anon,{auth:{persistSession:false,autoRefreshToken:false}});
      const {data,error}=await verifier.auth.signInWithPassword({email:user.email,password:body.password});
      proof=!error && data.user?.id===user.id;
      if(data.session) await verifier.auth.signOut({scope:'local'});
    }
    // Initial enrollment only: require a fresh authenticated session, not a stale browser session.
    const {data:claims,error:claimError}=await auth.auth.getClaims(bearer.slice(7));
    const issuedAt=claims?.claims?.iat;
    const signedAt=Date.parse(user.last_sign_in_at || '');
    if(!stored && body.action==='create') proof=proof || (!claimError && typeof issuedAt==='number' && Date.now()-issuedAt*1000<300000 && Number.isFinite(signedAt) && Date.now()-signedAt<300000);
    if(!proof) return reply({error:'Подтвердите действие текущим паролем или действующим кодом. Для первого создания можно войти заново.'},403);
    if(body.action==='change_password') {
      if(!body.password || !body.new_password || !body.confirmed) return reply({error:'Укажите текущий и новый пароль'},400);
      // Use the signed-in user's normal Auth API; never an administrative password override.
      const result=await fetch(`${url}/auth/v1/user`,{method:'PUT',headers:{Authorization:bearer,apikey:anon,'Content-Type':'application/json'},body:JSON.stringify({password:body.new_password,current_password:body.password})});
      if(!result.ok) return reply({error:'Не удалось изменить пароль. Проверьте текущий пароль и требования к новому.'},400);
      await record(user.id,'password_changed','Пароль аккаунта изменён. Если это были не вы, обратитесь в поддержку.');
      return reply({ok:true});
    }
    if(body.action==='revoke_sessions') {
      if(!body.confirmed) return reply({error:'Подтвердите завершение сеансов'},400);
      const {error}=await admin.auth.admin.signOut(bearer.slice(7),'global');
      if(error) throw new Error('revoke');
      await record(user.id,'sessions_revoked','Все сеансы завершены. Уже выданные токены действуют до окончания их срока.');
      return reply({ok:true});
    }
    if(body.action==='reveal') {
      if(!stored) return reply({error:'Сначала создайте код'},400);
      const code=await decryptCode(stored.encrypted_code,secret,user.id);
      await record(user.id,'code_revealed');
      return reply({code,revision:stored.revision});
    }
    if(!body.confirmed || (body.action==='create' && stored) || (body.action==='rotate' && !stored)) return reply({error:'Подтвердите создание или замену кода'},400);
    if(body.revision!==(stored?.revision || 0)) return reply({error:'Код уже изменился. Обновите страницу.'},409);
    for(let attempt=0;attempt<5;attempt++) {
      const code=generateCode();
      const {data,error}=await admin.rpc('replace_account_security_code',{_user:user.id,_hash:await digest(`code:${code}`,secret),_encrypted:await encryptCode(code,secret,user.id),_expected:body.revision});
      if(!error) return reply({code,revision:data});
      if(error.code!=='23505') return reply({error:'Не удалось заменить код. Предыдущий код остаётся действительным.'},409);
    }
    return reply({error:'Не удалось создать уникальный код. Предыдущий код остаётся действительным.'},503);
  } catch { return reply({error:'Операция не выполнена. Попробуйте позже.'},500); }
});
