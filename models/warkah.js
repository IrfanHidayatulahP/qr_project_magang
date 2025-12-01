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
      },
      unique: "fk_warkah_doc"
    },
    nomor_di_208: {
      type: DataTypes.STRING(100),
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
    uraian_bt: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    uraian_su: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    uraian_warkah_detail: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    uraian_informasi_arsip_fix: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    tingkat_perkembangan_bt: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    tingkat_perkembangan_su: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    tingkat_perkembangan_fix: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    sequelize,
    tableName: 'warkah',
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
        name: "ux_id_dokumen",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "id_dokumen" },
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
    ]
  });
};
