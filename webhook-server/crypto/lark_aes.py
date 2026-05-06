import base64
import hashlib

from Crypto.Cipher import AES
from Crypto.Util.Padding import unpad


def lark_aes_decrypt(encrypted_str: str, encrypt_key: str) -> str:
    key = hashlib.sha256(encrypt_key.encode()).digest()
    data = base64.b64decode(encrypted_str)
    iv = data[:16]
    ciphertext = data[16:]
    cipher = AES.new(key, AES.MODE_CBC, iv=iv)
    plaintext = unpad(cipher.decrypt(ciphertext), AES.block_size)
    return plaintext.decode("utf-8")
