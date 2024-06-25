const admin = require('firebase-admin');
const express = require('express');
const bodyParser = require('body-parser');
const serviceAccount = require('./atom-43343-firebase-adminsdk-y7xc2-8cead5ae49.json');
const cors = require('cors');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const app = express();
app.use(cors());
app.use(bodyParser.json());

// Middleware para verificar el token de ID
async function verifyToken(req, res, next) {
    const idToken = req.headers.authorization?.split('Bearer ')[1];
    if (!idToken) {
        return res.status(401).send({ error: 'Unauthorized' });
    }
    try {
        req.user = await admin.auth().verifyIdToken(idToken);
        next();
    } catch (error) {
        return res.status(401).send({ error: 'Unauthorized' });
    }
}

app.get('/', (req, res) => {
    res.send('app running');
});

app.get('/tasks', verifyToken, async (req, res) => {
    const { uid } = req.user;
    console.log(uid);
    try {
        const todosSnapshot = await db.collection('todos').where('uid', '==', uid).get();
        const todos = todosSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        res.status(200).send({ todos });
    } catch (error) {
        res.status(500).send({ error: error });
    }
});

app.post('/tasks', verifyToken, async (req, res) => {
    const dataPost = {
        title: req.body.title,
        description: req.body.description,
        date: req.body.date,
        state: req.body.state,
        uid: req.body.uid
    };
    try {
        await db.collection('todos').add(dataPost);
        res.status(200).send({ message: 'Todo added successfully' });
    } catch (error) {
        res.status(500).send({ error: 'Error adding todo' });
    }
});
app.delete('/tasks/:id', verifyToken, async (req, res) => {
    const todoId = req.params.id;

    try {
        const todoRef = db.collection('todos').doc(todoId);
        const doc = await todoRef.get();

        if (!doc.exists) {
            return res.status(404).send({ error: 'Todo not found' });
        }
        await todoRef.delete();
        res.status(200).send({ message: 'Todo deleted successfully' });
    } catch (error) {
        res.status(500).send({ error: 'Error deleting todo' });
    }
});

app.patch('/tasks/:id', verifyToken, async (req, res) => {
    const { id } = req.params;
    try {
        await db.collection('todos').doc(id).update(req.body);
        res.status(200).send({ message: 'Todo updated successfully' });
    } catch (error) {
        res.status(500).send({ error: 'Error updating todo' });
    }
});

app.listen(3000, () => {
    console.log('Server is running on port 3000');
});