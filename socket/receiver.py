"""
Real-Time Matrix Receiver (Python)
---------------------------------
Continuously receives 200x200 single-precision matrices from a Fortran sender
over TCP socket connection. Handles network streaming and partial data receives.
"""

import socket
import numpy as np
import time

# VECTOR_SIZE = 1000
VECTOR_SIZE = 40000
ELEMENT_SIZE = 4  # single precision (float32)
BUFFER_SIZE = VECTOR_SIZE * ELEMENT_SIZE
shutdown_flag = False


def input_listener():
    """Thread to watch for user input"""
    global shutdown_flag
    while True:
        cmd = input().lower()
        if cmd in ('q', 'quit', 'exit'):
            shutdown_flag = True
            break


def main():
    """Main receiver function that sets up socket and processes incoming data."""
    import sys
    # Socket configuration
    host = '192.168.1.83'  # Listen on all interfaces
    # "tcp://142.103.138.201:1883"
    # host = '142.103.138.201'
    port = 5000
    # port = 1883
    # file = open('voltage.txt', 'w')
    # Create and configure TCP socket
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        
        # Socket options for better performance:
        # SO_REUSEADDR - Allows quick restart of the receiver
        # TCP_NODELAY - Disables Nagle's algorithm for low-latency
        s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        s.setsockopt(socket.IPPROTO_TCP, socket.TCP_NODELAY, 1)
        
        # Bind socket to network interface and port
        print (host, port)
        s.bind((host, port))
        
        # Start listening for incoming connections (max 1 queued connection)
        s.listen(1)
        print(f"[STATUS] Receiver initialized on {host}:{port}")
        print("[STATUS] Waiting for Fortran sender to connect...")

        while not shutdown_flag:  # Outer loop for reconnection
            try:
                s.settimeout(1.0)  # Check shutdown_flag periodically
                conn, addr = s.accept()
                s.settimeout(None)  # Reset timeout after connection
                print(f"Connected by {addr}")
            
                with conn:
                    buffer = bytearray()
                    count = 0
                    start_time = time.time()
                    print ('start time ', start_time)
                    while not shutdown_flag:
                        try:
                            # Receive data in chunks
                            data = conn.recv(4096)
                            if not data:
                                break  # Connection closed
                                
                            buffer.extend(data)

                            
                            # Process complete vectors as they arrive
                            while len(buffer) >= BUFFER_SIZE:
                                # Extract one vector
                                vector_data = buffer[:BUFFER_SIZE]
                                buffer = buffer[BUFFER_SIZE:]
                                # print ('data received', vector_data)
                                
                                # Convert to numpy array
                                vector = np.frombuffer(vector_data, dtype=np.float32)
                                print ('data received', vector)
                                count += 1
                                if count % 10 == 0:  # Print every 10 vectors
                                    elapsed = time.time() - start_time
                                    if elapsed != 0: 
                                        rate = count/elapsed
                                    else:
                                        rate = 0
                                    print(
                                        f"Received {count} vectors | "
                                        f"Rate: {rate:.1f} Hz | "
                                        f"Latest vector: {vector}"
                                    )
                                    # for i in range(len(vector)):
                                    #     file.write(str(vector[i]))
                                    # file.write('\n')
                        except socket.timeout:
                            continue  # Check shutdown_flag
                    print("Connection closed")
            except socket.timeout:
                continue  # Check shutdown_flag again
            except Exception as e:
                print(f"Error: {str(e)}")
                sys.exit()
        print("\nShutting down receiver...")
        s.close()
        # file.close()

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\nTerminated by Ctrl+C")
        shutdown_flag = True
        sys.exit(0)