// main.js
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js'
import { 
    getFirestore,
    collection,
    doc,
    getDocs,
    getDoc,
    addDoc,
    deleteDoc,
    updateDoc,
    query,
    orderBy
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

// Konfigurasi Firebase
const firebaseConfig = {
    apiKey: "AIzaSyDdr0fxnYpfeG2b6GlTQ_-4TqpmGk2uvOk",
    authDomain: "insan-cemerlang-80713.firebaseapp.com",
    projectId: "insan-cemerlang-80713",
    storageBucket: "insan-cemerlang-80713.appspot.com",
    messagingSenderId: "1016858047753",
    appId: "1:1016858047753:web:0534dda2085c2adab68fd8",
    measurementId: "G-E7G0K9XTCD"
};

// Inisialisasi Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Data sementara untuk simulasi
let dataRekording = [];

// Fungsi untuk mengambil data dari Firestore
async function ambilDataRekording() {
    try {
        const q = query(collection(db, "rekording_ayam"), orderBy("tanggal", "asc"));
        const querySnapshot = await getDocs(q);
        const data = [];
        querySnapshot.forEach((doc) => {
            data.push({
                id: doc.id,
                ...doc.data()
            });
        });
        return data;
    } catch (error) {
        console.error("Error mengambil data: ", error);
        // Jika error, gunakan data contoh
        return dataRekording;
    }
}

// Fungsi untuk menambahkan data ke Firestore
async function tambahDataRekording(data) {
    try {
        const docRef = await addDoc(collection(db, "rekording_ayam"), data);
        console.log("Data berhasil ditambahkan dengan ID: ", docRef.id);
        return true;
    } catch (error) {
        console.error("Error menambahkan data: ", error);
        // Jika error, simpan ke data sementara
        data.id = 'local_' + Date.now();
        dataRekording.push(data);
        return true;
    }
}

// Fungsi untuk mengubah data di Firestore
async function ubahDataRekording(id, data) {
    try {
        if (id.startsWith('local_')) {
            // Update data lokal
            const index = dataRekording.findIndex(item => item.id === id);
            if (index !== -1) {
                dataRekording[index] = { ...data, id };
            }
            return true;
        } else {
            // Update data Firebase
            const docRef = doc(db, "rekording_ayam", id);
            await updateDoc(docRef, data);
            console.log("Data berhasil diubah");
            return true;
        }
    } catch (error) {
        console.error("Error mengubah data: ", error);
        return false;
    }
}

// Fungsi untuk menghapus data dari Firestore
async function hapusDataRekording(id) {
    try {
        if (id.startsWith('local_')) {
            // Hapus data lokal
            dataRekording = dataRekording.filter(item => item.id !== id);
            return true;
        } else {
            // Hapus data Firebase
            await deleteDoc(doc(db, "rekording_ayam", id));
            console.log("Data berhasil dihapus");
            return true;
        }
    } catch (error) {
        console.error("Error menghapus data: ", error);
        return false;
    }
}

// Fungsi untuk menghitung Fi (Feed Intake) dalam gram/ekor
function hitungFi(pakanKg, sisaPopulasi) {
    if (!pakanKg || !sisaPopulasi || sisaPopulasi === 0) return 0;
    // Konversi kg ke gram dan bagi dengan jumlah ayam
    return (pakanKg * 1000) / sisaPopulasi;
}

// Fungsi untuk menghitung %HD (Hen Day Production)
function hitungPersenHD(telurButir, sisaPopulasi) {
    if (!telurButir || !sisaPopulasi || sisaPopulasi === 0) return 0;
    return (telurButir / sisaPopulasi) * 100;
}

// Fungsi untuk menampilkan data di tabel
function tampilkanData(data) {
    const tableBody = document.getElementById('tableBody');
    tableBody.innerHTML = '';

    if (data.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="15" class="text-center py-4">
                    <i class="fas fa-info-circle me-2"></i>Belum ada data rekording. Klik "Tambah Data" untuk menambahkan data baru.
                </td>
            </tr>
        `;
        return;
    }

    data.forEach(item => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${item.minggu || ''}</td>
            <td>${item.hari || ''}</td>
            <td>${formatTanggal(item.tanggal) || ''}</td>
            <td>${item.unggul || ''}</td>
            <td>${item.mati || ''}</td>
            <td>${item.sisa || ''}</td>
            <td>${item.pakanKg || ''}</td>
            <td class="calculated-field">${formatAngka(item.pakanFi) || ''}</td>
            <td>${item.telurKg || ''}</td>
            <td>${item.telurButir || ''}</td>
            <td class="calculated-field">${formatAngka(item.persenHD) || ''}</td>
            <td>${item.rusak || ''}</td>
            <td>${item.keterangan || ''}</td>
            <td>
                <button class="btn btn-sm btn-warning btn-ubah" data-id="${item.id}">
                    <i class="fas fa-edit"></i> Ubah
                </button>
                <button class="btn btn-sm btn-danger btn-hapus" data-id="${item.id}">
                    <i class="fas fa-trash"></i> Hapus
                </button>
            </td>
        `;
        tableBody.appendChild(row);
    });

    // Tambahkan event listener untuk tombol ubah dan hapus
    document.querySelectorAll('.btn-ubah').forEach(button => {
        button.addEventListener('click', function() {
            const id = this.getAttribute('data-id');
            ubahData(id);
        });
    });

    document.querySelectorAll('.btn-hapus').forEach(button => {
        button.addEventListener('click', function() {
            const id = this.getAttribute('data-id');
            hapusData(id);
        });
    });

    // Update statistik
    updateStats(data);
}

// Fungsi untuk memuat dan menampilkan data
async function muatData() {
    const data = await ambilDataRekording();
    tampilkanData(data);
}

// Format tanggal dari format Firestore ke format Indonesia
function formatTanggal(tanggal) {
    if (!tanggal) return '';
    
    let date;
    if (typeof tanggal.toDate === 'function') {
        date = tanggal.toDate();
    } else if (tanggal instanceof Date) {
        date = tanggal;
    } else {
        date = new Date(tanggal);
    }
    
    return date.toLocaleDateString('id-ID');
}

// Format tanggal untuk input date
function formatTanggalInput(tanggal) {
    if (!tanggal) return '';
    
    let date;
    if (typeof tanggal.toDate === 'function') {
        date = tanggal.toDate();
    } else if (tanggal instanceof Date) {
        date = tanggal;
    } else {
        date = new Date(tanggal);
    }
    
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// Format angka dengan 1 digit desimal
function formatAngka(angka) {
    if (!angka && angka !== 0) return '';
    return parseFloat(angka).toFixed(1);
}

// Fungsi untuk menambah data
function tambahData() {
    document.getElementById('dataForm').reset();
    document.getElementById('recordId').value = '';
    document.getElementById('dataModalLabel').textContent = 'Tambah Data Rekording';
    
    // Set nilai default
    document.getElementById('unggul').value = 1500;
    document.getElementById('tanggal').valueAsDate = new Date();
    hitungSemua();
    
    const modal = new bootstrap.Modal(document.getElementById('dataModal'));
    modal.show();
}

// Fungsi untuk mengubah data
async function ubahData(id) {
    try {
        let data;
        
        if (id.startsWith('local_')) {
            // Ambil data lokal
            data = dataRekording.find(item => item.id === id);
        } else {
            // Ambil data dari Firebase
            const docRef = doc(db, "rekording_ayam", id);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                data = docSnap.data();
            }
        }
        
        if (data) {
            document.getElementById('recordId').value = id;
            document.getElementById('minggu').value = data.minggu || '';
            document.getElementById('hari').value = data.hari || '';
            document.getElementById('tanggal').value = formatTanggalInput(data.tanggal) || '';
            document.getElementById('unggul').value = data.unggul || '';
            document.getElementById('mati').value = data.mati || '';
            document.getElementById('sisa').value = data.sisa || '';
            document.getElementById('pakanKg').value = data.pakanKg || '';
            document.getElementById('pakanFi').value = formatAngka(data.pakanFi) || '';
            document.getElementById('telurKg').value = data.telurKg || '';
            document.getElementById('telurButir').value = data.telurButir || '';
            document.getElementById('persenHD').value = formatAngka(data.persenHD) || '';
            document.getElementById('rusak').value = data.rusak || '';
            document.getElementById('keterangan').value = data.keterangan || '';
            
            document.getElementById('dataModalLabel').textContent = 'Ubah Data Rekording';
            
            const modal = new bootstrap.Modal(document.getElementById('dataModal'));
            modal.show();
        } else {
            alert('Data tidak ditemukan!');
        }
    } catch (error) {
        console.error("Error mengambil data untuk diubah: ", error);
        alert('Terjadi kesalahan saat mengambil data!');
    }
}

// Fungsi untuk menghapus data
async function hapusData(id) {
    if (confirm('Apakah Anda yakin ingin menghapus data ini?')) {
        const berhasil = await hapusDataRekording(id);
        if (berhasil) {
            alert('Data berhasil dihapus!');
            muatData();
        } else {
            alert('Terjadi kesalahan saat menghapus data!');
        }
    }
}

// Fungsi untuk menyimpan data (tambah atau ubah)
async function simpanData() {
    const id = document.getElementById('recordId').value;
    
    // Validasi form
    const minggu = document.getElementById('minggu').value;
    const hari = document.getElementById('hari').value;
    const tanggal = document.getElementById('tanggal').value;
    
    if (!minggu || !hari || !tanggal) {
        alert('Harap lengkapi semua field yang wajib diisi!');
        return;
    }
    
    // Hitung nilai otomatis
    const unggul = parseInt(document.getElementById('unggul').value) || 0;
    const mati = parseInt(document.getElementById('mati').value) || 0;
    const sisa = unggul - mati;
    const pakanFi = hitungFi(
        parseFloat(document.getElementById('pakanKg').value) || 0,
        sisa
    );
    const persenHD = hitungPersenHD(
        parseInt(document.getElementById('telurButir').value) || 0,
        sisa
    );
    
    const data = {
        minggu: parseInt(minggu) || 0,
        hari: hari,
        tanggal: new Date(tanggal),
        unggul: unggul,
        mati: mati,
        sisa: sisa,
        pakanKg: parseFloat(document.getElementById('pakanKg').value) || 0,
        pakanFi: pakanFi,
        telurKg: parseFloat(document.getElementById('telurKg').value) || 0,
        telurButir: parseInt(document.getElementById('telurButir').value) || 0,
        persenHD: persenHD,
        rusak: parseInt(document.getElementById('rusak').value) || 0,
        keterangan: document.getElementById('keterangan').value
    };

    let berhasil = false;
    
    if (id) {
        // Ubah data
        berhasil = await ubahDataRekording(id, data);
    } else {
        // Tambah data
        berhasil = await tambahDataRekording(data);
    }

    if (berhasil) {
        alert(`Data berhasil ${id ? 'diubah' : 'ditambahkan'}!`);
        const modal = bootstrap.Modal.getInstance(document.getElementById('dataModal'));
        modal.hide();
        muatData();
    } else {
        alert(`Terjadi kesalahan saat ${id ? 'mengubah' : 'menambahkan'} data!`);
    }
}

// Fungsi untuk mencetak PDF
function cetakPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('l', 'mm', 'a4');
    
    // Warna tema
    const primaryColor = [44, 120, 108];
    const lightColor = [248, 249, 250];
    
    // Margin yang konsisten
    const marginLeft = 10;
    const marginTop = 10;
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    
    // Header dengan background berwarna
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(0, 0, pageWidth, 25, 'F');
    
    // JUDUL UTAMA - Tengah
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    
    // Hitung lebar judul untuk penempatan yang presisi
    const title = 'REKORDING HARIAN AYAM PETELUR';
    const titleWidth = doc.getStringUnitWidth(title) * doc.internal.getFontSize() / doc.internal.scaleFactor;
    const titleX = (pageWidth - titleWidth) / 2;
    doc.text(title, titleX, 12);
    
    // SUBJUDUL - Tengah
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    const subtitle = '"BUMDES CIPTA MANDIRI SEJAHTERA"';
    const subtitleWidth = doc.getStringUnitWidth(subtitle) * doc.internal.getFontSize() / doc.internal.scaleFactor;
    const subtitleX = (pageWidth - subtitleWidth) / 2;
    doc.text(subtitle, subtitleX, 18);
    
    // Coba tambahkan logo jika tersedia
    try {
        const logoImg = new Image();
        logoImg.src = 'bumdes.jpg';
        
        // Tambahkan logo dengan fallback jika gagal
        setTimeout(() => {
            try {
                if (logoImg.complete && logoImg.naturalWidth !== 0) {
                    // Logo berhasil dimuat
                    doc.addImage(logoImg, 'JPEG', marginLeft + 5, 5, 15, 15);
                    
                    // Informasi tambahan
                    doc.setTextColor(0, 0, 0);
                    doc.setFontSize(10);
                    doc.text('Tanggal masuk : 23 Agustus 2025', marginLeft + 25, 35);
                    doc.text('Populasi : 1.500 Ekor', marginLeft + 25, 41);
                } else {
                    // Logo tidak tersedia, gunakan fallback
                    doc.setTextColor(0, 0, 0);
                    doc.setFontSize(10);
                    doc.text('Tanggal masuk : 23 Agustus 2025', marginLeft, 35);
                    doc.text('Populasi : 1.500 Ekor', marginLeft, 41);
                }
                
                generateTable(doc);
            } catch (e) {
                console.error("Error saat menambahkan logo:", e);
                doc.setTextColor(0, 0, 0);
                doc.setFontSize(10);
                doc.text('Tanggal masuk : 23 Agustus 2025', marginLeft, 35);
                doc.text('Populasi : 1.500 Ekor', marginLeft, 41);
                generateTable(doc);
            }
        }, 500);
        
    } catch (e) {
        console.error("Error inisialisasi logo:", e);
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(10);
        doc.text('Tanggal masuk : 23 Agustus 2025', marginLeft, 35);
        doc.text('Populasi : 1.500 Ekor', marginLeft, 41);
        generateTable(doc);
    }
    
    function generateTable(doc) {
        // Siapkan data untuk tabel
        const tableHeaders = [
            ['Minggu', 'Hari', 'Tanggal', 'Unggul', 'Mati', 'Sisa', 'Pakan\n(Kg)', 'Fi', 'Telur\n(Kg)', 'Telur\n(Butir)', '%HD', 'Rusak', 'Keterangan']
        ];
        
        const tableRows = [];
        const dataRows = document.querySelectorAll('#tableBody tr');
        
        dataRows.forEach(row => {
            const cells = row.querySelectorAll('td');
            if (cells.length >= 13) {
                const rowData = [
                    cells[0].textContent.trim() || '0',
                    cells[1].textContent.trim() || '-',
                    cells[2].textContent.trim() || '-',
                    cells[3].textContent.trim() || '0',
                    cells[4].textContent.trim() || '0',
                    cells[5].textContent.trim() || '0',
                    cells[6].textContent.trim() || '0',
                    cells[7].textContent.trim() || '0.0',
                    cells[8].textContent.trim() || '0',
                    cells[9].textContent.trim() || '0',
                    cells[10].textContent.trim() || '0.0',
                    cells[11].textContent.trim() || '0',
                    cells[12].textContent.trim() || '-'
                ];
                tableRows.push(rowData);
            }
        });
        
        // Jika tidak ada data, tambahkan baris kosong
        if (tableRows.length === 0) {
            tableRows.push(['-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', 'Tidak ada data']);
        }
        
        // BUAT TABEL DENGAN MARGIN YANG KONSISTEN
        doc.autoTable({
            head: tableHeaders,
            body: tableRows,
            startY: 48,
            theme: 'grid',
            styles: {
                fontSize: 8,
                cellPadding: 3,
                overflow: 'linebreak',
                lineColor: [100, 100, 100],
                lineWidth: 0.1,
                textColor: [0, 0, 0],
                valign: 'middle'
            },
            headStyles: {
                fillColor: primaryColor,
                textColor: 255,
                fontStyle: 'bold',
                halign: 'center',
                valign: 'middle',
                fontSize: 9,
                cellPadding: 3,
                minCellHeight: 12
            },
            bodyStyles: {
                halign: 'center',
                valign: 'middle'
            },
            alternateRowStyles: {
                fillColor: [245, 247, 250]
            },
            columnStyles: {
                0: { halign: 'center' },
                1: { halign: 'center' },
                2: { halign: 'center' },
                3: { halign: 'center' },
                4: { halign: 'center' },
                5: { halign: 'center' },
                6: { halign: 'center' },
                7: { halign: 'center' },
                8: { halign: 'center' },
                9: { halign: 'center' },
                10: { halign: 'center' },
                11: { halign: 'center' },
                12: { halign: 'left', cellPadding: { left: 5, right: 2, top: 2, bottom: 2 } } 
            },
            margin: { 
                left: marginLeft,
                right: marginLeft,
                top: 48
            },
            tableLineWidth: 0.1,
            tableLineColor: [100, 100, 100],
            didDrawPage: function(data) {
                // Footer hak cipta
                doc.setFontSize(8);
                doc.setTextColor(100, 100, 100);
                const footerText = '© 2025 BUMDES CIPTA MANDIRI SEJAHTERA - Sistem Rekording Ayam Petelur';
                const footerWidth = doc.getStringUnitWidth(footerText) * doc.internal.getFontSize() / doc.internal.scaleFactor;
                const footerX = (pageWidth - footerWidth) / 2;
                doc.text(footerText, footerX, pageHeight - 10);
                
                // Nomor halaman
                doc.setFontSize(8);
                doc.text(`Halaman ${data.pageNumber}`, pageWidth - marginLeft - 10, pageHeight - 10);
            }
        });
        
        // Simpan PDF dengan nama file yang sesuai
        const today = new Date();
        const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
        const fileName = `Rekording_Ayam_${dateStr}.pdf`;
        
        // Beri jeda sebelum menyimpan untuk memastikan semua elemen tergambar
        setTimeout(() => {
            doc.save(fileName);
        }, 100);
    }
}

// Fungsi untuk share ke WhatsApp
function shareWhatsApp() {
    // Ambil semua data dari tabel
    const dataRows = document.querySelectorAll('#tableBody tr');
    
    // Jika tidak ada data
    if (dataRows.length === 0) {
        alert('Belum ada data untuk dibagikan!');
        return;
    }
    
    // Ambil data terbaru (baris terakhir)
    const lastRow = dataRows[dataRows.length - 1];
    const cells = lastRow.querySelectorAll('td');
    
    // Jika data tidak lengkap
    if (cells.length < 13) {
        alert('Data tidak lengkap!');
        return;
    }
    
    // Ambil nilai dari data terbaru
    const hari = cells[1].textContent || '';
    const tanggal = cells[2].textContent || '';
    const unggul = cells[3].textContent || '1.500';
    const mati = cells[4].textContent || '0';
    const sisa = cells[5].textContent || '1.500';
    const pakanKg = cells[6].textContent || '0';
    const fi = cells[7].textContent || '0.0';
    const telurKg = cells[8].textContent || '0';
    const telurButir = cells[9].textContent || '0';
    const hd = cells[10].textContent || '0.0';
    const rusak = cells[11].textContent || '0';
    const keterangan = cells[12].textContent || '-';
    
    // Format pesan WhatsApp
    let message = `LAPORAN REKORDING HARIAN TELUR
${hari}, ${tanggal}

Populasi :
- mati = ${mati}
- sisa = ${sisa}

Pakan :
- kg = ${pakanKg}
- fi = ${fi}

Produksi Telur :
- kg = ${telurKg}
- butir = ${telurButir}
- %HD = ${hd}%
- rusak = ${rusak}
- keterangan = ${keterangan}

Sisa Pakan
- setengah karung

_Dikirim dari Sistem Rekording BUMDES Cipta Mandiri Sejahtera_`;
    
    // Encode pesan untuk URL
    const encodedMessage = encodeURIComponent(message);
    
    // Buat URL WhatsApp
    const whatsappUrl = `https://wa.me/?text=${encodedMessage}`;
    
    // Buka jendela baru untuk WhatsApp
    window.open(whatsappUrl, '_blank');
}

// Fungsi untuk memperbarui statistik
function updateStats(data) {
    if (data.length === 0) {
        document.getElementById('today-production').textContent = '0';
        document.getElementById('avg-fi').textContent = '0.0';
        document.getElementById('avg-hd').textContent = '0.0';
        return;
    }
    
    // Data terbaru (hari ini)
    const todayData = data[data.length - 1];
    document.getElementById('today-production').textContent = todayData.telurButir || '0';
    
    // Rata-rata Fi
    const totalFi = data.reduce((sum, item) => sum + (item.pakanFi || 0), 0);
    const avgFi = data.length > 0 ? totalFi / data.length : 0;
    document.getElementById('avg-fi').textContent = avgFi.toFixed(1);
    
    // Rata-rata %HD
    const totalHD = data.reduce((sum, item) => sum + (item.persenHD || 0), 0);
    const avgHD = data.length > 0 ? totalHD / data.length : 0;
    document.getElementById('avg-hd').textContent = avgHD.toFixed(1);
}

// Fungsi untuk menghitung semua nilai otomatis
function hitungSemua() {
    hitungSisa();
    hitungFiOtomatis();
    hitungPersenHDOtomatis();
}

// Fungsi untuk menghitung sisa populasi
function hitungSisa() {
    const unggul = parseInt(document.getElementById('unggul').value) || 0;
    const mati = parseInt(document.getElementById('mati').value) || 0;
    document.getElementById('sisa').value = unggul - mati;
}

// Fungsi untuk menghitung Fi otomatis
function hitungFiOtomatis() {
    const pakanKg = parseFloat(document.getElementById('pakanKg').value) || 0;
    const sisa = parseInt(document.getElementById('sisa').value) || 0;
    const fi = hitungFi(pakanKg, sisa);
    document.getElementById('pakanFi').value = formatAngka(fi);
}

// Fungsi untuk menghitung %HD otomatis
function hitungPersenHDOtomatis() {
    const telurButir = parseInt(document.getElementById('telurButir').value) || 0;
    const sisa = parseInt(document.getElementById('sisa').value) || 0;
    const persenHD = hitungPersenHD(telurButir, sisa);
    document.getElementById('persenHD').value = formatAngka(persenHD);
}

// Event listener saat halaman dimuat
document.addEventListener('DOMContentLoaded', function() {
    // Muat data dari Firestore
    muatData();
    
    // Event listener untuk tombol tambah
    document.getElementById('btnTambah').addEventListener('click', tambahData);
    
    // Event listener untuk tombol simpan di modal
    document.getElementById('btnSimpan').addEventListener('click', simpanData);
    
    // Event listener untuk tombol cetak PDF
    document.getElementById('btnCetak').addEventListener('click', cetakPDF);
    
    // Event listener untuk tombol share WhatsApp
    document.getElementById('btnShare').addEventListener('click', shareWhatsApp);
    
    // Event listener untuk menghitung sisa populasi
    document.getElementById('unggul').addEventListener('input', hitungSemua);
    document.getElementById('mati').addEventListener('input', hitungSemua);
    
    // Event listener untuk menghitung Fi dan %HD
    document.getElementById('pakanKg').addEventListener('input', hitungSemua);
    document.getElementById('telurButir').addEventListener('input', hitungSemua);
});