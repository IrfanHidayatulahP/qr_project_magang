// controllers/dokumenController.js
const db = require('../config/db');
const { Op } = require('sequelize');

// model references (safe lookup)
const Dokumen = db.dokumen || (db.models && (db.models.dokumen || db.models.Dokumen));
const Pemilik = db.pemilik || (db.models && (db.models.pemilik || db.models.Pemilik));
const Lokasi = db.lokasi || (db.models && (db.models.lokasi || db.models.Lokasi));
const Unit = db.unit || (db.models && (db.models.unit || db.models.Unit));

if (!Dokumen) {
    console.error("Model 'dokumen' tidak ditemukan pada export db. Keys in db:", Object.keys(db));
}

function ensureModelOrRespond(res) {
    if (!Dokumen) {
        const msg = "Server misconfiguration: model 'dokumen' tidak tersedia. Periksa config/db.js";
        console.error(msg);
        if (res && typeof res.status === 'function') {
            res.status(500).send(msg);
            return false;
        }
        throw new Error(msg);
    }
    return true;
}

function isValidId(id) {
    if (id == null) return false;
    const n = Number(id);
    return Number.isInteger(n) && n > 0;
}

/** showIndex - listing dokumen, optional q untuk pencarian */
exports.showIndex = async (req, res) => {
    try {
        if (!ensureModelOrRespond(res)) return;

        const q = (req.query.q || '').toString().trim();
        let records = [];

        if (q) {
            if (isValidId(q)) {
                const r = await Dokumen.findByPk(Number(q), { attributes: { exclude: ['createdAt', 'updatedAt'] } });
                records = r ? [r] : [];
            } else {
                records = await Dokumen.findAll({
                    where: {
                        [Op.or]: [
                            { no_dokumen: { [Op.like]: `%${q}%` } },
                            { nomor_hak: { [Op.like]: `%${q}%` } },
                            { desa: { [Op.like]: `%${q}%` } },
                            { kecamatan: { [Op.like]: `%${q}%` } },
                            { kota: { [Op.like]: `%${q}%` } }
                        ]
                    },
                    order: [['id_dokumen', 'DESC']],
                    limit: 1000,
                    attributes: { exclude: ['createdAt', 'updatedAt'] }
                });
            }
        } else {
            records = await Dokumen.findAll({
                order: [['id_dokumen', 'DESC']],
                limit: 1000,
                attributes: { exclude: ['createdAt', 'updatedAt'] }
            });
        }

        const recordsPlain = Array.isArray(records)
            ? records.map(r => (r && typeof r.toJSON === 'function' ? r.toJSON() : r))
            : [];

        return res.render('dokumen/list_dokumen', {
            records: recordsPlain,
            user: req.session?.user || null,
            nama_karyawan: req.session?.user?.nama_karyawan || '',
            filter_q: q,
            error: req.query.error || null,
            success: req.query.success || null
        });
    } catch (err) {
        console.error('dokumen.showIndex error:', err);
        return res.status(500).send('Server Error');
    }
};

/** showCreateForm - tampilkan form tambah dokumen */
exports.showCreateForm = async (req, res) => {
    try {
        if (!ensureModelOrRespond(res)) return;

        // ambil opsi untuk select dropdown (pemilik, lokasi, unit)
        let pemilikOptions = [], lokasiOptions = [], unitOptions = [];
        if (Pemilik) {
            const all = await Pemilik.findAll({ order: [['id_pemilik', 'ASC']], limit: 1000, attributes: { exclude: ['createdAt', 'updatedAt'] } });
            pemilikOptions = all.map(x => (x && typeof x.toJSON === 'function' ? x.toJSON() : x));
        }
        if (Lokasi) {
            const all = await Lokasi.findAll({ order: [['id_lokasi', 'ASC']], limit: 1000, attributes: { exclude: ['createdAt', 'updatedAt'] } });
            lokasiOptions = all.map(x => (x && typeof x.toJSON === 'function' ? x.toJSON() : x));
        }
        if (Unit) {
            const all = await Unit.findAll({ order: [['id_unit', 'ASC']], limit: 1000, attributes: { exclude: ['createdAt', 'updatedAt'] } });
            unitOptions = all.map(x => (x && typeof x.toJSON === 'function' ? x.toJSON() : x));
        }

        return res.render('dokumen/tambah_dokumen', {
            pemilikOptions,
            lokasiOptions,
            unitOptions,
            user: req.session?.user || null,
            nama_karyawan: req.session?.user?.nama_karyawan || '',
            error: req.query.error || null,
            success: req.query.success || null,
            old: {}
        });
    } catch (err) {
        console.error('dokumen.showCreateForm error:', err);
        return res.status(500).send('Server Error');
    }
};

/** create - simpan dokumen baru */
exports.create = async (req, res) => {
    if (!ensureModelOrRespond(res)) return;
    const t = await db.sequelize.transaction();
    try {
        const {
            tipe_dokumen,
            no_dokumen,
            nomor_hak,
            jenis_hak,
            tanggal,
            id_pemilik,
            desa,
            kecamatan,
            kota,
            area_m2,
            luas_tanah,
            id_lokasi,
            id_unit,
            media,
            jumlah_lembar,
            tingkat_perkembangan,
            no_boks_definitif,
            no_folder,
            uraian_informasi,
            status,
            metode_perlindungan
        } = req.body;

        // validasi dasar
        if (!tipe_dokumen || String(tipe_dokumen).trim() === '') {
            await t.rollback();
            return res.redirect('/dokumen/create?error=' + encodeURIComponent('Tipe dokumen wajib'));
        }
        if (!no_dokumen || String(no_dokumen).trim() === '') {
            await t.rollback();
            return res.redirect('/dokumen/create?error=' + encodeURIComponent('No dokumen wajib'));
        }

        // cek uniqueness ringan (tipe + no_dokumen [+ nomor_hak jika ada])
        const whereUnique = { tipe_dokumen, no_dokumen };
        if (nomor_hak && String(nomor_hak).trim() !== '') whereUnique.nomor_hak = nomor_hak;
        const existing = await Dokumen.findOne({ where: whereUnique, attributes: { exclude: ['createdAt', 'updatedAt'] } });
        if (existing) {
            await t.rollback();
            return res.redirect('/dokumen/create?error=' + encodeURIComponent('Dokumen dengan data yang sama sudah ada'));
        }

        // parse numeric fields
        const parseFloatOrNull = (val) => {
            if (typeof val === 'undefined' || val === null || String(val).trim() === '') return null;
            const v = Number(String(val).replace(',', '.'));
            return Number.isFinite(v) ? v : null;
        };

        const areaVal = parseFloatOrNull(area_m2);
        const luasVal = parseFloatOrNull(luas_tanah);
        const jumlahLembarVal = (typeof jumlah_lembar !== 'undefined' && jumlah_lembar !== '') ? Number(jumlah_lembar) : null;
        if (jumlahLembarVal !== null && (!Number.isFinite(jumlahLembarVal) || jumlahLembarVal < 0)) {
            await t.rollback();
            return res.redirect('/dokumen/create?error=' + encodeURIComponent('jumlah_lembar harus angka >= 0'));
        }

        // parse tanggal (DATEONLY)
        let tanggalVal = null;
        if (typeof tanggal !== 'undefined' && tanggal !== null && String(tanggal).trim() !== '') {
            const d = new Date(String(tanggal));
            if (!isNaN(d.getTime())) {
                // store as YYYY-MM-DD string or Date object; Sequelize DATEONLY accepts Date or string
                const yyyy = d.getFullYear();
                const mm = String(d.getMonth() + 1).padStart(2, '0');
                const dd = String(d.getDate()).padStart(2, '0');
                tanggalVal = `${yyyy}-${mm}-${dd}`;
            } else {
                tanggalVal = null;
            }
        }

        // optional: cek foreign keys exist
        if (Pemilik && id_pemilik) {
            const p = await Pemilik.findByPk(Number(id_pemilik), { attributes: { exclude: ['createdAt', 'updatedAt'] } });
            if (!p) {
                await t.rollback();
                return res.redirect('/dokumen/create?error=' + encodeURIComponent('Pemilik tidak ditemukan'));
            }
        }

        if (Lokasi && id_lokasi) {
            const l = await Lokasi.findByPk(Number(id_lokasi), { attributes: { exclude: ['createdAt', 'updatedAt'] } });
            if (!l) {
                await t.rollback();
                return res.redirect('/dokumen/create?error=' + encodeURIComponent('Lokasi tidak ditemukan'));
            }
        }

        if (Unit && id_unit) {
            const u = await Unit.findByPk(Number(id_unit), { attributes: { exclude: ['createdAt', 'updatedAt'] } });
            if (!u) {
                await t.rollback();
                return res.redirect('/dokumen/create?error=' + encodeURIComponent('Unit tidak ditemukan'));
            }
        }

        const payload = {
            tipe_dokumen,
            no_dokumen,
            nomor_hak: nomor_hak || null,
            jenis_hak: jenis_hak || null,
            tanggal: tanggalVal,
            id_pemilik: id_pemilik ? Number(id_pemilik) : null,
            desa: desa || null,
            kecamatan: kecamatan || null,
            kota: kota || null,
            area_m2: areaVal,
            luas_tanah: luasVal,
            id_lokasi: id_lokasi ? Number(id_lokasi) : null,
            id_unit: id_unit ? Number(id_unit) : null,
            media: media || null,
            jumlah_lembar: jumlahLembarVal,
            tingkat_perkembangan: tingkat_perkembangan || null,
            no_boks_definitif: no_boks_definitif || null,
            no_folder: no_folder || null,
            uraian_informasi: uraian_informasi || null,
            status: status || null,
            metode_perlindungan: metode_perlindungan || null
        };

        await Dokumen.create(payload, {
            transaction: t,
            fields: [
                'tipe_dokumen', 'no_dokumen', 'nomor_hak', 'jenis_hak', 'tanggal', 'id_pemilik',
                'desa', 'kecamatan', 'kota', 'area_m2', 'luas_tanah', 'id_lokasi', 'id_unit',
                'media', 'jumlah_lembar', 'tingkat_perkembangan', 'no_boks_definitif', 'no_folder',
                'uraian_informasi', 'status', 'metode_perlindungan'
            ],
            silent: true
        });

        await t.commit();
        return res.redirect('/dokumen?success=' + encodeURIComponent('Dokumen berhasil ditambahkan'));
    } catch (err) {
        await t.rollback();
        console.error('dokumen.create error:', err);
        return res.redirect('/dokumen/create?error=' + encodeURIComponent('Gagal menyimpan data dokumen'));
    }
};

/** showEditForm - tampilkan form edit */
exports.showEditForm = async (req, res) => {
    try {
        if (!ensureModelOrRespond(res)) return;

        const id = req.params.id;
        if (!isValidId(id)) return res.status(400).send('Parameter id tidak valid');

        const dok = await Dokumen.findByPk(Number(id), { attributes: { exclude: ['createdAt', 'updatedAt'] } });
        if (!dok) return res.status(404).send('Data dokumen tidak ditemukan');

        const dokPlain = dok && typeof dok.toJSON === 'function' ? dok.toJSON() : dok;

        // load options for selects
        let pemilikOptions = [], lokasiOptions = [], unitOptions = [];
        if (Pemilik) {
            const all = await Pemilik.findAll({ order: [['id_pemilik', 'ASC']], limit: 1000, attributes: { exclude: ['createdAt', 'updatedAt'] } });
            pemilikOptions = all.map(x => (x && typeof x.toJSON === 'function' ? x.toJSON() : x));
        }
        if (Lokasi) {
            const all = await Lokasi.findAll({ order: [['id_lokasi', 'ASC']], limit: 1000, attributes: { exclude: ['createdAt', 'updatedAt'] } });
            lokasiOptions = all.map(x => (x && typeof x.toJSON === 'function' ? x.toJSON() : x));
        }
        if (Unit) {
            const all = await Unit.findAll({ order: [['id_unit', 'ASC']], limit: 1000, attributes: { exclude: ['createdAt', 'updatedAt'] } });
            unitOptions = all.map(x => (x && typeof x.toJSON === 'function' ? x.toJSON() : x));
        }

        return res.render('dokumen/edit_dokumen', {
            dokumen: dokPlain,
            pemilikOptions,
            lokasiOptions,
            unitOptions,
            user: req.session?.user || null,
            nama_karyawan: req.session?.user?.nama_karyawan || '',
            error: req.query.error || null,
            success: req.query.success || null
        });
    } catch (err) {
        console.error('dokumen.showEditForm error:', err);
        return res.status(500).send('Server Error');
    }
};

/** update - update dokumen */
exports.update = async (req, res) => {
    if (!ensureModelOrRespond(res)) return;
    const t = await db.sequelize.transaction();
    try {
        const id = req.params.id;
        if (!isValidId(id)) {
            await t.rollback();
            return res.status(400).send('ID tidak valid');
        }

        const item = await Dokumen.findByPk(Number(id), { attributes: { exclude: ['createdAt', 'updatedAt'] } });
        if (!item) {
            await t.rollback();
            return res.status(404).send('Data dokumen tidak ditemukan');
        }

        const {
            tipe_dokumen,
            no_dokumen,
            nomor_hak,
            jenis_hak,
            tanggal,
            id_pemilik,
            desa,
            kecamatan,
            kota,
            area_m2,
            luas_tanah,
            id_lokasi,
            id_unit,
            media,
            jumlah_lembar,
            tingkat_perkembangan,
            no_boks_definitif,
            no_folder,
            uraian_informasi,
            status,
            metode_perlindungan
        } = req.body;

        // hanya update field yang dikirim
        if (typeof tipe_dokumen !== 'undefined') item.tipe_dokumen = tipe_dokumen || item.tipe_dokumen;
        if (typeof no_dokumen !== 'undefined') item.no_dokumen = no_dokumen || item.no_dokumen;
        if (typeof nomor_hak !== 'undefined') item.nomor_hak = nomor_hak || null;
        if (typeof jenis_hak !== 'undefined') item.jenis_hak = jenis_hak || null;

        // tanggal
        if (typeof tanggal !== 'undefined') {
            const tstr = String(tanggal).trim();
            if (tstr === '') item.tanggal = null;
            else {
                const d = new Date(tstr);
                if (!isNaN(d.getTime())) {
                    const yyyy = d.getFullYear();
                    const mm = String(d.getMonth() + 1).padStart(2, '0');
                    const dd = String(d.getDate()).padStart(2, '0');
                    item.tanggal = `${yyyy}-${mm}-${dd}`;
                }
            }
        }

        if (typeof id_pemilik !== 'undefined') item.id_pemilik = id_pemilik ? Number(id_pemilik) : null;
        if (typeof desa !== 'undefined') item.desa = desa || null;
        if (typeof kecamatan !== 'undefined') item.kecamatan = kecamatan || null;
        if (typeof kota !== 'undefined') item.kota = kota || null;

        const parseFloatOrNull = (val) => {
            if (typeof val === 'undefined' || val === null || String(val).trim() === '') return null;
            const v = Number(String(val).replace(',', '.'));
            return Number.isFinite(v) ? v : null;
        };

        if (typeof area_m2 !== 'undefined') item.area_m2 = parseFloatOrNull(area_m2);
        if (typeof luas_tanah !== 'undefined') item.luas_tanah = parseFloatOrNull(luas_tanah);
        if (typeof id_lokasi !== 'undefined') item.id_lokasi = id_lokasi ? Number(id_lokasi) : null;
        if (typeof id_unit !== 'undefined') item.id_unit = id_unit ? Number(id_unit) : null;
        if (typeof media !== 'undefined') item.media = media || null;
        if (typeof jumlah_lembar !== 'undefined') {
            item.jumlah_lembar = (jumlah_lembar === '' ? null : Number(jumlah_lembar));
        }
        if (typeof tingkat_perkembangan !== 'undefined') item.tingkat_perkembangan = tingkat_perkembangan || null;
        if (typeof no_boks_definitif !== 'undefined') item.no_boks_definitif = no_boks_definitif || null;
        if (typeof no_folder !== 'undefined') item.no_folder = no_folder || null;
        if (typeof uraian_informasi !== 'undefined') item.uraian_informasi = uraian_informasi || null;
        if (typeof status !== 'undefined') item.status = status || null;
        if (typeof metode_perlindungan !== 'undefined') item.metode_perlindungan = metode_perlindungan || null;

        // simpan
        await item.save({
            transaction: t,
            fields: [
                'tipe_dokumen', 'no_dokumen', 'nomor_hak', 'jenis_hak', 'tanggal', 'id_pemilik',
                'desa', 'kecamatan', 'kota', 'area_m2', 'luas_tanah', 'id_lokasi', 'id_unit',
                'media', 'jumlah_lembar', 'tingkat_perkembangan', 'no_boks_definitif', 'no_folder',
                'uraian_informasi', 'status', 'metode_perlindungan'
            ],
            silent: true
        });

        await t.commit();
        return res.redirect('/dokumen?success=' + encodeURIComponent('Dokumen berhasil diupdate'));
    } catch (err) {
        await t.rollback();
        console.error('dokumen.update error:', err);
        return res.redirect('/dokumen/edit/' + (req.params.id || '') + '?error=' + encodeURIComponent('Gagal mengupdate data dokumen'));
    }
};

/** delete - hapus dokumen */
exports.delete = async (req, res) => {
    if (!ensureModelOrRespond(res)) return;
    const t = await db.sequelize.transaction();
    try {
        const id = req.params.id;
        if (!isValidId(id)) {
            await t.rollback();
            return res.status(400).send('ID tidak valid');
        }

        const record = await Dokumen.findByPk(Number(id), { attributes: { exclude: ['createdAt', 'updatedAt'] } });
        if (!record) {
            await t.rollback();
            return res.redirect('/dokumen?error=' + encodeURIComponent('Data tidak ditemukan'));
        }

        await Dokumen.destroy({ where: { id_dokumen: record.id_dokumen }, transaction: t });
        await t.commit();
        return res.redirect('/dokumen?success=' + encodeURIComponent('Dokumen berhasil dihapus'));
    } catch (err) {
        await t.rollback();
        console.error('dokumen.delete error:', err);
        return res.redirect('/dokumen?error=' + encodeURIComponent('Gagal menghapus data dokumen'));
    }
};

/** showDetail - lihat detail dokumen */
exports.showDetail = async (req, res) => {
    try {
        if (!ensureModelOrRespond(res)) return;

        const id = req.params.id;
        if (!isValidId(id)) return res.redirect('/dokumen?error=' + encodeURIComponent('ID tidak valid'));

        const record = await Dokumen.findByPk(Number(id), { attributes: { exclude: ['createdAt', 'updatedAt'] } });
        if (!record) return res.status(404).send('Data tidak ditemukan');

        const recordPlain = typeof record.toJSON === 'function' ? record.toJSON() : record;

        return res.render('dokumen/detail_dokumen', {
            dokumen: recordPlain,
            user: req.session?.user || null,
            nama_karyawan: req.session?.user?.nama_karyawan || '',
            error: req.query.error || null,
            success: req.query.success || null
        });
    } catch (err) {
        console.error('dokumen.showDetail error:', err);
        return res.redirect('/dokumen?error=' + encodeURIComponent('Terjadi kesalahan saat mengambil data'));
    }
};
