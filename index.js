// Exemplo simples de API em Express (index.js)
// Endpoints:
// GET  /            -> mensagem de boas-vindas
// GET  /items       -> lista todos os itens
// GET  /items/:id   -> obtém 1 item
// POST /items       -> cria um item { name }
// PUT  /items/:id   -> atualiza um item { name }
// DELETE /items/:id -> remove um item

const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// "Banco de dados" em memória
let items = [];
let nextId = 1;

// Rotas
app.get('/', (req, res) => {
  res.json({ message: 'API Express funcionando' });
});

app.get('/items', (req, res) => {
  res.json(items);
});

app.get('/items/:id', (req, res) => {
  const id = Number(req.params.id);
  const item = items.find(i => i.id === id);
  if (!item) return res.status(404).json({ error: 'Item não encontrado' });
  res.json(item);
});

app.post('/items', (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Campo name é obrigatório' });
  const item = { id: nextId++, name };
  items.push(item);
  res.status(201).json(item);
});

app.put('/items/:id', (req, res) => {
  const id = Number(req.params.id);
  const { name } = req.body;
  const item = items.find(i => i.id === id);
  if (!item) return res.status(404).json({ error: 'Item não encontrado' });
  if (!name) return res.status(400).json({ error: 'Campo name é obrigatório' });
  item.name = name;
  res.json(item);
});

app.delete('/items/:id', (req, res) => {
  const id = Number(req.params.id);
  const index = items.findIndex(i => i.id === id);
  if (index === -1) return res.status(404).json({ error: 'Item não encontrado' });
  const deleted = items.splice(index, 1)[0];
  res.json(deleted);
});

// Tratamento de erro genérico
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Erro interno' });
});

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});