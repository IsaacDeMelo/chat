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
const { v2: cloudinary } = require('cloudinary');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

cloudinary.config({
    cloud_name: "duf0jgp5g", // Adicione no .env
    api_key: 565451444635366,       // Adicione no .env
    api_secret: "0aQZwIXBXwe2hKZImALQDKevbVw", // Adicione no .env
});

const storage = new CloudinaryStorage({
    cloudinary,
    params: {
        folder: 'profiles', // Nome da pasta no Cloudinary
        allowed_formats: ['jpg', 'png', 'jpeg'], // Formatos permitidos
    },
});

const upload = multer({ storage });
const app = express();
const PORT = process.env.PORT || 3000;
const server = http.createServer(app); // Cria o servidor HTTP
const io = new Server(server); // Adiciona o WebSocket ao servidor

// Conexão WebSocket
io.on('connection', (socket) => {
    console.log('Novo cliente conectado');

    // Escuta por desconexões
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

app.post('/register', upload.single('perfil'), async (req, res) => {
    const { username, email, password } = req.body;

    try {
        // Verifica se o usuário já existe
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).send('Este e-mail já está registrado.');
        }

        // Obtenha a URL da imagem enviada
        const perfilUrl = req.file.path;
    
        // Cria um novo usuário
        const newUser = new User({
            username,
            email,
            perfil: perfilUrl, // Salva a URL no banco de dados
            password,
        });

        await newUser.save();
        res.redirect('/login');
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
        console.log(user);
        res.render('chat', {user: user});
        
    } catch (err) {
        console.log(err);
        const messages = await Message.find();
        res.status(500).send('Erro ao processar login');
    }
});

app.post('/api/messages', upload.single('image'), async (req, res) => {
    const { usuario, texto } = req.body;
    const user = await User.findOne({ username: usuario });
    const foto = user?.perfil;
    const created = moment().tz('America/Sao_Paulo').format('hh:mm A');
    let imageUrl = null;

    if (req.file) {
        imageUrl = req.file.path; // URL da imagem no Cloudinary
    }

    try {
        const newMessage = new Message({
            usuario,
            texto,
            foto,
            created,
            imageUrl // Salva a URL da imagem, se houver
        });

        await newMessage.save();
        console.log('Mensagem salva:', newMessage);
        notifyClients(); // Notifica os clientes
        res.status(201).json(newMessage);
    } catch (err) {
        console.error('Erro ao salvar mensagem:', err.message);
        res.status(500).json({ error: 'Erro ao salvar mensagem' });
    }
});

app.get('/api/messages', async (req, res) => {
    try {
        const messages = await Message.find();
        res.json(messages);
        notifyClients();
    } catch (err) {
        res.status(500).json({ error: 'Erro ao buscar mensagens' });
    }
});

// Inicia o servidor e conecta ao MongoDB
server.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
    connectDB();
});