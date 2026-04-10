const fs = require("fs");
const path = require("path");

const baseDir = path.resolve(__dirname, "..", "public");
const pages = [
  ["cadastro-bancario.html", path.join("src", "pages", "cadastro-bancario.js")],
  ["cartoes.html", path.join("src", "pages", "cartoes.js")],
  ["contas.html", path.join("src", "pages", "contas.js")],
  ["dashboard.html", path.join("src", "pages", "dashboard.js")],
  ["investimentos.html", path.join("src", "pages", "investimentos.js")],
  ["profile.html", path.join("src", "pages", "profile.js")],
  ["recebimentos.html", path.join("src", "pages", "recebimentos.js")],
];

function readFile(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function getHtmlIds(html) {
  return new Set([...html.matchAll(/id="([^"]+)"/g)].map((match) => match[1]));
}

function getScriptIds(script) {
  const directIds = [...script.matchAll(/document\.getElementById\("([^"]+)"\)/g)].map(
    (match) => match[1]
  );
  const helperIds = [...script.matchAll(/getElement\("([^"]+)"\)/g)].map(
    (match) => match[1]
  );

  return [...new Set([...directIds, ...helperIds])].sort();
}

function validatePage(htmlFile, jsFile) {
  const html = readFile(path.join(baseDir, htmlFile));
  const script = readFile(path.join(baseDir, jsFile));
  const htmlIds = getHtmlIds(html);
  const scriptIds = getScriptIds(script);
  const missingIds = scriptIds.filter((id) => !htmlIds.has(id));

  return {
    htmlFile,
    jsFile,
    missingIds,
  };
}

const results = pages.map(([htmlFile, jsFile]) => validatePage(htmlFile, jsFile));
const hasErrors = results.some((result) => result.missingIds.length > 0);

results.forEach((result) => {
  if (!result.missingIds.length) {
    console.log(`OK: ${result.htmlFile} <- ${result.jsFile}`);
    return;
  }

  console.error(`ERRO: ${result.htmlFile} <- ${result.jsFile}`);
  console.error(`IDs ausentes: ${result.missingIds.join(", ")}`);
});

if (hasErrors) {
  process.exit(1);
}
