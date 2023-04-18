from .Config import Config
from .basics import eprint

import pickle
import os

def load_cookies_from_file(filename: str):
    cookie_path = os.path.join(Config.get().cookies_dir, filename + ".cookie")
    if not os.path.exists(cookie_path):
        eprint(f"Warning: Could not find cookie file at path: {cookie_path} (ignoring)")
        return []
    
    cookie_data = pickle.load(open(cookie_path, "rb"))
    cookies = []
    for cookie in cookie_data:
        # still necessary?
        if 'sameSite' in cookie:
            if cookie['sameSite'] == 'None':
                cookie['sameSite'] = 'Strict'
        cookies.append(cookie)
    return cookies

def save_cookies_to_file(cookies, filename: str):
    cookie_path = os.path.join(Config.get().cookies_dir, filename + ".cookie")
    with open(cookie_path, "wb") as f:
        pickle.dump(cookies, f)
        f.close()
