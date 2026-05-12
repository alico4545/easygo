const fs = require('fs');
const path = require('path');

const targets = [
  {
    label: 'react-native-sensors',
    file: path.join(
      process.cwd(),
      'node_modules',
      'react-native-sensors',
      'android',
      'build.gradle',
    ),
  },
  {
    label: 'react-native-tts',
    file: path.join(
      process.cwd(),
      'node_modules',
      'react-native-tts',
      'android',
      'build.gradle',
    ),
  },
];

for (const target of targets) {
  if (!fs.existsSync(target.file)) {
    console.log(`[patch-gradle-repos] ${target.label}: target not found, skipping`);
    continue;
  }

  const original = fs.readFileSync(target.file, 'utf8');
  let patched = original.replace(/\bjcenter\(\)/g, 'mavenCentral()');

  if (target.label === 'react-native-tts') {
    // Legacy android plugin declaration in this module breaks on modern Gradle.
    patched = patched.replace(
      /buildscript[\s\S]*?apply plugin:\s*'com\.android\.library'/,
      "apply plugin: 'com.android.library'",
    );
  }

  if (patched !== original) {
    fs.writeFileSync(target.file, patched, 'utf8');
    console.log(`[patch-gradle-repos] ${target.label}: patched jcenter() -> mavenCentral()`);
  } else {
    console.log(`[patch-gradle-repos] ${target.label}: no jcenter() found, skipping`);
  }
}
