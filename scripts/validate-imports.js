import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Color codes for console output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

class ImportValidator {
  constructor() {
    this.projectRoot = path.join(__dirname, '..');
    this.errors = [];
    this.warnings = [];
    this.fileMap = new Map();
    this.dependencyGraph = new Map();
  }

  log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
  }

  addError(message) {
    this.errors.push(message);
    this.log(`❌ ERROR: ${message}`, 'red');
  }

  addWarning(message) {
    this.warnings.push(message);
    this.log(`⚠️ WARNING: ${message}`, 'yellow');
  }

  /**
   * Scan project files and build file map
   */
  scanFiles() {
    this.log('📁 Scanning project files...', 'blue');
    
    const scanDir = (dir, relativePath = '') => {
      const items = fs.readdirSync(dir);
      
      for (const item of items) {
        const fullPath = path.join(dir, item);
        const relativeFilePath = path.join(relativePath, item);
        
        if (item === 'node_modules' || item.startsWith('.')) {
          continue; // Skip node_modules and hidden files
        }
        
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
          scanDir(fullPath, relativeFilePath);
        } else if (item.endsWith('.js') || item.endsWith('.mjs')) {
          this.fileMap.set(relativeFilePath, fullPath);
        }
      }
    };
    
    scanDir(this.projectRoot);
    this.log(`Found ${this.fileMap.size} JavaScript files`, 'green');
  }

  /**
   * Extract imports from a file
   */
  extractImports(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const imports = [];
      
      // Match ES6 import statements
      const importRegex = /import\s+(?:(?:\{[^}]*\}|\*\s+as\s+\w+|\w+)\s+from\s+)?['"`]([^'"`]+)['"`]/g;
      
      let match;
      while ((match = importRegex.exec(content)) !== null) {
        imports.push({
          statement: match[0],
          path: match[1],
          line: content.substring(0, match.index).split('\n').length
        });
      }
      
      // Match dynamic imports
      const dynamicImportRegex = /import\(['"`]([^'"`]+)['"`]\)/g;
      while ((match = dynamicImportRegex.exec(content)) !== null) {
        imports.push({
          statement: match[0],
          path: match[1],
          line: content.substring(0, match.index).split('\n').length,
          dynamic: true
        });
      }
      
      return imports;
    } catch (error) {
      this.addError(`Failed to read file ${filePath}: ${error.message}`);
      return [];
    }
  }

  /**
   * Extract exports from a file
   */
  extractExports(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const exports = [];
      
      // Match named exports
      const namedExportRegex = /export\s+(?:const|let|var|function|class)\s+(\w+)/g;
      let match;
      while ((match = namedExportRegex.exec(content)) !== null) {
        exports.push({
          name: match[1],
          type: 'named',
          line: content.substring(0, match.index).split('\n').length
        });
      }
      
      // Match export { ... } statements
      const exportBlockRegex = /export\s+\{([^}]+)\}/g;
      while ((match = exportBlockRegex.exec(content)) !== null) {
        const exportedNames = match[1].split(',').map(name => name.trim().split(' as ')[0]);
        exportedNames.forEach(name => {
          if (name) {
            exports.push({
              name: name.trim(),
              type: 'named',
              line: content.substring(0, match.index).split('\n').length
            });
          }
        });
      }
      
      // Match default exports
      if (content.includes('export default')) {
        exports.push({
          name: 'default',
          type: 'default',
          line: content.indexOf('export default')
        });
      }
      
      return exports;
    } catch (error) {
      this.addError(`Failed to read file ${filePath}: ${error.message}`);
      return [];
    }
  }

  /**
   * Resolve import path to actual file
   */
  resolveImportPath(importPath, fromFile) {
    // Handle node_modules imports
    if (!importPath.startsWith('.')) {
      return { resolved: true, external: true, path: importPath };
    }
    
    const fromDir = path.dirname(fromFile);
    const resolvedPath = path.resolve(fromDir, importPath);
    
    // Try different extensions
    const extensions = ['', '.js', '.mjs', '/index.js'];
    
    for (const ext of extensions) {
      const testPath = resolvedPath + ext;
      if (fs.existsSync(testPath)) {
        const relativePath = path.relative(this.projectRoot, testPath);
        return { 
          resolved: true, 
          external: false, 
          path: relativePath,
          absolutePath: testPath
        };
      }
    }
    
    return { resolved: false, path: importPath };
  }

  /**
   * Validate all imports in a file
   */
  validateFileImports(filePath, relativePath) {
    const imports = this.extractImports(filePath);
    const exports = this.extractExports(filePath);
    
    // Store file info
    this.dependencyGraph.set(relativePath, {
      imports: imports.map(imp => imp.path),
      exports: exports.map(exp => exp.name),
      filePath,
      relativePath
    });
    
    for (const importStatement of imports) {
      const resolved = this.resolveImportPath(importStatement.path, filePath);
      
      if (!resolved.resolved) {
        this.addError(
          `Invalid import in ${relativePath}:${importStatement.line} - Cannot resolve '${importStatement.path}'`
        );
        continue;
      }
      
      if (resolved.external) {
        // External dependency - check if it's in package.json
        continue;
      }
      
      // Check if imported file exists in our file map
      if (!this.fileMap.has(resolved.path)) {
        this.addError(
          `Missing file in ${relativePath}:${importStatement.line} - File '${resolved.path}' does not exist`
        );
        continue;
      }
      
      // Validate named imports
      if (importStatement.statement.includes('{')) {
        const importedNames = this.extractImportedNames(importStatement.statement);
        const targetExports = this.extractExports(resolved.absolutePath);
        const availableExports = targetExports.map(exp => exp.name);
        
        for (const importedName of importedNames) {
          if (!availableExports.includes(importedName)) {
            this.addError(
              `Invalid import in ${relativePath}:${importStatement.line} - '${importedName}' is not exported by '${resolved.path}'`
            );
          }
        }
      }
    }
  }

  /**
   * Extract imported names from import statement
   */
  extractImportedNames(statement) {
    const match = statement.match(/\{([^}]+)\}/);
    if (!match) return [];
    
    return match[1]
      .split(',')
      .map(name => name.trim().split(' as ')[0].trim())
      .filter(name => name);
  }

  /**
   * Detect circular dependencies
   */
  detectCircularDependencies() {
    this.log('🔄 Checking for circular dependencies...', 'blue');
    
    const visited = new Set();
    const recursionStack = new Set();
    
    const dfs = (node, path = []) => {
      if (recursionStack.has(node)) {
        const cycle = path.slice(path.indexOf(node));
        this.addError(`Circular dependency detected: ${cycle.join(' → ')} → ${node}`);
        return true;
      }
      
      if (visited.has(node)) {
        return false;
      }
      
      visited.add(node);
      recursionStack.add(node);
      
      const nodeInfo = this.dependencyGraph.get(node);
      if (nodeInfo) {
        for (const dependency of nodeInfo.imports) {
          const resolvedDep = this.resolveImportPath(dependency, nodeInfo.filePath);
          if (resolvedDep.resolved && !resolvedDep.external) {
            if (dfs(resolvedDep.path, [...path, node])) {
              return true;
            }
          }
        }
      }
      
      recursionStack.delete(node);
      return false;
    };
    
    for (const [node] of this.dependencyGraph) {
      if (!visited.has(node)) {
        dfs(node);
      }
    }
  }

  /**
   * Check for unused imports
   */
  checkUnusedImports() {
    this.log('🧹 Checking for unused imports...', 'blue');
    
    for (const [relativePath, fileInfo] of this.dependencyGraph) {
      try {
        const content = fs.readFileSync(fileInfo.filePath, 'utf8');
        const imports = this.extractImports(fileInfo.filePath);
        
        for (const importStatement of imports) {
          if (importStatement.statement.includes('{')) {
            const importedNames = this.extractImportedNames(importStatement.statement);
            
            for (const importedName of importedNames) {
              // Simple check - look for usage in file content
              const usageRegex = new RegExp(`\\b${importedName}\\b`, 'g');
              const matches = content.match(usageRegex) || [];
              
              // If only found once, it's probably just the import statement
              if (matches.length <= 1) {
                this.addWarning(
                  `Potentially unused import in ${relativePath}:${importStatement.line} - '${importedName}' may not be used`
                );
              }
            }
          }
        }
      } catch (error) {
        this.addWarning(`Could not check unused imports for ${relativePath}: ${error.message}`);
      }
    }
  }

  /**
   * Check package.json dependencies
   */
  validatePackageDependencies() {
    this.log('📦 Validating package.json dependencies...', 'blue');
    
    try {
      const packageJsonPath = path.join(this.projectRoot, 'package.json');
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      
      const allDeps = {
        ...packageJson.dependencies,
        ...packageJson.devDependencies,
        ...packageJson.peerDependencies
      };
      
      const externalImports = new Set();
      
      for (const [, fileInfo] of this.dependencyGraph) {
        const imports = this.extractImports(fileInfo.filePath);
        
        for (const importStatement of imports) {
          if (!importStatement.path.startsWith('.')) {
            // Extract package name (handle scoped packages)
            const packageName = importStatement.path.startsWith('@') 
              ? importStatement.path.split('/').slice(0, 2).join('/')
              : importStatement.path.split('/')[0];
            
            externalImports.add(packageName);
          }
        }
      }
      
      // Check for missing dependencies
      for (const packageName of externalImports) {
        if (!allDeps[packageName] && !this.isBuiltinModule(packageName)) {
          this.addError(`Missing dependency: '${packageName}' is imported but not listed in package.json`);
        }
      }
      
      // Check for unused dependencies
      for (const depName of Object.keys(allDeps)) {
        if (!externalImports.has(depName)) {
          this.addWarning(`Potentially unused dependency: '${depName}' is listed in package.json but not imported`);
        }
      }
      
    } catch (error) {
      this.addError(`Failed to validate package.json: ${error.message}`);
    }
  }

  /**
   * Check if module is a Node.js builtin
   */
  isBuiltinModule(moduleName) {
    const builtins = [
      'fs', 'path', 'os', 'crypto', 'http', 'https', 'url', 'util', 
      'events', 'stream', 'buffer', 'child_process', 'cluster', 'dgram',
      'dns', 'net', 'querystring', 'readline', 'repl', 'string_decoder',
      'timers', 'tls', 'tty', 'vm', 'worker_threads', 'zlib'
    ];
    
    return builtins.includes(moduleName);
  }

  /**
   * Generate import/export report
   */
  generateReport() {
    this.log('\n📊 Generating import/export report...', 'blue');
    
    const report = {
      totalFiles: this.fileMap.size,
      totalImports: 0,
      totalExports: 0,
      externalDependencies: new Set(),
      internalDependencies: new Set(),
      errors: this.errors.length,
      warnings: this.warnings.length
    };
    
    for (const [, fileInfo] of this.dependencyGraph) {
      const imports = this.extractImports(fileInfo.filePath);
      const exports = this.extractExports(fileInfo.filePath);
      
      report.totalImports += imports.length;
      report.totalExports += exports.length;
      
      for (const importStatement of imports) {
        if (importStatement.path.startsWith('.')) {
          report.internalDependencies.add(importStatement.path);
        } else {
          const packageName = importStatement.path.startsWith('@') 
            ? importStatement.path.split('/').slice(0, 2).join('/')
            : importStatement.path.split('/')[0];
          report.externalDependencies.add(packageName);
        }
      }
    }
    
    console.log('\n' + '='.repeat(50));
    this.log('📈 PROJECT IMPORT/EXPORT REPORT', 'blue');
    console.log('='.repeat(50));
    
    this.log(`📁 Total Files: ${report.totalFiles}`, 'green');
    this.log(`📥 Total Imports: ${report.totalImports}`, 'green');
    this.log(`📤 Total Exports: ${report.totalExports}`, 'green');
    this.log(`📦 External Dependencies: ${report.externalDependencies.size}`, 'green');
    this.log(`🔗 Internal Dependencies: ${report.internalDependencies.size}`, 'green');
    
    if (this.errors.length > 0) {
      this.log(`❌ Errors: ${this.errors.length}`, 'red');
    } else {
      this.log('✅ No errors found!', 'green');
    }
    
    if (this.warnings.length > 0) {
      this.log(`⚠️ Warnings: ${this.warnings.length}`, 'yellow');
    } else {
      this.log('✅ No warnings!', 'green');
    }
    
    console.log('='.repeat(50));
    
    return report;
  }

  /**
   * Run complete validation
   */
  async validate() {
    this.log('🚀 Starting import validation...', 'blue');
    console.log('='.repeat(50));
    
    // Step 1: Scan all files
    this.scanFiles();
    
    // Step 2: Validate each file's imports
    this.log('\n🔍 Validating imports...', 'blue');
    for (const [relativePath, absolutePath] of this.fileMap) {
      this.validateFileImports(absolutePath, relativePath);
    }
    
    // Step 3: Check for circular dependencies
    this.detectCircularDependencies();
    
    // Step 4: Check for unused imports
    this.checkUnusedImports();
    
    // Step 5: Validate package.json dependencies
    this.validatePackageDependencies();
    
    // Step 6: Generate report
    const report = this.generateReport();
    
    // Exit with error code if there are errors
    if (this.errors.length > 0) {
      this.log('\n💥 Validation failed with errors!', 'red');
      process.exit(1);
    } else {
      this.log('\n✅ Validation completed successfully!', 'green');
    }
    
    return report;
  }

  /**
   * Fix common import issues automatically
   */
  async autoFix() {
    this.log('🔧 Starting auto-fix...', 'blue');
    
    const fixes = [];
    
    // Fix missing .js extensions
    for (const [relativePath, absolutePath] of this.fileMap) {
      const content = fs.readFileSync(absolutePath, 'utf8');
      const imports = this.extractImports(absolutePath);
      
      let modified = false;
      let newContent = content;
      
      for (const importStatement of imports) {
        if (importStatement.path.startsWith('.') && !importStatement.path.endsWith('.js')) {
          const resolvedPath = this.resolveImportPath(importStatement.path + '.js', absolutePath);
          
          if (resolvedPath.resolved && !resolvedPath.external) {
            const oldStatement = importStatement.statement;
            const newStatement = oldStatement.replace(importStatement.path, importStatement.path + '.js');
            newContent = newContent.replace(oldStatement, newStatement);
            modified = true;
            
            fixes.push({
              file: relativePath,
              line: importStatement.line,
              old: oldStatement,
              new: newStatement,
              type: 'add-extension'
            });
          }
        }
      }
      
      if (modified) {
        fs.writeFileSync(absolutePath, newContent);
        this.log(`✅ Fixed imports in ${relativePath}`, 'green');
      }
    }
    
    this.log(`🔧 Applied ${fixes.length} automatic fixes`, 'green');
    return fixes;
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const validator = new ImportValidator();
  
  if (args.includes('--fix')) {
    await validator.autoFix();
    await validator.validate();
  } else if (args.includes('--report-only')) {
    validator.scanFiles();
    for (const [relativePath, absolutePath] of validator.fileMap) {
      validator.validateFileImports(absolutePath, relativePath);
    }
    validator.generateReport();
  } else {
    await validator.validate();
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('❌ Validation failed:', error.message);
    process.exit(1);
  });
}

export { ImportValidator };