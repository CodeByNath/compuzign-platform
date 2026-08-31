<?php if (!defined('COMPUZIGN_PLUGIN_PATH')) { return; }

/**
 * @var bool   $hasError
 * @var string $nonce
 * @var string $redirectTarget
 */
?>
<div class="cz-station-login-gate">
  <div class="cz-station-login-gate__card">
    <div class="cz-station-login-gate__brand">
      <div class="cz-station-login-gate__mark">CZ</div>
      <p class="cz-station-login-gate__name">CompuZign</p>
      <p class="cz-station-login-gate__sub">Admin Station</p>
    </div>

    <form class="cz-station-login-gate__form" method="post" action="">
      <input type="hidden" name="<?php echo esc_attr(\CompuZign\Platform\Modules\AdminStation\AdminStationAuth::NONCE_FIELD); ?>" value="<?php echo esc_attr($nonce); ?>">
      <input type="hidden" name="<?php echo esc_attr(\CompuZign\Platform\Modules\AdminStation\AdminStationAuth::REDIRECT_FIELD); ?>" value="<?php echo esc_attr($redirectTarget); ?>">

      <div class="cz-tf-field">
        <label class="cz-tf-label" for="cz_as_username">Username</label>
        <input
          class="cz-tf-control cz-tf-input"
          type="text"
          name="cz_username"
          id="cz_as_username"
          autocomplete="username"
          required
          <?php echo !$hasError ? 'autofocus' : ''; ?>
        >
      </div>

      <div class="cz-tf-field">
        <label class="cz-tf-label" for="cz_as_password">Password</label>
        <div class="cz-station-login-gate__password-wrap">
          <input
            class="cz-tf-control cz-tf-input"
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
