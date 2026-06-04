// Simple JS syntax checker
const fs = require('fs');
const path = require('path');

function checkFile(filePath) {
    const ext = path.extname(filePath);
    if (ext !== '.js' && ext !== '.cjs') return;

    try {
        require('child_process').execSync(`node --check "${filePath}"`, { stdio: 'pipe' });
    } catch (e) {
        console.error(`Syntax error in ${filePath}: ${e.stderr || e.message}`);
        process.exit(1);
    }
}

// Check staged JS files
const { execSync } = require('child_process');
try {
    const staged = execSync('git diff --cached --name-only --diff-filter=ACM', { encoding: 'utf-8' })
        .split('\n')
        .filter(f => f.endsWith('.js') || f.endsWith('.cjs'));

    for (const file of staged) {
        if (fs.existsSync(file)) {
            checkFile(file);
        }
    }
    console.log('✅ JS syntax check passed');
} catch (e) {
    console.error('JS syntax check failed:', e.message);
    process.exit(1);
}
