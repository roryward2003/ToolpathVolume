import React, { useEffect, useState } from 'react'
import "../styles/Menu.css"

const Input = ({submit}) => {
    const [active, setActive] = useState(false)
    const [text, setText] = useState("")
    const [cursor, setCursor] = useState("")

    useEffect(() => {
        const intervalId = setInterval(() => {
            setCursor((prev) => prev === "" ? "|" : "")
        }, 500)
    
        return () => clearInterval(intervalId);
    }, []);

    function handleSubmit() {
        submit(parseFloat(text))
    }

    function handleKeyDown(event) {
        if (!active) { return }
        if (event.key === "Enter") {
            handleSubmit()
        } else if (event.key === "Backspace" && text.length > 0) {
            setText(text.slice(0, text.length-1))
        } else if (event.key >= "0" && event.key <= "9" && text.length < 15) {
            setText(text + event.key)
        } else if (event.key === "." && text === "") {
            setText("0.")
        } else if (event.key === "." && !text.includes(".") && text.length < 15) {
            setText(text + event.key)
        }
    }
  
    return (
        <button className="item input"
            onFocus={() => setActive(true)}
            onBlur={() => setActive(false)}
            onKeyDown={handleKeyDown}>
            {text === "" ? (active ? cursor : "Enter depth here") : text}
        </button>
    )
}

export default Input