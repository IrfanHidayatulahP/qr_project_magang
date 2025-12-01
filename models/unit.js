const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('unit', {
    id_unit: {
      autoIncrement: true,
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true
    },
    kode_unit: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: "ux_kode_unit"
    },
    nama_unit: {
      type: DataTypes.STRING(200),
      allowNull: true
    },
    alamat: {
      type: DataTypes.TEXT,
      allowNull: true
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
    tableName: 'unit',
    timestamps: true,
    indexes: [
      {
        name: "PRIMARY",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "id_unit" },
        ]
      },
      {
        name: "ux_kode_unit",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "kode_unit" },
        ]
      },
    ]
  });
};
