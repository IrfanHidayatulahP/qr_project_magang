const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('pemilik', {
    id_pemilik: {
      autoIncrement: true,
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true
    },
    nama_pemilik: {
      type: DataTypes.STRING(200),
      allowNull: false
    },
    alamat: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    nik: {
      type: DataTypes.STRING(20),
      allowNull: true,
      unique: "ux_nik"
    },
    telepon: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    email: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: 1
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
      {
        name: "ux_nik",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "nik" },
        ]
      },
    ]
  });
};
