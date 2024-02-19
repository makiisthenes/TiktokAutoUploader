from .Config import Config
from .basics import eprint

import pickle
import os


def load_cookies_from_file(filename: str, cookies_path=None):
    if not cookies_path:
        cookie_path = os.path.join(os.getcwd(), Config.get().cookies_dir, filename + ".cookie")
    else:
        cookie_path = os.path.join(cookies_path, filename + ".cookie")
    if not os.path.exists(cookie_path):
        # eprint(f"Warning: Could not find cookie file at path: {cookie_path} (ignoring)")
        print("User not found on system.")
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


def save_cookies_to_file(cookies, filename: str, cookies_path=None):
    if not cookies_path:
        cookie_path = os.path.join(os.getcwd(), Config.get().cookies_dir, filename + ".cookie")
    else:
        cookie_path = os.path.join(cookies_path, filename + ".cookie")
    print("Saving cookies to file: ", cookie_path)
    with open(cookie_path, "wb") as f:
        pickle.dump(cookies, f)
        f.close()


def delete_cookies_file(filename: str, cookies_path=None):
    if not cookies_path:
        cookie_path = os.path.join(os.getcwd(), Config.get().cookies_dir, filename + ".cookie")
    else:
        cookie_path = os.path.join(cookies_path, filename + ".cookie")
    if os.path.exists(cookie_path):
        os.remove(cookie_path)
        print("Deleted cookies file: ", cookie_path)
    else:
        print("No cookies file to delete: ", cookie_path)


def delete_all_cookies_files(cookies_path=None):
    if not cookies_path:
        cookie_dir = os.path.join(os.getcwd(), Config.get().cookies_dir)
    else:
        cookie_dir = cookies_path
    for filename in os.listdir(cookie_dir):
        if filename.endswith(".cookie"):
            os.remove(os.path.join(cookie_dir, filename))
            print("Deleted cookies file: ", filename)
    print("Deleted all cookies files.")


def update_dc_location(filename:str, new_dc_location: str):
    """As datacenter location can change per load, we need to update based on response set cookies headers, in the case of dc change, we need to update settings"""
    raise NotImplementedError("This function is not implemented yet.")