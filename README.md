# Hotjar Heatmap Analyzer

A web application that analyzes Hotjar heatmap data in relation to website code, providing AI-powered insights using the Gemini API.

## Features

- Website code fetching and analysis
- Hotjar CSV data parsing
- AI-powered analysis using Google's Gemini API
- Interactive results display with filtering
- Visual element previews and context
  * Element screenshots for easy identification
  * Visual DOM path navigation
  * Element position and styling context
- Responsive design

## Setup

1. Clone the repository:
```bash
git clone <your-repo-url>
cd hotjar-app
```

2. Set up the configuration:
   - Copy `config.sample.js` to `config.js`
   - Add your Gemini API key to `config.js`:
```javascript
export const config = {
    geminiApiKey: 'YOUR_GEMINI_API_KEY_HERE'
};
```

3. Start the servers:
   - Start the main application server:
```bash
python -m http.server 8000
```
   - Start the proxy server (in a new terminal):
```bash
python proxy_server.py
```

4. Open the application:
   - Navigate to `http://localhost:8000` in your web browser

## Usage

1. Enter a website URL to analyze
2. Upload your Hotjar heatmap CSV file
   - Required columns: "Element CSS selector", "Total # of clicks"
   - Optional columns: "Visible in image", "% of total"
3. View the analysis results:
   - Click patterns
   - Element visibility
   - AI-powered recommendations

## File Structure

```
hotjar-app/
├── index.html              # Main application page
├── css/
│   └── style.css          # Custom styles
├── js/
│   ├── main.js            # Application initialization
│   ├── urlHandler.js      # URL validation and fetching
│   ├── fileHandler.js     # CSV file processing
│   ├── analyzer.js        # Data analysis and Gemini API
│   └── ui.js             # UI updates and rendering
├── config.sample.js       # Sample configuration template
├── config.js             # Your actual configuration (git-ignored)
└── proxy_server.py       # CORS proxy server
```

## Development

- The application uses vanilla JavaScript and Tailwind CSS
- No build process required
- CORS proxy server handles website code fetching
- Gemini API integration is configured via `config.js`

## Security Notes

- The `config.js` file containing your API key is git-ignored
- Never commit sensitive credentials to the repository
- The proxy server includes basic security measures
- Input validation is implemented for URLs and file uploads

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.