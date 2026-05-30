import { LoginGate } from './LoginGate';
import { AdminShell } from './AdminShell';

export function AdminApp() {
  return (
    <LoginGate>
      <AdminShell />
    </LoginGate>
  );
}
