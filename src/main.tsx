import React from 'react'
import ReactDOM from 'react-dom/client'
import { Root } from './collaboration/Root'
import { initializeMobile } from './mobile/runtime'
import './styles.css'
import './styles-extra.css'
import './home-reference.css'
import './mobile/mobile.css'

void initializeMobile().catch(() => window.dispatchEvent(new CustomEvent('evergreen:native-error', {detail:'Não foi possível inicializar os recursos do aparelho.'})))

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode><Root /></React.StrictMode>,
)
