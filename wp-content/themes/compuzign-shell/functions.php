<?php
if ( ! defined( 'ABSPATH' ) ) exit;

/*
 * Shell theme setup.
 * The plugin (CompuZign Platform) owns all assets, layout, and frontend runtime.
 * This file only declares WordPress feature support needed for a valid document shell.
 */
add_action( 'after_setup_theme', function () {
	// Allow WordPress / plugins to inject <title> via wp_head().
	add_theme_support( 'title-tag' );

	// Featured image support (used by SEO plugins and social meta).
	add_theme_support( 'post-thumbnails' );

	// Clean HTML5 output for core-generated markup.
	add_theme_support( 'html5', [
		'search-form',
		'comment-form',
		'comment-list',
		'gallery',
		'caption',
		'style',
		'script',
	] );
} );
