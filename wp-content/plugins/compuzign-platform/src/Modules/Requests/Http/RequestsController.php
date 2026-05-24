<?php

namespace CompuZign\Platform\Modules\Requests\Http;

class RequestsController
{
    public function register(): void
    {
        add_action('rest_api_init', [$this, 'registerRoutes']);
    }

    public function registerRoutes(): void
    {
        register_rest_route('compuzign/v1', '/requests/submit', [
            'methods'             => 'POST',
            'callback'            => [$this, 'submitRequest'],
            'permission_callback' => '__return_true',
        ]);
    }

    public function submitRequest(\WP_REST_Request $request): \WP_REST_Response
    {
        // ── Type guard ──────────────────────────────────────────────────────
        $type = sanitize_text_field((string) $request->get_param('type'));
        if ($type !== 'quote_cart') {
            return new \WP_REST_Response(
                ['success' => false, 'message' => 'Invalid request type.'],
                400
            );
        }

        // ── Sanitise inputs ──────────────────────────────────────────────────
        $contact  = sanitize_text_field((string) ($request->get_param('contact') ?? ''));
        $email    = sanitize_email((string) ($request->get_param('email') ?? ''));
        $company  = sanitize_text_field((string) ($request->get_param('company') ?? ''));
        $phone    = sanitize_text_field((string) ($request->get_param('phone') ?? ''));
        $notes    = sanitize_textarea_field((string) ($request->get_param('notes') ?? ''));
        $quoteRef = sanitize_text_field((string) ($request->get_param('quote_ref') ?? ''));
        $rawItems = $request->get_param('items');

        // ── Required-field validation ────────────────────────────────────────
        if ($contact === '') {
            return new \WP_REST_Response(
                ['success' => false, 'message' => 'Contact name is required.'],
                422
            );
        }

        if ($email === '' || !is_email($email)) {
            return new \WP_REST_Response(
                ['success' => false, 'message' => 'A valid email address is required.'],
                422
            );
        }

        if (empty($rawItems) || !is_array($rawItems)) {
            return new \WP_REST_Response(
                ['success' => false, 'message' => 'At least one service item is required.'],
                422
            );
        }

        // ── Accept client-generated ref if well-formed, otherwise mint one ───
        if (!preg_match('/^CZ-[A-Z0-9]{6}$/', $quoteRef)) {
            $quoteRef = 'CZ-' . strtoupper(substr(md5(uniqid('cz', true)), 0, 6));
        }

        // ── Sanitise items array ─────────────────────────────────────────────
        $items = [];
        foreach ($rawItems as $raw) {
            if (!is_array($raw)) {
                continue;
            }
            $price = null;
            if (isset($raw['price']) && $raw['price'] !== null) {
                $price = floatval($raw['price']);
            }
            $features = [];
            if (isset($raw['features']) && is_array($raw['features'])) {
                $features = array_values(array_map('sanitize_text_field', $raw['features']));
            }
            $items[] = [
                'serviceId'    => intval($raw['serviceId'] ?? 0),
                'serviceTitle' => sanitize_text_field((string) ($raw['serviceTitle'] ?? '')),
                'categoryName' => sanitize_text_field((string) ($raw['categoryName'] ?? '')),
                'tierTitle'    => sanitize_text_field((string) ($raw['tierTitle'] ?? '')),
                'tierId'       => sanitize_text_field((string) ($raw['tierId'] ?? '')),
                'price'        => $price,
                'billingCycle' => sanitize_text_field((string) ($raw['billingCycle'] ?? '')),
                'features'     => $features,
            ];
        }

        // ── Persist to transient (7 days) ────────────────────────────────────
        $payload = [
            'type'      => 'quote_cart',
            'quote_ref' => $quoteRef,
            'contact'   => $contact,
            'company'   => $company,
            'email'     => $email,
            'phone'     => $phone,
            'notes'     => $notes,
            'items'     => $items,
            'submitted' => current_time('mysql'),
        ];
        set_transient('cz_quote_' . $quoteRef, $payload, 7 * DAY_IN_SECONDS);

        // ── Email notifications ──────────────────────────────────────────────
        $adminEmail = (string) get_option('admin_email');
        $siteTitle  = (string) get_bloginfo('name');
        $headers    = ['Content-Type: text/html; charset=UTF-8'];

        wp_mail(
            $adminEmail,
            "[{$siteTitle}] New Quote Request — {$quoteRef}",
            $this->buildAdminHtmlEmail($payload),
            $headers
        );

        wp_mail(
            $email,
            "Your quote request has been received — {$quoteRef}",
            $this->buildCustomerHtmlEmail($payload, $siteTitle),
            $headers
        );

        return new \WP_REST_Response([
            'success'  => true,
            'quote_id' => $quoteRef,
            'message'  => 'Your quote request has been received. We will be in touch within one business day.',
        ], 200);
    }

    // ── Email helpers ────────────────────────────────────────────────────────

    /**
     * Groups item prices by billing cycle; counts unpriced items.
     *
     * @param  array<int, array<string, mixed>> $items
     * @return array{cycleGroups: array<string, float>, unpricedCount: int}
     */
    private function calcTotals(array $items): array
    {
        $cycleGroups   = [];
        $unpricedCount = 0;

        foreach ($items as $item) {
            if ($item['price'] === null) {
                $unpricedCount++;
                continue;
            }
            $cycle               = $item['billingCycle'] ?: 'one-time';
            $cycleGroups[$cycle] = ($cycleGroups[$cycle] ?? 0.0) + (float) $item['price'];
        }

        return ['cycleGroups' => $cycleGroups, 'unpricedCount' => $unpricedCount];
    }

    /**
     * Builds the <tr> rows for the service table used in both email templates.
     *
     * @param array<int, array<string, mixed>> $items
     */
    private function emailServiceRows(array $items): string
    {
        $html = '';

        foreach ($items as $item) {
            $price   = $item['price'] !== null
                ? '$' . number_format((float) $item['price'], 2)
                : 'Custom pricing';
            $cycle   = $item['billingCycle'] !== '' ? ' / ' . ucfirst((string) $item['billingCycle']) : '';
            $isAddon = (int) $item['serviceId'] < 0;
            $badge   = $isAddon
                ? ' <span style="font-size:10px;background:#f0f0f0;padding:1px 6px;border-radius:8px;color:#888;">add-on</span>'
                : '';
            $title   = esc_html((string) $item['serviceTitle']);
            $tier    = esc_html((string) $item['tierTitle']);
            $billing = $item['billingCycle'] !== '' ? 'Billed ' . esc_html(ucfirst((string) $item['billingCycle'])) : '';

            $html .= "
              <tr>
                <td style=\"padding:11px 14px;border-bottom:1px solid #f0f0f0;\">
                  <div style=\"font-size:13px;font-weight:600;color:#111;\">{$title}{$badge}</div>
                  <div style=\"font-size:11px;color:#999;margin-top:2px;\">{$tier} tier &nbsp;·&nbsp; {$billing}</div>
                </td>
                <td style=\"padding:11px 14px;border-bottom:1px solid #f0f0f0;text-align:right;white-space:nowrap;\">
                  <span style=\"font-size:14px;font-weight:700;color:#111;\">{$price}</span>
                  <span style=\"font-size:11px;color:#999;\">{$cycle}</span>
                </td>
              </tr>";
        }

        return $html;
    }

    /**
     * Builds the totals block (border-top + one row per billing cycle).
     *
     * @param array{cycleGroups: array<string, float>, unpricedCount: int} $totals
     */
    private function emailTotalsBlock(array $totals): string
    {
        if (empty($totals['cycleGroups'])) {
            return '
              <tr>
                <td style="padding:0 28px 24px;">
                  <table role="presentation" cellpadding="0" cellspacing="0" width="100%"
                         style="border-top:2px solid #111;padding-top:12px;">
                    <tr>
                      <td style="font-size:13px;color:#666;">Pricing on request</td>
                      <td style="text-align:right;font-size:16px;font-weight:700;color:#111;">Contact Us</td>
                    </tr>
                  </table>
                </td>
              </tr>';
        }

        $rows = '';

        foreach ($totals['cycleGroups'] as $cycle => $amount) {
            $label  = esc_html(ucfirst((string) $cycle));
            $suffix = $cycle !== 'one-time' ? ' / ' . esc_html(ucfirst((string) $cycle)) : '';
            $rows  .= "
                <tr>
                  <td style=\"padding:10px 0;\">
                    <span style=\"font-size:13px;color:#666;\">Estimated {$label} total</span>
                  </td>
                  <td style=\"text-align:right;padding:10px 0;\">
                    <span style=\"font-size:22px;font-weight:800;color:#111;\">\$" . number_format($amount, 2) . "</span>
                    <span style=\"font-size:12px;color:#999;\">{$suffix}</span>
                  </td>
                </tr>";
        }

        if ($totals['unpricedCount'] > 0) {
            $n     = (int) $totals['unpricedCount'];
            $rows .= "
                <tr>
                  <td colspan=\"2\" style=\"padding:4px 0;\">
                    <span style=\"font-size:11px;color:#999;font-style:italic;\">
                      + {$n} item(s) at custom pricing — included in our proposal response.
                    </span>
                  </td>
                </tr>";
        }

        return "
          <tr>
            <td style=\"padding:0 28px 24px;\">
              <table role=\"presentation\" cellpadding=\"0\" cellspacing=\"0\" width=\"100%\"
                     style=\"border-top:2px solid #111;padding-top:8px;\">
                {$rows}
              </table>
            </td>
          </tr>";
    }

    /** @param array<string, mixed> $data */
    private function buildAdminHtmlEmail(array $data): string
    {
        $totals      = $this->calcTotals($data['items']);
        $serviceRows = $this->emailServiceRows($data['items']);
        $totalsBlock = $this->emailTotalsBlock($totals);

        $contact   = esc_html((string) $data['contact']);
        $company   = esc_html($data['company'] !== '' ? (string) $data['company'] : '—');
        $email     = esc_html((string) $data['email']);
        $phone     = esc_html($data['phone'] !== '' ? (string) $data['phone'] : '—');
        $quoteRef  = esc_html((string) $data['quote_ref']);
        $submitted = esc_html((string) $data['submitted']);

        $notesRow = $data['notes'] !== ''
            ? '<tr><td colspan="2" style="padding:10px 14px;font-size:13px;color:#555;border-top:1px solid #ebebeb;line-height:1.5;">'
              . nl2br(esc_html((string) $data['notes']))
              . '</td></tr>'
            : '';

        return <<<HTML
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:Arial,Helvetica,sans-serif;">
<table role="presentation" cellpadding="0" cellspacing="0" width="100%"
       style="background:#f4f4f4;padding:24px 16px;">
  <tr><td align="center">
  <table role="presentation" cellpadding="0" cellspacing="0" width="600"
         style="max-width:600px;width:100%;background:#ffffff;border-radius:8px;
                overflow:hidden;border:1px solid #e0e0e0;">

    <!-- HEADER -->
    <tr><td style="background:#0f0f0f;padding:20px 28px;">
      <span style="color:#FFDA17;font-size:18px;font-weight:800;letter-spacing:-0.5px;">CompuZign</span>
      <span style="color:#555;font-size:10px;margin-left:12px;text-transform:uppercase;
                   letter-spacing:1.5px;">Admin Notification</span>
    </td></tr>

    <!-- TITLE ROW -->
    <tr><td style="padding:24px 28px 16px;">
      <h1 style="margin:0;font-size:20px;color:#111;font-weight:700;">New Quote Request</h1>
      <p style="margin:6px 0 0;font-size:12px;color:#999;">
        Ref: <strong style="color:#111;font-family:monospace;">{$quoteRef}</strong>
        &nbsp;·&nbsp; {$submitted}
      </p>
    </td></tr>

    <!-- CONTACT TABLE -->
    <tr><td style="padding:0 28px 20px;">
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%"
             style="border:1px solid #ebebeb;border-radius:6px;overflow:hidden;font-size:13px;">
        <tr><td colspan="2"
                style="padding:9px 14px;background:#f4f4f4;border-bottom:1px solid #ebebeb;">
          <span style="font-size:10px;font-weight:700;text-transform:uppercase;
                       letter-spacing:1px;color:#888;">Contact Details</span>
        </td></tr>
        <tr>
          <td style="padding:9px 14px;color:#999;border-bottom:1px solid #ebebeb;width:26%;">Name</td>
          <td style="padding:9px 14px;color:#111;font-weight:600;border-bottom:1px solid #ebebeb;">{$contact}</td>
        </tr>
        <tr>
          <td style="padding:9px 14px;color:#999;border-bottom:1px solid #ebebeb;">Company</td>
          <td style="padding:9px 14px;color:#111;border-bottom:1px solid #ebebeb;">{$company}</td>
        </tr>
        <tr>
          <td style="padding:9px 14px;color:#999;border-bottom:1px solid #ebebeb;">Email</td>
          <td style="padding:9px 14px;color:#111;border-bottom:1px solid #ebebeb;">{$email}</td>
        </tr>
        <tr>
          <td style="padding:9px 14px;color:#999;">Phone</td>
          <td style="padding:9px 14px;color:#111;">{$phone}</td>
        </tr>
        {$notesRow}
      </table>
    </td></tr>

    <!-- SERVICES TABLE -->
    <tr><td style="padding:0 28px 20px;">
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%"
             style="border:1px solid #ebebeb;border-radius:6px;overflow:hidden;font-size:13px;">
        <tr><td colspan="2"
                style="padding:9px 14px;background:#f4f4f4;border-bottom:1px solid #ebebeb;">
          <span style="font-size:10px;font-weight:700;text-transform:uppercase;
                       letter-spacing:1px;color:#888;">Selected Services</span>
        </td></tr>
        {$serviceRows}
      </table>
    </td></tr>

    <!-- TOTALS -->
    {$totalsBlock}

    <!-- FOOTER -->
    <tr><td style="background:#f9f9f9;padding:16px 28px;border-top:1px solid #ebebeb;">
      <p style="margin:0;font-size:11px;color:#bbb;line-height:1.5;">
        Transient key:
        <code style="font-family:monospace;background:#eee;padding:1px 5px;
                     border-radius:3px;color:#777;">cz_quote_{$quoteRef}</code>
        (expires in 7 days).
      </p>
    </td></tr>

  </table>
  </td></tr>
</table>
</body>
</html>
HTML;
    }

    /** @param array<string, mixed> $data */
    private function buildCustomerHtmlEmail(array $data, string $siteTitle): string
    {
        $totals      = $this->calcTotals($data['items']);
        $serviceRows = $this->emailServiceRows($data['items']);
        $totalsBlock = $this->emailTotalsBlock($totals);

        $contact   = esc_html((string) $data['contact']);
        $quoteRef  = esc_html((string) $data['quote_ref']);
        $siteLabel = esc_html($siteTitle);

        $notesBlock = $data['notes'] !== ''
            ? '<tr><td style="padding:0 28px 20px;">
                <p style="margin:0 0 6px;font-size:11px;font-weight:700;text-transform:uppercase;
                           letter-spacing:1px;color:#999;">Your Notes</p>
                <p style="margin:0;font-size:13px;color:#555;background:#f9f9f9;padding:12px 14px;
                           border-radius:6px;border-left:3px solid #ddd;line-height:1.6;">'
              . nl2br(esc_html((string) $data['notes']))
              . '</p></td></tr>'
            : '';

        return <<<HTML
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:Arial,Helvetica,sans-serif;">
<table role="presentation" cellpadding="0" cellspacing="0" width="100%"
       style="background:#f4f4f4;padding:24px 16px;">
  <tr><td align="center">
  <table role="presentation" cellpadding="0" cellspacing="0" width="600"
         style="max-width:600px;width:100%;background:#ffffff;border-radius:8px;
                overflow:hidden;border:1px solid #e0e0e0;">

    <!-- HEADER -->
    <tr><td style="background:#0f0f0f;padding:20px 28px;">
      <span style="color:#FFDA17;font-size:18px;font-weight:800;letter-spacing:-0.5px;">CompuZign</span>
      <span style="color:#555;font-size:10px;margin-left:12px;text-transform:uppercase;
                   letter-spacing:1.5px;">Managed IT Services</span>
    </td></tr>

    <!-- GREETING -->
    <tr><td style="padding:28px 28px 16px;">
      <h1 style="margin:0 0 10px;font-size:20px;color:#111;font-weight:700;">
        Quote Request Received
      </h1>
      <p style="margin:0;font-size:15px;color:#444;line-height:1.65;">
        Hi <strong>{$contact}</strong>,<br><br>
        Thank you for your quote request. We&#39;ve received it and will be in touch
        within one business day with a tailored proposal.
      </p>
    </td></tr>

    <!-- REFERENCE BADGE -->
    <tr><td style="padding:0 28px 20px;">
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%"
             style="background:#f9f9f9;border-radius:6px;border:1px solid #ebebeb;">
        <tr><td style="padding:14px 18px;">
          <span style="font-size:11px;color:#999;text-transform:uppercase;
                       letter-spacing:1px;">Quote Reference</span><br>
          <span style="font-size:20px;font-weight:800;color:#111;
                       font-family:monospace;letter-spacing:1px;">{$quoteRef}</span>
        </td></tr>
      </table>
    </td></tr>

    <!-- SERVICES TABLE -->
    <tr><td style="padding:0 28px 20px;">
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%"
             style="border:1px solid #ebebeb;border-radius:6px;overflow:hidden;font-size:13px;">
        <tr><td colspan="2"
                style="padding:9px 14px;background:#f4f4f4;border-bottom:1px solid #ebebeb;">
          <span style="font-size:10px;font-weight:700;text-transform:uppercase;
                       letter-spacing:1px;color:#888;">Your Selected Services</span>
        </td></tr>
        {$serviceRows}
      </table>
    </td></tr>

    <!-- TOTALS -->
    {$totalsBlock}

    <!-- NOTES (conditional) -->
    {$notesBlock}

    <!-- RECOMMENDED NEXT STEPS -->
    <tr><td style="padding:0 28px 24px;">
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%"
             style="background:#f9f9f9;border-radius:6px;border:1px solid #ebebeb;overflow:hidden;">
        <tr><td style="padding:9px 14px;background:#f4f4f4;border-bottom:1px solid #ebebeb;">
          <span style="font-size:10px;font-weight:700;text-transform:uppercase;
                       letter-spacing:1px;color:#888;">Recommended Next Steps</span>
        </td></tr>
        <tr><td style="padding:14px 16px;font-size:13px;color:#555;line-height:1.65;">
          Our team will review your service selection and reach out with a detailed proposal.
          In the meantime, feel free to reply to this email with any questions or additional context.
        </td></tr>
      </table>
    </td></tr>

    <!-- CTA -->
    <tr><td style="padding:0 28px 28px;text-align:center;">
      <p style="margin:0;font-size:13px;color:#666;line-height:1.6;">
        Questions? Reply to this email or reach us at
        <a href="mailto:hello@compuzign.com"
           style="color:#111;font-weight:600;text-decoration:none;">hello@compuzign.com</a>
      </p>
    </td></tr>

    <!-- FOOTER -->
    <tr><td style="background:#f4f4f4;padding:18px 28px;border-top:1px solid #e8e8e8;">
      <p style="margin:0 0 4px;font-size:11px;color:#bbb;line-height:1.5;">
        This is a preliminary, non-binding quote. All prices are in USD and exclude applicable taxes.
        Pricing is valid for 30 days and is subject to scope confirmation.
      </p>
      <p style="margin:4px 0 0;font-size:11px;color:#bbb;">
        &copy; {$siteLabel} &mdash; Managed IT Services
      </p>
    </td></tr>

  </table>
  </td></tr>
</table>
</body>
</html>
HTML;
    }
}
