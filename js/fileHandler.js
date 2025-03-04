// File upload and parsing functionality

export function setupFileHandler(onDataParsed) {
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('file-upload');
    const errorElement = document.getElementById('fileError');

    // Setup event listeners
    dropZone.addEventListener('dragover', handleDragOver);
    dropZone.addEventListener('dragleave', handleDragLeave);
    dropZone.addEventListener('drop', handleDrop);
    fileInput.addEventListener('change', handleFileSelect);

    /**
     * Handle file drag over event
     * @param {DragEvent} e - The drag event
     */
    function handleDragOver(e) {
        e.preventDefault();
        e.stopPropagation();
        dropZone.classList.add('drag-active');
    }

    /**
     * Handle file drag leave event
     * @param {DragEvent} e - The drag event
     */
    function handleDragLeave(e) {
        e.preventDefault();
        e.stopPropagation();
        dropZone.classList.remove('drag-active');
    }

    /**
     * Handle file drop event
     * @param {DragEvent} e - The drop event
     */
    function handleDrop(e) {
        e.preventDefault();
        e.stopPropagation();
        dropZone.classList.remove('drag-active');

        const files = e.dataTransfer.files;
        if (files.length > 0) {
            processFile(files[0]);
        }
    }

    /**
     * Handle file selection from input
     * @param {Event} e - The change event
     */
    function handleFileSelect(e) {
        const files = e.target.files;
        if (files.length > 0) {
            processFile(files[0]);
        }
    }

    /**
     * Process the uploaded file
     * @param {File} file - The uploaded file
     */
    async function processFile(file) {
        try {
            // Reset error state
            hideError();

            // Validate file
            if (!isValidFile(file)) {
                throw new Error('Please upload a valid CSV file');
            }

            // Parse and validate CSV file
            const data = await parseHotjarCSV(file);
            
            // Call the callback with the parsed data
            await onDataParsed(data);

        } catch (error) {
            showError(error.message);
            console.error('File processing error:', error);
        }
    }

    /**
     * Validate file type and size
     * @param {File} file - The file to validate
     * @returns {boolean} - Whether the file is valid
     */
    function isValidFile(file) {
        // Check file type
        if (!file.name.toLowerCase().endsWith('.csv')) {
            throw new Error('Please upload a CSV file');
        }

        // Check file size (max 10MB)
        const maxSize = 10 * 1024 * 1024; // 10MB in bytes
        if (file.size > maxSize) {
            throw new Error('File size must be less than 10MB');
        }

        return true;
    }

    /**
     * Parse Hotjar CSV file
     * @param {File} file - The CSV file to parse
     * @returns {Promise<Array>} - Parsed CSV data
     */
    function parseHotjarCSV(file) {
        return new Promise((resolve, reject) => {
            Papa.parse(file, {
                header: true,
                skipEmptyLines: true,
                transformHeader: header => header.trim(), // Trim whitespace from headers
                complete: (results) => {
                    try {
                        if (results.errors.length > 0) {
                            throw new Error('Failed to parse CSV file: ' + results.errors[0].message);
                        }

                        // Log headers for debugging
                        console.log('CSV Headers:', results.meta.fields);
                        
                        // Check for required columns
                        const requiredColumns = ['Element CSS selector', 'Total # of clicks'];
                        const missingColumns = requiredColumns.filter(col => !results.meta.fields.includes(col));
                        
                        if (missingColumns.length > 0) {
                            throw new Error(
                                'CSV file is missing required columns: ' + missingColumns.join(', ') + '\n' +
                                'Available columns: ' + results.meta.fields.join(', ')
                            );
                        }

                        // Transform the data directly
                        const transformedData = results.data.map(row => ({
                            selector: row['Element CSS selector'],
                            clicks: parseInt(row['Total # of clicks']) || 0,
                            moves: 0, // We don't have this data
                            scrolls: 0, // We don't have this data
                            visible: row['Visible in image'] === 'Yes',
                            percentage: parseFloat((row['% of total'] || '0').replace(/[^0-9.]/g, '')) || 0
                        }));

                        resolve(transformedData);
                    } catch (error) {
                        reject(error);
                    }
                },
                error: (error) => {
                    reject(new Error('Failed to parse CSV file: ' + error.message));
                }
            });
        });
    }

    function showError(message) {
        errorElement.textContent = message;
        errorElement.classList.remove('hidden');
    }

    function hideError() {
        errorElement.textContent = '';
        errorElement.classList.add('hidden');
    }

    // Return public interface
    return {
        processFile,
        isValidFile
    };
}