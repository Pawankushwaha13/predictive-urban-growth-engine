import app from "./app.js";

const vercelHandler = (req, res) => app(req, res);

export default vercelHandler;
