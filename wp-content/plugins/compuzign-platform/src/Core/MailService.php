<?php

namespace CompuZign\Platform\Core;

class MailService
{
    public function register(): void
    {
        if (!defined('CZ_SMTP_HOST')) {
            return;
        }

        add_action('phpmailer_init', [$this, 'configure']);
    }

    /**
     * Configures PHPMailer to use an external SMTP transport.
     * Credentials are loaded from wp-config.php constants — never from this file.
     *
     * @param \PHPMailer\PHPMailer\PHPMailer $phpMailer
     */
    public function configure(object $phpMailer): void
    {
        $phpMailer->isSMTP();
        $phpMailer->Host     = CZ_SMTP_HOST;
        $phpMailer->SMTPAuth = true;
        $phpMailer->Port     = (int) CZ_SMTP_PORT;
        $phpMailer->Username = CZ_SMTP_USER;
        $phpMailer->Password = CZ_SMTP_PASS;

        // Port 465 = implicit SSL (SMTPS). Everything else = STARTTLS.
        $phpMailer->SMTPSecure = ((int) CZ_SMTP_PORT === 465) ? 'ssl' : 'tls';

        if (defined('CZ_SMTP_FROM') && CZ_SMTP_FROM !== '') {
            $phpMailer->From     = CZ_SMTP_FROM;
            $phpMailer->FromName = defined('CZ_SMTP_FROM_NAME') ? CZ_SMTP_FROM_NAME : 'CompuZign';
        }
    }
}
