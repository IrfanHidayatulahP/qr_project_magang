const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('surat_ukur', {
    id_surat_ukur: {
      autoIncrement: true,
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true
    },
    nomor_hak: {
      type: DataTypes.STRING(150),
      allowNull: false,
      unique: "ux_nomor_hak"
    },
    jenis_hak: {
      type: DataTypes.ENUM('HM','HGB','HP','HGU','Pengelolaan','Lainnya'),
      allowNull: true
    },
    nomor_surat_ukur: {
      type: DataTypes.STRING(255),
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
    tableName: 'surat_ukur',
    hasTrigger: true,
    timestamps: true,
    indexes: [
      {
        name: "PRIMARY",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "id_surat_ukur" },
        ]
      },
      {
        name: "ux_nomor_hak",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "nomor_hak" },
        ]
      },
    ]
  });
};
