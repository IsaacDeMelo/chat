const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Message = require('./models/message.js');
const User = require('./models/user.js');
const moment = require('moment-timezone');
const http = require('http');
const { Server } = require('socket.io');

let CurrentUser = 0;

dotenv.config();

const app = express();
app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
const PORT = process.env.PORT || 3000;
const server = http.createServer(app); // Cria o servidor HTTP
const io = new Server(server); // Adiciona o WebSocket ao servidor
// Conexão WebSocket
io.on('connection', async (socket) => {
    console.log('Novo cliente conectado');

    try {
        // Envia mensagens já existentes ao cliente
        const messages = await Message.find();
        socket.emit('updateMessages', messages);
    } catch (err) {
        console.error('Erro ao buscar mensagens ao conectar:', err);
    }

    socket.on('disconnect', () => {
        console.log('Cliente desconectado');
    });
});


const notifyClients = () => {
    Message.find()
        .then((messages) => {
            io.emit('updateMessages', messages);
        })
        .catch((err) => console.error('Erro ao buscar mensagens:', err));
};

app.post('/api/messages', async (req, res) => {
    const { usuario, texto } = req.body;
    const username = usuario;
    const user = await User.findOne({ username });
    const foto = user.perfil;
    const created = moment()
        .tz('America/Sao_Paulo')
        .format('DD [de] MMMM [de] YYYY, HH:mm:ss');

    try {
        const newMessage = new Message({ usuario, texto, foto, created });
        await newMessage.save();

        notifyClients(); // Atualiza os clientes
        res.status(201).json(newMessage);
    } catch (err) {
        console.error('Erro ao salvar mensagem:', err.message);
        res.status(500).json({ error: 'Erro ao salvar mensagem' });
    }
});


app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true })); // Para processar dados de formulários
// Middleware para interpretar JSON
app.use(express.json());

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log('Conectado ao MongoDB com sucesso!');
    } catch (err) {
        console.error('Erro ao conectar ao MongoDB:', err.message);
        process.exit(1); // Encerra o servidor em caso de erro
    }
};

app.get('/', async (req, res) => {
    res.redirect('/login');
});

app.get('/login', (req, res) => {
    res.render('login');
});

app.post('/register', async (req, res) => {
    const { username, email, perfil, password } = req.body;

    try {
        // Verifica se o usuário já existe
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).send('Este e-mail já está registrado.');
        }

        // Cria um novo usuário
        const newUser = new User({
            username,
            email,
            perfil, // A URL da foto de perfil
            password,
        });

        // Salva o novo usuário no banco de dados
        await newUser.save();
        res.redirect('/login'); // Redireciona para a página de login após o registro bem-sucedido
    } catch (err) {
        console.error('Erro ao registrar usuário:', err.message);
        res.status(500).send('Erro ao registrar usuário');
    }
});


app.get('/register', (req, res) => {
    res.render('register');
});

app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const user = await User.findOne({ username });
        if (!user) {
            return res.status(400).send('Usuário não encontrado');
        }
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(400).send('Senha incorreta');
        }
        CurrentUser = user;
        res.render('chat', {user: user});
    } catch (err) {
        console.log(err);
        const messages = await Message.find();
        res.status(500).send('Erro ao processar login');
    }
});

app.post('/api/messages', async (req, res) => {
    const { usuario, texto } = req.body; // Recebe o nome do usuário e o texto da mensagem no corpo da requisição
    const username = usuario;
    const user = await User.findOne({ username })
    const foto = user.perfil;
    // Define o horário de criação no fuso de Brasília
    const created = moment()
        .tz('America/Sao_Paulo')
        .format('DD [de] MMMM [de] YYYY, HH:mm:ss'); // Formata com dia, mês, ano e horário

    try {
        const newMessage = new Message({ usuario, texto, foto, created });
        console.log(created)
        await newMessage.save();

        console.log(CurrentUser.username);
        console.log(`Texto da mensagem: ${texto}`);
        res.status(201).json(newMessage); // Retorna a nova mensagem
    } catch (err) {
        console.error('Erro ao salvar mensagem:', err.message);
        res.status(500).json({ error: 'Erro ao salvar mensagem' });
    }
});

app.get('/api/messages', async (req, res) => {
    try {
        const messages = await Message.find();
        res.json(messages);
    } catch (err) {
        res.status(500).json({ error: 'Erro ao buscar mensagens' });
    }
});

// Inicia o servidor e conecta ao MongoDB
server.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
    connectDB();
});