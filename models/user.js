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
    }
});

// Método para comparar senhas
UserSchema.methods.comparePassword = async function(password) {
    return bcrypt.compare(password, this.password);
};

// Middleware para hash de senha
UserSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();
    this.password = await bcrypt.hash(this.password, 10);
    next();
});

// Criando o modelo
const User = mongoose.model('User', UserSchema);

module.exports = User;
