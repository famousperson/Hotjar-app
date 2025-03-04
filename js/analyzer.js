// Data analysis and Gemini API integration

export function setupAnalyzer() {
    /**
     * Analyze website code and Hotjar data
     * @param {{html: string, css: string[], js: string[]}} websiteCode - The website code
     * @param {Array} hotjarData - Parsed Hotjar data
     * @returns {Promise<Array>} - Analysis results
     */
    async function analyzeData(websiteCode, hotjarData) {
        try {
            // Create a virtual DOM to analyze HTML structure
            const parser = new DOMParser();
            const doc = parser.parseFromString(websiteCode.html, 'text/html');

            // Process each Hotjar data entry
            const results = await Promise.all(
                hotjarData.map(entry => analyzeElement(entry, doc, websiteCode))
            );

            // Filter out null results (elements not found) and sort by interaction count
            return results
                .filter(result => result !== null)
                .sort((a, b) => b.totalInteractions - a.totalInteractions);

        } catch (error) {
            console.error('Analysis error:', error);
            throw new Error('Failed to analyze data: ' + error.message);
        }
    }

    /**
     * Analyze a single element from Hotjar data
     * @param {Object} entry - Hotjar data entry
     * @param {Document} doc - Virtual DOM document
     * @param {{html: string, css: string[], js: string[]}} websiteCode - Website code
     * @returns {Promise<Object|null>} - Analysis result
     */
    async function analyzeElement(entry, doc, websiteCode) {
        try {
            // Find element in virtual DOM
            const element = doc.querySelector(entry.selector);
            if (!element) {
                console.warn(`Element not found: ${entry.selector}`);
                return null;
            }

            // Get element context
            const context = getElementContext(element);
            const relevantCSS = findRelevantCSS(entry.selector, websiteCode.css);
            
            // Use clicks as the primary metric
            const totalInteractions = entry.clicks;

            // Prepare data for AI analysis
            const analysisData = {
                selector: entry.selector,
                element: {
                    tagName: element.tagName.toLowerCase(),
                    className: element.className,
                    id: element.id,
                    innerText: element.innerText.slice(0, 100) + (element.innerText.length > 100 ? '...' : ''),
                    location: context.location,
                    visible: entry.visible
                },
                metrics: {
                    clicks: entry.clicks,
                    percentage: entry.percentage,
                    totalInteractions,
                    isVisible: entry.visible
                },
                context: {
                    parent: context.parent,
                    siblings: context.siblings
                },
                styles: relevantCSS
            };

            // Get AI analysis
            const aiAnalysis = await analyzeWithGemini(analysisData);

            // Return combined analysis result
            return {
                ...analysisData,
                analysis: aiAnalysis,
                status: determineStatus(aiAnalysis, totalInteractions),
                totalInteractions
            };

        } catch (error) {
            console.error(`Error analyzing element ${entry.selector}:`, error);
            return null;
        }
    }

    /**
     * Get element's context in the DOM
     * @param {Element} element - DOM element
     * @returns {Object} - Element context
     */
    function getElementContext(element) {
        const parent = element.parentElement;
        const siblings = Array.from(parent?.children || [])
            .filter(child => child !== element)
            .map(child => ({
                tagName: child.tagName.toLowerCase(),
                className: child.className
            }));

        // Determine element's location in the page
        let location = 'body';
        let current = element;
        while (current.parentElement) {
            if (current.parentElement.tagName === 'HEADER') location = 'header';
            if (current.parentElement.tagName === 'FOOTER') location = 'footer';
            if (current.parentElement.tagName === 'NAV') location = 'navigation';
            if (current.parentElement.tagName === 'MAIN') location = 'main content';
            if (current.parentElement.tagName === 'ASIDE') location = 'sidebar';
            current = current.parentElement;
        }

        return {
            parent: parent ? {
                tagName: parent.tagName.toLowerCase(),
                className: parent.className,
                id: parent.id
            } : null,
            siblings: siblings.slice(0, 5), // Limit to 5 siblings for brevity
            location
        };
    }

    /**
     * Find CSS rules relevant to the element
     * @param {string} selector - CSS selector
     * @param {string[]} cssContent - CSS content array
     * @returns {string} - Relevant CSS rules
     */
    function findRelevantCSS(selector, cssContent) {
        try {
            const relevantRules = [];
            
            // Convert selector to a regex-safe string
            const selectorRegex = new RegExp(
                selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
                + '\\s*{[^}]*}',
                'g'
            );

            // Search for rules in all CSS content
            cssContent.forEach(css => {
                const matches = css.match(selectorRegex);
                if (matches) {
                    relevantRules.push(...matches);
                }
            });

            return relevantRules.join('\n');
        } catch (error) {
            console.warn('Error finding CSS rules:', error);
            return '';
        }
    }

    /**
     * Determine the status based on AI analysis and interaction count
     * @param {string} analysis - AI analysis text
     * @param {number} totalInteractions - Total interaction count
     * @returns {string} - Status (normal, problem, or success)
     */
    function determineStatus(analysis, totalInteractions) {
        const lowerAnalysis = analysis.toLowerCase();
        if (lowerAnalysis.includes('problem') || lowerAnalysis.includes('issue')) {
            return 'problem';
        }
        if (lowerAnalysis.includes('success') || lowerAnalysis.includes('positive')) {
            return 'success';
        }
        return 'normal';
    }

    /**
     * Analyze data using Gemini API
     * @param {Object} data - Data to analyze
     * @returns {Promise<string>} - Analysis result
     */
    async function analyzeWithGemini(data) {
        let geminiApiKey;
        
        try {
            // Try to import config file
            const config = await import('../config.js');
            geminiApiKey = config.config.geminiApiKey;
        } catch (error) {
            console.warn('Config file not found or invalid. Using mock analysis.');
            return mockAnalysis(data);
        }

        // Use mock analysis if no API key
        if (!geminiApiKey) {
            console.warn('No Gemini API key found. Using mock analysis.');
            return mockAnalysis(data);
        }

        const geminiApiEndpoint = 'https://generative-ai.googleapis.com/v1/models/gemini-pro:generateContent';

        const prompt = `
            Analyze this website element and its user interaction data to provide UX/conversion insights:

            Element Details:
            - Type: ${data.element.tagName}
            - Location: ${data.element.location}
            - Content: ${data.element.innerText}
            - Selector: ${data.selector}

            Interaction Metrics:
            - Clicks: ${data.metrics.clicks}
            - Mouse movements: ${data.metrics.moves}
            - Scroll events: ${data.metrics.scrolls}
            - Total Interactions: ${data.metrics.totalInteractions}

            Context:
            - Parent Element: ${JSON.stringify(data.context.parent)}
            - Nearby Elements: ${JSON.stringify(data.context.siblings)}
            - Page Location: ${data.element.location}
            
            CSS Styles:
            ${data.styles}

            Based on this data, provide a concise analysis addressing:
            1. Is this showing normal usage patterns, potential problems, or notable success?
            2. What specific UX/conversion insights can be drawn from the interaction patterns?
            3. If there are issues, what are the top 1-2 actionable recommendations for improvement?

            Keep the response brief and focused on actionable insights.
        `;

        try {
            const response = await fetch(geminiApiEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${geminiApiKey}`
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: prompt
                        }]
                    }]
                })
            });

            if (!response.ok) {
                throw new Error(`Gemini API error: ${response.status}`);
            }

            const result = await response.json();
            
            // Extract the response text from the Gemini API result
            const analysisText = result.candidates[0].content.parts[0].text;
            return analysisText || 'Analysis not available.';

        } catch (error) {
            console.error('Gemini API error:', error);
            // Fallback to mock analysis if API fails
            return mockAnalysis(data);
        }
    }

    /**
     * Generate mock analysis for testing
     * @param {Object} data - Analysis data
     * @returns {string} - Mock analysis
     */
    function mockAnalysis(data) {
        const { metrics, element } = data;
        
        // Define thresholds
        const HIGH_CLICKS = 100;
        const HIGH_MOVES = 500;
        const HIGH_SCROLLS = 200;

        if (metrics.clicks > HIGH_CLICKS) {
            return `Success: High engagement with ${element.totalInteractions} total interactions. This ${element.tagName} element in the ${element.location} is performing well.`;
        }

        if (metrics.moves > HIGH_MOVES && metrics.clicks < 10) {
            return `Problem: High mouse movement (${metrics.moves}) but low clicks (${metrics.clicks}) suggests users may be having trouble interacting with this element. Consider improving clickability and visual feedback.`;
        }

        if (metrics.scrolls > HIGH_SCROLLS) {
            return `Normal: Significant scroll activity is expected for this ${element.tagName} element in the ${element.location}. Content appears to be engaging users as intended.`;
        }

        return `Normal: This ${element.tagName} element shows typical interaction patterns for its location in the ${element.location}.`;
    }

    // Return public interface
    return {
        analyzeData,
        analyzeElement
    };
}