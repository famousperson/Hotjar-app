from http.server import HTTPServer, BaseHTTPRequestHandler
import json
import urllib.request
import urllib.parse
from urllib.error import URLError

class ProxyHandler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_cors_headers()
        self.end_headers()

    def do_POST(self):
        try:
            # Read the request body
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            url = json.loads(post_data)['url']

            # Set up headers for the request
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }

            # Make the request
            req = urllib.request.Request(url, headers=headers)
            with urllib.request.urlopen(req) as response:
                website_content = response.read().decode('utf-8')

            # Send response
            self.send_response(200)
            self.send_cors_headers()
            self.send_header('Content-Type', 'application/json')
            self.end_headers()

            # Send the website content
            response_data = json.dumps({
                'content': website_content,
                'status': 'success'
            })
            self.wfile.write(response_data.encode('utf-8'))

        except URLError as e:
            self.send_error_response(str(e))
        except Exception as e:
            self.send_error_response(str(e))

    def send_cors_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')

    def send_error_response(self, error_message):
        self.send_response(500)
        self.send_cors_headers()
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        response_data = json.dumps({
            'status': 'error',
            'message': error_message
        })
        self.wfile.write(response_data.encode('utf-8'))

def run_proxy_server(port=8001):
    server_address = ('', port)
    httpd = HTTPServer(server_address, ProxyHandler)
    print(f'Starting proxy server on port {port}...')
    httpd.serve_forever()

if __name__ == '__main__':
    run_proxy_server()