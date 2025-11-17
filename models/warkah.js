const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('warkah', {
    id_warkah: {
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
    no_warkah: {
      type: DataTypes.STRING(150),
      allowNull: true
    },
    no_di: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    id_lokasi: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'lokasi',
        key: 'id_lokasi'
      }
    },
    jenis_arsip: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    info_arsip: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    jumlah_lembar: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    jangka_simpan: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    berkas_fisik: {
      type: DataTypes.ENUM('Asli','Copy'),
      allowNull: true
    },
    metode_perlindungan: {
      type: DataTypes.STRING(150),
      allowNull: true
    },
    keterangan: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    sequelize,
    tableName: 'warkah',
    hasTrigger: true,
    timestamps: false,
    indexes: [
      {
        name: "PRIMARY",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "id_warkah" },
        ]
      },
      {
        name: "fk_wk_doc",
        using: "BTREE",
        fields: [
          { name: "id_dokumen" },
        ]
      },
      {
        name: "fk_wk_lok",
        using: "BTREE",
        fields: [
          { name: "id_lokasi" },
        ]
      },
      {
        name: "no_warkah",
        using: "BTREE",
        fields: [
          { name: "no_warkah" },
        ]
      },
      {
        name: "no_di",
        using: "BTREE",
        fields: [
          { name: "no_di" },
        ]
      },
    ]
  });
};
