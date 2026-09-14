<?php if (!defined('COMPUZIGN_PLUGIN_PATH')) { return; }

/**
 * @var bool   $hasError
 * @var string $nonce
 */
?>
<div class="cz-admin-station cz-station-login-gate" data-station-theme="dark">
  <div class="cz-station-login-gate__card">
    <div class="cz-station-login-gate__brand">
      <div class="cz-station-login-gate__mark">CZ</div>
      <p class="cz-station-login-gate__name">CompuZign</p>
      <p class="cz-station-login-gate__sub">Admin Station</p>
    </div>

    <form class="cz-station-login-gate__form" method="post" action="">
      <input type="hidden" name="<?php echo esc_attr(\CompuZign\Platform\Modules\AdminStation\AdminStationAuth::NONCE_FIELD); ?>" value="<?php echo esc_attr($nonce); ?>">

      <div class="cz-tf-field">
        <label class="cz-tf-label" for="cz_as_username">Username</label>
        <div class="cz-station-login-gate__control-wrap">
          <svg class="cz-station-login-gate__control-icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false">
            <path fill-rule="evenodd" d="M7.5 6a4.5 4.5 0 1 1 9 0 4.5 4.5 0 0 1-9 0ZM3.751 20.105a8.25 8.25 0 0 1 16.498 0 .75.75 0 0 1-.437.695A18.683 18.683 0 0 1 12 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 0 1-.437-.695Z" clip-rule="evenodd" />
          </svg>
          <input
            class="cz-tf-control cz-tf-input cz-tf-control--lg"
            type="text"
            name="cz_username"
            id="cz_as_username"
            autocomplete="username"
            required
            <?php echo !$hasError ? 'autofocus' : ''; ?>
          >
        </div>
      </div>

      <div class="cz-tf-field">
        <label class="cz-tf-label" for="cz_as_password">Password</label>
        <div class="cz-station-login-gate__control-wrap cz-station-login-gate__password-wrap">
          <svg class="cz-station-login-gate__control-icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false">
            <path fill-rule="evenodd" d="M12 1.5a5.25 5.25 0 0 0-5.25 5.25v3a3 3 0 0 0-3 3v6.75a3 3 0 0 0 3 3h10.5a3 3 0 0 0 3-3v-6.75a3 3 0 0 0-3-3v-3c0-2.9-2.35-5.25-5.25-5.25Zm3.75 8.25v-3a3.75 3.75 0 1 0-7.5 0v3h7.5Z" clip-rule="evenodd" />
          </svg>
          <input
            class="cz-tf-control cz-tf-input cz-tf-control--lg"
            type="password"
            name="cz_password"
            id="cz_as_password"
            autocomplete="current-password"
            required
            <?php echo $hasError ? 'autofocus' : ''; ?>
          >
          <button type="button" class="cz-station-login-gate__toggle" data-cz-toggle-password aria-label="Show password" aria-pressed="false">Show</button>
        </div>
      </div>

      <?php if ($hasError): ?>
      <div class="cz-admin-error-msg" role="alert">Incorrect username or password. Please try again.</div>
      <?php endif; ?>

      <button type="submit" class="cz-admin-btn cz-admin-btn--primary cz-station-login-gate__submit">Sign in</button>
    </form>

    <div class="cz-station-login-gate__divider"></div>
    <p class="cz-station-login-gate__footer">Powered by WeeraXStudios</p>
  </div>
</div>
<script>
(function () {
  var toggle = document.currentScript.previousElementSibling.querySelector('[data-cz-toggle-password]');
  if (!toggle) { return; }
  toggle.addEventListener('click', function () {
    var field = toggle.previousElementSibling;
    var showing = field.type === 'text';
    field.type = showing ? 'password' : 'text';
    toggle.textContent = showing ? 'Show' : 'Hide';
    toggle.setAttribute('aria-pressed', showing ? 'false' : 'true');
    toggle.setAttribute('aria-label', showing ? 'Show password' : 'Hide password');
  });
})();
</script>
