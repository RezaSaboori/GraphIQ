import express from 'express';
import bodyParser from 'body-parser';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = 3000;

app.use(bodyParser.json());

const shapesFilePath = path.join(__dirname, '../public/datasets/shapes.json');
const connectorsFilePath = path.join(__dirname, '../public/datasets/connectors.json');

// API to get shapes
app.get('/api/shapes', (req, res) => {
    fs.readFile(shapesFilePath, 'utf8', (err, data) => {
        if (err) {
            console.error(err);
            res.status(500).send('Error reading shapes file');
            return;
        }
        res.setHeader('Content-Type', 'application/json');
        res.send(data);
    });
});

// API to get connectors
app.get('/api/connectors', (req, res) => {
    fs.readFile(connectorsFilePath, 'utf8', (err, data) => {
        if (err) {
            console.error(err);
            res.status(500).send('Error reading connectors file');
            return;
        }
        res.setHeader('Content-Type', 'application/json');
        res.send(data);
    });
});

// API to save shapes
app.post('/api/shapes', (req, res) => {
    const newShapesData = req.body;
    fs.writeFile(shapesFilePath, JSON.stringify(newShapesData, null, 2), 'utf8', (err) => {
        if (err) {
            console.error(err);
            res.status(500).send('Error writing shapes file');
            return;
        }
        res.status(200).send({ message: 'Shapes saved successfully' });
    });
});

app.listen(port, () => {
    console.log(`[server] listening at http://localhost:${port}`);
});
