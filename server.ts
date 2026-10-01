import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import apiRouter from './server/apiRouter.ts';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(apiRouter);

// Serve static frontend assets from dist if built
app.use(express.static(path.resolve(__dirname, 'dist')));
app.get('*', (_req, res) => {
  res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
