const fs = require('fs');

const cssPath = 'public/styles.css';
const content = fs.readFileSync(cssPath, 'utf8');
const lines = content.split('\n');

const startMarker = '/* Dashboard mockup fidelity overrides */';
const endMarker = '/* ===== Premium setup pages: Banco, Contas, Cartoes, Recebimentos ===== */';

const startIndex = lines.findIndex(line => line.includes(startMarker));
const endIndex = lines.findIndex(line => line.includes(endMarker));

if (startIndex !== -1 && endIndex !== -1 && startIndex < endIndex) {
  // We keep everything before startIndex, and everything from endIndex onwards.
  const newLines = [
    ...lines.slice(0, startIndex),
    ...lines.slice(endIndex)
  ];
  fs.writeFileSync(cssPath, newLines.join('\n'));
  console.log(`Success! Removed lines ${startIndex + 1} to ${endIndex}. Total lines reduced from ${lines.length} to ${newLines.length}.`);
} else {
  console.error(`Markers not found. start: ${startIndex}, end: ${endIndex}`);
}
