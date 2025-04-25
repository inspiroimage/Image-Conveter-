class ImageConverter {
    constructor() {
        this.initializeElements();
        this.setupEventListeners();
        this.state = {
            currentFile: null,
            selectedFormat: 'pdf',
            convertedBlob: null
        };
    }

    initializeElements() {
        this.elements = {
            fileInput: document.getElementById('fileInput'),
            dropZone: document.getElementById('dropZone'),
            imagePreview: document.getElementById('imagePreview'),
            convertBtn: document.getElementById('convertBtn'),
            qualitySlider: document.getElementById('qualitySlider'),
            qualityValue: document.getElementById('qualityValue'),
            formatButtons: document.querySelectorAll('.format-btn'),
            originalSize: document.querySelector('.original-size'),
            convertedSize: document.querySelector('.converted-size'),
            selectFileBtn: document.getElementById('selectFileBtn')
        };
    }

    setupEventListeners() {
        this.elements.dropZone.addEventListener('dragover', this.handleDragOver.bind(this));
        this.elements.dropZone.addEventListener('drop', this.handleDrop.bind(this));
        this.elements.selectFileBtn.addEventListener('click', () => this.elements.fileInput.click());
        this.elements.fileInput.addEventListener('change', this.handleFileSelect.bind(this));
        this.elements.formatButtons.forEach(btn => 
            btn.addEventListener('click', this.selectFormat.bind(this))
        );
        this.elements.qualitySlider.addEventListener('input', this.updateQuality.bind(this));
        this.elements.convertBtn.addEventListener('click', this.startConversion.bind(this));
    }

    handleDragOver(e) {
        e.preventDefault();
        this.elements.dropZone.style.borderColor = 'var(--primary)';
    }

    handleDrop(e) {
        e.preventDefault();
        this.elements.dropZone.style.borderColor = 'var(--border)';
        const file = e.dataTransfer.files[0];
        if (file) this.loadImage(file);
    }

    handleFileSelect(e) {
        const file = e.target.files[0];
        if (file) this.loadImage(file);
    }

    async loadImage(file) {
        if (!file.type.startsWith('image/')) return;
        
        this.state.currentFile = file;
        const reader = new FileReader();
        
        reader.onload = (e) => {
            this.elements.imagePreview.innerHTML = `
                <img src="${e.target.result}" alt="Preview">
            `;
            this.updateFileInfo(file.size);
            this.updateConvertedSize();
        };
        reader.readAsDataURL(file);
    }

    selectFormat(e) {
        this.elements.formatButtons.forEach(btn => btn.classList.remove('active'));
        e.target.classList.add('active');
        this.state.selectedFormat = e.target.dataset.format;
        this.updateConvertedSize();
    }

    updateQuality(e) {
        this.elements.qualityValue.textContent = `${e.target.value}%`;
        this.updateConvertedSize();
    }

    async updateConvertedSize() {
        if (!this.state.currentFile) return;
        
        try {
            const quality = this.elements.qualitySlider.value / 100;
            const img = await createImageBitmap(this.state.currentFile);
            const canvas = document.createElement('canvas');
            
            canvas.width = img.width;
            canvas.height = img.height;
            canvas.getContext('2d').drawImage(img, 0, 0);
            
            canvas.toBlob(blob => {
                this.state.convertedBlob = blob;
                this.elements.convertedSize.textContent = this.formatSize(blob.size);
            }, `image/${this.state.selectedFormat}`, quality);
        } catch (error) {
            console.error('Error processing image:', error);
        }
    }

    async startConversion() {
        if (!this.state.currentFile) return this.showError('Please select an image first');
        
        const convertBtn = this.elements.convertBtn;
        convertBtn.disabled = true;
        convertBtn.querySelector('.btn-text').textContent = 'Processing...';
        convertBtn.querySelector('.spinner').classList.remove('hidden');

        try {
            if (this.state.selectedFormat === 'pdf') {
                await this.convertToPDF();
            } else {
                this.downloadFile(this.state.convertedBlob);
            }
        } catch (error) {
            this.showError('Conversion failed. Please try again.');
        } finally {
            convertBtn.disabled = false;
            convertBtn.querySelector('.btn-text').textContent = 'Start Conversion';
            convertBtn.querySelector('.spinner').classList.add('hidden');
        }
    }

    async convertToPDF() {
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF();
        const img = await createImageBitmap(this.state.currentFile);
        
        const width = pdf.internal.pageSize.getWidth();
        const height = (img.height * width) / img.width;
        
        pdf.addImage(img, 'JPEG', 0, 0, width, height);
        pdf.save(`converted-${Date.now()}.pdf`);
    }

    downloadFile(blob) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `converted-${Date.now()}.${this.state.selectedFormat}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    updateFileInfo(size) {
        this.elements.originalSize.textContent = this.formatSize(size);
    }

    formatSize(bytes) {
        const sizes = ['B', 'KB', 'MB'];
        if (bytes === 0) return '0 B';
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
    }

    showError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.textContent = message;
        document.body.appendChild(errorDiv);
        
        setTimeout(() => {
            errorDiv.remove();
        }, 3000);
    }
}

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
    new ImageConverter();
});
