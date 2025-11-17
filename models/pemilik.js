const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('pemilik', {
    id_pemilik: {
      autoIncrement: true,
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true
    },
    nama_lengkap: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    no_identitas: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    alamat: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    no_hp: {
      type: DataTypes.STRING(50),
      allowNull: true
    }
  }, {
    sequelize,
    tableName: 'pemilik',
    timestamps: true,
    indexes: [
      {
        name: "PRIMARY",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "id_pemilik" },
        ]
      },
    ]
  });
};
