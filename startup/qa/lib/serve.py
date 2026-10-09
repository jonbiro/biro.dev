"""Static file server for the QA toolkit.

`python3 -m http.server` keeps a listen backlog of 5, so parallel browser pages lose
connections and capture half-loaded pages. This server raises the backlog and stays quiet.
Usage: python3 serve.py PORT DIRECTORY
"""
import functools
import http.server
import sys


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, format, *args):
        pass


class Server(http.server.ThreadingHTTPServer):
    request_queue_size = 256
    daemon_threads = True


if __name__ == '__main__':
    port, directory = int(sys.argv[1]), sys.argv[2]
    handler = functools.partial(QuietHandler, directory=directory)
    Server(('127.0.0.1', port), handler).serve_forever()
