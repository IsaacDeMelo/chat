const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const { Schema } = mongoose;

const atributosSchema = new Schema({
  forca: Number,
  resistencia: Number,
  velocidade: Number,
  agilidade: Number,
  nen: Number,
  extra: Number,

}, { _id: false });

const dataSchema = new Schema({
  nome: { type: String, required: true },
  idade: { type: Number, required: true },
  familia: { type: String, required: true },
  alturaCM: { type: Number, required: true },
  localizacao: { type: String, required: true },
  atributos: { type: atributosSchema, required: true },
  tipoRatsu: { type: String, required: true },
  raridadeNen: { type: String, required: true },
  itens: { type: Object, default: {} },
  dinheiro: { type: Number, default: 10000 },
});

// Definindo o esquema de usuário
const UserSchema = new Schema({
    username: { type: String, required: true, unique: true },
    number: { type: String, required: true, unique: true },
    perfil: { type: String, required: true },
    password: { type: String, required: false },
    girosF: { type: Number, required: true, default: 5},
    girosH: { type: Number, required: true, default: 5},
    girosR: { type: Number, required: true, default: 5},
    adm: { type: Boolean, required: true, default: false},
    data: {
        type: dataSchema, 
        required: false,  
    },
    lastMessageTime: {
        type: Date, // Armazena o tempo da última mensagem
        default: null
    },
    saldoBancario: {
        type: Number,
        required: true,
        default: 0 // Inicialmente 0, você pode definir um valor inicial, se necessário.
    },
});

// Criando o modelo
const User = mongoose.model('User', UserSchema);

module.exports = User;
