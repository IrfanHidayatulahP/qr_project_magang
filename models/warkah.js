const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('warkah', {
    id_warkah: {
      autoIncrement: true,
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true
    },
    nomor_di_208: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    nomor_hak: {
      type: DataTypes.STRING(150),
      allowNull: true
    },
    tahun_terbit: {
      type: DataTypes.DATE(4),
      allowNull: true
    },
    kode_klasifikasi: {
      type: DataTypes.STRING(20),
      allowNull: true
    },
    jenis_arsip_vital: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    uraian_informasi_arsip: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    media: {
      type: DataTypes.ENUM('Kertas','Digital','Microfilm'),
      allowNull: true,
      defaultValue: "Kertas"
    },
    jumlah: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    jangka_simpan_aktif: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    jangka_simpan_inaktif: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    jangka_simpan_keterangan: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    tingkat_perkembangan: {
      type: DataTypes.ENUM('Asli','Copy','Salinan'),
      allowNull: true,
      defaultValue: "Asli"
    },
    lokasi_penyimpanan: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    no_boks_definitif: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    nomor_folder: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    metode_perlindungan: {
      type: DataTypes.ENUM('Vaulting','Cloud','Physical'),
      allowNull: true,
      defaultValue: "Vaulting"
    },
    keterangan: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    sequelize,
    tableName: 'warkah',
    hasTrigger: true,
    timestamps: true,
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
        name: "idx_nomor_di_208",
        using: "BTREE",
        fields: [
          { name: "nomor_di_208" },
        ]
      },
      {
        name: "idx_kode_klasifikasi",
        using: "BTREE",
        fields: [
          { name: "kode_klasifikasi" },
        ]
      },
      {
        name: "idx_warkah_nomor_hak",
        using: "BTREE",
        fields: [
          { name: "nomor_hak" },
        ]
      },
    ]
  });
};
