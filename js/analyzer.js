// Data analysis and Gemini API integration

import { visualizeElement } from './elementVisualizer.js';

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

            // Get enhanced element context and visual information
            const context = getElementContext(element);
            const relevantCSS = findRelevantCSS(entry.selector, websiteCode.css);
            const visualData = await visualizeElement(entry.selector, websiteCode);

            // Calculate interaction patterns
            const totalInteractions = entry.clicks;
            const interactionPattern = analyzeInteractionPattern(entry, context.semanticContext);

            // Prepare enhanced data for AI analysis
            const analysisData = {
                selector: entry.selector,
                element: {
                    tagName: element.tagName.toLowerCase(),
                    className: element.className,
                    id: element.id,
                    innerText: element.innerText.slice(0, 100) + (element.innerText.length > 100 ? '...' : ''),
                    location: context.location,
                    locationPath: context.locationPath,
                    visible: entry.visible,
                    preview: visualData?.screenshot || null,
                    domPath: visualData?.domPath || [],
                    role: context.semanticContext.role,
                    isInteractive: context.semanticContext.isInteractive
                },
                metrics: {
                    clicks: entry.clicks,
                    percentage: entry.percentage,
                    totalInteractions,
                    isVisible: entry.visible,
                    interactionQuality: interactionPattern.quality,
                    engagementScore: calculateEngagementScore(entry, context)
                },
                context: {
                    parent: context.parent,
                    siblings: context.siblings.map(sibling => ({
                        ...sibling,
                        relationshipType: sibling.type,
                        position: sibling.position
                    })),
                    visualHierarchy: context.semanticContext.visualHierarchy,
                    pageSection: context.semanticContext.section
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
        
        // Get detailed sibling context
        const siblings = Array.from(parent?.children || [])
            .filter(child => child !== element)
            .map(child => ({
                tagName: child.tagName.toLowerCase(),
                className: child.className,
                id: child.id,
                type: getSiblingType(child),
                position: getRelativePosition(child, element)
            }));

        // Build detailed location path
        const locationPath = [];
        let current = element;
        let depth = 0;
        const maxDepth = 5; // Limit depth to prevent infinite loops

        while (current.parentElement && depth < maxDepth) {
            const section = getSectionInfo(current.parentElement);
            if (section.type) {
                locationPath.unshift(section);
            }
            current = current.parentElement;
            depth++;
        }

        // Determine semantic context
        const semanticContext = {
            isInteractive: isInteractiveElement(element),
            role: element.getAttribute('role') || getImplicitRole(element),
            section: getPageSection(locationPath),
            visualHierarchy: getVisualHierarchy(element)
        };

        return {
            parent: parent ? {
                tagName: parent.tagName.toLowerCase(),
                className: parent.className,
                id: parent.id,
                role: parent.getAttribute('role') || getImplicitRole(parent)
            } : null,
            siblings: siblings.slice(0, 5), // Limit to 5 siblings for brevity
            location: semanticContext.section,
            locationPath,
            semanticContext
        };
    }

    /**
     * Get the type of sibling element
     * @param {Element} element - DOM element
     * @returns {string} - Element type
     */
    function getSiblingType(element) {
        if (element.tagName === 'A') return 'link';
        if (element.tagName === 'BUTTON') return 'button';
        if (element.tagName === 'INPUT') return `input-${element.type || 'text'}`;
        if (element.tagName === 'IMG') return 'image';
        if (['H1', 'H2', 'H3', 'H4', 'H5', 'H6'].includes(element.tagName)) return 'heading';
        if (['P', 'SPAN', 'DIV'].includes(element.tagName)) return 'content';
        return 'other';
    }

    /**
     * Get relative position of an element compared to reference element
     * @param {Element} element - Element to check
     * @param {Element} reference - Reference element
     * @returns {string} - Relative position
     */
    function getRelativePosition(element, reference) {
        const elementRect = element.getBoundingClientRect();
        const referenceRect = reference.getBoundingClientRect();
        
        if (elementRect.top < referenceRect.top) return 'above';
        if (elementRect.top > referenceRect.top) return 'below';
        if (elementRect.left < referenceRect.left) return 'left';
        return 'right';
    }

    /**
     * Get section information for an element
     * @param {Element} element - DOM element
     * @returns {Object} - Section information
     */
    function getSectionInfo(element) {
        const sectionTypes = {
            HEADER: { type: 'header', importance: 'high' },
            FOOTER: { type: 'footer', importance: 'medium' },
            NAV: { type: 'navigation', importance: 'high' },
            MAIN: { type: 'main content', importance: 'high' },
            ASIDE: { type: 'sidebar', importance: 'medium' },
            SECTION: { type: 'section', importance: 'medium' },
            ARTICLE: { type: 'article', importance: 'medium' },
            FORM: { type: 'form', importance: 'high' }
        };

        return sectionTypes[element.tagName] || { type: null, importance: 'low' };
    }

    /**
     * Check if element is interactive
     * @param {Element} element - DOM element
     * @returns {boolean} - Is interactive
     */
    function isInteractiveElement(element) {
        const interactiveTags = ['A', 'BUTTON', 'INPUT', 'SELECT', 'TEXTAREA'];
        const interactiveRoles = ['button', 'link', 'checkbox', 'radio', 'tab', 'menuitem'];
        
        return interactiveTags.includes(element.tagName) ||
               (element.getAttribute('role') && interactiveRoles.includes(element.getAttribute('role'))) ||
               element.hasAttribute('onclick') ||
               element.hasAttribute('tabindex');
    }

    /**
     * Get implicit ARIA role for element
     * @param {Element} element - DOM element
     * @returns {string} - Implicit role
     */
    function getImplicitRole(element) {
        const roleMap = {
            A: 'link',
            BUTTON: 'button',
            H1: 'heading',
            H2: 'heading',
            H3: 'heading',
            H4: 'heading',
            H5: 'heading',
            H6: 'heading',
            IMG: 'img',
            INPUT: element.type || 'textbox',
            NAV: 'navigation',
            UL: 'list',
            OL: 'list',
            LI: 'listitem'
        };

        return roleMap[element.tagName] || 'generic';
    }

    /**
     * Get page section based on location path
     * @param {Array} locationPath - Path of element locations
     * @returns {string} - Page section description
     */
    function getPageSection(locationPath) {
        if (locationPath.length === 0) return 'body';
        
        const sectionPriority = ['header', 'navigation', 'main content', 'sidebar', 'footer'];
        for (const priority of sectionPriority) {
            const section = locationPath.find(loc => loc.type === priority);
            if (section) return section.type;
        }
        
        return locationPath[0].type || 'body';
    }

    /**
     * Get visual hierarchy information
     * @param {Element} element - DOM element
     * @returns {Object} - Visual hierarchy info
     */
    function getVisualHierarchy(element) {
        const styles = window.getComputedStyle(element);
        return {
            isVisible: styles.display !== 'none' && styles.visibility !== 'hidden',
            zIndex: styles.zIndex,
            position: styles.position,
            isFixed: styles.position === 'fixed',
            isAbsolute: styles.position === 'absolute'
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
            Analyze this website element's interaction patterns and provide UX insights:

            Element Details:
            - Type: ${data.element.tagName}
            - Role: ${data.element.role}
            - Interactive: ${data.element.isInteractive ? 'Yes' : 'No'}
            - Location Path: ${data.element.locationPath.map(p => p.type).join(' > ')}
            - Content: ${data.element.innerText}
            - Selector: ${data.selector}

            Interaction Metrics:
            - Clicks: ${data.metrics.clicks}
            - Engagement Score: ${data.metrics.engagementScore}/100
            - Interaction Quality: ${data.metrics.interactionQuality}
            - Visibility: ${data.metrics.isVisible ? 'Visible' : 'Not Visible'}
            - Total Interactions: ${data.metrics.totalInteractions}

            Page Context:
            - Section: ${data.context.pageSection}
            - Visual Position: ${JSON.stringify(data.context.visualHierarchy)}
            - Parent Element: ${JSON.stringify(data.context.parent)}
            - Related Elements: ${data.context.siblings.map(s => `${s.relationshipType} (${s.position})`).join(', ')}

            CSS Styles:
            ${data.styles}

            Please analyze:
            1. Element Usage: Is the interaction pattern (${data.metrics.interactionQuality}) appropriate for this element type and role?
            2. Context Impact: How does the element's location (${data.context.pageSection}) and visibility affect its performance?
            3. Engagement Quality: With a ${data.metrics.engagementScore}/100 engagement score, what specific improvements could enhance user interaction?

            Focus on actionable recommendations based on:
            - Element role and interaction expectations
            - Position and visibility in page context
            - Current engagement patterns vs. optimal patterns
            
            Keep the response concise and practical.
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
        const { metrics, element, context } = data;
        
        const patterns = {
            highEngagement: metrics.engagementScore > 80,
            moderateEngagement: metrics.engagementScore > 50,
            lowEngagement: metrics.engagementScore <= 50,
            visibilityIssue: !metrics.isVisible,
            interactiveElement: element.isInteractive
        };

        // Build context-aware analysis
        let analysis = '';
        
        // Primary status determination
        if (patterns.highEngagement) {
            analysis = `Success: Strong user engagement (${metrics.engagementScore}/100) with this ${element.role || element.tagName} element. `;
            
            if (element.isInteractive) {
                analysis += `As an interactive element in the ${context.pageSection}, it's effectively capturing user attention and actions.`;
            } else {
                analysis += `Despite being non-interactive, this content is drawing significant user interest.`;
            }
        } else if (patterns.moderateEngagement) {
            analysis = `Normal: Moderate engagement levels (${metrics.engagementScore}/100) for this ${element.tagName} element. `;
            
            if (patterns.interactiveElement) {
                analysis += `Consider enhancing visual prominence or call-to-action clarity to improve interaction rates.`;
            } else {
                analysis += `Content engagement is within expected range for its location in ${context.pageSection}.`;
            }
        } else {
            analysis = `Problem: Low engagement (${metrics.engagementScore}/100) detected. `;
            
            if (patterns.visibilityIssue) {
                analysis += `Element visibility issues may be impacting performance. Consider adjusting layout or scroll position.`;
            } else if (patterns.interactiveElement) {
                analysis += `Despite being an interactive ${element.role}, user interaction is below expectations. Review positioning and visual hierarchy.`;
            } else {
                analysis += `Content may need revision or better placement to improve engagement in the ${context.pageSection} section.`;
            }
        }

        return analysis;
    }

    /**
     * Analyze interaction patterns for an element
     * @param {Object} entry - Hotjar data entry
     * @param {Object} context - Semantic context
     * @returns {Object} - Interaction pattern analysis
     */
    function analyzeInteractionPattern(entry, context) {
        const { clicks, visible } = entry;
        const { isInteractive, role } = context;

        // Define quality thresholds
        let quality = 'normal';
        const patterns = {
            highEngagement: clicks > 100,
            lowVisibleEngagement: visible && clicks < 10,
            missedOpportunity: isInteractive && clicks < 5,
            navigationElement: ['link', 'button', 'menuitem'].includes(role)
        };

        // Determine interaction quality
        if (patterns.highEngagement) {
            quality = 'high';
        } else if (patterns.lowVisibleEngagement && patterns.navigationElement) {
            quality = 'low';
        } else if (patterns.missedOpportunity) {
            quality = 'needs_improvement';
        }

        return {
            quality,
            patterns
        };
    }

    /**
     * Calculate engagement score for an element
     * @param {Object} entry - Hotjar data entry
     * @param {Object} context - Element context
     * @returns {number} - Engagement score (0-100)
     */
    function calculateEngagementScore(entry, context) {
        const { clicks, percentage, visible } = entry;
        const { locationPath, semanticContext } = context;

        // Base score from clicks percentage
        let score = percentage * 100;

        // Adjust for visibility
        if (!visible) score *= 0.7;

        // Adjust for location importance
        const locationImportance = locationPath.reduce((acc, loc) => {
            if (loc.importance === 'high') return acc * 1.2;
            if (loc.importance === 'medium') return acc * 1.1;
            return acc;
        }, 1);
        score *= locationImportance;

        // Adjust for semantic relevance
        if (semanticContext.isInteractive) {
            score *= 1.2; // Interactive elements should have higher engagement
        }

        // Cap at 100 and round to 2 decimal places
        return Math.min(100, Math.round(score * 100) / 100);
    }

    // Return public interface
    return {
        analyzeData,
        analyzeElement,
        analyzeInteractionPattern,
        calculateEngagementScore
    };
}