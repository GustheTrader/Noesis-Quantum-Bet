import fs from 'fs';

async function run() {
    console.log("Starting download...");
    const res = await fetch('https://api.github.com/repos/GustheTrader/5layergraphKB/zipball/main', {
        headers: {
            'Authorization': 'Bearer _wH3mfvo2ddviqRrnYO2wDgEmQ1mFtE4KLggt',
            'User-Agent': 'Node.js',
            'Accept': 'application/vnd.github.v3+json'
        }
    });
    if (!res.ok) {
        console.error("Error:", res.status, await res.text());
        return;
    }
    const buffer = await res.arrayBuffer();
    fs.writeFileSync('repo.zip', Buffer.from(buffer));
    console.log("Saved repo.zip");
}
run();
