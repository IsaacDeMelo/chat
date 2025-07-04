const express = require('express');
const util = require('util');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Message = require('./models/message.js');
const Mission = require('./models/mission.js');
const Response = require('./models/response.js');
const User = require('./models/user.js');
const moment = require('moment-timezone');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

let CurrentUser = null;

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
const PORT = process.env.PORT || 3200;
const server = http.createServer(app); // Cria o servidor HTTP
const io = new Server(server); // Adiciona o WebSocket ao servidor

// Conexão WebSocket
io.on('connection', (socket) => {
    console.log('Novo cliente conectado');

    socket.on('requestMessages', () => {
        Message.find()
            .then((messages) => {
                socket.emit('updateMessages', messages);
            })
            .catch((err) => {
                console.error('Erro ao buscar mensagens:', err);
            });
    });
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
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true })); // Para processar dados de formulários console.log
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
app.get('/open-world/:id', async (req, res) => {
    let userPassword = req.params.id;
    let user = await User.findOne({ password: userPassword });
    let missions = await Mission.find();
    let responses = await Response.find();
    console.log(responses)
    res.render('open-world', { user: user, missions: missions, responses: responses })
})
app.post('/spin/:id', async (req, res) => {
    const type = req.body.type;
    let userPassword = req.params.id;
    let user = await User.findOne({ password: userPassword });

    try {
        if (type === "nen") {
            if (user.girosH >= 1) {
                user.girosH -= 1;
                await User.findByIdAndUpdate(user._id, { girosH: user.girosH });
                return res.json({ success: true });
            }
        }

        if (type === "familia") {
            if (user.girosF >= 1) {
                user.girosF -= 1;
                await User.findByIdAndUpdate(user._id, { girosF: user.girosF });
                return res.json({ success: true });
            }
        }

        if (type === "raridade") {
            if (user.girosR >= 1) {
                user.girosR -= 1;
                await User.findByIdAndUpdate(user._id, { girosR: user.girosR });
                return res.json({ success: true });
            }
        }

        return res.json({ success: false, error: "Sem giros disponíveis." });

    } catch (err) {
        console.error("Erro ao atualizar usuário:", err);
        return res.status(500).json({ success: false, error: "Erro interno do servidor." });
    }
});
app.get('/login', (req, res) => {
    res.render('login');
});
app.get('/loginAdm', (req, res) => {
    res.render('loginAdm');
})
app.post('/register', upload.single('perfil'), async (req, res) => {
    const { username, number } = req.body;
    const password = Math.floor(100000000 + Math.random() * 900000000);
    const email = String(Math.floor(100000000 + Math.random() * 9000000000));
    //const data = { nome: "Personagem", atributos: { forca: 0, resistencia: 0, velocidade: 0, agilidade: 0, nen: 0 }, itens: {}, dinheiro: 0 }
    try {
        // Verifica se o usuário já existe
        const existingUser = await User.findOne({ number });
        if (existingUser) {
            return res.status(400).send('Você já tem uma conta.');
        }
        // Obtenha a URL da imagem enviada
        const perfilUrl = req.file.path;
        // Cria um novo usuário
        const newUser = new User({
            username,
            number: String(number),
            perfil: perfilUrl, // Salva a URL no banco de dados
            email,
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
    const { number } = req.body;
    const user = await User.findOne({ number });
    try {
        //const user = await User.findOne({ username });
        if (!user) {
            return res.status(400).send('Usuário não encontrado');
        }
        CurrentUser = user;
        res.redirect("/home");
    } catch (err) {
        console.log(err);
        const messages = await Message.find();
        res.status(500).send('Erro ao processar login');
    }
});
app.post('/api/login', async (req, res) => {
    const { number } = req.body;
    try {
        // Verifica se o número existe no banco de dados
        const user = await User.findOne({ number });
        if (user) {
            CurrentUser = user;
            // Número válido, retorna sucesso
            res.redirect(`/home/${user.password}`)
        } else {
            res.redirect('/register');
            // Número não encontrado, requer registro
        }
    } catch (err) {
        console.error('Erro ao verificar número:', err.message);
        res.status(500).json({ success: false, message: 'Erro no servidor.' });
    }
});
app.post('/api/loginAdm', async (req, res) => {
    const { number } = req.body;
    try {
        // Verifica se o número existe no banco de dados
        const user = await User.findOne({ number });
        if (user) {
            CurrentUser = user;
            // Número válido, retorna sucesso
            if (user.adm == true) {
                res.redirect(`/adm/${user.password}`)
            }
        } else {
            res.redirect('/register');
            // Número não encontrado, requer registro
        }
    } catch (err) {
        console.error('Erro ao verificar número:', err.message);
        res.status(500).json({ success: false, message: 'Erro no servidor.' });
    }
});
app.get('/home/:id', async (req, res) => {
    let userPassword = req.params.id;
    let user = await User.findOne({ password: userPassword });
    if (user) {
        let users = await User.find({});
        users.forEach(element => {
            if (!element.nen) {
                element.nen = false
                element.save();
            }
        })
        res.render('chat', { user: user, users: users });
    } else {
        res.redirect('/login')
    }
});
app.get('/adm/:id', async (req, res) => {
    let userPassword = req.params.id;
    let user = await User.findOne({ password: userPassword });
    if (user) {
        let users = await User.find();
        let missions = await Mission.find();
        const responses = await Response.find({ revisado: false });
        res.render('adm', { user: user, users: users, responses: responses, missions: missions });
    } else {
        res.redirect('/login')
    }
});
app.get('/deletar-resposta/:id/:password', async (req, res) => {
    try {
        const { id, password } = req.params;

        // Verifica se a resposta existe antes de deletar (opcional)
        const response = await Response.findById(id);
        const user = await User.findOne({ password })
        if (!response) {
            return res.status(404).send('Resposta não encontrada.');
        }

        await Response.findByIdAndDelete(id);

        // Redireciona após deletar (ajuste o caminho conforme seu fluxo)
        res.redirect(`/response/${response.missao}/${user.password}`);
    } catch (error) {
        console.error('Erro ao deletar resposta:', error);
        res.status(500).send('Erro ao tentar deletar a resposta.');
    }
});
app.get('/criar-missao', (req, res) => {
    res.render('./adm/criarMissao.ejs')
});
app.get('/ficha/:id', async (req, res) => {
    try {
        let userPassword = req.params.id;
        let user = await User.findOne({ password: userPassword });

        if (!user) {
            return res.status(404).send('Usuário não encontrado');
        }

        res.render('ficha', { user });
    } catch (err) {
        console.error(err);
        res.status(500).send('Erro no servidor');
    }
});
app.post('/mission-submit', upload.single('imagem'), async (req, res) => {
    const { titulo, descricao, imagem, pontos, dinheiro } = req.body;
    let imageUrl = null;
    if (req.file) {
        imageUrl = req.file.path;
    }
    try {
        const newMission = new Mission({
            titulo,
            descricao,
            imagem: imageUrl,
            pontos,
            dinheiro
        });

        await newMission.save();
        res.redirect('/loginAdm')
    } catch (err) {
        console.error('Erro ao salvar a missão:', err.message);
        res.status(500).json({ error: 'Erro ao salvar a missão.' });
    }
});
app.get('/mission-delete/:id', async (req, res) => {
    const titulo = req.params.id;

    try {
        const missao = await Mission.findOneAndDelete({ titulo });

        if (!missao) {
            return res.status(404).json({ error: 'Missão não encontrada.' });
        }
        res.redirect('/loginAdm')
    } catch (err) {
        console.error('Erro ao deletar missão:', err.message);
        res.status(500).json({ error: 'Erro ao deletar a missão.' });
    }
});
app.post('/api/messages', upload.single('image'), async (req, res) => {
    const { usuario, texto } = req.body;
    const user = await User.findOne({ username: usuario });
    const foto = user?.perfil;
    const created = moment().tz('America/Sao_Paulo').format('hh:mm A');
    let imageUrl = null;

    if (req.file) {
        imageUrl = req.file.path;
    }

    // Verifica se é um comando /dado
    if (/^\/dado/i.test(texto)) {
        const nomesBrutos = texto.replace(/^\/dado\s*/i, ''); // remove "/dado" + espaços iniciais console.log
        const lista = nomesBrutos
            .split(',')
            .map(n => n.trim())
            .filter(n => n.length > 0);

        if (lista.length === 0) {
            return res.status(400).json({ error: 'Nenhum nome informado no comando /dado.' });
        }

        const linhas = lista.map(nome => {
            const numero = Math.floor(Math.random() * 21);
            return `${nome} tirou ${numero} no dado 🎲`;
        });

        const textoFinal = linhas.join('\n');

        const dadoMessage = new Message({
            usuario: 'Dado',
            texto: textoFinal,
            foto: 'https://i.pinimg.com/736x/ee/51/73/ee5173dd81b2abc23de6df5a5b671548.jpg',
            created,
            imageUrl: null
        });

        await dadoMessage.save();
        notifyClients();

        return res.status(201).json(dadoMessage);
    }

    // Caso seja uma mensagem comum
    try {
        const newMessage = new Message({
            usuario,
            texto,
            foto,
            created,
            imageUrl
        });

        await newMessage.save();
        notifyClients();
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
app.post('/enviar-ficha/:id', async (req, res) => {
    let userPassword = req.params.id;
    let user = await User.findOne({ password: userPassword });
    const d = req.body;

    // Validação básica
    const obrigatorios = ['characterName', 'age', 'family', 'hatsu', 'nenType', 'strength', 'endurance', 'speed', 'agility', 'nen'];
    for (const campo of obrigatorios) {
        if (d[campo] === undefined || d[campo] === '') {
            return res.status(400).json({ success: false, error: `Campo ${campo} está faltando.` });
        }
    }
    const familia = d.family;
    if (familia == "Nostrade") {
        d.money = 20000
    } else if (familia == "Kakin") {
        d.money = 40000
    }
    // (Opcional) Validação de pontos totais
    const totalAtributos = Number(d.strength) + Number(d.endurance) + Number(d.speed) + Number(d.agility);
    if (totalAtributos > 20) {
        return res.status(400).json({ success: false, error: 'Total de pontos excede 20.' });
    }

    try {
        user.data = {
            nome: d.characterName,
            idade: Number(d.age),
            familia: d.family,
            alturaCM: Number(d.height || 0),
            localizacao: d.location || 'Desconhecida',
            atributos: {
                forca: Number(d.strength),
                resistencia: Number(d.endurance),
                velocidade: Number(d.speed),
                agilidade: Number(d.agility),
                nen: Number(d.nen)
            },
            tipoRatsu: d.nenType,
            raridadeNen: d.hatsu,
            itens: {},
            dinheiro: Number(String(d.money)?.replace(/\D/g, '') || 10000)

        };

        await user.save();
        res.json({ success: true })

    } catch (err) {
        console.error('Erro ao salvar ficha:', err);
        res.status(500).json({ success: false, error: 'Erro ao salvar no banco.' });
    }
});
app.post('/responder-missao', async (req, res) => {
    const { titulo, password, texto } = req.body;
    console.log(req.body);
    const user = await User.findOne({ password: password })
    console.log(user);
    const resposta = new Response({
        missao: titulo,
        usuario: user.username,
        numeroUsuario: user.number,
        texto: texto,
    })
    resposta.save();
    res.redirect(`/open-world/${user.password}`);

});
app.get('/pontos/:password', async (req, res) => {
    const password = req.params.password;
    const user = await User.findOne({ password });
    res.render('pontos', { user: user })
});
app.post('/pontos/:password', async (req, res) => {
    const password = req.params.password;
    const user = await User.findOne({ password });

    if (!user || !user.data || !user.data.atributos) {
        return res.status(400).send("Usuário inválido");
    }

    const body = req.body;
    const atributos = ['forca', 'resistencia', 'velocidade', 'agilidade'];
    let totalGasto = 0;

    for (let attr of atributos) {
        const incremento = parseInt(body[attr]) || 0;

        if (incremento < 0) {
            return res.status(400).send(`Valor negativo não permitido em ${attr}.`);
        }

        user.data.atributos[attr] += incremento;
        totalGasto += incremento;
    }

    if (user.nen && body.nen) {
        const nenIncremento = parseInt(body.nen) || 0;

        if (nenIncremento < 0) {
            return res.status(400).send("Valor negativo não permitido em Nen.");
        }

        user.data.atributos.nen += nenIncremento;
        totalGasto += nenIncremento;
    }

    if (totalGasto > user.data.atributos.extra) {
        return res.status(400).send("Você gastou mais pontos do que o disponível.");
    }

    user.data.atributos.extra -= totalGasto;

    await user.save();
    res.redirect('/');
});

app.get('/revisar-missao/:titulo/:usuario', async (req, res) => {
    const { titulo, usuario } = req.params;
    const response = await Response.findOne({ missao: titulo, usuario: usuario });
    const user = await User.findOne({ username: usuario });
    if (response) {
        const atributosBase = user.data.atributos || {};
        const atributosComBonus = {
            forca: Number(atributosBase.forca) || 0,
            resistencia: Number(atributosBase.resistencia) || 0,
            velocidade: Number(atributosBase.velocidade) || 0,
            agilidade: Number(atributosBase.agilidade) || 0,
            nen: Number(atributosBase.nen) || 0
        };


        const familia = user.data.familia;

        if (familia === "Zoldyck") {
            atributosComBonus.forca *= 1.10;
            atributosComBonus.velocidade *= 1.15;
        } else if (familia === "Uzuki") {
            atributosComBonus.forca *= 1.10;
            atributosComBonus.velocidade *= 1.10;
        } else if (familia === "Freecs") {
            atributosComBonus.forca *= 1.25;
            atributosComBonus.resistencia *= 1.25;
        } else if (familia === "Netero") {
            atributosComBonus.forca *= 1.20;
            atributosComBonus.resistencia *= 1.20;
        } else if (familia === "Ryusegai") {
            atributosComBonus.forca *= 1.20;
            atributosComBonus.velocidade *= 1.15;
            atributosComBonus.resistencia *= 1.10;
        }

        // Arredonda os valores com bônus, se quiser:
        for (let key in atributosComBonus) {
            atributosComBonus[key] = atributosComBonus[key].toFixed(1);
        }

        res.render('revisao', {
            user,
            response,
            atributosBonus: atributosComBonus
        });
    } else {
        console.log(titulo)
        console.log(usuario)
        console.log(user)
        console.log(response)
    }
});
app.post('/aprovar-missao/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // 1. Buscar a resposta
        const response = await Response.findById(id);
        if (!response) return res.status(404).send("Resposta não encontrada.");

        // 2. Buscar a missão correspondente
        const mission = await Mission.findOne({ titulo: response.missao });
        if (!mission) return res.status(404).send("Missão associada não encontrada.");

        // 3. Buscar o usuário
        const user = await User.findOne({ username: response.usuario });
        if (!user || !user.data) return res.status(404).send("Usuário não encontrado.");

        // 4. Atribuir recompensas
        const pontos = parseInt(mission.pontos, 10) || 0;
        const dinheiro = parseInt(mission.dinheiro, 10) || 0;

        if (user.data.atributos) {
            user.data.atributos.extra = (user.data.atributos.extra || 0) + pontos;
        }

        user.data.dinheiro += dinheiro;

        // 5. Marcar a resposta como revisada e aprovada
        response.revisado = true;
        response.aprovado = true;

        await Promise.all([
            response.save(),
            user.save()
        ]);

        res.redirect('/loginAdm'); // ou para a lista de revisões
    } catch (err) {
        console.error("Erro ao aprovar missão:", err);
        res.status(500).send("Erro interno ao aprovar missão.");
    }
});

app.post('/reprovar-missao/:id', async (req, res) => {
    const { id } = req.params;
    await Response.findByIdAndUpdate(id, { revisado: true, aprovado: false });
    res.redirect('/loginAdm'); // ou a página que desejar
});
app.get('/response/:id/:password', async (req, res) => {
    const titulo = req.params.id;
    const password = req.params.password;
    console.log(titulo);
    console.log(password);
    const mission = await Mission.findOne({ titulo });
    const user = await User.findOne({ password });
    res.render('response', { mission: mission, user: user });
});
// Inicia o servidor e conecta ao MongoDB
server.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
    connectDB();
});
