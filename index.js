const express = require('express');
const cors = require('cors');
const axios = require('axios');
const app = express();
const port = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());

// Endpoint principal do MCP
app.get('/', (req, res) => {
  res.json({
    status: 'online',
    version: '1.0.0',
    name: 'Cursor MCP Server'
  });
});

// Endpoint de ferramentas (exemplo)
app.get('/tools', (req, res) => {
  res.json({
    tools: [
      {
        name: 'codebase_search',
        description: 'Busca semântica no código',
        parameters: {
          type: 'object',
          properties: {
            query: { type: 'string' },
            target_directories: { type: 'array', items: { type: 'string' } }
          }
        }
      }
    ]
  });
});

// Endpoint de status (exemplo)
app.get('/status', (req, res) => {
  res.json({
    status: 'online',
    version: '1.0.0',
    tools: ['codebase_search']
  });
});

// Endpoint para listar repositórios do GitHub
app.get('/github/repos', async (req, res) => {
  const githubToken = process.env.GITHUB_TOKEN;
  try {
    const response = await axios.get('https://api.github.com/user/repos', {
      headers: {
        Authorization: `token ${githubToken}`,
        'User-Agent': 'mcp-server'
      }
    });
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(port, () => {
  console.log(`MCP Server rodando na porta ${port}`);
});
