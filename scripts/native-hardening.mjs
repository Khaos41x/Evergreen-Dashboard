import {readFileSync,writeFileSync} from 'node:fs'
import {nativeHTML} from './native-csp.mjs'
// Applied only to packaged copies; Vercel dist/index.html and its headers are untouched.
for(const path of ['android/app/src/main/assets/public/index.html','ios/App/App/public/index.html']){
 writeFileSync(path,nativeHTML(readFileSync(path,'utf8')))
}
console.log('CSP applied to Android/iOS packaged HTML only.')
