#!/usr/bin/env node

/**
 * Post-build script to create distributable packages with relative dependencies
 * for local installation before packages are published to npm.
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const rootDir = path.join(__dirname, "..");
const packagesDir = path.join(rootDir, "packages");
const distDir = path.join(rootDir, "dist-local");

/**
 * Replace workspace dependencies with relative paths
 */
function replaceWorkspaceDependencies(packageJsonPath, outputPath) {
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));

  // Map of workspace dependencies to relative paths
  const workspaceMap = {
    "@codemcp/knowledge-core": "file:./packages/core",
    "@codemcp/knowledge-content-loader": "file:./packages/content-loader",
    "@codemcp/knowledge-mcp-server": "file:./packages/mcp-server",
    "@codemcp/knowledge-cli": "file:./packages/cli",
  };

  // Replace workspace dependencies
  if (packageJson.dependencies) {
    Object.keys(packageJson.dependencies).forEach((dep) => {
      if (
        packageJson.dependencies[dep] === "workspace:*" &&
        workspaceMap[dep]
      ) {
        packageJson.dependencies[dep] = workspaceMap[dep];
        console.log(`  Replaced ${dep}: workspace:* → ${workspaceMap[dep]}`);
      }
    });
  }

  if (packageJson.devDependencies) {
    Object.keys(packageJson.devDependencies).forEach((dep) => {
      if (
        packageJson.devDependencies[dep] === "workspace:*" &&
        workspaceMap[dep]
      ) {
        packageJson.devDependencies[dep] = workspaceMap[dep];
        console.log(`  Replaced ${dep}: workspace:* → ${workspaceMap[dep]}`);
      }
    });
  }

  fs.writeFileSync(outputPath, JSON.stringify(packageJson, null, 2));
}

/**
 * Copy package with modified dependencies
 */
function preparePackageForLocal(packageName, packagePath) {
  console.log(`\nPreparing ${packageName} for local installation...`);

  const distPackageDir = path.join(distDir, packageName);

  // Create dist directory
  if (!fs.existsSync(distPackageDir)) {
    fs.mkdirSync(distPackageDir, { recursive: true });
  }

  // Copy package.json with modified dependencies
  const originalPackageJson = path.join(packagePath, "package.json");
  const distPackageJson = path.join(distPackageDir, "package.json");

  if (fs.existsSync(originalPackageJson)) {
    replaceWorkspaceDependencies(originalPackageJson, distPackageJson);
  }

  // Copy dist folder if it exists
  const originalDist = path.join(packagePath, "dist");
  const targetDist = path.join(distPackageDir, "dist");

  if (fs.existsSync(originalDist)) {
    console.log(`  Copying dist folder...`);
    execSync(`cp -r "${originalDist}" "${targetDist}"`);
  }

  // Copy other important files
  const filesToCopy = ["README.md", "LICENSE", ".npmrc"];
  filesToCopy.forEach((file) => {
    const srcFile = path.join(packagePath, file);
    const destFile = path.join(distPackageDir, file);
    if (fs.existsSync(srcFile)) {
      fs.copyFileSync(srcFile, destFile);
      console.log(`  Copied ${file}`);
    }
  });
}

/**
 * Main execution
 */
function main() {
  console.log("🔧 Creating local installation packages...\n");

  // Clean dist directory
  if (fs.existsSync(distDir)) {
    execSync(`rm -rf "${distDir}"`);
  }
  fs.mkdirSync(distDir, { recursive: true });

  // Process each package
  const packages = [
    ["core", path.join(packagesDir, "core")],
    ["content-loader", path.join(packagesDir, "content-loader")],
    ["mcp-server", path.join(packagesDir, "mcp-server")],
    ["cli", path.join(packagesDir, "cli")],
  ];

  packages.forEach(([name, packagePath]) => {
    if (fs.existsSync(packagePath)) {
      preparePackageForLocal(name, packagePath);
    }
  });

  // Prepare root package
  console.log(`\nPreparing root package for local installation...`);
  const distRootDir = path.join(distDir, "root");
  fs.mkdirSync(distRootDir, { recursive: true });

  replaceWorkspaceDependencies(
    path.join(rootDir, "package.json"),
    path.join(distRootDir, "package.json"),
  );

  // Copy root files
  const rootFiles = ["README.md", "LICENSE", ".npmrc"];
  rootFiles.forEach((file) => {
    const srcFile = path.join(rootDir, file);
    const destFile = path.join(distRootDir, file);
    if (fs.existsSync(srcFile)) {
      fs.copyFileSync(srcFile, destFile);
    }
  });

  console.log("\n✅ Local installation packages created in dist-local/");
  console.log("\n📦 To create and install locally:");
  console.log("   cd dist-local/mcp-server && npm pack");
  console.log("   npm install -g codemcp-knowledge-mcp-server-0.1.0.tgz");
  console.log("\n   Or install directly from directory:");
  console.log("   npm install -g ./dist-local/mcp-server/");
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { preparePackageForLocal, replaceWorkspaceDependencies };
