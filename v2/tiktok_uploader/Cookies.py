from tiktok_uploader.IO import IO

import threading, os



class Cookies:
    """ Singleton class to store cookies """
    __instance = None


    @staticmethod
    def getCookies(Browser):
        if Cookies.__instance is None:
            with threading.Lock():
                if Cookies.__instance is None:
                    Cookies.__instance = Cookies(Browser)
        return Cookies.__instance


    def __init__(self, browser):
        if Cookies.__instance is not None:
            raise Exception("This class is a singleton!")
        else:
            Cookies.__instance = self
            self.browser = browser.getBrowser()
        self.io = IO.getInstance()



    def _loadCookies(self, selected_cookie):
        cookie_path = os.path.join(self.io.getCookieDir(), selected_cookie)
        cookie_data = self.io.pickle_load(cookie_path)
        for cookie in cookie_data:
             if 'sameSite' in cookie:
                 if cookie['sameSite'] == 'None':
                     cookie['sameSite'] = 'Strict'
             self.browser.add_cookie(cookie)


    def selectCookies(self):
        if len(self.io.listdir(self.io.getCookieDir())) > 0:
            print("Select Cookie number that you want to use:: ")
            cookies_dict = dict(enumerate(self.io.listdir(self.io.getCookieDir())))
            for index, filename in enumerate(self.io.listdir(self.io.getCookieDir())):
                print(f"({index}) --> {filename}")
            print("(a) --> Add NEW Cookie.")
            selected = ""
            while type(selected) is not int or not 0 <= selected < len(self.io.listdir(self.io.getCookieDir())):
                try:
                    selection = input("Please select an integer representing a cookie::")
                    selected = int(selection)
                except ValueError:
                    if selection == "a":
                        self._createCookies()
                        return
                    pass

            selected_cookie = cookies_dict[selected]
            self._loadCookies(selected_cookie)
        else:
            print("No cookies stored on save directory!")
            self._createCookies()


    def _createCookies(self):
        print("Your browser currently shows the tiktok login page, please login in.")
        input("After you have logged in fully, please press any button to continue...")
        print("#####")
        filename = input("Please enter a name for the cookie to be stored as::: ")
        cookie_path = os.path.join(self.io.getCookieDir(), filename + ".cookie")
        self.io.pickle_dump(self.browser.get_cookies(), cookie_path)
        print("Cookie has been created successfully, resuming upload!")