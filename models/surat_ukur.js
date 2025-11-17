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
    no_survey: {
      type: DataTypes.STRING(150),
      allowNull: true
    },
    koordinat: {
      type: DataTypes.TEXT,
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
    tableName: 'surat_ukur',
    hasTrigger: true,
    timestamps: false,
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
        name: "fk_su_doc",
        using: "BTREE",
        fields: [
          { name: "id_dokumen" },
        ]
      },
      {
        name: "no_survey",
        using: "BTREE",
        fields: [
          { name: "no_survey" },
        ]
      },
    ]
  });
};
