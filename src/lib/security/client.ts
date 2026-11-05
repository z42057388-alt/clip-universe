import { supabase } from '@/integrations/supabase/client';
export type SecurityAction = 'status'|'send_email_proof'|'create'|'rotate'|'reveal'|'recover'|'device'|'support'|'revoke_sessions'|'change_password'|'review_request';
export async function securityRequest(action: SecurityAction, values: Record<string, unknown> = {}) {
  const { data, error } = await supabase.functions.invoke('account-security', { body: { action, ...values } });
  if (error) {
    let message='Операция не выполнена. Попробуйте позже.';
    if (error.context instanceof Response) {
      try { const body=await error.context.json(); if(typeof body.error==='string') message=body.error; } catch { /* do not disclose transport details */ }
    }
    throw new Error(message);
  }
  if (!data || data.error) throw new Error(data?.error || 'Защита временно недоступна');
  return data;
}
