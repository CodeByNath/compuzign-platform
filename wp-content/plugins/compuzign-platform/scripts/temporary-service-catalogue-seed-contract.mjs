import fs from 'node:fs';

const runner = fs.readFileSync(new URL('../resources/ts/temporary-service-catalogue-seed/TemporaryServiceCatalogueSeedAction.tsx', import.meta.url), 'utf8');
const footer = fs.readFileSync(new URL('../resources/ts/admin-station/shell/AdminStationFooter.tsx', import.meta.url), 'utf8');
const serviceModule = fs.readFileSync(new URL('../src/Modules/Service/ServiceModule.php', import.meta.url), 'utf8');

function check(condition, message) {
  if (!condition) throw new Error(`FAIL: ${message}`);
  console.log(`  ok — ${message}`);
}

console.log('\nTemporary Service catalogue seed contract\n');
check((runner.match(/title: '/g) ?? []).length === 10, 'the runner contains exactly ten supplied Services');
check(runner.includes('const catalogue = await fetchAdminCatalog()'), 'the current catalogue is read before orchestration');
check(runner.indexOf('await fetchAdminCatalog()') < runner.indexOf('for (const definition of DEFINITIONS)'), 'the catalogue read precedes every mutation loop');
check(runner.includes('createServiceCategory({ name: definition.category, description: \'\' })'), 'missing Categories use the inline Service drawer API');
check(runner.includes('createService({'), 'missing Services use the Service create API');
check(runner.includes('updateServiceInclusions('), 'Inclusions use the Service draft API');
check(runner.includes('updateServiceOverview('), 'missing existing Category assignments use the Service Overview draft API');
check(runner.includes('fetchAdminServiceDetail('), 'existing matches are inspected through the Service detail API');
check(runner.includes("action: 'conflicted'"), 'multiple normalized matches fail closed');
check(runner.includes("action: 'reused'"), 'safe reruns report reused records');
check(runner.includes("reportFromDetail(definition, 'repaired'"), 'missing assignments report repaired records');
check(runner.includes('Existing meaningful description differs; no write was made.'), 'meaningful content differences are never overwritten');
check(!runner.includes('settleService'), 'the runner cannot settle modules');
check(!runner.includes('updateServiceStatus'), 'the runner cannot mutate lifecycle state');
check(!runner.includes('delete'), 'the runner cannot delete rollback records');
check(footer.includes('<TemporaryServiceCatalogueSeedAction />'), 'the authenticated Admin application exposes the temporary action');
check(!serviceModule.includes('WP_CLI'), 'ServiceModule has no WP-CLI seed registration');
check(!serviceModule.includes('SeedCommand'), 'ServiceModule has no seed command dependency');

console.log('\nTemporary Service catalogue seed contract passed.\n');
