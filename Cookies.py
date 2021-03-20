import os, pickle

# This class is in charge of cookies and logging user into site.
class Cookies:
    def __init__(self, cookie_dir=os.getcwd(), cookie_name="tiktok.cookie"):
        self.cookies_dir = cookie_dir
        self.cookie_name = cookie_name
        self.cookie_path = os.path.join(self.cookies_dir, self.cookie_name)
        self.cookies = None

    def __len__(self):
        if self.checkCookiesExists():
            cookies = self.getCookies()
            return len(cookies)
        return 0

    def checkCookiesExists(self):
        return os.path.exists(self.cookie_path)

    def writeCookie(self, cookies):
        pickle.dump(cookies, open(self.cookie_path, "wb"))

    def getCookies(self):
        cookies = pickle.load(open(self.cookie_path, "rb"))
        self.cookies = cookies
        return cookies

    def loadCookies(self, bot):
        if self.checkCookiesExists():
            cookies = self.getCookies()
            for cookie in cookies:
                bot.add_cookie(cookie)
            return True
        return False