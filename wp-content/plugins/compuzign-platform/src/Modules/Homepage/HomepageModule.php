<?php

namespace CompuZign\Platform\Modules\Homepage;

class HomepageModule
{
    public function register(): void
    {
        add_shortcode('compuzign_hero',              [$this, 'renderHero']);
        add_shortcode('compuzign_trust',             [$this, 'renderTrust']);
        add_shortcode('compuzign_intro',             [$this, 'renderIntro']);
        add_shortcode('compuzign_why',               [$this, 'renderWhy']);
        add_shortcode('compuzign_services_list',     [$this, 'renderServicesList']);
        add_shortcode('compuzign_stats',             [$this, 'renderStats']);
        add_shortcode('compuzign_services_overview', [$this, 'renderServicesOverview']);
        add_shortcode('compuzign_results',           [$this, 'renderResults']);
        add_shortcode('compuzign_cta_band',          [$this, 'renderCtaBand']);
    }

    public function renderHero(): string
    {
        $this->enqueueAssets();
        return $this->renderTemplate('hero');
    }

    public function renderTrust(): string
    {
        $this->enqueueAssets();
        return $this->renderTemplate('trust');
    }

    public function renderIntro(): string
    {
        $this->enqueueAssets();
        return $this->renderTemplate('intro');
    }

    public function renderWhy(): string
    {
        $this->enqueueAssets();
        return $this->renderTemplate('why');
    }

    public function renderServicesList(): string
    {
        $this->enqueueAssets();
        return $this->renderTemplate('services-editorial');
    }

    public function renderStats(): string
    {
        $this->enqueueAssets();
        return $this->renderTemplate('stats');
    }

    public function renderServicesOverview(): string
    {
        $this->enqueueAssets();
        return $this->renderTemplate('services-overview');
    }

    public function renderResults(): string
    {
        $this->enqueueAssets();
        return $this->renderTemplate('results');
    }

    public function renderCtaBand(): string
    {
        $this->enqueueAssets();
        return $this->renderTemplate('cta-band');
    }

    private function enqueueAssets(): void
    {
        if (wp_style_is('compuzign-homepage', 'registered')) {
            wp_enqueue_style('compuzign-homepage');
        }
        if (wp_script_is('compuzign-homepage', 'registered')) {
            wp_enqueue_script('compuzign-homepage');
        }
    }

    private function renderTemplate(string $name): string
    {
        $path = COMPUZIGN_APP_PATH . 'modules/homepage/templates/' . $name . '.php';

        ob_start();
        if (file_exists($path)) {
            include $path;
        }
        return (string) ob_get_clean();
    }
}
