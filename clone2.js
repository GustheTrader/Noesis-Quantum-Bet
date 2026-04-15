import { execSync } from 'child_process';
try {
  execSync('git clone https://GustheTrader:_wH3mfvo2ddviqRrnYO2wDgEmQ1mFtE4KLggt@github.com/GustheTrader/5layergraphKB.git repo_dir2', { stdio: 'inherit' });
  console.log("Success");
} catch (e) {
  console.error(e.message);
}
