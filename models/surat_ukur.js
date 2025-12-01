const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('surat_ukur', {
    id_surat_ukur: {
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
    nomor_hak: {
      type: DataTypes.STRING(150),
      allowNull: false,
      unique: "ux_nomor_hak"
    },
    jenis_hak: {
      type: DataTypes.ENUM('HM','HGB','HP','HGU','Pengelolaan','Lainnya'),
      allowNull: true
    },
    luas_tanah: {
      type: DataTypes.DECIMAL(10,2),
      allowNull: true
    },
    batas_timur: {
      type: DataTypes.STRING(200),
      allowNull: true
    },
    batas_barat: {
      type: DataTypes.STRING(200),
      allowNull: true
    },
    batas_utara: {
      type: DataTypes.STRING(200),
      allowNull: true
    },
    batas_selatan: {
      type: DataTypes.STRING(200),
      allowNull: true
    },
    koordinat: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    sequelize,
    tableName: 'surat_ukur',
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
      {
        name: "fk_su_doc",
        using: "BTREE",
        fields: [
          { name: "id_dokumen" },
        ]
      },
    ]
  });
};
