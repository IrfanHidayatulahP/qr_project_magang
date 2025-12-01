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
      allowNull: true,
      unique: "ux_no_reg"
    },
    no_peta: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    jenis_hak: {
      type: DataTypes.ENUM('HM','HGB','HP','HGU','Pengelolaan','Lainnya'),
      allowNull: true
    },
    luas_tanah: {
      type: DataTypes.DECIMAL(10,2),
      allowNull: true
    },
    nama_pemilik_asal: {
      type: DataTypes.STRING(200),
      allowNull: true
    },
    tahun_terbit: {
      type: DataTypes.DATE(4),
      allowNull: true
    },
    keterangan: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    status_buku: {
      type: DataTypes.ENUM('Aktif','Non-Aktif','Mutasi','Hapus'),
      allowNull: true,
      defaultValue: "Aktif"
    }
  }, {
    sequelize,
    tableName: 'buku_tanah',
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
        name: "ux_no_reg",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "no_reg" },
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
        name: "idx_jenis_hak",
        using: "BTREE",
        fields: [
          { name: "jenis_hak" },
        ]
      },
      {
        name: "idx_status_buku",
        using: "BTREE",
        fields: [
          { name: "status_buku" },
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
