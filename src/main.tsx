import React from 'react'
import ReactDOM from 'react-dom/client'
import { Root } from './collaboration/Root'
import './styles.css'
import './styles-extra.css'
import './home-reference.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode><Root /></React.StrictMode>,
)
