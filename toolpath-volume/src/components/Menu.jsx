import React, { useEffect, useState } from 'react'
import '../styles/Menu.css'
import Input from './Input.jsx'

const Menu = ({setDepth}) => {
    return (
        <div className="menu">
            <button className="item browse">
                Browse for SVG
            </button>
            <Input className="item input" submit={setDepth}/>
        </div>
    )
}

export default Menu