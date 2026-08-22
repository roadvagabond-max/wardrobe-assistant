import { execSync } from 'child_process';

const msg = process.argv.slice(2).join(' ') || `Auto update: ${new Date().toLocaleString()}`;

function run(cmd) {
  try {
    return execSync(cmd, { stdio: 'pipe', encoding: 'utf-8' });
  } catch (err) {
    if (err.stdout) console.log(err.stdout.trim());
    if (err.stderr) console.error(err.stderr.trim());
    throw err;
  }
}

try {
  console.log('🔄 Staging changes...');
  run('git add .');

  const status = run('git status --porcelain').trim();
  if (!status) {
    console.log('✨ Nincs új módosítás, amit fel kellene tölteni.');
    process.exit(0);
  }

  console.log(`💾 Committing: "${msg}"...`);
  run(`git commit -m "${msg.replace(/"/g, '\\"')}"`);

  console.log('🚀 Pushing to GitHub (origin main)...');
  const pushOut = run('git push origin main');
  if (pushOut) console.log(pushOut.trim());

  console.log('✅ Sikeresen feltöltve a GitHubra!');
} catch (error) {
  console.error('❌ Hiba történt a szinkronizálás során.');
  process.exit(1);
}
