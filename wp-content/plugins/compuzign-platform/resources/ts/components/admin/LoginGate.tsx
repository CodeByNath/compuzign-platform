import { useState } from 'preact/hooks';
import type { ComponentChildren } from 'preact';

// Frontend-only presentation gate — session-scoped, no WordPress auth involved.
const VALID_USERNAME = 'Account Manager';
const VALID_PASSWORD = 'Compuzign2026';
const SESSION_KEY    = 'cz_admin_auth';

interface Props {
  children: ComponentChildren;
}

export function LoginGate({ children }: Props) {
  const [authed, setAuthed] = useState(
    () => sessionStorage.getItem(SESSION_KEY) === '1',
  );
  const [username, setUsername]       = useState('');
  const [password, setPassword]       = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError]             = useState('');

  if (authed) {
    return <>{children}</>;
  }

  const handleSubmit = (e: Event) => {
    e.preventDefault();
    if (username.trim() === VALID_USERNAME && password === VALID_PASSWORD) {
      sessionStorage.setItem(SESSION_KEY, '1');
      setAuthed(true);
    } else {
      setError('Incorrect username or password. Please try again.');
    }
  };

  const handleInput = () => {
    if (error) setError('');
  };

  return (
    <div class="cz-login-root">
      <div class="cz-login-card">

        {/* ── Brand ─────────────────────────────────────────────── */}
        <div class="cz-login-brand">
          <div class="cz-login-brand__mark">CZ</div>
          <p class="cz-login-brand__name">CompuZign</p>
          <p class="cz-login-brand__sub">Command Centre</p>
        </div>

        {/* ── Form ──────────────────────────────────────────────── */}
        <form class="cz-login-form" onSubmit={handleSubmit}>

          <div class="cz-login-field">
            <label class="cz-login-label" for="cz-login-username">Username</label>
            <input
              id="cz-login-username"
              type="text"
              class="cz-login-input"
              value={username}
              onInput={(e) => { setUsername((e.target as HTMLInputElement).value); handleInput(); }}
              placeholder="Enter username"
              autocomplete="username"
              autofocus
              required
            />
          </div>

          <div class="cz-login-field">
            <label class="cz-login-label" for="cz-login-password">Password</label>
            <div class="cz-login-input-wrap">
              <input
                id="cz-login-password"
                type={showPassword ? 'text' : 'password'}
                class="cz-login-input"
                value={password}
                onInput={(e) => { setPassword((e.target as HTMLInputElement).value); handleInput(); }}
                placeholder="Enter password"
                autocomplete="current-password"
                required
              />
              <button
                type="button"
                class="cz-login-eye"
                onClick={() => setShowPassword((s) => !s)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                tabIndex={-1}
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>

          {error && (
            <div class="cz-login-error" role="alert">{error}</div>
          )}

          <button type="submit" class="cz-login-btn">
            Access Command Centre
          </button>

        </form>

        {/* ── Footer ────────────────────────────────────────────── */}
        <p class="cz-login-footer">Powered by WeeraXStudio</p>

      </div>
    </div>
  );
}
