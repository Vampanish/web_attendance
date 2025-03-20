import React, { useState } from "react";
import axios from "axios";
import "./Calculator.css";

function Calculator() {
    const [input, setInput] = useState("0");

    const handleButtonClick = (value) => {
        if (value === "C") {
            setInput("0");
        } else if (value === "=") {
            calculateResult();
        } else {
            setInput((prev) => (prev === "0" ? value : prev + value));
        }
    };

    const calculateResult = async () => {
        try {
            const response = await axios.post("http://localhost:5000/calculate", {
                expression: input
            });
            setInput(response.data.result);
        } catch (error) {
            console.error("Error fetching result:", error);
            setInput("Error");
        }
    };

    return (
        <div className="calculator">
            <div className="display">{input}</div>
            <div className="buttons">
                {["C", "←", "%", "/"].map((btn) => (
                    <button key={btn} onClick={() => handleButtonClick(btn)}>{btn}</button>
                ))}
                {["7", "8", "9", "*"].map((btn) => (
                    <button key={btn} onClick={() => handleButtonClick(btn)}>{btn}</button>
                ))}
                {["4", "5", "6", "-"].map((btn) => (
                    <button key={btn} onClick={() => handleButtonClick(btn)}>{btn}</button>
                ))}
                {["1", "2", "3", "+"].map((btn) => (
                    <button key={btn} onClick={() => handleButtonClick(btn)}>{btn}</button>
                ))}
                {["±", "0", ".", "="].map((btn) => (
                    <button key={btn} className={btn === "=" ? "equals" : ""} onClick={() => handleButtonClick(btn)}>
                        {btn}
                    </button>
                ))}
            </div>
        </div>
    );
}

export default Calculator;
