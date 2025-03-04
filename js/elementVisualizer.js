// Element visualization functionality
import html2canvas from 'https://cdn.skypack.dev/html2canvas';

export async function visualizeElement(selector, websiteCode) {
    // Create a temporary container for rendering
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.width = '1024px'; // Standard width for visualization
    document.body.appendChild(container);

    try {
        // Create temporary iframe to render website code
        const iframe = document.createElement('iframe');
        iframe.style.width = '1024px';
        iframe.style.height = '768px';
        container.appendChild(iframe);

        // Write website code to iframe
        iframe.contentDocument.open();
        iframe.contentDocument.write(websiteCode.html);
        
        // Add website styles
        const styleEl = iframe.contentDocument.createElement('style');
        styleEl.textContent = websiteCode.css.join('\n');
        iframe.contentDocument.head.appendChild(styleEl);
        
        iframe.contentDocument.close();

        // Wait for iframe content to load
        await new Promise(resolve => iframe.onload = resolve);

        // Find the element in iframe
        const element = iframe.contentDocument.querySelector(selector);
        if (!element) {
            throw new Error('Element not found');
        }

        // Get element position info
        const rect = element.getBoundingClientRect();
        const positionInfo = getPositionInfo(element);

        // Generate DOM path visualization
        const domPath = generateDOMPath(element);

        // Capture element screenshot
        const canvas = await html2canvas(element, {
            backgroundColor: null,
            scale: 0.5 // Scale down for thumbnail
        });

        // Clean up
        container.remove();

        return {
            screenshot: canvas.toDataURL(),
            domPath,
            position: {
                x: rect.x,
                y: rect.y,
                width: rect.width,
                height: rect.height
            },
            style: getComputedStyles(element),
            context: positionInfo
        };

    } catch (error) {
        console.error('Visualization error:', error);
        container.remove();
        return null;
    }
}

function getPositionInfo(element) {
    const sections = ['header', 'nav', 'main', 'footer', 'aside'];
    let currentElement = element;
    let position = 'body';

    while (currentElement.parentElement) {
        const parentTag = currentElement.parentElement.tagName.toLowerCase();
        if (sections.includes(parentTag)) {
            position = parentTag;
            break;
        }
        currentElement = currentElement.parentElement;
    }

    // Get nearby elements for context
    const siblings = Array.from(element.parentElement.children)
        .filter(child => child !== element)
        .slice(0, 3) // Limit to 3 siblings
        .map(sibling => ({
            tag: sibling.tagName.toLowerCase(),
            text: sibling.textContent.slice(0, 50),
            classes: Array.from(sibling.classList)
        }));

    return {
        section: position,
        siblings,
        parent: {
            tag: element.parentElement.tagName.toLowerCase(),
            classes: Array.from(element.parentElement.classList)
        }
    };
}

function generateDOMPath(element) {
    const path = [];
    let current = element;

    while (current && current.tagName) {
        const tag = current.tagName.toLowerCase();
        const classes = Array.from(current.classList).join('.');
        const id = current.id ? `#${current.id}` : '';
        
        path.unshift({
            tag,
            classes: classes ? `.${classes}` : '',
            id
        });

        current = current.parentElement;
    }

    return path;
}

function getComputedStyles(element) {
    const computed = element.ownerDocument.defaultView.getComputedStyle(element);
    return {
        color: computed.color,
        backgroundColor: computed.backgroundColor,
        fontSize: computed.fontSize,
        fontFamily: computed.fontFamily,
        padding: computed.padding,
        margin: computed.margin,
        position: computed.position,
        display: computed.display
    };
}