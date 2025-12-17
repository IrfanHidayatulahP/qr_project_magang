const db = require('../config/db');

exports.showDashboard = async (req, res) => {
    try {
        // 1. SETUP TANGGAL (Format YYYY-MM-DD HH:mm:ss untuk SQL)
        const date = new Date();
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        
        // Awal bulan ini
        const startStr = `${year}-${month}-01 00:00:00`;
        // Akhir bulan ini
        const lastDay = new Date(year, date.getMonth() + 1, 0).getDate();
        const endStr = `${year}-${month}-${lastDay} 23:59:59`;

        // -----------------------------------------------------------
        // 2. QUERY RAW SQL (BYPASS MODEL)
        // Kita panggil nama tabel dan nama kolom secara manual
        // -----------------------------------------------------------
        
        // --- A. Hitung Total Arsip (Kotak Kuning) ---
        // PENTING: Kita pakai nama tabel asli di database: 'daftar_arsip_vital'
        let totalArsip = 0;
        try {
            const [resArsip] = await db.sequelize.query("SELECT COUNT(*) as total FROM daftar_arsip_vital");
            totalArsip = resArsip[0].total || 0;
        } catch (error) {
            // Jika tabel belum dibuat, anggap 0
            console.error("Info: Tabel daftar_arsip_vital belum ada atau kosong.");
            totalArsip = 0;
        }

        // --- B. Hitung Total Dokumen Seumur Hidup (Kotak Biru) ---
        const [resTotalBT] = await db.sequelize.query("SELECT COUNT(*) as total FROM buku_tanah");
        const [resTotalSU] = await db.sequelize.query("SELECT COUNT(*) as total FROM surat_ukur");
        const [resTotalWarkah] = await db.sequelize.query("SELECT COUNT(*) as total FROM warkah");

        const totalDokumen = (resTotalBT[0].total || 0) + 
                             (resTotalSU[0].total || 0) + 
                             (resTotalWarkah[0].total || 0);

        // --- C. Hitung Dokumen Bulan Ini (Kotak Merah) ---
        // Kita pakai 'created_at' (nama kolom asli di MySQL) bukan 'createdAt'
        const [resNewBT] = await db.sequelize.query(
            `SELECT COUNT(*) as total FROM buku_tanah WHERE created_at BETWEEN '${startStr}' AND '${endStr}'`
        );
        const [resNewSU] = await db.sequelize.query(
            `SELECT COUNT(*) as total FROM surat_ukur WHERE created_at BETWEEN '${startStr}' AND '${endStr}'`
        );
        const [resNewWarkah] = await db.sequelize.query(
            `SELECT COUNT(*) as total FROM warkah WHERE created_at BETWEEN '${startStr}' AND '${endStr}'`
        );

        const dokumenBulanIni = (resNewBT[0].total || 0) + 
                                (resNewSU[0].total || 0) + 
                                (resNewWarkah[0].total || 0);

        // 3. RENDER VIEW
        return res.render('dashboard', {
            user: req.session?.user || null,
            nama_karyawan: req.session?.user?.nama_karyawan || 'Admin',
            
            // Kirim variabel
            totalArsip,          
            totalDokumen,      
            dokumenBulanIni 
        });

    } catch (err) {
        console.error('Dashboard Error (Raw Query):', err);
        // Tampilkan error di browser jika fatal
        return res.send(`
            <div style="padding: 20px;">
                <h3 style="color: red;">Dashboard Error</h3>
                <p>${err.message}</p>
                <a href="/login">Logout</a>
            </div>
        `);
    }
};