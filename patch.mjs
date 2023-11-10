// Currently, react-native-webview is not compatible with react-native 0.73
// Also for new arch: screens, safe-area-context, and clipboard
import { readFile, writeFile } from 'node:fs/promises'

const file = await readFile('node_modules/react-native-webview/package.json', {
  encoding: 'utf8'
})

await writeFile(
  'node_modules/react-native-webview/package.json',
  file.replace(
    `  "main-internal": "src/index.ts",
  "typings": "index.d.ts",`,
    `  "main-internal": "src/index.ts",
  "react-native": "src/index.ts",
  "typings": "index.d.ts",`
  )
)

console.log('Patched react-native-webview for 0.73 compat')
