var DataTypes = require("sequelize").DataTypes;
var _buku_tanah = require("./buku_tanah");
var _dokumen = require("./dokumen");
var _files = require("./files");
var _karyawan = require("./karyawan");
var _lokasi = require("./lokasi");
var _pemilik = require("./pemilik");
var _surat_ukur = require("./surat_ukur");
var _unit = require("./unit");
var _warkah = require("./warkah");

function initModels(sequelize) {
  var buku_tanah = _buku_tanah(sequelize, DataTypes);
  var dokumen = _dokumen(sequelize, DataTypes);
  var files = _files(sequelize, DataTypes);
  var karyawan = _karyawan(sequelize, DataTypes);
  var lokasi = _lokasi(sequelize, DataTypes);
  var pemilik = _pemilik(sequelize, DataTypes);
  var surat_ukur = _surat_ukur(sequelize, DataTypes);
  var unit = _unit(sequelize, DataTypes);
  var warkah = _warkah(sequelize, DataTypes);

  buku_tanah.belongsTo(dokumen, { as: "id_dokumen_dokumen", foreignKey: "id_dokumen"});
  dokumen.hasMany(buku_tanah, { as: "buku_tanahs", foreignKey: "id_dokumen"});
  files.belongsTo(dokumen, { as: "id_dokumen_dokumen", foreignKey: "id_dokumen"});
  dokumen.hasMany(files, { as: "files", foreignKey: "id_dokumen"});
  surat_ukur.belongsTo(dokumen, { as: "id_dokumen_dokumen", foreignKey: "id_dokumen"});
  dokumen.hasMany(surat_ukur, { as: "surat_ukurs", foreignKey: "id_dokumen"});
  warkah.belongsTo(dokumen, { as: "id_dokumen_dokumen", foreignKey: "id_dokumen"});
  dokumen.hasMany(warkah, { as: "warkahs", foreignKey: "id_dokumen"});
  dokumen.belongsTo(lokasi, { as: "id_lokasi_lokasi", foreignKey: "id_lokasi"});
  lokasi.hasMany(dokumen, { as: "dokumens", foreignKey: "id_lokasi"});
  warkah.belongsTo(lokasi, { as: "id_lokasi_lokasi", foreignKey: "id_lokasi"});
  lokasi.hasMany(warkah, { as: "warkahs", foreignKey: "id_lokasi"});
  dokumen.belongsTo(pemilik, { as: "id_pemilik_pemilik", foreignKey: "id_pemilik"});
  pemilik.hasMany(dokumen, { as: "dokumens", foreignKey: "id_pemilik"});
  dokumen.belongsTo(unit, { as: "id_unit_unit", foreignKey: "id_unit"});
  unit.hasMany(dokumen, { as: "dokumens", foreignKey: "id_unit"});

  return {
    buku_tanah,
    dokumen,
    files,
    karyawan,
    lokasi,
    pemilik,
    surat_ukur,
    unit,
    warkah,
  };
}
module.exports = initModels;
module.exports.initModels = initModels;
module.exports.default = initModels;
