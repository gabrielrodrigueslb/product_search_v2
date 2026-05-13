import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import vetorRoutes from './src/routes/providers/vetor.routes.js';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(cors());

app.use('/providers/vetor', vetorRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`Servidor rodando em ${PORT}`);
});
