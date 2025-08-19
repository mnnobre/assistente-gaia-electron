const fs = require("fs");
const path = require("path");

const rootDir = process.cwd();
const outputFile = path.join(rootDir, "projeto_completo.txt");

let output = "";

// =======================
// CONFIGURAÇÕES DE IGNORE
// =======================
const ignoreDirs = ["node_modules", ".git", "dist", "build", "out","release"];
const ignoreFiles = ["package-lock.json", "yarn.lock"];

// Extensões de arquivos de texto que vamos incluir
const textFileExtensions = [
  ".js", ".ts", ".tsx", ".jsx",
  ".json", ".md", ".html", ".css", ".scss", ".less",
  ".txt", ".yml", ".yaml", ".xml", ".ini", ".env"
];

/**
 * Checa se arquivo deve ser considerado texto.
 */
function isTextFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return textFileExtensions.includes(ext);
}

/**
 * Gera a árvore de diretórios em formato de texto.
 */
function generateTree(dir, prefix = "") {
  const items = fs.readdirSync(dir, { withFileTypes: true });

  items.forEach((item, index) => {
    if (ignoreDirs.includes(item.name) || ignoreFiles.includes(item.name)) return;

    const isLast = index === items.length - 1;
    const pointer = isLast ? "┗ " : "┣ ";

    if (item.isDirectory()) {
      output += `${prefix}${pointer}📂 ${item.name}\n`;
      generateTree(path.join(dir, item.name), prefix + (isLast ? "   " : "┃  "));
    } else {
      output += `${prefix}${pointer}📄 ${item.name}\n`;
    }
  });
}

/**
 * Percorre arquivos e escreve caminho + conteúdo.
 */
function dumpFiles(dir) {
  const items = fs.readdirSync(dir, { withFileTypes: true });

  items.forEach(item => {
    const fullPath = path.join(dir, item.name);
    if (ignoreDirs.includes(item.name) || ignoreFiles.includes(item.name)) return;

    if (item.isDirectory()) {
      dumpFiles(fullPath);
    } else if (isTextFile(fullPath)) {
      output += `\n// ${path.relative(rootDir, fullPath)}\n`;
      try {
        const content = fs.readFileSync(fullPath, "utf-8");
        output += content + "\n";
      } catch (err) {
        output += `Erro ao ler arquivo: ${err.message}\n`;
      }
    }
  });
}

// --- EXECUÇÃO ---
output += `📂 ${path.basename(rootDir)}\n`;
generateTree(rootDir);
dumpFiles(rootDir);

fs.writeFileSync(outputFile, output, "utf-8");
console.log(`✅ Projeto exportado para: ${outputFile}`);
