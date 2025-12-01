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
      allowNull: true,
      unique: "ux_kode_lokasi"
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    kapasitas: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0
    },
    terpakai: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0
    }
  }, {
    sequelize,
    tableName: 'lokasi',
    timestamps: true,
    indexes: [
      {
        name: "PRIMARY",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "id_lokasi" },
        ]
      },
      {
        name: "ux_kode_lokasi",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "kode_lokasi" },
        ]
      },
      {
        name: "idx_ruangan_rak",
        using: "BTREE",
        fields: [
          { name: "ruangan" },
          { name: "no_rak" },
        ]
      },
      {
        name: "idx_lokasi_ruangan",
        using: "BTREE",
        fields: [
          { name: "ruangan" },
        ]
      },
    ]
  });
};
