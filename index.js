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

// Endpoint para receber webhooks do GitHub
app.post('/github/webhook', (req, res) => {
  const event = req.headers['x-github-event'];
  const payload = req.body;
  console.log('Recebido webhook do GitHub:', event);
  // Aqui você pode analisar o evento e acionar automações se necessário
  res.status(200).send('OK');
});

// Endpoint para receber webhooks do Vercel
app.post('/vercel/webhook', async (req, res) => {
  const payload = req.body;
  console.log('Recebido webhook do Vercel:', payload);

  // Exemplo: se status do deploy for erro, aciona automação de correção
  if (payload && payload.deployment && payload.deployment.state === 'ERROR') {
    // Aqui você pode chamar a função de correção automática
    // Exemplo: await corrigirErroDeploy(payload)
    console.log('Erro detectado no deploy! Acionando automação de correção...');
    // Você pode chamar o endpoint interno ou função já existente
  }

  res.status(200).send('OK');
});

// Função para monitorar deploys no Vercel e corrigir automaticamente se houver erro
const vercelToken = process.env.VERCEL_TOKEN;
const vercelProject = process.env.VERCEL_PROJECT || 'smartcont-automations-vfna';
const vercelTeam = process.env.VERCEL_TEAM || undefined; // se usar time, defina aqui
const vercelOwner = process.env.VERCEL_OWNER || 'danieltjdd';

async function monitorarDeploysVercel() {
  try {
    // Buscar os últimos deploys do projeto
    let url = `https://api.vercel.com/v6/deployments?projectId=${vercelProject}`;
    if (vercelTeam) {
      url += `&teamId=${vercelTeam}`;
    }
    const response = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${vercelToken}`
      }
    });
    const deploys = response.data.deployments || [];
    // Verificar se há algum deploy com erro
    const erroDeploy = deploys.find(d => d.state === 'ERROR');
    if (erroDeploy) {
      console.log('Deploy com erro detectado:', erroDeploy);
      // Acionar automação de correção
      await corrigirErroDeploy();
    } else {
      console.log('Nenhum deploy com erro encontrado.');
    }
  } catch (err) {
    console.error('Erro ao monitorar deploys do Vercel:', err.response?.data || err.message);
  }
}

// Função para acionar automação de correção
async function corrigirErroDeploy() {
  try {
    // Chama o próprio endpoint de correção já implementado
    const githubOwner = vercelOwner;
    const githubRepo = 'smartcont-automations';
    const res = await axios.post(`http://localhost:${port}/vercel/fix-build-script`, {
      repo: githubRepo,
      owner: githubOwner
    });
    console.log('Automação de correção acionada:', res.data);
  } catch (err) {
    console.error('Erro ao acionar automação de correção:', err.response?.data || err.message);
  }
}

// Inicia o monitoramento a cada 2 minutos
setInterval(monitorarDeploysVercel, 2 * 60 * 1000);

app.listen(port, () => {
  console.log(`MCP Server rodando na porta ${port}`);
});