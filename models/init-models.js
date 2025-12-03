var DataTypes = require("sequelize").DataTypes;
var _buku_tanah = require("./buku_tanah");
var _daftar_arsip_vital = require("./daftar_arsip_vital");
var _karyawan = require("./karyawan");
var _lokasi = require("./lokasi");
var _surat_ukur = require("./surat_ukur");
var _unit = require("./unit");
var _warkah = require("./warkah");

function initModels(sequelize) {
  var buku_tanah = _buku_tanah(sequelize, DataTypes);
  var daftar_arsip_vital = _daftar_arsip_vital(sequelize, DataTypes);
  var karyawan = _karyawan(sequelize, DataTypes);
  var lokasi = _lokasi(sequelize, DataTypes);
  var surat_ukur = _surat_ukur(sequelize, DataTypes);
  var unit = _unit(sequelize, DataTypes);
  var warkah = _warkah(sequelize, DataTypes);

  daftar_arsip_vital.belongsTo(buku_tanah, { as: "id_dokumen_bt_buku_tanah", foreignKey: "id_dokumen_bt"});
  buku_tanah.hasMany(daftar_arsip_vital, { as: "daftar_arsip_vitals", foreignKey: "id_dokumen_bt"});
  daftar_arsip_vital.belongsTo(surat_ukur, { as: "id_dokumen_su_surat_ukur", foreignKey: "id_dokumen_su"});
  surat_ukur.hasMany(daftar_arsip_vital, { as: "daftar_arsip_vitals", foreignKey: "id_dokumen_su"});
  daftar_arsip_vital.belongsTo(warkah, { as: "id_dokumen_warkah_warkah", foreignKey: "id_dokumen_warkah"});
  warkah.hasMany(daftar_arsip_vital, { as: "daftar_arsip_vitals", foreignKey: "id_dokumen_warkah"});

  return {
    buku_tanah,
    daftar_arsip_vital,
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
