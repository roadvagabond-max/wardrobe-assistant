/**
 * Sartorial AI Golden Eval Suite CLI Runner
 * Executes TC-1 through TC-6 tests and outputs a formatted terminal report.
 */
import { runSartorialGoldenEvalSuite } from './src/services/sartorialEval.js';

console.log('\n🎩 ========================================================');
console.log('   Sartorial AI — Golden Eval Suite (Spec Section 11)');
console.log('   Determinisztikus Szabászati Minőségbiztosítási Tesztek');
console.log('========================================================\n');

try {
  const report = runSartorialGoldenEvalSuite();

  report.results.forEach((test, idx) => {
    const icon = test.passed ? '✅ PASS' : '❌ FAIL';
    console.log(`${icon} [${test.id}] ${test.name}`);
    console.log(`   Elvárt: ${test.expectedVerdict}`);
    console.log(`   Valós:  ${test.actualVerdict}`);
    console.log(`   Infó:   ${test.explanation}`);
    console.log('   ' + '-'.repeat(52));
  });

  console.log('\n📊 ÖSSZESÍTÉS:');
  console.log(`   Összes teszt:   ${report.totalTests}`);
  console.log(`   Sikeres:        ${report.passedTests}`);
  console.log(`   Sikertelen:     ${report.failedTests}`);
  console.log(`   Megfelelőség:   ${report.passRatePercent}%`);
  console.log(`   Eredmény:       ${report.suiteVerdict === 'PASSED' ? '🎉 MINDEN SARTORIAL SZABÁLY TELJESÜLT' : '⚠️ HIBA TÖRTÉNT'}\n`);

  if (report.suiteVerdict !== 'PASSED') {
    process.exit(1);
  }
} catch (err) {
  console.error('❌ Hiba történt a Golden Eval tesztek futtatása közben:', err);
  process.exit(1);
}
