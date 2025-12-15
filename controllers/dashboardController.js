const daftarArsipController = require('./daftarArsipController');

exports.showDashboard = async (req, res) => {
    try {
        const counts = await daftarArsipController.getCounts();

        res.render('dashboard', {
            totalDokumen: counts.total,
            dokumenBulanIni: counts.bulanIni,
            panter: counts.panter
        });
    } catch (err) {
        console.error(err);
        res.render('dashboard', {
            totalDokumen: 0,
            dokumenBulanIni: 0,
            panter: 0
        });
    }
};
