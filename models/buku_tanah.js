const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('buku_tanah', {
    id_buku_tanah: {
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
    no_reg: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    jumlah_lembar: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    no_peta: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    keterangan: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    sequelize,
    tableName: 'buku_tanah',
    hasTrigger: true,
    timestamps: false,
    indexes: [
      {
        name: "PRIMARY",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "id_buku_tanah" },
        ]
      },
      {
        name: "fk_bt_doc",
        using: "BTREE",
        fields: [
          { name: "id_dokumen" },
        ]
      },
      {
        name: "no_reg",
        using: "BTREE",
        fields: [
          { name: "no_reg" },
        ]
      },
    ]
  });
};
