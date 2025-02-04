const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const { Schema } = mongoose;

// Definindo o esquema de usuário
const UserSchema = new Schema({
    username: { type: String, required: true, unique: true },
    number: { type: String, required: true, unique: true },
    perfil: { type: String, required: true },
    password: { type: String, required: false },
    lastMessageTime: {
        type: Date, // Armazena o tempo da última mensagem
        default: null
    },
    saldoBancario: {
        type: Number,
        required: true,
        default: 0 // Inicialmente 0, você pode definir um valor inicial, se necessário.
    },
    deck: {
        type: [Schema.Types.Mixed], // Array flexível que aceita qualquer tipo de dado
        required: true,
        default: [] // Inicializa o deck como um array vazio
    },
    battleReview: [
        {
            nome: { type: String, required: true },  // Nome do jogador ou oponente na batalha
            cartas: [
                {
                    nome: { type: String, required: true },  // Nome da carta
                    poder: { type: Number, required: true }  // Poder da carta
                }
            ],
            vida: { type: Number, required: true },
            energia: { type: Number, required: true },
            envenenado: [
                {
                    envenenado: { type: Boolean, default: false },  // Inicialmente false
                    dano: { type: Number, default: 0 }  // Inicialmente 0
                }
            ]
        }
    ]
});

// Método para comparar senhas
UserSchema.methods.comparePassword = async function (password) {
    return bcrypt.compare(password, this.password);
};

// Middleware para hash de senha
UserSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();
    this.password = await bcrypt.hash(this.password, 10);
    next();
});

// Criando o modelo
const User = mongoose.model('User', UserSchema);

module.exports = User;
