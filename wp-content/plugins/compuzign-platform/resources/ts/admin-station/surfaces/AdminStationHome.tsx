// The Home surface — the empty platform landing for the new administration
// environment. It carries no business logic; it exists to prove the new land
// is independent and ready to receive rebuilt business areas one at a time.

export function AdminStationHome() {
  return (
    <section class="cz-station-home" aria-labelledby="cz-station-home-title">
      <h1 id="cz-station-home-title" class="cz-station-home__title">Admin Station</h1>
      <p class="cz-station-home__lede">The new administration environment is ready.</p>
    </section>
  );
}
