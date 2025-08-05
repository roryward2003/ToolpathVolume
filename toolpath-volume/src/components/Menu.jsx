import React, { useEffect, useState } from 'react'
import '../styles/Menu.css'
import NumericInput from './NumericInput.jsx'
import Browse from './Browse.jsx'

const Menu = ({setSvg, setDepth}) => {
    return (
        <div className="menu">
            <Browse submit={setSvg}/>
            <NumericInput submit={setDepth}/>
        </div>
    )
}

export default Menu
