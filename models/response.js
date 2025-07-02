const mongoose = require('mongoose');

const responseSchema = new mongoose.Schema(
  {
    missao: {
      type: String,
      required: true,
      trim: true, // Remove espaços extras nas extremidades
    },
    usuario: {
        type: String,
        required: true,
        trim: true
    },
    numeroUsuario: {
        type: String,
        required: true, 
        trim: true,
    },
    texto: {
        type: String, 
        required: true, 
        trim: true,
    },
    revisado: {
        type: Boolean,
        required: true,
        default: false
    },
    aprovado: {
        type: Boolean,
        required: true, 
        default: false,
    }
  },
  {
    timestamps: true, // Adiciona campos createdAt e updatedAt automaticamente
  }
);

module.exports = mongoose.model('Response', responseSchema);