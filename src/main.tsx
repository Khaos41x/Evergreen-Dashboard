import React from 'react'
import ReactDOM from 'react-dom/client'
import { Root } from './collaboration/Root'
import { initializeMobile } from './mobile/runtime'
import {initializeLiveUpdates} from './mobile/live-updates'
import {registerPWA} from './pwa/register'
import './styles.css'
import './styles-extra.css'
import './home-reference.css'
import './mobile/mobile.css'
import './features/appearance/themes.css'
import './features/appearance/atlas.css'
import '@fontsource-variable/geist'
import { initializeFocusModality } from './features/appearance/focus'
import { initializeTheme } from './features/appearance/theme'

initializeTheme()
initializeFocusModality()

void initializeLiveUpdates().catch(()=>{})
void initializeMobile().catch(() => window.dispatchEvent(new CustomEvent('evergreen:native-error', {detail:'Não foi possível inicializar os recursos do aparelho.'})))

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode><Root /></React.StrictMode>,
)

registerPWA()

import './features/appearance/accessibility.css'
