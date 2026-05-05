const fs = require('fs');
const path = require('path');

const target = path.join(
  process.cwd(),
  'node_modules',
  'react-native-sensors',
  'android',
  'build.gradle',
);

if (!fs.existsSync(target)) {
  console.log('[patch-react-native-sensors] target not found, skipping');
  process.exit(0);
}

const original = fs.readFileSync(target, 'utf8');
const patched = original.replace(/\bjcenter\(\)/g, 'mavenCentral()');

if (patched !== original) {
  fs.writeFileSync(target, patched, 'utf8');
  console.log('[patch-react-native-sensors] patched jcenter() -> mavenCentral()');
} else {
  console.log('[patch-react-native-sensors] no jcenter() found, skipping');
}
