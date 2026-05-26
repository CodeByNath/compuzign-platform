<?php
/**
 * Full-screen page template for the Admin Command Centre.
 *
 * WordPress uses this automatically for any page with slug "admin-command-centre".
 * Renders a clean document shell — no site header, no site footer, no container
 * wrappers — so the platform runtime can occupy the full viewport.
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}
?><!DOCTYPE html>
<html <?php language_attributes(); ?>>
<head>
    <meta charset="<?php bloginfo( 'charset' ); ?>">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <?php wp_head(); ?>
    <style>
        /* Suppress any global page chrome that would constrain the admin shell */
        body.compuzign-admin-page {
            overflow: hidden;
            margin: 0 !important;
            padding: 0 !important;
        }
        body.compuzign-admin-page #compuzign-admin {
            display: block;
            width: 100vw;
            max-width: none;
        }
    </style>
</head>
<body <?php body_class( 'compuzign-admin-page' ); ?>>
<?php wp_body_open(); ?>
<?php
while ( have_posts() ) :
    the_post();
    the_content();
endwhile;
?>
<?php wp_footer(); ?>
</body>
</html>
