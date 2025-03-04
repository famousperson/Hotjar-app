// UI updates and rendering functionality

export function setupUI() {
    const loadingState = document.getElementById('loadingState');
    const loadingText = document.getElementById('loadingText');
    const resultsContainer = document.getElementById('resultsContainer');

    /**
     * Update the results display
     * @param {Array} results - Analysis results to display
     */
    function updateResults(results) {
        resultsContainer.innerHTML = ''; // Clear existing results

        if (!results || results.length === 0) {
            showNoResults();
            return;
        }

        // Group results by status
        const groupedResults = groupResultsByStatus(results);
        
        // Create result cards
        Object.entries(groupedResults).forEach(([status, items]) => {
            const statusSection = createStatusSection(status, items);
            resultsContainer.appendChild(statusSection);
        });

        // Initialize syntax highlighting
        Prism.highlightAll();
    }

    /**
     * Group results by their status
     * @param {Array} results - Results to group
     * @returns {Object} - Grouped results
     */
    function groupResultsByStatus(results) {
        return results.reduce((acc, result) => {
            if (!acc[result.status]) {
                acc[result.status] = [];
            }
            acc[result.status].push(result);
            return acc;
        }, {});
    }

    /**
     * Create a section for results of a specific status
     * @param {string} status - Status category
     * @param {Array} items - Results for this status
     * @returns {HTMLElement} - Status section element
     */
    function createStatusSection(status, items) {
        const section = document.createElement('div');
        section.className = 'mb-8';
        
        // Create header
        const header = document.createElement('h3');
        header.className = 'text-lg font-semibold mb-4 flex items-center';
        header.innerHTML = `
            <span class="status-indicator status-${status}"></span>
            ${capitalizeFirst(status)} Interactions (${items.length})
        `;
        
        // Create results grid
        const grid = document.createElement('div');
        grid.className = 'grid grid-cols-1 md:grid-cols-2 gap-6';
        
        // Add result cards
        items.forEach(result => {
            grid.appendChild(createResultCard(result));
        });

        section.appendChild(header);
        section.appendChild(grid);
        return section;
    }

    /**
     * Create a card for a single result
     * @param {Object} result - Analysis result
     * @returns {HTMLElement} - Result card element
     */
    function createResultCard(result) {
        const card = document.createElement('div');
        card.className = 'result-card bg-white rounded-lg shadow-sm p-6 border border-gray-200';
        
        // Get the metrics
        const clicks = result.metrics.clicks;
        const percentage = result.metrics.percentage;
        const isVisible = result.metrics.isVisible;

        card.innerHTML = `
            <div class="flex items-start justify-between mb-4">
                <div>
                    <h4 class="font-semibold text-gray-900">Element Details</h4>
                    <code class="text-sm text-gray-600">${result.selector}</code>
                </div>
                <span class="status-indicator status-${result.status} mt-1"></span>
            </div>

            <div class="mb-4">
                <h5 class="text-sm font-medium text-gray-700 mb-2">Element Context</h5>
                <p class="text-sm text-gray-600">
                    ${result.element.tagName.toUpperCase()} element in ${result.element.location}
                </p>
                ${result.element.innerText ? `
                    <p class="text-sm text-gray-500 mt-1">
                        Content: "${result.element.innerText}"
                    </p>
                ` : ''}
            </div>

            <div class="mb-4">
                <h5 class="text-sm font-medium text-gray-700 mb-2">Interaction Metrics</h5>
                <div class="space-y-2">
                    <div class="flex items-center text-sm">
                        <span class="w-24 text-gray-500">Clicks:</span>
                        <div class="flex-1 bg-gray-200 rounded-full h-2">
                            <div class="bg-blue-600 rounded-full h-2" style="width: ${percentage}%"></div>
                        </div>
                        <span class="ml-2 text-gray-600">${clicks}</span>
                    </div>
                    <div class="flex items-center text-sm">
                        <span class="w-24 text-gray-500">% of Total:</span>
                        <span class="text-gray-600">${percentage}%</span>
                    </div>
                    <div class="flex items-center text-sm">
                        <span class="w-24 text-gray-500">Visibility:</span>
                        <span class="px-2 py-1 text-xs ${isVisible ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'} rounded">
                            ${isVisible ? 'Visible in heatmap' : 'Not visible in heatmap'}
                        </span>
                    </div>
                </div>
            </div>

            ${result.styles ? `
                <div class="mb-4">
                    <h5 class="text-sm font-medium text-gray-700 mb-2">CSS Styles</h5>
                    <pre class="text-xs"><code class="language-css">${escapeHtml(result.styles)}</code></pre>
                </div>
            ` : ''}

            <div>
                <h5 class="text-sm font-medium text-gray-700 mb-2">Analysis</h5>
                <p class="text-sm text-gray-600">${result.analysis}</p>
            </div>
        `;

        return card;
    }

    /**
     * Show message when no results are available
     */
    function showNoResults() {
        resultsContainer.innerHTML = `
            <div class="text-center py-12">
                <p class="text-gray-500">No analysis results available yet.</p>
                <p class="text-sm text-gray-400 mt-2">
                    Please provide both website code and Hotjar data to begin analysis.
                </p>
            </div>
        `;
    }

    /**
     * Show loading state
     * @param {string} message - Loading message to display
     */
    function showLoading(message = 'Processing...') {
        loadingText.textContent = message;
        loadingState.classList.remove('hidden');
    }

    /**
     * Hide loading state
     */
    function hideLoading() {
        loadingState.classList.add('hidden');
    }

    /**
     * Show error message
     * @param {string} message - Error message to display
     */
    function showError(message) {
        const errorToast = document.createElement('div');
        errorToast.className = 'fixed bottom-4 right-4 bg-red-50 text-red-700 px-4 py-3 rounded-lg shadow-lg border border-red-200 transition-opacity duration-500';
        errorToast.innerHTML = `
            <div class="flex items-center">
                <svg class="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/>
                </svg>
                ${escapeHtml(message)}
            </div>
        `;

        document.body.appendChild(errorToast);

        // Remove toast after 5 seconds
        setTimeout(() => {
            errorToast.style.opacity = '0';
            setTimeout(() => errorToast.remove(), 500);
        }, 5000);
    }

    /**
     * Capitalize first letter of a string
     * @param {string} str - String to capitalize
     * @returns {string} - Capitalized string
     */
    function capitalizeFirst(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    /**
     * Escape HTML special characters
     * @param {string} html - String to escape
     * @returns {string} - Escaped string
     */
    function escapeHtml(html) {
        const div = document.createElement('div');
        div.textContent = html;
        return div.innerHTML;
    }

    // Return public interface
    return {
        updateResults,
        showLoading,
        hideLoading,
        showError
    };
}