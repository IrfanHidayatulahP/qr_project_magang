const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('buku_tanah', {
    id_buku_tanah: {
      autoIncrement: true,
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true
    },
    nomor_hak: {
      type: DataTypes.STRING(150),
      allowNull: true
    },
    jenis_hak: {
      type: DataTypes.ENUM('HM','HGB','HP','HGU','Pengelolaan','Lainnya'),
      allowNull: true
    },
    tahun_terbit: {
      type: DataTypes.DATE(4),
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
    qr_path: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    files: {
      type: DataTypes.STRING(255),
      allowNull: false
    }
  }, {
    sequelize,
    tableName: 'buku_tanah',
    hasTrigger: true,
    timestamps: true,
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
        name: "idx_jenis_hak",
        using: "BTREE",
        fields: [
          { name: "jenis_hak" },
        ]
      },
      {
        name: "idx_tahun_terbit",
        using: "BTREE",
        fields: [
          { name: "tahun_terbit" },
        ]
      },
    ]
  });
};
