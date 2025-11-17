const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('dokumen', {
    id_dokumen: {
      autoIncrement: true,
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true
    },
    tipe_dokumen: {
      type: DataTypes.ENUM('Buku Tanah','Surat Ukur','Warkah'),
      allowNull: false
    },
    no_dokumen: {
      type: DataTypes.STRING(150),
      allowNull: false
    },
    tanggal: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    id_pemilik: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'pemilik',
        key: 'id_pemilik'
      }
    },
    desa: {
      type: DataTypes.STRING(150),
      allowNull: true
    },
    kecamatan: {
      type: DataTypes.STRING(150),
      allowNull: true
    },
    kota: {
      type: DataTypes.STRING(150),
      allowNull: true
    },
    area_m2: {
      type: DataTypes.DECIMAL(12,2),
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
    id_unit: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'unit',
        key: 'id_unit'
      }
    },
    media: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    jumlah: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    tingkat_perkembangan: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    no_boks_definitif: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    no_folder: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    uraian_informasi: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    status: {
      type: DataTypes.ENUM('Lengkap','Rusak','Hilang'),
      allowNull: true,
      defaultValue: "Lengkap"
    }
  }, {
    sequelize,
    tableName: 'dokumen',
    timestamps: false,
    indexes: [
      {
        name: "PRIMARY",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "id_dokumen" },
        ]
      },
      {
        name: "ux_tipedok_nodok",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "tipe_dokumen" },
          { name: "no_dokumen" },
        ]
      },
      {
        name: "idx_owner",
        using: "BTREE",
        fields: [
          { name: "id_pemilik" },
        ]
      },
      {
        name: "idx_village",
        using: "BTREE",
        fields: [
          { name: "desa" },
        ]
      },
      {
        name: "fk_doc_location",
        using: "BTREE",
        fields: [
          { name: "id_lokasi" },
        ]
      },
      {
        name: "fk_doc_unit",
        using: "BTREE",
        fields: [
          { name: "id_unit" },
        ]
      },
      {
        name: "no_dokumen",
        using: "BTREE",
        fields: [
          { name: "no_dokumen" },
        ]
      },
    ]
  });
};
