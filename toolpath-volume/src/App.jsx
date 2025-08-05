import { useState, useEffect } from 'react'
import './App.css'
import Menu from './components/Menu.jsx'
import SvgHandler from './components/SvgHandler.jsx'

const App = () => {
  const [svg, setSvg] = useState(null)
  const [depth, setDepth] = useState(0)
  const [area, setArea] = useState(0)
  const [loading, setLoading] = useState(false)

  return (
    <div className="layout">
      <Menu className="sidebar" setSvg={setSvg} setDepth={setDepth}/>
      <div className="result"> Volume = {parseFloat(((depth/10) * area).toFixed(3))}ml </div>
      {loading && <div className="loading">Loading SVG...</div>}
      <SvgHandler className="svg-container" svg={svg} updateArea={setArea} setLoading={setLoading}/>
    </div>
  )
}

export default App
