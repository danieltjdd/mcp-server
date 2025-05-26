const express = require('express');
const cors = require('cors');
const axios = require('axios');
const app = express();
const port = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.json({
    status: 'online',
    version: '1.0.0',
    name: 'Cursor MCP Server'
  });
});

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

app.get('/status', (req, res) => {
  res.json({
    status: 'online',
    version: '1.0.0',
    tools: ['codebase_search']
  });
});

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

app.post('/vercel/fix-build-script', async (req, res) => {
  const { repo, owner } = req.body;
  const githubToken = process.env.GITHUB_TOKEN;

  if (!repo || !owner) {
    return res.status(400).json({ error: 'repo e owner são obrigatórios' });
  }

  try {
    // 1. Obter o conteúdo atual do package.json
    const packageJsonResponse = await axios.get(
      `https://api.github.com/repos/${owner}/${repo}/contents/package.json`,
      {
        headers: {
          Authorization: `token ${githubToken}`,
          'User-Agent': 'mcp-server'
        }
      }
    );

    const packageJson = JSON.parse(
      Buffer.from(packageJsonResponse.data.content, 'base64').toString()
    );

    // 2. Adicionar o script vercel-build se não existir
    if (!packageJson.scripts) {
      packageJson.scripts = {};
    }

    if (!packageJson.scripts['vercel-build']) {
      packageJson.scripts['vercel-build'] = 'next build';
    }

    // 3. Atualizar o arquivo no GitHub
    const updatedContent = Buffer.from(JSON.stringify(packageJson, null, 2)).toString('base64');

    await axios.put(
      `https://api.github.com/repos/${owner}/${repo}/contents/package.json`,
      {
        message: 'Adiciona script vercel-build',
        content: updatedContent,
        sha: packageJsonResponse.data.sha
      },
      {
        headers: {
          Authorization: `token ${githubToken}`,
          'User-Agent': 'mcp-server'
        }
      }
    );

    res.json({ 
      success: true, 
      message: 'Script vercel-build adicionado com sucesso',
      packageJson: packageJson
    });
  } catch (error) {
    console.error('Erro ao atualizar package.json:', error.response?.data || error.message);
    res.status(500).json({ 
      error: 'Erro ao atualizar package.json',
      details: error.response?.data || error.message
    });
  }
});

app.listen(port, () => {
  console.log(`MCP Server rodando na porta ${port}`);
});