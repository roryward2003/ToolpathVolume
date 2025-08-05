import React, { useRef } from 'react'
import "../styles/Menu.css"

const Browse = ({submit}) => {
    const fileInputRef = useRef(null);

    const handleClick = () => {
        fileInputRef.current?.click()
    }

    const handleFileChange = (event) => {
        const file = event.target.files[0];
        if (file && file.type === 'image/svg+xml') {
            submit(file);
        }
    }

    return (
        <div>
            <button className="item browse" onClick={handleClick}>
                Browse for SVG
            </button>
            <input
                type="file"
                accept=".svg"
                ref={fileInputRef}
                onChange={handleFileChange}
                style={{ display: 'none' }}
            />
        </div>
    )
}

export default Browse
