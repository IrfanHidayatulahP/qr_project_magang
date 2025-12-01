const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('dokumen_history', {
    id_history: {
      autoIncrement: true,
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true
    },
    id_dokumen: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'dokumen',
        key: 'id_dokumen'
      }
    },
    aksi: {
      type: DataTypes.ENUM('CREATE','UPDATE','DELETE'),
      allowNull: false
    },
    data_sebelum: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    data_sesudah: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    id_user: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'karyawan',
        key: 'id_karyawan'
      }
    }
  }, {
    sequelize,
    tableName: 'dokumen_history',
    timestamps: true,
    indexes: [
      {
        name: "PRIMARY",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "id_history" },
        ]
      },
      {
        name: "fk_history_doc",
        using: "BTREE",
        fields: [
          { name: "id_dokumen" },
        ]
      },
      {
        name: "fk_history_user",
        using: "BTREE",
        fields: [
          { name: "id_user" },
        ]
      },
      {
        name: "idx_created_at",
        using: "BTREE",
        fields: [
          { name: "created_at" },
        ]
      },
    ]
  });
};
