// Main application initialization and coordination
import { setupUrlHandler } from './urlHandler.js';
import { setupFileHandler } from './fileHandler.js';
import { setupAnalyzer } from './analyzer.js';
import { setupUI } from './ui.js';

class HotjarAnalyzer {
    constructor() {
        this.state = {
            websiteCode: null,
            hotjarData: null,
            analysisResults: [],
            currentFilter: 'all'
        };
        
        this.init();
    }

    async init() {
        try {
            // Initialize all modules
            const { handleUrlSubmit } = setupUrlHandler(this.handleWebsiteCode.bind(this));
            const { handleFileUpload } = setupFileHandler(this.handleHotjarData.bind(this));
            const { analyzeData } = setupAnalyzer();
            const ui = setupUI();

            // Store references to key functions
            this.analyzeData = analyzeData;
            this.updateUI = ui.updateResults;
            this.showLoading = ui.showLoading;
            this.hideLoading = ui.hideLoading;
            this.showError = ui.showError;

            // Setup filter event listeners
            document.querySelectorAll('.filter-btn').forEach(btn => {
                btn.addEventListener('click', () => this.handleFilter(btn.dataset.filter));
            });

        } catch (error) {
            console.error('Initialization error:', error);
            this.showError('Failed to initialize application. Please refresh the page.');
        }
    }

    async handleWebsiteCode(code) {
        try {
            this.state.websiteCode = code;
            await this.runAnalysis();
        } catch (error) {
            console.error('Error handling website code:', error);
            this.showError('Failed to process website code. Please try again.');
        }
    }

    async handleHotjarData(data) {
        try {
            this.state.hotjarData = data;
            await this.runAnalysis();
        } catch (error) {
            console.error('Error handling Hotjar data:', error);
            this.showError('Failed to process Hotjar data. Please check the file format and try again.');
        }
    }

    async runAnalysis() {
        // Only run analysis if we have both website code and Hotjar data
        if (!this.state.websiteCode || !this.state.hotjarData) {
            return;
        }

        try {
            this.showLoading('Analyzing data...');

            // Run the analysis
            this.state.analysisResults = await this.analyzeData(
                this.state.websiteCode,
                this.state.hotjarData
            );

            // Update UI with results
            this.updateUI(this.filterResults(this.state.currentFilter));
            
            // Show analysis section
            document.getElementById('analysisSection').classList.remove('hidden');
            
        } catch (error) {
            console.error('Analysis error:', error);
            this.showError('Failed to analyze data. Please try again.');
        } finally {
            this.hideLoading();
        }
    }

    handleFilter(filter) {
        try {
            // Update active filter button
            document.querySelectorAll('.filter-btn').forEach(btn => {
                if (btn.dataset.filter === filter) {
                    btn.classList.add('bg-indigo-100', 'text-indigo-700');
                    btn.classList.remove('text-gray-700');
                } else {
                    btn.classList.remove('bg-indigo-100', 'text-indigo-700');
                    btn.classList.add('text-gray-700');
                }
            });

            // Update state and refresh results
            this.state.currentFilter = filter;
            this.updateUI(this.filterResults(filter));
            
        } catch (error) {
            console.error('Filter error:', error);
            this.showError('Failed to apply filter. Please try again.');
        }
    }

    filterResults(filter) {
        if (filter === 'all') {
            return this.state.analysisResults;
        }
        return this.state.analysisResults.filter(result => result.status === filter);
    }
}

// Initialize application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new HotjarAnalyzer();
});