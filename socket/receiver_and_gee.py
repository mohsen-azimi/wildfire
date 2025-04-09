import socket
import numpy as np
import time
from vispy import app, gloo

# ========= FAST 2D PLOTTER CLASS ==========
class Plotter(app.Canvas):
    def __init__(self, shape=(200, 200), cmap_range=(-2.0, 2.0), title='Real-time 2D Plot'):
        app.Canvas.__init__(self, title=title, size=(800, 800), keys='interactive')
        self.shape = shape
        self.cmap_min, self.cmap_max = cmap_range

        self.vertex_shader = """
        attribute vec2 a_position;
        varying vec2 v_texcoord;
        void main() {
            gl_Position = vec4(a_position, 0.0, 1.0);
            v_texcoord = a_position * 0.5 + 0.5;
        }
        """

        self.fragment_shader = """
        uniform sampler2D u_texture;
        varying vec2 v_texcoord;

        vec4 jet(float x) {
            vec3 a, b;
            float c;
            if (x < 0.34) {
                a = vec3(0, 0, 0.5);
                b = vec3(0, 0.8, 0.95);
                c = (x - 0.0) / (0.34 - 0.0);
            } else if (x < 0.64) {
                a = vec3(0, 0.8, 0.95);
                b = vec3(0.85, 1, 0.04);
                c = (x - 0.34) / (0.64 - 0.34);
            } else if (x < 0.89) {
                a = vec3(0.85, 1, 0.04);
                b = vec3(0.96, 0.7, 0);
                c = (x - 0.64) / (0.89 - 0.64);
            } else {
                a = vec3(0.96, 0.7, 0);
                b = vec3(0.5, 0, 0);
                c = (x - 0.89) / (1.0 - 0.89);
            }
            return vec4(mix(a, b, c), 1.0);
        }

        void main() {
            float val = texture2D(u_texture, v_texcoord).r;
            gl_FragColor = jet(val);
        }
        """

        Z = np.zeros(self.shape, dtype=np.float32)
        self.texture_data = self._normalize(Z)
        self.texture = gloo.Texture2D(self.texture_data, interpolation='linear')

        self.program = gloo.Program(self.vertex_shader, self.fragment_shader)
        self.program['a_position'] = [(-1, -1), (-1, +1), (+1, -1), (+1, +1)]
        self.program['u_texture'] = self.texture

        gloo.set_viewport(0, 0, *self.physical_size)
        self.show()

    def _normalize(self, Z):
        Z = np.clip((Z - self.cmap_min) / (self.cmap_max - self.cmap_min), 0, 1)
        return Z.astype(np.float32)

    def plot(self, Z):
        """Update the texture with new matrix Z."""
        assert Z.shape == self.shape, f"Expected shape {self.shape}, got {Z.shape}"
        self.texture.set_data(self._normalize(Z))
        self.update()

    def on_draw(self, event):
        gloo.clear(color=True)
        self.program.draw('triangle_strip')

    def on_resize(self, event):
        gloo.set_viewport(0, 0, *event.physical_size)

# ========= SOCKET MATRIX RECEIVER ==========
shutdown_flag = False
VECTOR_SIZE = 40000
ELEMENT_SIZE = 4
BUFFER_SIZE = VECTOR_SIZE * ELEMENT_SIZE

# Create global plot instance
Plot = Plotter(shape=(200, 200), cmap_range=(-2, 2))

def main():
    import sys
    host = '192.168.180.37'
    port = 5000

    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        s.setsockopt(socket.IPPROTO_TCP, socket.TCP_NODELAY, 1)
        s.bind((host, port))
        print(f"[INFO] Listening on {s.getsockname()}")
        s.listen(1)
        print(f"[STATUS] Receiver initialized on {host}:{port}")
        print("[STATUS] Waiting for Fortran sender to connect...")

        while not shutdown_flag:
            try:
                s.settimeout(1.0)
                conn, addr = s.accept()
                s.settimeout(None)
                print(f"Connected by {addr}")

                with conn:
                    buffer = bytearray()
                    count = 0
                    start_time = time.time()
                    while not shutdown_flag:
                        try:
                            data = conn.recv(4096)
                            if not data:
                                break
                            buffer.extend(data)
                            while len(buffer) >= BUFFER_SIZE:
                                vector_data = buffer[:BUFFER_SIZE]
                                buffer = buffer[BUFFER_SIZE:]
                                vector = np.frombuffer(vector_data, dtype=np.float32)
                                temp2D = np.reshape(vector, (200, 200))

                                # ✅ Real-time plot update (your requested line)
                                Plot.plot(temp2D)

                                count += 1
                                if count % 10 == 0:
                                    elapsed = time.time() - start_time
                                    rate = count / elapsed if elapsed != 0 else 0
                                    print(
                                        f"Received {count} vectors | "
                                        f"Rate: {rate:.1f} Hz | "
                                        f"Shape: {temp2D.shape}"
                                    )
                        except socket.timeout:
                            continue
                    print("Connection closed")
            except socket.timeout:
                continue
            except Exception as e:
                print(f"Error: {str(e)}")
                sys.exit()
        print("\nShutting down receiver...")
        s.close()

# Run app and network loop
if __name__ == "__main__":
    import threading
    t = threading.Thread(target=main, daemon=True)
    t.start()
    app.run()




# """
# Real-Time Matrix Receiver (Python)
# ---------------------------------
# Continuously receives 200x200 single-precision matrices from a Fortran sender
# over TCP socket connection. Handles network streaming and partial data receives.
# """
#
# import socket
# import numpy as np
# import time
#
#
# # VECTOR_SIZE = 1000
# VECTOR_SIZE = 40000
# ELEMENT_SIZE = 4  # single precision (float32)
# BUFFER_SIZE = VECTOR_SIZE * ELEMENT_SIZE
# shutdown_flag = False
#
# def input_listener():
#     """Thread to watch for user input"""
#     global shutdown_flag
#     while True:
#         cmd = input().lower()
#         if cmd in ('q', 'quit', 'exit'):
#             shutdown_flag = True
#             break
#
#
# def main():
#     """Main receiver function that sets up socket and processes incoming data."""
#     import sys
#     # Socket configuration
#     host = '192.168.137.1'  # Listen on all interfaces
#     # "tcp://142.103.138.201:1883"
#     # host = '142.103.138.201'
#     port = 5000
#     # port = 1883
#     # file = open('voltage.txt', 'w')
#     # Create and configure TCP socket
#     with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
#
#         # Socket options for better performance:
#         # SO_REUSEADDR - Allows quick restart of the receiver
#         # TCP_NODELAY - Disables Nagle's algorithm for low-latency
#         s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
#         s.setsockopt(socket.IPPROTO_TCP, socket.TCP_NODELAY, 1)
#
#         # Bind socket to network interface and port
#         print (host, port)
#         s.bind((host, port))
#
#         print(f"[INFO] Listening on {s.getsockname()}")  # Shows actual host and port
#
#         # Start listening for incoming connections (max 1 queued connection)
#         s.listen(1)
#         print(f"[STATUS] Receiver initialized on {host}:{port}")
#         print("[STATUS] Waiting for Fortran sender to connect...")
#
#         while not shutdown_flag:  # Outer loop for reconnection
#             try:
#                 s.settimeout(1.0)  # Check shutdown_flag periodically
#                 conn, addr = s.accept()
#                 s.settimeout(None)  # Reset timeout after connection
#                 print(f"Connected by {addr}")
#
#                 with conn:
#                     buffer = bytearray()
#                     count = 0
#                     start_time = time.time()
#                     print ('start time ', start_time)
#                     while not shutdown_flag:
#                         try:
#                             # Receive data in chunks
#                             data = conn.recv(4096)
#                             if not data:
#                                 break  # Connection closed
#
#                             buffer.extend(data)
#
#
#                             # Process complete vectors as they arrive
#                             while len(buffer) >= BUFFER_SIZE:
#                                 # Extract one vector
#                                 vector_data = buffer[:BUFFER_SIZE]
#                                 buffer = buffer[BUFFER_SIZE:]
#                                 # print ('data received', vector_data)
#
#                                 # Convert to numpy array
#                                 vector = np.frombuffer(vector_data, dtype=np.float32)
#                                 # the vector is row by row, and make it 2d
#                                 temp2D = np.reshape(vector, (200, 200))
#                                 # print ('data received', vector)
#                                 print ('data received', vector.shape)
#                                 count += 1
#                                 if count % 10 == 0:  # Print every 10 vectors
#                                     elapsed = time.time() - start_time
#                                     if elapsed != 0:
#                                         rate = count/elapsed
#                                     else:
#                                         rate = 0
#                                     print(
#                                         f"Received {count} vectors | "
#                                         f"Rate: {rate:.1f} Hz | "
#                                         f"Latest vector: {vector}"
#                                     )
#                                     # for i in range(len(vector)):
#                                     #     file.write(str(vector[i]))
#                                     # file.write('\n')
#                         except socket.timeout:
#                             continue  # Check shutdown_flag
#                     print("Connection closed")
#             except socket.timeout:
#                 continue  # Check shutdown_flag again
#             except Exception as e:
#                 print(f"Error: {str(e)}")
#                 sys.exit()
#         print("\nShutting down receiver...")
#         s.close()
#         # file.close()
#
# if __name__ == "__main__":
#     t0 = time.time()
#     try:
#         main()
#     except KeyboardInterrupt:
#         print("\nTerminated by Ctrl+C")
#         shutdown_flag = True
#         # sys.exit(0)
#     print ('time taken', time.time() - t0)