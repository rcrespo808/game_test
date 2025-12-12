/**
 * Build script for CI/CD
 * Creates a build directory with all necessary files for deployment
 */

const fs = require('fs');
const path = require('path');

const BUILD_DIR = path.join(__dirname, '..', 'build');
const SRC_DIR = path.join(__dirname, '..', 'src');
const ASSETS_DIR = path.join(__dirname, '..', 'assets');

// Files and directories to copy
const COPY_PATHS = [
    { from: 'index.html', to: 'index.html' },
    { from: 'main.js', to: 'main.js' },
    { from: 'src', to: 'src' },
    { from: 'assets', to: 'assets' }
];

function ensureDir(dirPath) {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
}

function copyRecursive(src, dest) {
    const stat = fs.statSync(src);
    
    if (stat.isDirectory()) {
        ensureDir(dest);
        const entries = fs.readdirSync(src);
        entries.forEach(entry => {
            const srcPath = path.join(src, entry);
            const destPath = path.join(dest, entry);
            copyRecursive(srcPath, destPath);
        });
    } else {
        ensureDir(path.dirname(dest));
        fs.copyFileSync(src, dest);
    }
}

function build() {
    try {
        console.log('Starting build...');
        
        // Clean build directory
        if (fs.existsSync(BUILD_DIR)) {
            fs.rmSync(BUILD_DIR, { recursive: true, force: true });
        }
        ensureDir(BUILD_DIR);
        
        // Copy files
        COPY_PATHS.forEach(({ from, to }) => {
            const srcPath = path.join(__dirname, '..', from);
            const destPath = path.join(BUILD_DIR, to);
            
            if (fs.existsSync(srcPath)) {
                console.log(`Copying ${from} -> ${to}`);
                copyRecursive(srcPath, destPath);
            } else {
                console.warn(`Warning: ${from} not found, skipping`);
            }
        });
        
        console.log('Build complete!');
        console.log(`Build output: ${BUILD_DIR}`);
    } catch (error) {
        console.error('Build failed:', error);
        process.exit(1);
    }
}

build();

