import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { isCompleteEmailOtp } from '@/lib/security/email-login';

export function EmailCodeLogin({ onSuccess }: { onSuccess: () => void }) {
  const [email, setEmail] = useState('');
  const [sentEmail, setSentEmail] = useState('');
  const [token, setToken] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const attempted = useRef('');
  const verifying = useRef(false);
  const success = useRef(onSuccess);
  success.current = onSuccess;
  useEffect(() => {
    if (!sentEmail || !isCompleteEmailOtp(token) || attempted.current === token) return;
    const timer = window.setTimeout(async () => {
      if (verifying.current) return;
      verifying.current = true; attempted.current = token; setBusy(true); setMessage('Проверяем код…');
      try {
        const { data, error } = await supabase.auth.verifyOtp({ email: sentEmail, token, type: 'email' });
        if (error || !data.session) { setMessage('Код неверный или истёк. Проверьте последнее письмо или запросите новое.'); return; }
        const { data: verified, error: userError } = await supabase.auth.getUser();
        if (userError || verified.user?.id !== data.session.user.id) { setMessage('Не удалось подтвердить вход. Попробуйте ещё раз.'); return; }
        setToken(''); success.current();
      } catch { setMessage('Не удалось проверить код. Проверьте подключение и запросите новый код.'); }
      finally { verifying.current = false; setBusy(false); }
    }, 800);
    return () => window.clearTimeout(timer);
  }, [token, sentEmail]);
  return <section className="space-y-3 border-t border-border pt-4 mt-4">
    <h3 className="font-semibold">Вход по письму</h3>
    <form className="space-y-3" onSubmit={async e => {
      e.preventDefault(); setBusy(true); setMessage('');
      try {
        const { error } = await supabase.auth.signInWithOtp({ email: email.trim(), options: { shouldCreateUser: false, emailRedirectTo: `${window.location.origin}/auth` } });
        if (error) { setMessage('Не удалось отправить письмо. Попробуйте позже.'); return; }
        setSentEmail(email.trim()); setToken(''); attempted.current = '';
        setMessage('Если аккаунт существует, письмо отправлено. Откройте ссылку; если письмо содержит одноразовый код, введите его ниже.');
      } catch { setMessage('Не удалось отправить письмо. Проверьте подключение.'); }
      finally { setBusy(false); }
    }}>
      <Input type="email" autoComplete="email" aria-label="Почта для входа по коду" placeholder="Электронная почта аккаунта" value={email} onChange={e => {setEmail(e.target.value);setSentEmail('');setToken('');}} maxLength={1000} disabled={busy} required />
      <Button type="submit" variant="outline" className="w-full" disabled={busy}>{sentEmail ? 'Отправить письмо ещё раз' : 'Получить письмо для входа'}</Button>
    </form>
    {sentEmail && <Input aria-label="Одноразовый код из письма" placeholder="Код из письма" inputMode="numeric" autoComplete="one-time-code" maxLength={8} value={token} disabled={busy} onChange={e => setToken(e.target.value.replace(/\D/g, ''))} />}
    {message && <p role="status" className="text-sm text-muted-foreground break-words">{message}</p>}
  </section>;
}