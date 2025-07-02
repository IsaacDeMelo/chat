const mongoose = require('mongoose');

const missionSchema = new mongoose.Schema(
  {
    titulo: {
      type: String,
      required: true,
      trim: true, // Remove espaços extras nas extremidades
    },
    descricao: {
      type: String,
      required: true,
      trim: true,
    },
    imagem: {
      type: String,
      required: false,
      default: null
    },
    pontos: {
      type: String, 
      required: true,
      default: null,
    },
    dinheiro: {
      type: String,
      required: true,
      default: null
    },
  },
  {
    timestamps: true, // Adiciona campos createdAt e updatedAt automaticamente
  }
);

module.exports = mongoose.model('Mission', missionSchema);