// // Fungsi ini memastikan hanya data aman yang keluar ke client
// const formatKaryawanResponse = (karyawan) => {
//     if (!karyawan) return null;

//     return {
//         uuid: karyawan.id_karyawan, // Gunakan alias jika perlu
//         user: karyawan.username,
//         nama: karyawan.nama_karyawan,
//         jabatan: karyawan.jabatan,
//         status: karyawan.is_active ? 'Aktif' : 'Non-Aktif'
//         // JANGAN masukkan password, createdAt, atau internal_id yang sensitif
//     };
// };

// module.exports = { formatKaryawanResponse };