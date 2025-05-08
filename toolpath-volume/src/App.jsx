import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import Menu from './components/Menu.jsx'

function App() {
  const [depth, setDepth] = useState(0)

  return (
    <>
      <Menu setDepth={setDepth}/>
    </>
  )
}

export default App
