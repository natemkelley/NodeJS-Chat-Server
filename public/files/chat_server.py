# server.py
#http://www.bogotobogo.com/python/python_network_programming_server_client.php
#https://stackoverflow.com/questions/21233340/sending-string-via-socket-python
#https://stackoverflow.com/questions/11887291/how-to-add-carriage-return-in-python
#https://stackoverflow.com/questions/39535855/send-receive-data-over-a-socket-python3
#https://www.tutorialspoint.com/python/string_replace.htm

import sys
import socket
import select
import re
import traceback

HOST = ''                #creates an arbitrary host
SOCKET_LIST = []         #socket list array
RECV_BUFFER = 4096 
PORT = 9020
SOCK_NAME = {}


def server():
    server_socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    server_socket.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    server_socket.bind((HOST, PORT))
    server_socket.listen(10)
 
    # add server socket object to the list of readable connections
    SOCKET_LIST.append(server_socket)
 
    print ("Chat server started on port " + str(PORT))
 
    while 1:
        # get the list sockets which are ready to be read through select
        # 4th arg, time_out  = 0 : poll and never block
        ready_to_read,ready_to_write,in_error = select.select(SOCKET_LIST,[],[],0)
      
        for sock in ready_to_read:
            # a new connection request recieved
            if sock == server_socket:
                sockfd, addr = server_socket.accept()
                SOCKET_LIST.append(sockfd)
                print ("Client (%s, %s) connected" % addr)
                initialConnection(sockfd)
            # a message from a client, not a new connection
            else:
                # process data recieved from client, 
                try:
                    # receiving data from the socket.
                    data = sock.recv(RECV_BUFFER)
                    data = data.strip().decode('utf-8')
                    split_data = data.split()
                    first_word = split_data[0]
                    
                    if data:
                        broadcast(server_socket, sock, "\r" + '[' + str(sock.getpeername()) + '] ' + data)
                        print ("this is the stripped data=="+data)
                        print ("this is the split data=="+first_word)

                        if data == "help":
                            helpRequest(sock)
                        elif data == "adios":
                            adiosRequest(sock)
                        elif first_word =="name:":
                            nameRequest(sock, data)
                        elif first_word =="test:":
                            testRequest(sock, data)
                        elif data=="get":
                            getRequest(sock)
                        elif data=="push":
                            pushRequest(sock)
                        elif data=="getrange":
                            getrangeRequest(sock)
                        else:
                            unknownRequest(sock)


                    else:
                        # remove the socket that's broken    
                        if sock in SOCKET_LIST:
                            SOCKET_LIST.remove(sock)
                        # at this stage, no data means probably the connection has been broken
                        broadcast(server_socket, sock, "Client (%s, %s) is offline\n" % addr) 
                # exception 
                except:
                    print (traceback.format_exc())
                    print ("Unexpected error:", sys.exc_info()[0])
                    continue

    server_socket.close()

    # broadcast chat messages to all connected clients
def broadcast (server_socket, sock, message):
    for socket in SOCKET_LIST:
        # send the message only to peer
        if socket != server_socket and socket != sock :
            try :
                socket.send(message)
            except :
                # broken socket connection
                print ("closing broken socket :(")
                socket.close()
                # broken socket, remove it
                if socket in SOCKET_LIST:
                    print ("removed from socket list")
                    SOCKET_LIST.remove(socket)

                                    
def initialConnection (sock):
    sock.send("Welcome to Nate's chat server")
 
def helpRequest (sock):
    print ("Help request sent")
    sock.send(("Chat Server Help: "
        "\nhelp:  <cr><lf> receives a response of a list of the commands and their syntax"
        "\ntest:  words<cr><lf> receives a response of 'words<cr><lf>'"
        "\nname:  <chatname><cr><lf> receives a response of 'OK<cr><lf>'"
        "\nget:   <cr><lf> receives a response of the entire contents of the chat buffer"
        "\npush:  <stuff><cr><lf> receives a response of 'OK<cr><lf>'' \n\tThe result is that '<chatname>: <stuff>'' is added as a new line to the chat buffer"
        "\ngetrange: <startline> <endline><cr><lf> receives a response of lines <startline> through <endline>\n\t from the chat buffer. getrange assumes a 0-based buffer. Your client should return lines <startline> <endline>"
        "\nSOME UNRECOGNIZED COMMAND<cr><lf> receives a response 'Error: unrecognized command: SOME UNRECOGNIZED COMMAND<cr><lf>'"
        "\nadios: <cr><lf> will quit the current connection. Checks for EOF or CLOSE SOCKET\r\n"))

def testRequest (sock, data):
    print ("Test request sent")
    sock.send(data[6:])

def nameRequest (sock, data):
    print ("Name request sent")
    SOCK_NAME[id(sock)] = data.replace('\r\n', '')[6:] #6: discounts first six chars
    print "new connection name = " + SOCK_NAME[id(sock)]
    sock.send("Ok")

def getRequest (sock):
    print ("Get request sent")
    sock.send("get")

def pushRequest (sock):
    print ("Push request sent")
    sock.send("push")            

def getrangeRequest (sock):
    print ("GetRange request sent")
    sock.send("Get Range")

def unknownRequest (sock):
    print ("Unkown request sent")
    sock.send("Unknown")

def adiosRequest (sock):
    print ("Adios request sent")
    sock.send("Adios. You will be missed\n\n")
    if id(sock) in SOCK_NAME:
        del SOCK_NAME[id(sock)]
    if sock in SOCKET_LIST:
        SOCKET_LIST.remove(sock)
    sock.close()
    
if __name__ == "__main__":
    print ("__name__")
    sys.exit(server())          