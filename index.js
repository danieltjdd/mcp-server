const express = require('express');
const app = express();
const port = process.env.PORT || 8080;

app.get('/', (req, res) => {
  res.send('MCP Server está rodando!');
});

app.listen(port, () => {
  console.log(`MCP Server rodando na porta ${port}`);
}); 