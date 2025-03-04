// URL validation and website code fetching functionality

export function setupUrlHandler(onCodeFetched) {
    const urlInput = document.getElementById('websiteUrl');
    const fetchButton = document.getElementById('fetchWebsiteBtn');
    const errorElement = document.getElementById('urlError');

    // Setup event listeners
    fetchButton.addEventListener('click', () => handleUrlSubmit(urlInput.value));
    urlInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleUrlSubmit(urlInput.value);
        }
    });

    /**
     * Validate and handle URL submission
     * @param {string} url - The URL to validate and fetch
     */
    async function handleUrlSubmit(url) {
        try {
            // Reset error state
            hideError();
            
            // Validate URL
            if (!isValidUrl(url)) {
                throw new Error('Please enter a valid website URL');
            }

            // Show loading state
            fetchButton.disabled = true;
            fetchButton.innerHTML = '<span class="inline-block animate-spin mr-2">↻</span>Fetching...';

            // Fetch website code
            const code = await fetchWebsiteCode(url);
            
            // Call the callback with the fetched code
            await onCodeFetched(code);

        } catch (error) {
            showError(error.message);
            console.error('URL handling error:', error);
        } finally {
            // Reset button state
            fetchButton.disabled = false;
            fetchButton.textContent = 'Fetch Code';
        }
    }

    /**
     * Validate URL format
     * @param {string} url - URL to validate
     * @returns {boolean} - Whether the URL is valid
     */
    function isValidUrl(url) {
        try {
            new URL(url);
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Fetch website code from the provided URL
     * @param {string} url - URL to fetch code from
     * @returns {Promise<{html: string, css: string[], js: string[]}>} - Object containing HTML, CSS, and JS code
     */
    async function fetchWebsiteCode(url) {
        try {
            // Use our proxy server to fetch the website code
            const response = await fetch('http://localhost:8001', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ url })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Failed to fetch website code');
            }

            const result = await response.json();
            const html = result.content;

            // Parse the HTML
            const doc = new DOMParser().parseFromString(html, 'text/html');
            
            // Extract CSS and JavaScript
            const cssLinks = Array.from(doc.querySelectorAll('link[rel="stylesheet"]'))
                .map(link => link.href)
                .filter(href => href); // Remove empty hrefs

            const jsScripts = Array.from(doc.querySelectorAll('script[src]'))
                .map(script => script.src)
                .filter(src => src); // Remove empty srcs

            // For now, we'll return just the HTML as fetching external resources might still face CORS issues
            // This still gives us enough information for the analysis
            return {
                html,
                css: [], // External resources fetching disabled for now
                js: []  // External resources fetching disabled for now
            };

        } catch (error) {
            console.error('Fetch error:', error);
            throw new Error(
                'Failed to fetch website code. Please ensure the URL is correct and the website is accessible.\n' +
                'Error: ' + error.message
            );
        }
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
        handleUrlSubmit,
        isValidUrl
    };
}