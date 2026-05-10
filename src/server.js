require("dotenv").config();
const app = require("./app");

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(
    `🚀 Professional SaaS Backend running on http://localhost:${PORT}`,
  );
});
