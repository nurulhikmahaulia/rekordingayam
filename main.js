// Firebase SDK
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
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

// Fungsi untuk load form dari file HTML
async function loadFormModal(isEdit = false, data = null) {
    try {
        // Jika edit, load formubah.html, jika tidak load formtambah.html
        const formFile = isEdit ? 'formubah.html' : 'formtambah.html';
        const response = await fetch(formFile);
        const html = await response.text();
        
        // Masukkan ke modal container
        document.getElementById('modalContainer').innerHTML = html;
        
        // Jika ada data (edit mode), isi form
        if (data && isEdit) {
            document.getElementById('recordId').value = data.id;
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
        } else {
            // Tambah mode - set nilai default
            document.getElementById('dataForm').reset();
            document.getElementById('recordId').value = '';
            document.getElementById('unggul').value = 1500;
            document.getElementById('tanggal').valueAsDate = new Date();
        }
        
        // Hitung semua nilai otomatis
        hitungSemua();
        
        // Tambahkan event listeners untuk form
        setupFormListeners();
        
        // Tampilkan modal
        const modal = new bootstrap.Modal(document.getElementById('dataModal'));
        modal.show();
        
    } catch (error) {
        console.error('Error loading form:', error);
        alert('Gagal memuat form. Silakan coba lagi.');
    }
}

// Setup event listeners untuk form
function setupFormListeners() {
    // Event listener untuk tombol simpan
    const btnSimpan = document.getElementById('btnSimpan');
    if (btnSimpan) {
        btnSimpan.addEventListener('click', simpanData);
    }
    
    // Event listener untuk input yang memicu perhitungan
    const inputs = ['unggul', 'mati', 'pakanKg', 'telurButir'];
    inputs.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.addEventListener('input', hitungSemua);
        }
    });
}

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
        data.id = 'local_' + Date.now();
        dataRekording.push(data);
        return true;
    }
}

// Fungsi untuk mengubah data di Firestore
async function ubahDataRekording(id, data) {
    try {
        if (id.startsWith('local_')) {
            const index = dataRekording.findIndex(item => item.id === id);
            if (index !== -1) {
                dataRekording[index] = { ...data, id };
            }
            return true;
        } else {
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
            dataRekording = dataRekording.filter(item => item.id !== id);
            return true;
        } else {
            await deleteDoc(doc(db, "rekording_ayam", id));
            console.log("Data berhasil dihapus");
            return true;
        }
    } catch (error) {
        console.error("Error menghapus data: ", error);
        return false;
    }
}

// Fungsi untuk menghitung Fi (Feed Intake)
function hitungFi(pakanKg, sisaPopulasi) {
    if (!pakanKg || !sisaPopulasi || sisaPopulasi === 0) return 0;
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

    // Tambahkan event listener untuk tombol ubah
    document.querySelectorAll('.btn-ubah').forEach(button => {
        button.addEventListener('click', async function() {
            const id = this.getAttribute('data-id');
            try {
                let data;
                
                if (id.startsWith('local_')) {
                    data = dataRekording.find(item => item.id === id);
                } else {
                    const docRef = doc(db, "rekording_ayam", id);
                    const docSnap = await getDoc(docRef);
                    if (docSnap.exists()) {
                        data = docSnap.data();
                        data.id = id;
                    }
                }
                
                if (data) {
                    await loadFormModal(true, data);
                } else {
                    alert('Data tidak ditemukan!');
                }
            } catch (error) {
                console.error("Error mengambil data untuk diubah: ", error);
                alert('Terjadi kesalahan saat mengambil data!');
            }
        });
    });

    // Tambahkan event listener untuk tombol hapus
    document.querySelectorAll('.btn-hapus').forEach(button => {
        button.addEventListener('click', async function() {
            const id = this.getAttribute('data-id');
            if (confirm('Apakah Anda yakin ingin menghapus data ini?')) {
                const berhasil = await hapusDataRekording(id);
                if (berhasil) {
                    alert('Data berhasil dihapus!');
                    muatData();
                } else {
                    alert('Terjadi kesalahan saat menghapus data!');
                }
            }
        });
    });

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

// Fungsi untuk menyimpan data
async function simpanData() {
    const id = document.getElementById('recordId').value;
    const isEdit = !!id;
    
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
    
    if (isEdit) {
        berhasil = await ubahDataRekording(id, data);
    } else {
        berhasil = await tambahDataRekording(data);
    }

    if (berhasil) {
        alert(`Data berhasil ${isEdit ? 'diubah' : 'ditambahkan'}!`);
        const modal = bootstrap.Modal.getInstance(document.getElementById('dataModal'));
        modal.hide();
        muatData();
    } else {
        alert(`Terjadi kesalahan saat ${isEdit ? 'mengubah' : 'menambahkan'} data!`);
    }
}

// Fungsi untuk menghitung semua nilai otomatis
function hitungSemua() {
    const unggul = parseInt(document.getElementById('unggul').value) || 0;
    const mati = parseInt(document.getElementById('mati').value) || 0;
    const sisa = unggul - mati;
    
    if (document.getElementById('sisa')) {
        document.getElementById('sisa').value = sisa;
    }
    
    if (document.getElementById('pakanFi')) {
        const pakanKg = parseFloat(document.getElementById('pakanKg').value) || 0;
        const fi = hitungFi(pakanKg, sisa);
        document.getElementById('pakanFi').value = formatAngka(fi);
    }
    
    if (document.getElementById('persenHD')) {
        const telurButir = parseInt(document.getElementById('telurButir').value) || 0;
        const persenHD = hitungPersenHD(telurButir, sisa);
        document.getElementById('persenHD').value = formatAngka(persenHD);
    }
}

// Fungsi untuk mencetak PDF
function cetakPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('l', 'mm', 'a4');
    
    const primaryColor = [44, 120, 108];
    const marginLeft = 10;
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    
    // Header
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(0, 0, pageWidth, 25, 'F');
    
    // Judul
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    
    const title = 'REKORDING HARIAN AYAM PETELUR';
    const titleWidth = doc.getStringUnitWidth(title) * doc.internal.getFontSize() / doc.internal.scaleFactor;
    const titleX = (pageWidth - titleWidth) / 2;
    doc.text(title, titleX, 12);
    
    // Subjudul
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    const subtitle = '"BUMDES CIPTA MANDIRI SEJAHTERA"';
    const subtitleWidth = doc.getStringUnitWidth(subtitle) * doc.internal.getFontSize() / doc.internal.scaleFactor;
    const subtitleX = (pageWidth - subtitleWidth) / 2;
    doc.text(subtitle, subtitleX, 18);
    
    try {
        const logoImg = new Image();
        logoImg.src = 'bumdes.jpg';
        
        setTimeout(() => {
            try {
                if (logoImg.complete && logoImg.naturalWidth !== 0) {
                    doc.addImage(logoImg, 'JPEG', marginLeft + 5, 5, 15, 15);
                    doc.setTextColor(0, 0, 0);
                    doc.setFontSize(10);
                    doc.text('Tanggal masuk : 23 Agustus 2025', marginLeft + 25, 35);
                    doc.text('Populasi : 1.500 Ekor', marginLeft + 25, 41);
                } else {
                    doc.setTextColor(0, 0, 0);
                    doc.setFontSize(10);
                    doc.text('Tanggal masuk : 23 Agustus 2025', marginLeft, 35);
                    doc.text('Populasi : 1.500 Ekor', marginLeft, 41);
                }
                
                generateTable(doc);
            } catch (e) {
                console.error("Error:", e);
                doc.setTextColor(0, 0, 0);
                doc.setFontSize(10);
                doc.text('Tanggal masuk : 23 Agustus 2025', marginLeft, 35);
                doc.text('Populasi : 1.500 Ekor', marginLeft, 41);
                generateTable(doc);
            }
        }, 500);
        
    } catch (e) {
        console.error("Error:", e);
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(10);
        doc.text('Tanggal masuk : 23 Agustus 2025', marginLeft, 35);
        doc.text('Populasi : 1.500 Ekor', marginLeft, 41);
        generateTable(doc);
    }
    
    function generateTable(doc) {
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
        
        if (tableRows.length === 0) {
            tableRows.push(['-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', 'Tidak ada data']);
        }
        
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
                doc.setFontSize(8);
                doc.setTextColor(100, 100, 100);
                const footerText = '© 2025 BUMDES CIPTA MANDIRI SEJAHTERA - Sistem Rekording Ayam Petelur';
                const footerWidth = doc.getStringUnitWidth(footerText) * doc.internal.getFontSize() / doc.internal.scaleFactor;
                const footerX = (pageWidth - footerWidth) / 2;
                doc.text(footerText, footerX, pageHeight - 10);
                
                doc.setFontSize(8);
                doc.text(`Halaman ${data.pageNumber}`, pageWidth - marginLeft - 10, pageHeight - 10);
            }
        });
        
        const today = new Date();
        const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
        const fileName = `Rekording_Ayam_${dateStr}.pdf`;
        
        setTimeout(() => {
            doc.save(fileName);
        }, 100);
    }
}

// Fungsi untuk share ke WhatsApp
function shareWhatsApp() {
    const dataRows = document.querySelectorAll('#tableBody tr');
    
    if (dataRows.length === 0) {
        alert('Belum ada data untuk dibagikan!');
        return;
    }
    
    const lastRow = dataRows[dataRows.length - 1];
    const cells = lastRow.querySelectorAll('td');
    
    if (cells.length < 13) {
        alert('Data tidak lengkap!');
        return;
    }
    
    const hari = cells[1].textContent || '';
    const tanggal = cells[2].textContent || '';
    const mati = cells[4].textContent || '0';
    const sisa = cells[5].textContent || '1.500';
    const pakanKg = cells[6].textContent || '0';
    const fi = cells[7].textContent || '0.0';
    const telurKg = cells[8].textContent || '0';
    const telurButir = cells[9].textContent || '0';
    const hd = cells[10].textContent || '0.0';
    const rusak = cells[11].textContent || '0';
    const keterangan = cells[12].textContent || '-';
    
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
    
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/?text=${encodedMessage}`;
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
    
    const todayData = data[data.length - 1];
    document.getElementById('today-production').textContent = todayData.telurButir || '0';
    
    const totalFi = data.reduce((sum, item) => sum + (item.pakanFi || 0), 0);
    const avgFi = data.length > 0 ? totalFi / data.length : 0;
    document.getElementById('avg-fi').textContent = avgFi.toFixed(1);
    
    const totalHD = data.reduce((sum, item) => sum + (item.persenHD || 0), 0);
    const avgHD = data.length > 0 ? totalHD / data.length : 0;
    document.getElementById('avg-hd').textContent = avgHD.toFixed(1);
}

// Event listener saat halaman dimuat
document.addEventListener('DOMContentLoaded', function() {
    muatData();
    
    document.getElementById('btnTambah').addEventListener('click', function() {
        loadFormModal(false);
    });
    
    document.getElementById('btnCetak').addEventListener('click', cetakPDF);
    document.getElementById('btnShare').addEventListener('click', shareWhatsApp);
});