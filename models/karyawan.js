const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('karyawan', {
    id_karyawan: {
      autoIncrement: true,
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true
    },
    nama_karyawan: {
      type: DataTypes.STRING(200),
      allowNull: false
    },
    username: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: "ux_username"
    },
    password: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    email: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    jabatan: {
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
    tableName: 'karyawan',
    timestamps: true,
    indexes: [
      {
        name: "PRIMARY",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "id_karyawan" },
        ]
      },
      {
        name: "ux_username",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "username" },
        ]
      },
    ]
  });
};
