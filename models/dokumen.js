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
    nomor_hak: {
      type: DataTypes.STRING(150),
      allowNull: true
    },
    jenis_hak: {
      type: DataTypes.ENUM('HM','HGB','HP','HGU','Pengelolaan','Lainnya'),
      allowNull: true
    },
    tanggal: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    area_m2: {
      type: DataTypes.DECIMAL(12,2),
      allowNull: true
    },
    luas_tanah: {
      type: DataTypes.DECIMAL(10,2),
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
      type: DataTypes.ENUM('Kertas','Digital','Microfilm'),
      allowNull: true,
      defaultValue: "Kertas"
    },
    jumlah_lembar: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    tingkat_perkembangan: {
      type: DataTypes.ENUM('Asli','Copy','Salinan'),
      allowNull: true,
      defaultValue: "Asli"
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
    },
    metode_perlindungan: {
      type: DataTypes.ENUM('Vaulting','Cloud','Physical'),
      allowNull: true,
      defaultValue: "Vaulting"
    }
  }, {
    sequelize,
    tableName: 'dokumen',
    hasTrigger: true,
    timestamps: true,
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
      {
        name: "idx_tanggal",
        using: "BTREE",
        fields: [
          { name: "tanggal" },
        ]
      },
      {
        name: "idx_jenis_hak",
        using: "BTREE",
        fields: [
          { name: "jenis_hak" },
        ]
      },
      {
        name: "idx_dokumen_status",
        using: "BTREE",
        fields: [
          { name: "status" },
        ]
      },
      {
        name: "idx_dokumen_media",
        using: "BTREE",
        fields: [
          { name: "media" },
        ]
      },
      {
        name: "idx_dokumen_tanggal",
        using: "BTREE",
        fields: [
          { name: "tanggal" },
        ]
      },
    ]
  });
};
