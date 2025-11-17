const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('lokasi', {
    id_lokasi: {
      autoIncrement: true,
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true
    },
    ruangan: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    no_rak: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    label_baris: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    no_pos: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    kode_lokasi: {
      type: DataTypes.STRING(150),
      allowNull: true
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    sequelize,
    tableName: 'lokasi',
    timestamps: false,
    indexes: [
      {
        name: "PRIMARY",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "id_lokasi" },
        ]
      },
    ]
  });
};
