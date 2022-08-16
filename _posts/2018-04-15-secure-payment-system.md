---
layout: post
title: Secure Payment System
cover-img: /assets/img/secure-payment-system.jpg
thumbnail-img: /assets/img/secure-payment-system.jpg
gh-repo: lizaibeim/secure-payment-system
gh-badge: [star, fork, follow]
tags: [Java, Cryptography]
comments: true
---

This project is a Java implementation of the secure payment system with Secure Socket Layer(SSL) protocols. We simulate the process of the account balance transfer, including identity authentication, encryption algorithm negotiation, key exchange, and critical data transaction.

## Security mechanism
### SSL Record Protocol and SSL Handshake Protocol
SSL Record Protocol is based on the secure transaction protocol (e.g., TCP), providing basic services like data encapsulation, compression, and encryption. SSL Handshake Protocol is based on the SSL Record Protocol, used before the data transaction, providing services like identity authentication, encryption algorithms negotiation, and key exchange.

  What services provided by SSL are 
  1.	Authenticate users and servers to ensure that data is sent to the correct client and server;
  2.	Encrypt data to prevent data from being seen in the middle;
  3.	Maintain data integrity and ensure that data is not changed during transmission.

In our online payment system implementation, we first use Java keytool to generate certificates of client and server. Then, we export them out and import them into the other’s key store. The certificates are used for later RSA encryption algorithms· We use Java SSL package (javax.net.ssl) to implement the authentication of client and server.

  1.	The client sends ClientHello message to the server. The message includes supported signature algorithms and so on.  
  2.	The server responds via a ServerHello message and notifies one of the signature algorithms (SHA256withRSA in this demo case) chosen from the signature algorithms supported by the client.  
  3.	The server sends its public key via *ECDHServerKeyExchange* message to the client including **message** and the **digital signature** as a server digital certificate. The digital signature is an encrypted message digest signed by client's stored certificate authority's private key. The client verifies validity of the server digital certificate by decrpyting the digital signature with its sotred certificate authority's public key and check the integrity of the message by comparing the message digest with its computed the message digest with the same algorithm.  
  4.	The negotiation between the server and the client is done. The server sends ServerHelloDone message to the client.  
  5.	The client uses the server’s public key to create a session key and send to the server via *ECDHClientKeyExchange* message.  
  6.	The client notifies the server to change the encryption algorithm and sends with Change Cipher Spec message.  
  7.	The client sends the Finished message to inform the server to check the request of changing the encryption algorithm.  
  8.	The server ensures that the algorithm has been changed and returns Change Cipher Spec message.  
  9.	The server sends the Finished message.  
  10.	After authentication of the client and the server, the communication begins and the communication data are in protection.

The generated session key is used to encrypt data during communication between the client and the server. However, the session key is the symmetric key, so if the data is intercepted by others, it may be decrypted by malicious individuals due to lower security compared to the asymmetric key.  This problem will be solved with the following security mechanism.

###	Encryption-with-Password Authentication Protocol
After construct the SSL authentication protocol, the server and client can trust each other under the premise that the communication between them are secure.

For basic communication between server and client, it is encrypted first via AES with the session key. Besides the basic communication encryption, this program adopts RSA algorithm and SHA1 algorithm to encrypt the data.

#### SHA1 (with timestamp)
Firstly, the data to be sent would be concatenated with the current timestamp accessed from the system time. The concatenated data is then hashed by the SHA1 algorithm and signed by the sender's private key, which will produce signed digested message.

The extra timestamp can make the collision resistance of the hash algorithm more robust. The signature of the digested message can verify that the message was sent from the original sender, and the hash algorithm can be used to verify the integrity of the message to prevent it from malicious tampering.

#### RSA 512/1024
Then, the signed digested message plus the raw concatenated message are encapsulated into a single String. The String is encrypted by the RSA 512/1024 algorithm, and it will produce a cipher text of the String. This procedure can prevent unauthorized users from viewing the raw concatenated message. Because RSA is encrypted by asymmetric key pairs, it is difficult to decrypt by brute force without keys.

Before secure communication, the server and client need to transfer their public key of RSA to each other. The key pairs are generated by a KeyPairGenerator specified with a certain algorithm (RSA).

+ For the server side, it stores the private key and public key of itself and the public key of the client.

+ For the client side, it stores the private key and public key of itself and the public key of the server.  

When the server sends a message to the client, the server will concatenate the message with the timestamp. Then use the SHA1 function to generate digested message and signed the digested message with server's private key using the RSA algorithm. Create a new String consisting of the signed digested message and the raw concatenated message(with timestamp). At last, use the RSA algorithm to encrypt the new String by the client’s public key. The result is shown by *Hash Data encrypted with RSA 512*.

On the client side, the client receives the cipher text and decrypts the cipher text with its private key, and gets the signed digested message and the raw concatenated message.

The client verifies the sender by decrypting the signed digested message with the server's public key. If successful, then it will get the digested message. And then the client will use the raw concatenated message to generate a new digested message hashed by the SHA1 algorithm. Then, it will compare the new digested message with the received digested message. If the two are equal, the data is authentic and unaltered. Thus, the client will send a response to inform the server of the successful transaction with the message “true”. Otherwise, it means that the data has been tampered and the client will request the server to resend the message with “false”. The response and request messages are encrypted too.

#### Password authentication
The client needs to input their password to complete the transaction.

If the password is transferred appropriately, the server will check the password whether is correct or not by comparing the received password with the pre-stored password of the client.

If the password doesn’t match, the server will inform the client of inputting the incorrect password with the message “wrong”.

Then, the client will prompt the user to re-enter the password again.

#### Random Session Key and Random RSA key pair
For different sessions (based on SSL record protocol and SSL handshake protocol), the session keys shared by the client and server are different. In the same session, for each transaction, the RSA key pairs of client and server are also different.

This kind of mechanism can prevent attackers from sending permit packets intercepted from previous “client-server communication” to the server to conduct a fake transaction. The previous permit packet signed from an obsolete client private key could not be decrypted by the server with a new public key of the client, so the transaction would fail.

---
If you are interested in this project, please refer to the [project](https://github.com/lizaibeim/secure-payment-system) on GitHub for more details and installation guidelines.