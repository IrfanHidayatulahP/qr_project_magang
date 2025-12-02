var DataTypes = require("sequelize").DataTypes;
var _buku_tanah = require("./buku_tanah");
var _daftar_arsip_vital = require("./daftar_arsip_vital");
var _dokumen = require("./dokumen");
var _dokumen_history = require("./dokumen_history");
var _karyawan = require("./karyawan");
var _lokasi = require("./lokasi");
var _surat_ukur = require("./surat_ukur");
var _unit = require("./unit");
var _warkah = require("./warkah");

function initModels(sequelize) {
  var buku_tanah = _buku_tanah(sequelize, DataTypes);
  var daftar_arsip_vital = _daftar_arsip_vital(sequelize, DataTypes);
  var dokumen = _dokumen(sequelize, DataTypes);
  var dokumen_history = _dokumen_history(sequelize, DataTypes);
  var karyawan = _karyawan(sequelize, DataTypes);
  var lokasi = _lokasi(sequelize, DataTypes);
  var surat_ukur = _surat_ukur(sequelize, DataTypes);
  var unit = _unit(sequelize, DataTypes);
  var warkah = _warkah(sequelize, DataTypes);

  buku_tanah.belongsTo(dokumen, { as: "id_dokumen_dokumen", foreignKey: "id_dokumen"});
  dokumen.hasMany(buku_tanah, { as: "buku_tanahs", foreignKey: "id_dokumen"});
  daftar_arsip_vital.belongsTo(dokumen, { as: "id_dokumen_bt_dokumen", foreignKey: "id_dokumen_bt"});
  dokumen.hasMany(daftar_arsip_vital, { as: "daftar_arsip_vitals", foreignKey: "id_dokumen_bt"});
  daftar_arsip_vital.belongsTo(dokumen, { as: "id_dokumen_su_dokumen", foreignKey: "id_dokumen_su"});
  dokumen.hasMany(daftar_arsip_vital, { as: "id_dokumen_su_daftar_arsip_vitals", foreignKey: "id_dokumen_su"});
  daftar_arsip_vital.belongsTo(dokumen, { as: "id_dokumen_warkah_dokumen", foreignKey: "id_dokumen_warkah"});
  dokumen.hasMany(daftar_arsip_vital, { as: "id_dokumen_warkah_daftar_arsip_vitals", foreignKey: "id_dokumen_warkah"});
  dokumen_history.belongsTo(dokumen, { as: "id_dokumen_dokumen", foreignKey: "id_dokumen"});
  dokumen.hasMany(dokumen_history, { as: "dokumen_histories", foreignKey: "id_dokumen"});
  surat_ukur.belongsTo(dokumen, { as: "id_dokumen_dokumen", foreignKey: "id_dokumen"});
  dokumen.hasMany(surat_ukur, { as: "surat_ukurs", foreignKey: "id_dokumen"});
  warkah.belongsTo(dokumen, { as: "id_dokumen_dokumen", foreignKey: "id_dokumen"});
  dokumen.hasOne(warkah, { as: "warkah", foreignKey: "id_dokumen"});
  dokumen_history.belongsTo(karyawan, { as: "id_user_karyawan", foreignKey: "id_user"});
  karyawan.hasMany(dokumen_history, { as: "dokumen_histories", foreignKey: "id_user"});
  dokumen.belongsTo(lokasi, { as: "id_lokasi_lokasi", foreignKey: "id_lokasi"});
  lokasi.hasMany(dokumen, { as: "dokumens", foreignKey: "id_lokasi"});
  dokumen.belongsTo(unit, { as: "id_unit_unit", foreignKey: "id_unit"});
  unit.hasMany(dokumen, { as: "dokumens", foreignKey: "id_unit"});

  return {
    buku_tanah,
    daftar_arsip_vital,
    dokumen,
    dokumen_history,
    karyawan,
    lokasi,
    surat_ukur,
    unit,
    warkah,
  };
}
module.exports = initModels;
module.exports.initModels = initModels;
module.exports.default = initModels;
