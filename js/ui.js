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
                    <div class="flex items-center mt-1">
                        <code class="text-sm text-gray-600 bg-gray-50 px-2 py-1 rounded">${result.selector}</code>
                        <span class="ml-2 px-2 py-1 text-xs ${result.metrics.isVisible ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'} rounded">
                            ${result.metrics.isVisible ? 'Visible in heatmap' : 'Not visible in heatmap'}
                        </span>
                    </div>
                </div>
                <span class="status-indicator status-${result.status} mt-1"></span>
            </div>

            <div class="mb-4">
                <h5 class="text-sm font-medium text-gray-700 mb-2">Element Context</h5>
                <div class="space-y-3">
                    <div class="bg-white rounded-lg border border-gray-200">
                        <div class="p-3 bg-gray-50 border-b border-gray-200">
                            <h6 class="text-xs font-medium text-gray-700">Element Information</h6>
                        </div>
                        <div class="p-4">
                            <div class="space-y-4">
                                <div class="flex items-center space-x-2 text-sm">
                                    <svg class="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>
                                    </svg>
                                    <div class="overflow-hidden">
                                        <p class="text-xs text-gray-500 mb-1">Location Path</p>
                                        <div class="flex items-center flex-wrap gap-1">
                                            ${result.element.location.split('/').map((part, i, arr) => `
                                                <span class="px-1.5 py-0.5 text-xs ${
                                                    i === arr.length - 1 ? 'bg-blue-50 text-blue-600' : 'bg-gray-50 text-gray-600'
                                                } rounded whitespace-nowrap">${part}</span>
                                                ${i < arr.length - 1 ? '<span class="text-gray-400">/</span>' : ''}
                                            `).join('')}
                                        </div>
                                    </div>
                                </div>
                                ${result.element.preview ? `
                                    <div class="rounded-lg border border-gray-200 overflow-hidden">
                                        <div class="relative bg-gray-50">
                                            <img src="${result.element.preview}"
                                                 alt="Element preview"
                                                 class="w-full object-contain max-h-32"
                                            />
                                            <div class="absolute inset-0 border border-blue-500 bg-blue-500/5"></div>
                                        </div>
                                        <div class="bg-gray-50 p-2 border-t border-gray-200">
                                            <p class="text-xs text-gray-600 flex items-center">
                                                <svg class="w-3.5 h-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                                                </svg>
                                                Visual Preview
                                            </p>
                                        </div>
                                    </div>
                                ` : ''}
                            </div>
                                <div class="absolute top-0 right-0 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-bl">
                                    ${result.metrics.percentage}% of total clicks
                                </div>
                                <p class="text-sm text-gray-700 mb-2 flex items-center">
                                    <svg class="w-4 h-4 mr-1 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                                    </svg>
                                    <span class="font-medium">Location:</span> <span class="ml-1">${result.element.location}</span>
                                </p>
                                <div class="space-y-2">
                                    <div class="flex items-center space-x-2 text-sm">
                                        <div class="flex-shrink-0 w-4 h-4">
                                            <svg class="w-full h-full text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"/>
                                            </svg>
                                        </div>
                                        <div class="flex-1">
                                            <p class="text-gray-700">
                                                <span class="font-medium">Page Section:</span> ${result.element.location}
                                            </p>
                                        </div>
                                    </div>
                                <div>
                                    <p class="text-xs text-gray-500 mb-2">Element Structure</p>
                                    <div class="bg-gray-50 rounded-lg border border-gray-200 p-2">
                                        <div class="flex items-center space-x-2 overflow-x-auto">
                                            <code class="text-xs font-mono whitespace-nowrap">
                                                <span class="text-purple-600">&lt;${result.element.tagName.toLowerCase()}</span>
                                                ${result.element.className ? `
                                                    <span class="text-gray-500"> class=</span>
                                                    <span class="text-blue-600">"${result.element.className}"</span>
                                                ` : ''}
                                                ${result.element.id ? `
                                                    <span class="text-gray-500"> id=</span>
                                                    <span class="text-orange-600">"${result.element.id}"</span>
                                                ` : ''}
                                                <span class="text-purple-600">&gt;</span>
                                            </code>
                                            ${result.element.className || result.element.id ? `
                                                <div class="flex items-center gap-1">
                                                    ${result.element.className ? `
                                                        <span class="px-1.5 py-0.5 text-xs bg-blue-50 text-blue-600 rounded whitespace-nowrap">class: ${result.element.className}</span>
                                                    ` : ''}
                                                    ${result.element.id ? `
                                                        <span class="px-1.5 py-0.5 text-xs bg-orange-50 text-orange-600 rounded whitespace-nowrap">id: ${result.element.id}</span>
                                                    ` : ''}
                                                </div>
                                            ` : ''}
                                        </div>
                                    </div>
                                </div>
                                </div>
                                ${result.element.innerText ? `
                                    <div class="mt-2">
                                        <p class="text-xs text-gray-500 mb-1">Content Preview:</p>
                                        <div class="text-sm bg-gray-50 p-2 rounded border border-gray-100">
                                            "${result.element.innerText}"
                                        </div>
                                    </div>
                                ` : ''}
                            </div>
                            ${result.element.domPath ? `
                        <div class="mt-4 bg-white rounded-lg border border-gray-200">
                            <div class="p-3 bg-gray-50 border-b border-gray-200">
                                <div class="flex items-center justify-between">
                                    <p class="text-xs font-medium text-gray-700">Element Location</p>
                                    <span class="text-xs text-gray-500">Click path to highlight</span>
                                </div>
                            </div>
                            <div class="p-3 max-h-48 overflow-y-auto">
                                <div class="space-y-1.5">
                                            ${result.element.domPath.map((node, index, array) => `
                                                <button class="w-full flex items-center px-2 py-1.5 hover:bg-gray-50 rounded group">
                                                    <div class="flex-shrink-0 w-4 flex items-center justify-center">
                                                        ${index < array.length - 1 ?
                                                            '<div class="h-full w-px bg-gray-200 group-hover:bg-blue-200 transition-colors"></div>' :
                                                            '<div class="w-1.5 h-1.5 rounded-full bg-green-500"></div>'
                                                        }
                                                    </div>
                                                    <div class="flex-1 flex items-center ml-2 text-xs">
                                                        <span class="font-mono text-gray-600">&lt;${node.tag}&gt;</span>
                                                        ${node.classes ?
                                                            `<span class="ml-2 px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded">${node.classes}</span>` :
                                                            ''
                                                        }
                                                        ${node.id ?
                                                            `<span class="ml-2 px-1.5 py-0.5 bg-orange-50 text-orange-600 rounded">#${node.id}</span>` :
                                                            ''
                                                        }
                                                        ${index === array.length - 1 ?
                                                            '<span class="ml-auto px-1.5 py-0.5 bg-green-50 text-green-600 rounded">Current</span>' :
                                                            ''
                                                        }
                                                    </div>
                                                </button>
                                            `).join('')}
                                        </div>
                                    </div>
                                </div>
                            ` : ''}
                        </div>
                    </div>
                </div>
            </div>

            <div class="mb-4 bg-white rounded-lg border border-gray-200 overflow-hidden">
                <div class="p-4 bg-gray-50 border-b border-gray-200">
                    <div class="flex items-center justify-between">
                        <h5 class="text-sm font-medium text-gray-700">Interaction Analysis</h5>
                        <span class="px-2 py-1 text-xs ${
                            percentage > 20 ? 'bg-green-100 text-green-600' :
                            percentage > 10 ? 'bg-yellow-100 text-yellow-600' :
                            'bg-gray-100 text-gray-600'
                        } rounded-full">
                            ${
                                percentage > 20 ? 'High Impact' :
                                percentage > 10 ? 'Medium Impact' :
                                'Low Impact'
                            }
                        </span>
                    </div>
                </div>
                <div class="p-4">
                    <div class="grid grid-cols-2 gap-4 mb-4">
                        <div class="bg-gray-50 rounded-lg p-4 border border-gray-100">
                            <div class="flex items-baseline justify-between mb-2">
                                <span class="text-sm text-gray-500">Total Clicks</span>
                                <span class="text-2xl font-bold text-gray-900">${clicks}</span>
                            </div>
                            <div class="relative pt-2">
                                <div class="flex mb-2 items-center justify-between">
                                    <div class="text-xs text-gray-500">Engagement Rate</div>
                                    <div class="text-xs text-blue-600 font-semibold">${percentage}%</div>
                                </div>
                                <div class="overflow-hidden h-2 text-xs flex rounded bg-gray-200">
                                    <div style="width:${percentage}%"
                                         class="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center ${
                                             percentage > 20 ? 'bg-blue-500' :
                                             percentage > 10 ? 'bg-blue-400' :
                                             'bg-blue-300'
                                         }">
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="bg-gray-50 rounded-lg p-4 border border-gray-100">
                            <div class="flex items-start space-x-3">
                                <div class="flex-shrink-0 mt-1">
                                    <div class="w-8 h-8 rounded-full flex items-center justify-center ${
                                        isVisible ? 'bg-green-100 text-green-500' : 'bg-gray-100 text-gray-400'
                                    }">
                                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                                  d="${isVisible ?
                                                      'M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z' :
                                                      'M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a10 10 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18'
                                                  }" />
                                        </svg>
                                    </div>
                                </div>
                                <div class="flex-1">
                                    <p class="text-sm font-medium ${isVisible ? 'text-green-600' : 'text-gray-500'}">
                                        ${isVisible ? 'Element is Visible' : 'Element Not Visible'}
                                    </p>
                                    <p class="mt-1 text-xs text-gray-500">
                                        ${isVisible ?
                                            'This element can be seen in the current heatmap view' :
                                            'This element might be hidden or outside the current viewport'
                                        }
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="bg-blue-50 rounded-lg p-3 border border-blue-100">
                        <div class="flex items-start">
                            <svg class="w-5 h-5 text-blue-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                            </svg>
                            <div class="ml-3">
                                <p class="text-sm text-blue-800 font-medium">Quick Analysis</p>
                                <p class="text-sm text-blue-600 mt-1">
                                    ${
                                        percentage > 20 ?
                                            `This is a high-impact element receiving ${percentage}% of all clicks. Consider optimizing the user journey around this interaction.` :
                                        percentage > 10 ?
                                            `With ${percentage}% of clicks, this element shows moderate engagement. There might be opportunities to enhance its visibility.` :
                                            `This element receives relatively low engagement (${percentage}% of clicks). Consider reviewing its placement or visibility if higher engagement is desired.`
                                    }
                                    ${!isVisible ? ' Currently not visible in the heatmap view, which may affect its effectiveness.' : ''}
                                </p>
                            </div>
                        </div>
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