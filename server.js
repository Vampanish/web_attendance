import express, { json } from "express";
import cors from "cors";
const app = express();
app.use(cors());
app.use(json());

app.post("/calculate", (req, res) => {
    try {
        const { expression } = req.body;
        const result = eval(expression); // Simple eval-based calculation
        res.json({ result });
    } catch (error) {
        res.json({ result: "Error" });
    }
});

app.listen(5000, () => console.log("Server running on port 5000"));
