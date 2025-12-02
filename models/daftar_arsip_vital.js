const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('daftar_arsip_vital', {
    id_daftar_arsip: {
      autoIncrement: true,
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true
    },
    nomor_urut: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: "ux_nomor_urut"
    },
    kode_klasifikasi: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    jenis_arsip_vital: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    nomor_item_arsip_uraian: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    kurun_waktu_berkas: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    media_buku_tanah: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    media_surat_ukur: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    media_warkah: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    jumlah_buku_tanah: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    jumlah_surat_ukur: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    jumlah_warkah: {
      type: DataTypes.STRING(50),
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
      type: DataTypes.TEXT,
      allowNull: true
    },
    lokasi_simpan_bt_ruang_rak: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    lokasi_simpan_bt_no_boks: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    lokasi_simpan_bt_no_folder: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    lokasi_simpan_su_ruang_rak: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    lokasi_simpan_su_no_boks: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    lokasi_simpan_su_no_folder: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    lokasi_simpan_warkah_ruang_rak: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    lokasi_simpan_warkah_no_boks: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    lokasi_simpan_warkah_no_folder: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    metode_perlindungan_bt: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    metode_perlindungan_su: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    metode_perlindungan_warkah: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    keterangan: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    id_dokumen_bt: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'dokumen',
        key: 'id_dokumen'
      }
    },
    id_dokumen_su: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'dokumen',
        key: 'id_dokumen'
      }
    },
    id_dokumen_warkah: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'dokumen',
        key: 'id_dokumen'
      }
    },
    is_processed: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: 0
    },
    processing_notes: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    sequelize,
    tableName: 'daftar_arsip_vital',
    hasTrigger: true,
    timestamps: true,
    indexes: [
      {
        name: "PRIMARY",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "id_daftar_arsip" },
        ]
      },
      {
        name: "ux_nomor_urut",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "nomor_urut" },
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
        name: "fk_daftar_arsip_bt",
        using: "BTREE",
        fields: [
          { name: "id_dokumen_bt" },
        ]
      },
      {
        name: "fk_daftar_arsip_su",
        using: "BTREE",
        fields: [
          { name: "id_dokumen_su" },
        ]
      },
      {
        name: "fk_daftar_arsip_warkah",
        using: "BTREE",
        fields: [
          { name: "id_dokumen_warkah" },
        ]
      },
      {
        name: "idx_is_processed",
        using: "BTREE",
        fields: [
          { name: "is_processed" },
        ]
      },
    ]
  });
};
