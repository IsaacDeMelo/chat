const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
    texto: {
      type: String,
      required: true,
      trim: true, // Remove espaços extras nas extremidades
    },
    usuario: {
      type: String,
      required: true,
      trim: true,
    },
    foto: {
      type: String, // URL da foto
      default: null, // Permite mensagens sem foto
    },
    created: {
      type: String, // URL da foto
      default: null, // Permite mensagens sem foto
    },
  },
  {
    timestamps: true, // Adiciona campos createdAt e updatedAt automaticamente
  }
);

module.exports = mongoose.model('Message', messageSchema);