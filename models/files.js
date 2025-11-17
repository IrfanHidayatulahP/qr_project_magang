const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('files', {
    id: {
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
    filename: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    path: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    file_size: {
      type: DataTypes.BIGINT,
      allowNull: true
    },
    uploaded_by: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    uploaded_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: Sequelize.Sequelize.fn('current_timestamp')
    }
  }, {
    sequelize,
    tableName: 'files',
    timestamps: false,
    indexes: [
      {
        name: "PRIMARY",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "id" },
        ]
      },
      {
        name: "fk_file_doc",
        using: "BTREE",
        fields: [
          { name: "id_dokumen" },
        ]
      },
    ]
  });
};
