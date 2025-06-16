import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read package.json
const packagePath = path.join(__dirname, '..', 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));

// Generate version.js content
const versionContent = `// Auto-generated file - DO NOT EDIT
// Generated on: ${new Date().toISOString()}

export const version = '${packageJson.version}';
`;

// Write to lib/utils/version.js
const versionPath = path.join(__dirname, '..', 'lib', 'utils', 'version.js');
fs.writeFileSync(versionPath, versionContent);

console.log(`✅ Generated version.js with version: ${packageJson.version}`);